'use client'

import { useState, useEffect } from 'react'
import { AddSubscriptionDialog } from './AddSubscriptionDialog'
import { SubscriptionTable } from './SubscriptionTable'

interface Resort {
  id: number
  name: string
}

interface Subscription {
  id: number
  resortId: number
  notificationTime: string
  isActive: boolean
  createdAt: string
  resort: Resort
}

export function SubscriptionsSection() {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([])
  const [loading, setLoading] = useState(true)

  const fetchSubscriptions = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/subscriptions')
      if (!response.ok) throw new Error('Failed to fetch subscriptions')
      const data = await response.json()
      setSubscriptions(data.subscriptions)
    } catch (error) {
      console.error('Fetch subscriptions error:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSubscriptions()
  }, [])

  return (
    <div className="rounded-lg border p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">Your Subscriptions</h2>
        <AddSubscriptionDialog onSubscriptionAdded={fetchSubscriptions} />
      </div>

      {loading ? (
        <div className="text-center py-8 text-gray-500">Loading subscriptions...</div>
      ) : (
        <SubscriptionTable subscriptions={subscriptions} onUpdate={fetchSubscriptions} />
      )}
    </div>
  )
}
