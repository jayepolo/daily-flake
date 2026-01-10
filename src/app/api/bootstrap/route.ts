import { NextResponse } from 'next/server'
import { startScheduler, isSchedulerRunning } from '@/jobs/scheduler'

/**
 * Bootstrap API - Initializes the scheduler on server start
 * This should be called once when the app starts up
 */
export async function GET() {
  try {
    if (isSchedulerRunning()) {
      return NextResponse.json({
        message: 'Scheduler already running',
        status: 'running',
      })
    }

    startScheduler()

    return NextResponse.json({
      message: 'Scheduler started successfully',
      status: 'started',
    })
  } catch (error) {
    console.error('[Bootstrap] Error starting scheduler:', error)
    return NextResponse.json(
      {
        error: 'Failed to start scheduler',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}
