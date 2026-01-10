import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/db'
import { normalizePhoneNumber } from '@/lib/phone'
import { sendVerificationCode } from '@/lib/twilio'
import { z } from 'zod'

const schema = z.object({
  phoneNumber: z.string().min(10),
})

export async function POST(req: Request) {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await req.json()
    const { phoneNumber } = schema.parse(body)

    const normalized = normalizePhoneNumber(phoneNumber)
    if (!normalized) {
      return NextResponse.json({ error: 'Invalid phone number' }, { status: 400 })
    }

    // Update user with phone number (not verified yet)
    // Twilio Verify manages the code and expiry, so we don't store them
    await prisma.user.update({
      where: { clerkUserId: userId },
      data: {
        phoneNumber: normalized,
        phoneVerified: false,
        phoneVerificationCode: null,
        phoneVerificationExpiresAt: null,
      },
    })

    // Send verification code via Twilio Verify Service
    const result = await sendVerificationCode(normalized)

    if (!result.success) {
      return NextResponse.json({ error: result.error || 'Failed to send verification code' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Send code error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
