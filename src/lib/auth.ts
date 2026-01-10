import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'

export async function requireAuth() {
  const { userId } = await auth()
  if (!userId) {
    redirect('/sign-in')
  }
  return userId
}

export async function requireAdmin() {
  const { userId } = await auth()
  if (!userId) {
    redirect('/sign-in')
  }

  const adminIds = process.env.ADMIN_USER_IDS?.split(',') || []
  if (!adminIds.includes(userId)) {
    redirect('/dashboard')
  }

  return userId
}
