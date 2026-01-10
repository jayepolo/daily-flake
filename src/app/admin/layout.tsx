import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { UserButton } from '@clerk/nextjs'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { userId } = await auth()

  if (!userId) {
    redirect('/sign-in')
  }

  // Check if user is admin
  const adminUserIds = process.env.ADMIN_USER_IDS?.split(',') || []
  if (!adminUserIds.includes(userId)) {
    redirect('/dashboard')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="border-b bg-white">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-8">
            <Link href="/admin" className="text-xl font-bold">
              ❄️ The Daily Flake Admin
            </Link>
            <div className="flex gap-4">
              <Link
                href="/admin"
                className="text-sm font-medium text-gray-700 hover:text-gray-900"
              >
                Dashboard
              </Link>
              <Link
                href="/admin/resorts"
                className="text-sm font-medium text-gray-700 hover:text-gray-900"
              >
                Resorts
              </Link>
              <Link
                href="/dashboard"
                className="text-sm font-medium text-gray-700 hover:text-gray-900"
              >
                User View
              </Link>
            </div>
          </div>
          <UserButton afterSignOutUrl="/" />
        </div>
      </nav>
      <main className="container mx-auto px-4 py-8">{children}</main>
    </div>
  )
}
