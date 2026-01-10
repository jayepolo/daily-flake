'use client'

import { useState } from 'react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Label } from '@/components/ui/label'

interface NotificationPreferencesProps {
  emailNotificationsEnabled: boolean
  smsNotificationsEnabled: boolean
  phoneVerified: boolean
}

export function NotificationPreferences({
  emailNotificationsEnabled: initialEmailEnabled,
  smsNotificationsEnabled: initialSmsEnabled,
  phoneVerified,
}: NotificationPreferencesProps) {
  const [emailEnabled, setEmailEnabled] = useState(initialEmailEnabled)
  const [smsEnabled, setSmsEnabled] = useState(initialSmsEnabled)
  const [loading, setLoading] = useState(false)

  const updatePreference = async (type: 'email' | 'sms', enabled: boolean) => {
    setLoading(true)

    try {
      const response = await fetch('/api/user/notification-preferences', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          [type === 'email' ? 'emailNotificationsEnabled' : 'smsNotificationsEnabled']: enabled,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to update preference')
      }

      if (type === 'email') {
        setEmailEnabled(enabled)
      } else {
        setSmsEnabled(enabled)
      }
    } catch (error) {
      console.error('Error updating preference:', error)
      // Revert on error
      if (type === 'email') {
        setEmailEnabled(!enabled)
      } else {
        setSmsEnabled(!enabled)
      }
      alert('Failed to update notification preference. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Notification Preferences</CardTitle>
        <CardDescription>Choose how you want to receive your daily snow reports</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-start space-x-3">
          <input
            type="checkbox"
            id="email-notifications"
            checked={emailEnabled}
            onChange={(e) => updatePreference('email', e.target.checked)}
            disabled={loading}
            className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 disabled:opacity-50"
          />
          <div className="flex-1">
            <Label
              htmlFor="email-notifications"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              📧 Email Notifications
            </Label>
            <p className="text-sm text-gray-500 mt-1">
              Receive beautifully formatted daily snow reports via email
            </p>
          </div>
        </div>

        <div className="flex items-start space-x-3">
          <input
            type="checkbox"
            id="sms-notifications"
            checked={smsEnabled}
            onChange={(e) => updatePreference('sms', e.target.checked)}
            disabled={loading || !phoneVerified}
            className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 disabled:opacity-50"
          />
          <div className="flex-1">
            <Label
              htmlFor="sms-notifications"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              📱 SMS Notifications
            </Label>
            <p className="text-sm text-gray-500 mt-1">
              {phoneVerified
                ? 'Receive concise daily snow reports via text message'
                : 'Verify your phone number to enable SMS notifications'}
            </p>
            {!phoneVerified && (
              <p className="text-xs text-yellow-600 mt-1">⚠️ Phone verification required</p>
            )}
          </div>
        </div>

        {!emailEnabled && !smsEnabled && (
          <div className="rounded-md bg-yellow-50 border border-yellow-200 p-3">
            <p className="text-sm text-yellow-800">
              ⚠️ You have no notification methods enabled. You won't receive any snow reports.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
