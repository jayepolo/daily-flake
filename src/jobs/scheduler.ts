import cron from 'node-cron'
import { scrapeResorts } from './scraper'
import { sendNotifications } from './notifier'

let schedulerStarted = false

/**
 * Start the scheduled jobs
 * Called once on server startup via bootstrap API
 */
export function startScheduler() {
  if (schedulerStarted) {
    console.log('[Scheduler] Already started, skipping')
    return
  }

  console.log('[Scheduler] Starting scheduled jobs...')

  // Run scraper every 15 minutes to check if any resorts need scraping
  // The scraper itself filters resorts based on their scrapeTime
  // With a 15-minute window, we'll catch all scheduled scrapes without hammering resort sites
  cron.schedule('*/15 * * * *', async () => {
    console.log('[Scheduler] Cron trigger: Running scraper job')
    try {
      await scrapeResorts()
    } catch (error) {
      console.error('[Scheduler] Scraper job failed:', error)
    }
  })

  // Run notifier every 15 minutes to check for pending notifications
  // The notifier filters subscriptions based on their notificationTime
  cron.schedule('*/15 * * * *', async () => {
    console.log('[Scheduler] Cron trigger: Running notifier job')
    try {
      await sendNotifications()
    } catch (error) {
      console.error('[Scheduler] Notifier job failed:', error)
    }
  })

  schedulerStarted = true
  console.log('[Scheduler] ✓ Scheduled jobs started')
  console.log('[Scheduler] - Scraper: runs every 15 minutes')
  console.log('[Scheduler] - Notifier: runs every 15 minutes')
}

/**
 * Check if scheduler is running
 */
export function isSchedulerRunning(): boolean {
  return schedulerStarted
}
