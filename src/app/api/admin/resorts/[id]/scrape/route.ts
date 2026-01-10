import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { extractSnowReport, generateSMSSummary } from '@/lib/claude'

interface ScrapedData {
  newSnowfall: number
  baseDepth: number
  liftsOpen: string
  conditions: string
}

async function fetchHTML(url: string): Promise<string> {
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
    },
  })

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`)
  }

  return await response.text()
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
