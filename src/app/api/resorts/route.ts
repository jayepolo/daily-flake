import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/db'

/**
 * GET /api/resorts
 * List all active resorts (public - for subscription selection)
 */
export async function GET() {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const resorts = await prisma.resort.findMany({
      where: {
        isActive: true,
      },
      orderBy: {
        name: 'asc',
      },
      select: {
        id: true,
        name: true,
        snowReportUrl: true,
      },
    })

    return NextResponse.json({ resorts })
  } catch (error) {
    console.error('Get resorts error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
