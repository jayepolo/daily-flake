import { prisma } from '@/lib/db'
import { sendSMS } from '@/lib/twilio'

/**
 * Check if notification time matches current time (within 15-minute window)
 */
function shouldNotifyNow(notificationTime: string): boolean {
  const now = new Date()

  // Get current time in Mountain Time (MT)
  // For simplicity, we'll use local time and assume server runs in MT
  const currentHour = now.getHours()
  const currentMinute = now.getMinutes()

  const [targetHour, targetMinute] = notificationTime.split(':').map(Number)

  // Notify if we're within the same hour and haven't passed more than 15 minutes
  if (currentHour === targetHour) {
    const minuteDiff = currentMinute - targetMinute
    return minuteDiff >= 0 && minuteDiff < 15
  }

  return false
}

/**
 * Get today's date in YYYY-MM-DD format
 */
function getTodayDateString(): string {
  const now = new Date()
  return now.toISOString().split('T')[0]
}

/**
 * Check if SMS already sent today for this user/resort
 */
async function alreadySentToday(userId: number, resortId: number): Promise<boolean> {
  const today = getTodayDateString()
  const todayStart = new Date(today + 'T00:00:00')
  const todayEnd = new Date(today + 'T23:59:59')

  const existing = await prisma.deliveryLog.findFirst({
    where: {
      userId,
      resortId,
      sentAt: {
        gte: todayStart,
        lte: todayEnd,
      },
    },
  })

  return !!existing
}

/**
 * Send notification for a single subscription
 */
async function sendNotification(subscription: any): Promise<void> {
  const { user, resort } = subscription
  const today = getTodayDateString()

  console.log(`[Notifier] Processing notification for ${user.email} - ${resort.name}`)

  try {
    // Check if already sent today
    const alreadySent = await alreadySentToday(user.id, resort.id)
    if (alreadySent) {
      console.log(`[Notifier] Already sent to ${user.email} for ${resort.name} today, skipping`)
      return
    }

    // Get today's scraped report
    const report = await prisma.scrapedReport.findUnique({
      where: {
        resortId_reportDate: {
          resortId: resort.id,
          reportDate: today,
        },
      },
    })

    let message: string
    let deliveryStatus = 'sent'
    let errorDetails: string | null = null

    if (!report || report.scrapeStatus === 'failed' || !report.smsSummary) {
      // No report available or scraping failed
      message = `${resort.name} mountain data not available`
      console.log(`[Notifier] No report available for ${resort.name}, sending fallback message`)
    } else {
      // Use the pre-generated SMS summary
      message = `${resort.name}: ${report.smsSummary}`

      // Ensure message stays under 160 characters
      if (message.length > 160) {
        message = message.substring(0, 157) + '...'
      }
    }

    console.log(`[Notifier] Sending SMS to ${user.phoneNumber}: "${message}"`)

    // Send SMS via Twilio
    const result = await sendSMS(user.phoneNumber, message)

    if (!result.success) {
      deliveryStatus = 'failed'
      errorDetails = result.error || 'Unknown error'
      console.error(`[Notifier] ✗ Failed to send SMS to ${user.phoneNumber}:`, errorDetails)
    } else {
      console.log(`[Notifier] ✓ Successfully sent SMS to ${user.phoneNumber}`)
    }

    // Log delivery
    await prisma.deliveryLog.create({
      data: {
        userId: user.id,
        resortId: resort.id,
        phoneNumber: user.phoneNumber,
        messageSent: message,
        twilioMessageSid: result.sid || null,
        deliveryStatus,
        errorDetails,
      },
    })
  } catch (error: any) {
    console.error(`[Notifier] Error processing notification:`, error)

    // Log failed delivery
    await prisma.deliveryLog.create({
      data: {
        userId: user.id,
        resortId: resort.id,
        phoneNumber: user.phoneNumber || '',
        messageSent: `${resort.name}: Error processing notification`,
        twilioMessageSid: null,
        deliveryStatus: 'failed',
        errorDetails: error.message || String(error),
      },
    })
  }
}

/**
 * Main notifier job - runs periodically to send scheduled notifications
 */
export async function sendNotifications(): Promise<void> {
  console.log('[Notifier] Running notifier job...')

  try {
    // Get all active subscriptions with verified phone numbers
    const subscriptions = await prisma.userSubscription.findMany({
      where: {
        isActive: true,
        user: {
          phoneVerified: true,
          isPaused: false,
        },
      },
      include: {
        user: true,
        resort: true,
      },
    })

    console.log(`[Notifier] Found ${subscriptions.length} active subscriptions`)

    // Filter subscriptions due for notification at this time
    const subscriptionsToDo = subscriptions.filter((sub) =>
      shouldNotifyNow(sub.notificationTime)
    )

    if (subscriptionsToDo.length === 0) {
      console.log('[Notifier] No subscriptions scheduled for notification at this time')
      return
    }

    console.log(`[Notifier] ${subscriptionsToDo.length} subscriptions scheduled for notification:`)
    subscriptionsToDo.forEach((s) =>
      console.log(`  - ${s.user.email} → ${s.resort.name} (${s.notificationTime})`)
    )

    // Send notifications sequentially (to avoid rate limiting)
    for (const subscription of subscriptionsToDo) {
      await sendNotification(subscription)
      // Small delay between sends to be polite to Twilio
      await new Promise((resolve) => setTimeout(resolve, 100))
    }

    console.log('[Notifier] Notifier job complete')
  } catch (error) {
    console.error('[Notifier] Notifier job error:', error)
  }
}
