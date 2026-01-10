'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface Resort {
  id: number
  name: string
  snowReportUrl: string
  scrapeTime: string
  isActive: boolean
  _count: {
    subscriptions: number
    scrapedReports: number
  }
}

export default function ResortsPage() {
  const [resorts, setResorts] = useState<Resort[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingResort, setEditingResort] = useState<Resort | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    snowReportUrl: '',
    scrapeTime: '05:30',
    isActive: true,
  })
  const [formError, setFormError] = useState('')
  const [formLoading, setFormLoading] = useState(false)

  useEffect(() => {
    fetchResorts()
  }, [])

  const fetchResorts = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/admin/resorts')
      if (!response.ok) throw new Error('Failed to fetch resorts')
      const data = await response.json()
      setResorts(data.resorts)
    } catch (error) {
      console.error('Fetch resorts error:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleOpenDialog = (resort?: Resort) => {
    if (resort) {
      setEditingResort(resort)
      setFormData({
        name: resort.name,
        snowReportUrl: resort.snowReportUrl,
        scrapeTime: resort.scrapeTime,
        isActive: resort.isActive,
      })
    } else {
      setEditingResort(null)
      setFormData({
        name: '',
        snowReportUrl: '',
        scrapeTime: '05:30',
        isActive: true,
      })
    }
    setFormError('')
    setDialogOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError('')
    setFormLoading(true)

    try {
      const url = editingResort
        ? `/api/admin/resorts/${editingResort.id}`
        : '/api/admin/resorts'
      const method = editingResort ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save resort')
      }

      setDialogOpen(false)
      fetchResorts()
    } catch (err: any) {
      setFormError(err.message || 'Failed to save resort')
    } finally {
      setFormLoading(false)
    }
  }

  const handleDelete = async (resort: Resort) => {
    if (
      !confirm(
        `Are you sure you want to delete ${resort.name}? This will remove ${resort._count.subscriptions} subscriptions.`
      )
    ) {
      return
    }

    try {
      const response = await fetch(`/api/admin/resorts/${resort.id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to delete resort')
      }

      fetchResorts()
    } catch (error) {
      console.error('Delete resort error:', error)
      alert('Failed to delete resort')
    }
  }

  const handleToggleActive = async (resort: Resort) => {
    try {
      const response = await fetch(`/api/admin/resorts/${resort.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !resort.isActive }),
      })

      if (!response.ok) {
        throw new Error('Failed to update resort')
      }

      fetchResorts()
    } catch (error) {
      console.error('Toggle active error:', error)
      alert('Failed to update resort')
    }
  }

  if (loading) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Loading resorts...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">Resort Management</h1>
          <p className="text-gray-600">Manage ski resorts and scraping schedules</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => handleOpenDialog()}>Add Resort</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <form onSubmit={handleSubmit}>
              <DialogHeader>
                <DialogTitle>{editingResort ? 'Edit Resort' : 'Add New Resort'}</DialogTitle>
                <DialogDescription>
                  Configure resort details and scraping schedule
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="name">Resort Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="url">Snow Report URL</Label>
                  <Input
                    id="url"
                    type="url"
                    value={formData.snowReportUrl}
                    onChange={(e) => setFormData({ ...formData, snowReportUrl: e.target.value })}
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="time">Scrape Time (Mountain Time)</Label>
                  <Input
                    id="time"
                    type="time"
                    value={formData.scrapeTime}
                    onChange={(e) => setFormData({ ...formData, scrapeTime: e.target.value })}
                    required
                  />
                  <p className="text-xs text-gray-500">
                    Time when the scraper will check this resort daily
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="active"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  />
                  <Label htmlFor="active">Active (available for subscriptions)</Label>
                </div>
                {formError && (
                  <div className="text-sm text-red-600 bg-red-50 p-3 rounded">{formError}</div>
                )}
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={formLoading}>
                  {formLoading ? 'Saving...' : editingResort ? 'Update' : 'Create'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Scrape Time</TableHead>
              <TableHead>Subscriptions</TableHead>
              <TableHead>Reports</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {resorts.map((resort) => (
              <TableRow key={resort.id}>
                <TableCell className="font-medium">{resort.name}</TableCell>
                <TableCell>{resort.scrapeTime} MT</TableCell>
                <TableCell>{resort._count.subscriptions}</TableCell>
                <TableCell>{resort._count.scrapedReports}</TableCell>
                <TableCell>
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      resort.isActive
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {resort.isActive ? 'Active' : 'Inactive'}
                  </span>
                </TableCell>
                <TableCell className="text-right space-x-2">
                  <Button variant="outline" size="sm" onClick={() => handleOpenDialog(resort)}>
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleToggleActive(resort)}
                  >
                    {resort.isActive ? 'Deactivate' : 'Activate'}
                  </Button>
                  <Button variant="destructive" size="sm" onClick={() => handleDelete(resort)}>
                    Delete
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
