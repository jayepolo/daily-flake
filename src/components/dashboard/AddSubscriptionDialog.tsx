'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface Resort {
  id: number
  name: string
  snowReportUrl: string
}

interface Props {
  onSubscriptionAdded: () => void
}

export function AddSubscriptionDialog({ onSubscriptionAdded }: Props) {
  const [open, setOpen] = useState(false)
  const [resorts, setResorts] = useState<Resort[]>([])
  const [selectedResortId, setSelectedResortId] = useState<string>('')
  const [notificationTime, setNotificationTime] = useState('07:00')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (open) {
      fetchResorts()
    }
  }, [open])

  const fetchResorts = async () => {
    try {
      const response = await fetch('/api/resorts')
      if (!response.ok) throw new Error('Failed to fetch resorts')
      const data = await response.json()
      setResorts(data.resorts)
    } catch (err) {
      setError('Failed to load resorts')
      console.error(err)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    if (!selectedResortId) {
      setError('Please select a resort')
      setLoading(false)
      return
    }

    try {
      const response = await fetch('/api/subscriptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resortId: parseInt(selectedResortId),
          notificationTime,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create subscription')
      }

      // Success - reset form and close dialog
      setSelectedResortId('')
      setNotificationTime('07:00')
      setOpen(false)
      onSubscriptionAdded()
    } catch (err: any) {
      setError(err.message || 'Failed to create subscription')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>Add Resort</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Add Resort Subscription</DialogTitle>
            <DialogDescription>
              Choose a resort and set your preferred notification time.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="resort">Resort</Label>
              <Select value={selectedResortId} onValueChange={setSelectedResortId}>
                <SelectTrigger id="resort">
                  <SelectValue placeholder="Select a resort" />
                </SelectTrigger>
                <SelectContent>
                  {resorts.map((resort) => (
                    <SelectItem key={resort.id} value={resort.id.toString()}>
                      {resort.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="time">Notification Time (Mountain Time)</Label>
              <Input
                id="time"
                type="time"
                value={notificationTime}
                onChange={(e) => setNotificationTime(e.target.value)}
                required
              />
              <p className="text-xs text-gray-500">
                You'll receive your daily snow report at this time
              </p>
            </div>
            {error && (
              <div className="text-sm text-red-600 bg-red-50 p-3 rounded">
                {error}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Adding...' : 'Add Subscription'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
