import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/db'
import { z } from 'zod'

const updateSchema = z.object({
  notificationTime: z.string().regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/).optional(),
  isActive: z.boolean().optional(),
})

/**
 * PUT /api/subscriptions/[id]
 * Update a subscription (change notification time or pause/resume)
 */
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { id } = await params
    const subscriptionId = parseInt(id)

    if (isNaN(subscriptionId)) {
      return NextResponse.json({ error: 'Invalid subscription ID' }, { status: 400 })
    }

    const user = await prisma.user.findUnique({
      where: { clerkUserId: userId },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Check subscription exists and belongs to user
    const subscription = await prisma.userSubscription.findFirst({
      where: {
        id: subscriptionId,
        userId: user.id,
      },
    })

    if (!subscription) {
      return NextResponse.json({ error: 'Subscription not found' }, { status: 404 })
    }

    const body = await req.json()
    const updates = updateSchema.parse(body)

    // Update subscription
    const updated = await prisma.userSubscription.update({
      where: { id: subscriptionId },
      data: updates,
      include: {
        resort: true,
      },
    })

    return NextResponse.json({ subscription: updated })
  } catch (error) {
    console.error('Update subscription error:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request data' }, { status: 400 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * DELETE /api/subscriptions/[id]
 * Delete a subscription
 */
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { id } = await params
    const subscriptionId = parseInt(id)

    if (isNaN(subscriptionId)) {
      return NextResponse.json({ error: 'Invalid subscription ID' }, { status: 400 })
    }

    const user = await prisma.user.findUnique({
      where: { clerkUserId: userId },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Check subscription exists and belongs to user
    const subscription = await prisma.userSubscription.findFirst({
      where: {
        id: subscriptionId,
        userId: user.id,
      },
    })

    if (!subscription) {
      return NextResponse.json({ error: 'Subscription not found' }, { status: 404 })
    }

    // Delete subscription
    await prisma.userSubscription.delete({
      where: { id: subscriptionId },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete subscription error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
