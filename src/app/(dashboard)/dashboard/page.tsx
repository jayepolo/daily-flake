import { auth, currentUser } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/db'
import { PhoneVerification } from '@/components/dashboard/PhoneVerification'
import { SubscriptionsSection } from '@/components/dashboard/SubscriptionsSection'
import { NotificationPreferences } from '@/components/dashboard/NotificationPreferences'

export default async function DashboardPage() {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  // Get or create user in database
  let user = await prisma.user.findUnique({
    where: { clerkUserId: userId },
  })

  // If user doesn't exist, create them (fallback in case webhook didn't fire)
  if (!user) {
    const clerkUser = await currentUser()
    user = await prisma.user.create({
      data: {
        clerkUserId: userId,
        email: clerkUser?.emailAddresses[0]?.emailAddress || '',
      },
    })
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Dashboard</h1>
        <p className="text-gray-600">Manage your snow report subscriptions</p>
      </div>

      <div className="space-y-6">
        <PhoneVerification
          phoneNumber={user.phoneNumber}
          phoneVerified={user.phoneVerified}
        />

        <NotificationPreferences
          emailNotificationsEnabled={user.emailNotificationsEnabled}
          smsNotificationsEnabled={user.smsNotificationsEnabled}
          phoneVerified={user.phoneVerified}
        />

        <SubscriptionsSection />
      </div>
    </div>
  )
}
