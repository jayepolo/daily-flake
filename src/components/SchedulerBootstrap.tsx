'use client'

import { useEffect } from 'react'

/**
 * Client component that bootstraps the scheduler on app start
 * Only runs in production
 */
export function SchedulerBootstrap() {
  useEffect(() => {
    // Only run in production
    if (process.env.NODE_ENV === 'production') {
      fetch('/api/bootstrap')
        .then((res) => res.json())
        .then((data) => {
          console.log('[SchedulerBootstrap]', data.message)
        })
        .catch((err) => {
          console.error('[SchedulerBootstrap] Failed to start scheduler:', err)
        })
    }
  }, [])

  return null
}
