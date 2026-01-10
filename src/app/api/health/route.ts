import { NextResponse } from 'next/server'
import { isSchedulerRunning } from '@/jobs/scheduler'
import { prisma } from '@/lib/db'

/**
 * Health check endpoint
 * Returns system status and metrics
 */
export async function GET() {
  try {
    // Check database connection
    await prisma.$queryRaw`SELECT 1`

    // Get basic stats
    const [userCount, resortCount, subscriptionCount] = await Promise.all([
      prisma.user.count(),
      prisma.resort.count({ where: { isActive: true } }),
      prisma.userSubscription.count({ where: { isActive: true } }),
    ])

    return NextResponse.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      scheduler: {
        running: isSchedulerRunning(),
      },
      stats: {
        users: userCount,
        activeResorts: resortCount,
        activeSubscriptions: subscriptionCount,
      },
    })
  } catch (error) {
    console.error('[Health] Health check failed:', error)
    return NextResponse.json(
      {
        status: 'unhealthy',
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}
