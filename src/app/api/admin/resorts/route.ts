import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/db'
import { z } from 'zod'

const createSchema = z.object({
  name: z.string().min(1),
  snowReportUrl: z.string().url(),
  scrapeTime: z.string().regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/), // HH:mm format
  isActive: z.boolean().default(true),
})

/**
 * Check if user is admin
 */
function isAdmin(userId: string): boolean {
  const adminUserIds = process.env.ADMIN_USER_IDS?.split(',') || []
  return adminUserIds.includes(userId)
}

/**
 * GET /api/admin/resorts
 * List all resorts (admin only)
 */
export async function GET() {
  const { userId } = await auth()

  if (!userId || !isAdmin(userId)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  try {
    const resorts = await prisma.resort.findMany({
      orderBy: {
        name: 'asc',
      },
      include: {
        _count: {
          select: {
            subscriptions: true,
            scrapedReports: true,
          },
        },
      },
    })

    return NextResponse.json({ resorts })
  } catch (error) {
    console.error('Get resorts error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * POST /api/admin/resorts
 * Create a new resort (admin only)
 */
export async function POST(req: Request) {
  const { userId } = await auth()

  if (!userId || !isAdmin(userId)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  try {
    const body = await req.json()
    const data = createSchema.parse(body)

    // Check for duplicate name
    const existing = await prisma.resort.findUnique({
      where: { name: data.name },
    })

    if (existing) {
      return NextResponse.json({ error: 'Resort with this name already exists' }, { status: 400 })
    }

    const resort = await prisma.resort.create({
      data: {
        name: data.name,
        snowReportUrl: data.snowReportUrl,
        scrapeTime: data.scrapeTime,
        isActive: data.isActive,
      },
    })

    return NextResponse.json({ resort }, { status: 201 })
  } catch (error) {
    console.error('Create resort error:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request data' }, { status: 400 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
