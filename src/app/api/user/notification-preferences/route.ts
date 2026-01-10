import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function PATCH(req: NextRequest) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { emailNotificationsEnabled, smsNotificationsEnabled } = body

    // Validate inputs
    if (
      emailNotificationsEnabled !== undefined &&
      typeof emailNotificationsEnabled !== 'boolean'
    ) {
      return NextResponse.json(
        { error: 'emailNotificationsEnabled must be a boolean' },
        { status: 400 }
      )
    }

    if (smsNotificationsEnabled !== undefined && typeof smsNotificationsEnabled !== 'boolean') {
      return NextResponse.json(
        { error: 'smsNotificationsEnabled must be a boolean' },
        { status: 400 }
      )
    }

    // Get user from database
    const user = await prisma.user.findUnique({
      where: { clerkUserId: userId },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Build update data
    const updateData: any = {}
    if (emailNotificationsEnabled !== undefined) {
      updateData.emailNotificationsEnabled = emailNotificationsEnabled
    }
    if (smsNotificationsEnabled !== undefined) {
      // Only allow enabling SMS if phone is verified
      if (smsNotificationsEnabled && !user.phoneVerified) {
        return NextResponse.json(
          { error: 'Phone number must be verified to enable SMS notifications' },
          { status: 400 }
        )
      }
      updateData.smsNotificationsEnabled = smsNotificationsEnabled
    }

    // Update user preferences
    const updatedUser = await prisma.user.update({
      where: { clerkUserId: userId },
      data: updateData,
    })

    return NextResponse.json({
      success: true,
      emailNotificationsEnabled: updatedUser.emailNotificationsEnabled,
      smsNotificationsEnabled: updatedUser.smsNotificationsEnabled,
    })
  } catch (error) {
    console.error('Error updating notification preferences:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
