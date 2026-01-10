import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/db'

/**
 * Check if user is admin
 */
function isAdmin(userId: string): boolean {
  const adminUserIds = process.env.ADMIN_USER_IDS?.split(',') || []
  return adminUserIds.includes(userId)
}

/**
 * GET /api/admin/metrics
 * Get dashboard metrics (admin only)
 */
export async function GET() {
  const { userId } = await auth()

  if (!userId || !isAdmin(userId)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  try {
    // Get counts
    const [
      totalUsers,
      verifiedUsers,
      activeSubscriptions,
      activeResorts,
      todayDeliveries,
      recentDeliveries,
      subscriptionsByResort,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { phoneVerified: true } }),
      prisma.userSubscription.count({ where: { isActive: true } }),
      prisma.resort.count({ where: { isActive: true } }),

      // Deliveries in last 24 hours
      prisma.deliveryLog.count({
        where: {
          sentAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
          },
        },
      }),

      // Recent deliveries with details
      prisma.deliveryLog.findMany({
        take: 10,
        orderBy: { sentAt: 'desc' },
        include: {
          user: {
            select: {
              email: true,
            },
          },
          resort: {
            select: {
              name: true,
            },
          },
        },
      }),

      // Subscriptions grouped by resort
      prisma.userSubscription.groupBy({
        by: ['resortId'],
        where: { isActive: true },
        _count: true,
      }),
    ])

    // Get resort names for subscription counts
    const resortIds = subscriptionsByResort.map((s) => s.resortId)
    const resorts = await prisma.resort.findMany({
      where: { id: { in: resortIds } },
      select: { id: true, name: true },
    })

    const resortMap = new Map(resorts.map((r) => [r.id, r.name]))

    const subscriptionsByResortWithNames = subscriptionsByResort.map((s) => ({
      resort: resortMap.get(s.resortId) || 'Unknown',
      count: s._count,
    }))

    return NextResponse.json({
      totalUsers,
      verifiedUsers,
      activeSubscriptions,
      activeResorts,
      todayDeliveries,
      recentDeliveries,
      subscriptionsByResort: subscriptionsByResortWithNames,
    })
  } catch (error) {
    console.error('Get metrics error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
