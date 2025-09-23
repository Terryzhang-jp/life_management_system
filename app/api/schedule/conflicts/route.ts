import { NextRequest, NextResponse } from 'next/server'
import { checkTimeConflict } from '@/lib/schedule-db'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const date = searchParams.get('date')
    const startTime = searchParams.get('start')
    const endTime = searchParams.get('end')
    const excludeId = searchParams.get('excludeId')

    if (!date || !startTime || !endTime) {
      return NextResponse.json({
        error: 'Date, start time, and end time are required'
      }, { status: 400 })
    }

    const conflicts = checkTimeConflict(
      date,
      startTime,
      endTime,
      excludeId ? parseInt(excludeId) : undefined
    )

    return NextResponse.json(conflicts)
  } catch (error) {
    console.error('Error checking conflicts:', error)
    return NextResponse.json({ error: 'Failed to check conflicts' }, { status: 500 })
  }
}