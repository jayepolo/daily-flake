import Link from 'next/link'
import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'

export default async function HomePage() {
  const { userId } = await auth()

  // Redirect to dashboard if already signed in
  if (userId) {
    redirect('/dashboard')
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-blue-50 to-white">
      <div className="container px-4 py-16 text-center">
        <h1 className="text-6xl font-bold tracking-tight text-gray-900 mb-6">
          ❄️ The Daily Flake
        </h1>
        <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
          Wake up to fresh powder alerts. Get daily snow reports from your favorite ski resorts delivered straight to your phone.
        </p>
        <div className="flex gap-4 justify-center">
          <Link
            href="/sign-up"
            className="inline-flex h-12 items-center justify-center rounded-md bg-blue-600 px-8 text-base font-medium text-white shadow hover:bg-blue-700 transition-colors"
          >
            Get Started Free
          </Link>
          <Link
            href="/sign-in"
            className="inline-flex h-12 items-center justify-center rounded-md border border-gray-300 bg-white px-8 text-base font-medium text-gray-700 shadow-sm hover:bg-gray-50 transition-colors"
          >
            Sign In
          </Link>
        </div>
      </div>
    </main>
  )
}
