import { NextRequest, NextResponse } from 'next/server'
import { getScheduleByDate } from '@/lib/schedule-db'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const date = searchParams.get('date')

    if (!date) {
      // Default to today
      const today = new Date().toISOString().split('T')[0]
      const schedule = getScheduleByDate(today)
      return NextResponse.json(schedule)
    }

    const schedule = getScheduleByDate(date)
    return NextResponse.json(schedule)
  } catch (error) {
    console.error('Error fetching day schedule:', error)
    return NextResponse.json({ error: 'Failed to fetch day schedule' }, { status: 500 })
  }
}