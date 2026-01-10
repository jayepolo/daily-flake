'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

interface Metrics {
  totalUsers: number
  verifiedUsers: number
  activeSubscriptions: number
  activeResorts: number
  todayDeliveries: number
  recentDeliveries: Array<{
    id: number
    messageSent: string
    sentAt: string
    deliveryStatus: string
    user: { email: string }
    resort: { name: string }
  }>
  subscriptionsByResort: Array<{
    resort: string
    count: number
  }>
}

export default function AdminPage() {
  const [metrics, setMetrics] = useState<Metrics | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchMetrics()
  }, [])

  const fetchMetrics = async () => {
    try {
      const response = await fetch('/api/admin/metrics')
      if (!response.ok) throw new Error('Failed to fetch metrics')
      const data = await response.json()
      setMetrics(data)
    } catch (error) {
      console.error('Fetch metrics error:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Loading metrics...</p>
      </div>
    )
  }

  if (!metrics) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600">Failed to load metrics</p>
      </div>
    )
  }

  const formatDate = (date: string) => {
    return new Date(date).toLocaleString()
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold mb-2">Admin Dashboard</h1>
        <p className="text-gray-600">System metrics and recent activity</p>
      </div>

      {/* Metrics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Total Users</CardDescription>
            <CardTitle className="text-4xl">{metrics.totalUsers}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xs text-muted-foreground">
              {metrics.verifiedUsers} verified ({Math.round((metrics.verifiedUsers / metrics.totalUsers) * 100)}%)
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Active Subscriptions</CardDescription>
            <CardTitle className="text-4xl">{metrics.activeSubscriptions}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xs text-muted-foreground">
              Across {metrics.activeResorts} active resorts
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Active Resorts</CardDescription>
            <CardTitle className="text-4xl">{metrics.activeResorts}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xs text-muted-foreground">
              Available for subscription
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Deliveries (24h)</CardDescription>
            <CardTitle className="text-4xl">{metrics.todayDeliveries}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xs text-muted-foreground">
              SMS messages sent
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Subscriptions by Resort */}
      <Card>
        <CardHeader>
          <CardTitle>Subscriptions by Resort</CardTitle>
          <CardDescription>Number of active subscriptions per resort</CardDescription>
        </CardHeader>
        <CardContent>
          {metrics.subscriptionsByResort.length > 0 ? (
            <div className="space-y-2">
              {metrics.subscriptionsByResort.map((item) => (
                <div key={item.resort} className="flex items-center justify-between">
                  <span className="font-medium">{item.resort}</span>
                  <span className="text-gray-600">{item.count} subscriptions</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500">No active subscriptions</p>
          )}
        </CardContent>
      </Card>

      {/* Recent Deliveries */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Deliveries</CardTitle>
          <CardDescription>Last 10 SMS deliveries</CardDescription>
        </CardHeader>
        <CardContent>
          {metrics.recentDeliveries.length > 0 ? (
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Resort</TableHead>
                    <TableHead>Message</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Sent At</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {metrics.recentDeliveries.map((delivery) => (
                    <TableRow key={delivery.id}>
                      <TableCell className="font-medium">{delivery.user.email}</TableCell>
                      <TableCell>{delivery.resort.name}</TableCell>
                      <TableCell className="max-w-xs truncate">{delivery.messageSent}</TableCell>
                      <TableCell>
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            delivery.deliveryStatus === 'sent'
                              ? 'bg-green-100 text-green-800'
                              : delivery.deliveryStatus === 'failed'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {delivery.deliveryStatus}
                        </span>
                      </TableCell>
                      <TableCell>{formatDate(delivery.sentAt)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <p className="text-gray-500">No deliveries yet</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
