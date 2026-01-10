import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { scrapeResorts } from '@/jobs/scraper'
import { sendNotifications } from '@/jobs/notifier'

/**
 * Manual job trigger endpoint (admin only)
 * Allows manually triggering scraper or notifier jobs for testing
 */
export async function POST(req: Request) {
  const { userId } = await auth()

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Check if user is admin
  const adminUserIds = process.env.ADMIN_USER_IDS?.split(',') || []
  if (!adminUserIds.includes(userId)) {
    return NextResponse.json({ error: 'Forbidden - Admin only' }, { status: 403 })
  }

  try {
    const body = await req.json()
    const { job } = body

    if (job === 'scraper') {
      console.log('[Trigger] Manually triggering scraper job...')
      await scrapeResorts()
      return NextResponse.json({
        message: 'Scraper job completed',
        job: 'scraper',
      })
    } else if (job === 'notifier') {
      console.log('[Trigger] Manually triggering notifier job...')
      await sendNotifications()
      return NextResponse.json({
        message: 'Notifier job completed',
        job: 'notifier',
      })
    } else {
      return NextResponse.json(
        { error: 'Invalid job type. Use "scraper" or "notifier"' },
        { status: 400 }
      )
    }
  } catch (error) {
    console.error('[Trigger] Job trigger error:', error)
    return NextResponse.json(
      {
        error: 'Job execution failed',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}
