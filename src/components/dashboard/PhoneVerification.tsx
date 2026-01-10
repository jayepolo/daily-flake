'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

interface Props {
  phoneNumber: string | null
  phoneVerified: boolean
}

export function PhoneVerification({ phoneNumber, phoneVerified }: Props) {
  const [phone, setPhone] = useState(phoneNumber || '')
  const [code, setCode] = useState('')
  const [codeSent, setCodeSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const handleSendCode = async () => {
    setLoading(true)
    setError('')
    setSuccess('')

    try {
      const res = await fetch('/api/phone/send-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber: phone }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to send code')
      }

      setCodeSent(true)
      setSuccess('Verification code sent! Check your phone.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send code')
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyCode = async () => {
    setLoading(true)
    setError('')
    setSuccess('')

    try {
      const res = await fetch('/api/phone/verify-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Invalid code')
      }

      setSuccess('Phone verified! Reloading...')
      setTimeout(() => window.location.reload(), 1500)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Verification failed')
    } finally {
      setLoading(false)
    }
  }

  if (phoneVerified) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Phone Number</CardTitle>
          <CardDescription>Your verified phone number for SMS notifications</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Phone</p>
              <p className="font-medium">{phoneNumber}</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setCodeSent(false)
                setCode('')
              }}
            >
              Change Number
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Verify Your Phone Number</CardTitle>
        <CardDescription>
          We'll send you a verification code via SMS to confirm your number
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!codeSent ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+1 (555) 555-5555"
                disabled={loading}
              />
            </div>
            <Button onClick={handleSendCode} disabled={loading || !phone}>
              {loading ? 'Sending...' : 'Send Verification Code'}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="code">Verification Code</Label>
              <Input
                id="code"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="123456"
                maxLength={6}
                disabled={loading}
              />
              <p className="text-sm text-gray-500">
                Enter the 6-digit code sent to {phone}
              </p>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleVerifyCode} disabled={loading || code.length !== 6}>
                {loading ? 'Verifying...' : 'Verify Code'}
              </Button>
              <Button
                variant="outline"
                onClick={() => setCodeSent(false)}
                disabled={loading}
              >
                Change Number
              </Button>
            </div>
          </div>
        )}

        {error && (
          <div className="rounded-md bg-red-50 p-3">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {success && (
          <div className="rounded-md bg-green-50 p-3">
            <p className="text-sm text-green-800">{success}</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
