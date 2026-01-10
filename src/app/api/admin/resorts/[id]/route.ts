import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/db'
import { z } from 'zod'

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  snowReportUrl: z.string().url().optional(),
  scrapeTime: z.string().regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/).optional(),
  isActive: z.boolean().optional(),
})

/**
 * Check if user is admin
 */
function isAdmin(userId: string): boolean {
  const adminUserIds = process.env.ADMIN_USER_IDS?.split(',') || []
  return adminUserIds.includes(userId)
}

/**
 * PUT /api/admin/resorts/[id]
 * Update a resort (admin only)
 */
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth()

  if (!userId || !isAdmin(userId)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  try {
    const { id } = await params
    const resortId = parseInt(id)

    if (isNaN(resortId)) {
      return NextResponse.json({ error: 'Invalid resort ID' }, { status: 400 })
    }

    const body = await req.json()
    const data = updateSchema.parse(body)

    // Check if resort exists
    const existing = await prisma.resort.findUnique({
      where: { id: resortId },
    })

    if (!existing) {
      return NextResponse.json({ error: 'Resort not found' }, { status: 404 })
    }

    // If updating name, check for duplicates
    if (data.name && data.name !== existing.name) {
      const duplicate = await prisma.resort.findUnique({
        where: { name: data.name },
      })

      if (duplicate) {
        return NextResponse.json(
          { error: 'Resort with this name already exists' },
          { status: 400 }
        )
      }
    }

    const resort = await prisma.resort.update({
      where: { id: resortId },
      data,
    })

    return NextResponse.json({ resort })
  } catch (error) {
    console.error('Update resort error:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request data' }, { status: 400 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * DELETE /api/admin/resorts/[id]
 * Delete a resort (admin only)
 */
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth()

  if (!userId || !isAdmin(userId)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  try {
    const { id } = await params
    const resortId = parseInt(id)

    if (isNaN(resortId)) {
      return NextResponse.json({ error: 'Invalid resort ID' }, { status: 400 })
    }

    // Check if resort exists
    const existing = await prisma.resort.findUnique({
      where: { id: resortId },
    })

    if (!existing) {
      return NextResponse.json({ error: 'Resort not found' }, { status: 404 })
    }

    // Delete resort (cascades to subscriptions, reports, logs)
    await prisma.resort.delete({
      where: { id: resortId },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete resort error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
