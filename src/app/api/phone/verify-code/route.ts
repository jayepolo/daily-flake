import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/db'
import { verifyCode } from '@/lib/twilio'
import { z } from 'zod'

const schema = z.object({
  code: z.string().length(6),
})

export async function POST(req: Request) {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await req.json()
    const { code } = schema.parse(body)

    const user = await prisma.user.findUnique({
      where: { clerkUserId: userId },
    })

    if (!user || !user.phoneNumber) {
      return NextResponse.json({ error: 'Phone number not found' }, { status: 404 })
    }

    // Verify code using Twilio Verify Service
    const result = await verifyCode(user.phoneNumber, code)

    if (!result.success) {
      return NextResponse.json({ error: result.error || 'Invalid or expired code' }, { status: 400 })
    }

    // Mark phone as verified
    await prisma.user.update({
      where: { clerkUserId: userId },
      data: {
        phoneVerified: true,
        phoneVerificationCode: null,
        phoneVerificationExpiresAt: null,
      },
    })

    // Note: Welcome SMS disabled until A2P 10DLC registration is complete
    // Once registered, uncomment this:
    // await sendSMS(
    //   user.phoneNumber,
    //   'Welcome to The Daily Flake! You\'ll start receiving daily snow reports based on your preferences.'
    // )

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Verify code error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
