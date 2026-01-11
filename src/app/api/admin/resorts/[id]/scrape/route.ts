import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { extractSnowReport, generateSMSSummary } from '@/lib/claude'
import puppeteer from 'puppeteer'

interface ScrapedData {
  newSnowfall: number
  baseDepth: number
  liftsOpen: string
  conditions: string
}

async function fetchHTML(url: string): Promise<string> {
  let browser = null
  try {
    console.log(`[Admin Scrape] Launching headless browser for ${url}`)

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
    await page.setViewport({ width: 1920, height: 1080 })
    await page.setUserAgent(
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    )

    console.log(`[Admin Scrape] Navigating to ${url}`)

    await page.goto(url, {
      waitUntil: 'networkidle2',
      timeout: 30000,
    })

    // Wait additional time for dynamic content to load
    await new Promise(resolve => setTimeout(resolve, 5000))

    const html = await page.content()

    console.log(`[Admin Scrape] Successfully fetched ${html.length} characters of HTML`)
    console.log(`[Admin Scrape] First 500 chars: ${html.substring(0, 500)}`)

    return html
  } catch (error) {
    console.error(`[Admin Scrape] Failed to fetch ${url}:`, error)
    throw error
  } finally {
    if (browser) {
      await browser.close()
    }
  }
}

function getTodayDateString(): string {
  const now = new Date()
  return now.toISOString().split('T')[0]
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is admin
    const adminUserIds = process.env.ADMIN_USER_IDS?.split(',') || []
    if (!adminUserIds.includes(userId)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id } = await params
    const resortId = parseInt(id)
    if (isNaN(resortId)) {
      return NextResponse.json({ error: 'Invalid resort ID' }, { status: 400 })
    }

    // Get resort
    const resort = await prisma.resort.findUnique({
      where: { id: resortId },
    })

    if (!resort) {
      return NextResponse.json({ error: 'Resort not found' }, { status: 404 })
    }

    const today = getTodayDateString()

    console.log(`[Admin Scrape] Force scraping ${resort.name}...`)

    // Fetch HTML
    const html = await fetchHTML(resort.snowReportUrl)

    // Extract data with Claude
    const reportData: ScrapedData = await extractSnowReport(html, resort.name)

    // Generate SMS summary
    const smsSummary = await generateSMSSummary(reportData, resort.name)

    // Upsert to database (update if exists, create if not)
    await prisma.scrapedReport.upsert({
      where: {
        resortId_reportDate: {
          resortId: resort.id,
          reportDate: today,
        },
      },
      update: {
        reportData: JSON.stringify(reportData),
        smsSummary,
        scrapeStatus: 'success',
        errorMessage: null,
        scrapedAt: new Date(),
      },
      create: {
        resortId: resort.id,
        reportDate: today,
        reportData: JSON.stringify(reportData),
        smsSummary,
        scrapeStatus: 'success',
        errorMessage: null,
      },
    })

    console.log(`[Admin Scrape] ✓ Successfully scraped ${resort.name}`)

    return NextResponse.json({
      success: true,
      resort: resort.name,
      data: reportData,
      summary: smsSummary,
    })
  } catch (error: any) {
    console.error('[Admin Scrape] Error:', error)

    // Try to save error to database
    try {
      const { id } = await params
      const resortId = parseInt(id)
      const today = getTodayDateString()

      await prisma.scrapedReport.upsert({
        where: {
          resortId_reportDate: {
            resortId,
            reportDate: today,
          },
        },
        update: {
          scrapeStatus: 'failed',
          errorMessage: error.message || String(error),
          scrapedAt: new Date(),
        },
        create: {
          resortId,
          reportDate: today,
          reportData: JSON.stringify({}),
          smsSummary: null,
          scrapeStatus: 'failed',
          errorMessage: error.message || String(error),
        },
      })
    } catch (dbError) {
      console.error('[Admin Scrape] Failed to save error to database:', dbError)
    }

    return NextResponse.json(
      { error: error.message || 'Failed to scrape resort' },
      { status: 500 }
    )
  }
}
