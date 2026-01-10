'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

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

interface Props {
  subscriptions: Subscription[]
  onUpdate: () => void
}

export function SubscriptionTable({ subscriptions, onUpdate }: Props) {
  const [loading, setLoading] = useState<number | null>(null)
  const [resending, setResending] = useState<number | null>(null)

  const handleToggleActive = async (subscription: Subscription) => {
    setLoading(subscription.id)
    try {
      const response = await fetch(`/api/subscriptions/${subscription.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          isActive: !subscription.isActive,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to update subscription')
      }

      onUpdate()
    } catch (error) {
      console.error('Toggle active error:', error)
      alert('Failed to update subscription')
    } finally {
      setLoading(null)
    }
  }

  const handleDelete = async (subscription: Subscription) => {
    if (!confirm(`Are you sure you want to unsubscribe from ${subscription.resort.name}?`)) {
      return
    }

    setLoading(subscription.id)
    try {
      const response = await fetch(`/api/subscriptions/${subscription.id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to delete subscription')
      }

      onUpdate()
    } catch (error) {
      console.error('Delete subscription error:', error)
      alert('Failed to delete subscription')
    } finally {
      setLoading(null)
    }
  }

  const handleResend = async (subscription: Subscription) => {
    setResending(subscription.id)
    try {
      const response = await fetch(`/api/subscriptions/${subscription.id}/resend`, {
        method: 'POST',
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send notification')
      }

      let successMsg = `✓ Sent report for ${subscription.resort.name}\n\n${data.message}`

      if (data.results.email && data.results.sms) {
        successMsg += '\n\n📧 Email: ' + (data.results.email.success ? 'Sent' : 'Failed')
        successMsg += '\n📱 SMS: ' + (data.results.sms.success ? 'Sent' : 'Failed')
      } else if (data.results.email) {
        successMsg += '\n\n📧 Email: ' + (data.results.email.success ? 'Sent' : 'Failed')
      } else if (data.results.sms) {
        successMsg += '\n\n📱 SMS: ' + (data.results.sms.success ? 'Sent' : 'Failed')
      }

      alert(successMsg)
    } catch (error: any) {
      console.error('Resend error:', error)
      alert(`✗ Failed to send notification\n\n${error.message}`)
    } finally {
      setResending(null)
    }
  }

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':')
    const hour = parseInt(hours)
    const ampm = hour >= 12 ? 'PM' : 'AM'
    const displayHour = hour % 12 || 12
    return `${displayHour}:${minutes} ${ampm} MT`
  }

  if (subscriptions.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        You haven't subscribed to any resorts yet. Add your first resort to start receiving daily snow reports!
      </div>
    )
  }

  return (
    <div className="border rounded-lg">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Resort</TableHead>
            <TableHead>Notification Time</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {subscriptions.map((subscription) => (
            <TableRow key={subscription.id}>
              <TableCell className="font-medium">
                {subscription.resort.name}
              </TableCell>
              <TableCell>{formatTime(subscription.notificationTime)}</TableCell>
              <TableCell>
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    subscription.isActive
                      ? 'bg-green-100 text-green-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  {subscription.isActive ? 'Active' : 'Paused'}
                </span>
              </TableCell>
              <TableCell className="text-right space-x-2">
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => handleResend(subscription)}
                  disabled={resending === subscription.id || loading === subscription.id}
                >
                  {resending === subscription.id ? 'Sending...' : 'Send Now'}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleToggleActive(subscription)}
                  disabled={loading === subscription.id || resending === subscription.id}
                >
                  {loading === subscription.id
                    ? 'Updating...'
                    : subscription.isActive
                    ? 'Pause'
                    : 'Resume'}
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => handleDelete(subscription)}
                  disabled={loading === subscription.id || resending === subscription.id}
                >
                  {loading === subscription.id ? 'Removing...' : 'Remove'}
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
