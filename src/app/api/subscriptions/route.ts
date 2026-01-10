import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/db'
import { z } from 'zod'

const createSchema = z.object({
  resortId: z.number(),
  notificationTime: z.string().regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/), // HH:mm format
})

/**
 * GET /api/subscriptions
 * List all subscriptions for the current user
 */
export async function GET() {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const user = await prisma.user.findUnique({
      where: { clerkUserId: userId },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const subscriptions = await prisma.userSubscription.findMany({
      where: { userId: user.id },
      include: {
        resort: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    return NextResponse.json({ subscriptions })
  } catch (error) {
    console.error('Get subscriptions error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * POST /api/subscriptions
 * Create a new subscription
 */
export async function POST(req: Request) {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const user = await prisma.user.findUnique({
      where: { clerkUserId: userId },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    if (!user.phoneVerified) {
      return NextResponse.json(
        { error: 'Phone number must be verified before subscribing' },
        { status: 403 }
      )
    }

    const body = await req.json()
    const { resortId, notificationTime } = createSchema.parse(body)

    // Check if resort exists and is active
    const resort = await prisma.resort.findUnique({
      where: { id: resortId },
    })

    if (!resort) {
      return NextResponse.json({ error: 'Resort not found' }, { status: 404 })
    }

    if (!resort.isActive) {
      return NextResponse.json({ error: 'Resort is not active' }, { status: 400 })
    }

    // Check for duplicate subscription (unique constraint will catch this too)
    const existing = await prisma.userSubscription.findUnique({
      where: {
        userId_resortId: {
          userId: user.id,
          resortId,
        },
      },
    })

    if (existing) {
      return NextResponse.json(
        { error: 'You are already subscribed to this resort' },
        { status: 400 }
      )
    }

    // Create subscription
    const subscription = await prisma.userSubscription.create({
      data: {
        userId: user.id,
        resortId,
        notificationTime,
        isActive: true,
      },
      include: {
        resort: true,
      },
    })

    return NextResponse.json({ subscription }, { status: 201 })
  } catch (error) {
    console.error('Create subscription error:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request data' }, { status: 400 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
