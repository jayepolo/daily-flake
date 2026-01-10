import { prisma } from '@/lib/db'
import { extractSnowReport, generateSMSSummary } from '@/lib/claude'
import puppeteer from 'puppeteer'

interface ScrapedData {
  newSnowfall: number
  baseDepth: number
  liftsOpen: string
  conditions: string
}

/**
 * Fetch fully-rendered HTML from a URL using headless browser
 * This executes JavaScript on the page to get dynamic content
 */
async function fetchHTML(url: string): Promise<string> {
  let browser = null
  try {
    console.log(`[Scraper] Launching headless browser for ${url}`)

    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
      ],
    })

    const page = await browser.newPage()

    // Set a realistic viewport and user agent
    await page.setViewport({ width: 1920, height: 1080 })
    await page.setUserAgent(
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    )

    console.log(`[Scraper] Navigating to ${url}`)

    // Navigate and wait for network to be idle (all JS loaded)
    await page.goto(url, {
      waitUntil: 'networkidle2',
      timeout: 30000,
    })

    // Wait a bit more for any dynamic content to load
    await page.waitForTimeout(2000)

    // Get the fully rendered HTML
    const html = await page.content()

    console.log(`[Scraper] Successfully fetched ${html.length} characters of HTML`)

    return html
  } catch (error) {
    console.error(`[Scraper] Failed to fetch ${url}:`, error)
    throw error
  } finally {
    if (browser) {
      await browser.close()
    }
  }
}

/**
 * Check if a resort needs scraping based on current time
 * Format: scrapeTime is "HH:mm" in Mountain Time
 */
function shouldScrapeNow(scrapeTime: string): boolean {
  const now = new Date()

  // Get current time in Mountain Time (MT)
  // For simplicity, we'll use local time and assume server runs in MT
  // In production, you'd use a library like date-fns-tz for timezone handling
  const currentHour = now.getHours()
  const currentMinute = now.getMinutes()

  const [targetHour, targetMinute] = scrapeTime.split(':').map(Number)

  // Scrape if we're within the same hour and haven't passed more than 15 minutes
  // This gives a 15-minute window for the cron job to catch it
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
 * Scrape a single resort's snow report
 */
async function scrapeResort(resort: any): Promise<void> {
  const today = getTodayDateString()

  console.log(`[Scraper] Starting scrape for ${resort.name} (${resort.snowReportUrl})`)

  try {
    // Check if already scraped today
    const existing = await prisma.scrapedReport.findUnique({
      where: {
        resortId_reportDate: {
          resortId: resort.id,
          reportDate: today,
        },
      },
    })

    if (existing) {
      console.log(`[Scraper] ${resort.name} already scraped today, skipping`)
      return
    }

    // Fetch HTML
    console.log(`[Scraper] Fetching HTML for ${resort.name}...`)
    const html = await fetchHTML(resort.snowReportUrl)

    // Extract data with Claude
    console.log(`[Scraper] Extracting data for ${resort.name} with Claude AI...`)
    const reportData: ScrapedData = await extractSnowReport(html, resort.name)

    // Generate SMS summary
    console.log(`[Scraper] Generating SMS summary for ${resort.name}...`)
    const smsSummary = await generateSMSSummary(reportData, resort.name)

    // Save to database
    await prisma.scrapedReport.create({
      data: {
        resortId: resort.id,
        reportDate: today,
        reportData: JSON.stringify(reportData),
        smsSummary,
        scrapeStatus: 'success',
        errorMessage: null,
      },
    })

    console.log(`[Scraper] ✓ Successfully scraped ${resort.name}`)
    console.log(`[Scraper] Data: ${JSON.stringify(reportData)}`)
    console.log(`[Scraper] SMS: ${smsSummary}`)
  } catch (error: any) {
    console.error(`[Scraper] ✗ Failed to scrape ${resort.name}:`, error)

    // Save error to database
    await prisma.scrapedReport.create({
      data: {
        resortId: resort.id,
        reportDate: today,
        reportData: JSON.stringify({}),
        smsSummary: null,
        scrapeStatus: 'failed',
        errorMessage: error.message || String(error),
      },
    })
  }
}

/**
 * Main scraper job - runs periodically to check which resorts need scraping
 */
export async function scrapeResorts(): Promise<void> {
  console.log('[Scraper] Running scraper job...')

  try {
    // Get all active resorts
    const resorts = await prisma.resort.findMany({
      where: {
        isActive: true,
      },
    })

    console.log(`[Scraper] Found ${resorts.length} active resorts`)

    // Filter resorts that need scraping based on current time
    const resortsToScrape = resorts.filter((resort) => shouldScrapeNow(resort.scrapeTime))

    if (resortsToScrape.length === 0) {
      console.log('[Scraper] No resorts scheduled for scraping at this time')
      return
    }

    console.log(`[Scraper] ${resortsToScrape.length} resorts scheduled for scraping:`)
    resortsToScrape.forEach((r) => console.log(`  - ${r.name} (${r.scrapeTime})`))

    // Scrape each resort sequentially (to avoid rate limiting)
    for (const resort of resortsToScrape) {
      await scrapeResort(resort)
      // Small delay between scrapes to be polite
      await new Promise((resolve) => setTimeout(resolve, 2000))
    }

    console.log('[Scraper] Scraper job complete')
  } catch (error) {
    console.error('[Scraper] Scraper job error:', error)
  }
}
