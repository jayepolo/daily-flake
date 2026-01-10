import { prisma } from '@/lib/db'
import { sendSMS } from '@/lib/twilio'
import { sendSnowReportEmail } from '@/lib/resend'

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
 * Check if notification already sent today for this user/resort/type
 */
async function alreadySentToday(
  userId: number,
  resortId: number,
  deliveryType: string
): Promise<boolean> {
  const today = getTodayDateString()
  const todayStart = new Date(today + 'T00:00:00')
  const todayEnd = new Date(today + 'T23:59:59')

  const existing = await prisma.deliveryLog.findFirst({
    where: {
      userId,
      resortId,
      deliveryType,
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
  let reportData: any = null

  if (!report || report.scrapeStatus === 'failed' || !report.smsSummary) {
    // No report available or scraping failed
    message = `${resort.name} mountain data not available`
    console.log(`[Notifier] No report available for ${resort.name}, sending fallback message`)
  } else {
    // Use the pre-generated SMS summary
    message = `${resort.name}: ${report.smsSummary}`

    // Parse report data for email
    try {
      reportData = JSON.parse(report.reportData)
    } catch (e) {
      console.error('[Notifier] Failed to parse report data:', e)
    }

    // Ensure message stays under 160 characters for SMS
    if (message.length > 160) {
      message = message.substring(0, 157) + '...'
    }
  }

  // Send Email Notification (if enabled)
  if (user.emailNotificationsEnabled) {
    try {
      const alreadySentEmail = await alreadySentToday(user.id, resort.id, 'email')
      if (alreadySentEmail) {
        console.log(
          `[Notifier] Already sent email to ${user.email} for ${resort.name} today, skipping`
        )
      } else {
        console.log(`[Notifier] Sending email to ${user.email}`)

        const emailResult = await sendSnowReportEmail({
          to: user.email,
          resortName: resort.name,
          reportSummary: message,
          reportData,
        })

        await prisma.deliveryLog.create({
          data: {
            userId: user.id,
            resortId: resort.id,
            deliveryType: 'email',
            recipientAddress: user.email,
            messageSent: message,
            messageId: emailResult.messageId || null,
            deliveryStatus: emailResult.success ? 'sent' : 'failed',
            errorDetails: emailResult.error || null,
          },
        })

        if (emailResult.success) {
          console.log(`[Notifier] ✓ Successfully sent email to ${user.email}`)
        } else {
          console.error(`[Notifier] ✗ Failed to send email to ${user.email}:`, emailResult.error)
        }
      }
    } catch (error: any) {
      console.error(`[Notifier] Error sending email:`, error)

      await prisma.deliveryLog.create({
        data: {
          userId: user.id,
          resortId: resort.id,
          deliveryType: 'email',
          recipientAddress: user.email,
          messageSent: message,
          messageId: null,
          deliveryStatus: 'failed',
          errorDetails: error.message || String(error),
        },
      })
    }
  }

  // Send SMS Notification (if enabled and phone verified)
  if (user.smsNotificationsEnabled && user.phoneVerified && user.phoneNumber) {
    try {
      const alreadySentSMS = await alreadySentToday(user.id, resort.id, 'sms')
      if (alreadySentSMS) {
        console.log(
          `[Notifier] Already sent SMS to ${user.phoneNumber} for ${resort.name} today, skipping`
        )
      } else {
        console.log(`[Notifier] Sending SMS to ${user.phoneNumber}: "${message}"`)

        const smsResult = await sendSMS(user.phoneNumber, message)

        await prisma.deliveryLog.create({
          data: {
            userId: user.id,
            resortId: resort.id,
            deliveryType: 'sms',
            recipientAddress: user.phoneNumber,
            messageSent: message,
            messageId: smsResult.sid || null,
            deliveryStatus: smsResult.success ? 'sent' : 'failed',
            errorDetails: smsResult.error || null,
          },
        })

        if (smsResult.success) {
          console.log(`[Notifier] ✓ Successfully sent SMS to ${user.phoneNumber}`)
        } else {
          console.error(`[Notifier] ✗ Failed to send SMS to ${user.phoneNumber}:`, smsResult.error)
        }
      }
    } catch (error: any) {
      console.error(`[Notifier] Error sending SMS:`, error)

      await prisma.deliveryLog.create({
        data: {
          userId: user.id,
          resortId: resort.id,
          deliveryType: 'sms',
          recipientAddress: user.phoneNumber || '',
          messageSent: message,
          messageId: null,
          deliveryStatus: 'failed',
          errorDetails: error.message || String(error),
        },
      })
    }
  }
}

/**
 * Main notifier job - runs periodically to send scheduled notifications
 */
export async function sendNotifications(): Promise<void> {
  console.log('[Notifier] Running notifier job...')

  try {
    // Get all active subscriptions (email or SMS enabled)
    const subscriptions = await prisma.userSubscription.findMany({
      where: {
        isActive: true,
        user: {
          isPaused: false,
          OR: [{ emailNotificationsEnabled: true }, { smsNotificationsEnabled: true }],
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
      // Small delay between sends to be polite to email/SMS providers
      await new Promise((resolve) => setTimeout(resolve, 100))
    }

    console.log('[Notifier] Notifier job complete')
  } catch (error) {
    console.error('[Notifier] Notifier job error:', error)
  }
}
