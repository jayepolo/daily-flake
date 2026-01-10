import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { sendSMS } from '@/lib/twilio'
import { sendSnowReportEmail } from '@/lib/resend'

function getTodayDateString(): string {
  const now = new Date()
  return now.toISOString().split('T')[0]
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const subscriptionId = parseInt(params.id)
    if (isNaN(subscriptionId)) {
      return NextResponse.json({ error: 'Invalid subscription ID' }, { status: 400 })
    }

    // Get subscription with user and resort
    const subscription = await prisma.userSubscription.findUnique({
      where: { id: subscriptionId },
      include: {
        user: true,
        resort: true,
      },
    })

    if (!subscription) {
      return NextResponse.json({ error: 'Subscription not found' }, { status: 404 })
    }

    // Verify ownership
    if (subscription.user.clerkUserId !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const today = getTodayDateString()

    // Get today's scraped report
    const report = await prisma.scrapedReport.findUnique({
      where: {
        resortId_reportDate: {
          resortId: subscription.resort.id,
          reportDate: today,
        },
      },
    })

    let message: string
    let reportData: any = null

    if (!report || report.scrapeStatus === 'failed' || !report.smsSummary) {
      message = `${subscription.resort.name} mountain data not available`
    } else {
      message = `${subscription.resort.name}: ${report.smsSummary}`

      try {
        reportData = JSON.parse(report.reportData)
      } catch (e) {
        console.error('[Resend] Failed to parse report data:', e)
      }

      if (message.length > 160) {
        message = message.substring(0, 157) + '...'
      }
    }

    const results = {
      email: null as any,
      sms: null as any,
    }

    // Send Email if enabled
    if (subscription.user.emailNotificationsEnabled) {
      console.log(`[Resend] Sending email to ${subscription.user.email}`)

      const emailResult = await sendSnowReportEmail({
        to: subscription.user.email,
        resortName: subscription.resort.name,
        reportSummary: message,
        reportData,
      })

      await prisma.deliveryLog.create({
        data: {
          userId: subscription.user.id,
          resortId: subscription.resort.id,
          deliveryType: 'email',
          recipientAddress: subscription.user.email,
          messageSent: message,
          messageId: emailResult.messageId || null,
          deliveryStatus: emailResult.success ? 'sent' : 'failed',
          errorDetails: emailResult.error || null,
        },
      })

      results.email = {
        success: emailResult.success,
        error: emailResult.error,
      }
    }

    // Send SMS if enabled and phone verified
    if (
      subscription.user.smsNotificationsEnabled &&
      subscription.user.phoneVerified &&
      subscription.user.phoneNumber
    ) {
      console.log(`[Resend] Sending SMS to ${subscription.user.phoneNumber}`)

      const smsResult = await sendSMS(subscription.user.phoneNumber, message)

      await prisma.deliveryLog.create({
        data: {
          userId: subscription.user.id,
          resortId: subscription.resort.id,
          deliveryType: 'sms',
          recipientAddress: subscription.user.phoneNumber,
          messageSent: message,
          messageId: smsResult.sid || null,
          deliveryStatus: smsResult.success ? 'sent' : 'failed',
          errorDetails: smsResult.error || null,
        },
      })

      results.sms = {
        success: smsResult.success,
        error: smsResult.error,
      }
    }

    console.log(`[Resend] ✓ Notification sent for ${subscription.resort.name}`)

    return NextResponse.json({
      success: true,
      resort: subscription.resort.name,
      message,
      results,
    })
  } catch (error: any) {
    console.error('[Resend] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to send notification' },
      { status: 500 }
    )
  }
}
