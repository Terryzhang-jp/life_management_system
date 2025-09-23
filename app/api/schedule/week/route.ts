import { NextRequest, NextResponse } from 'next/server'
import { getWeekSchedule } from '@/lib/schedule-db'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const weekStart = searchParams.get('start')

    if (!weekStart) {
      // Default to current week's Monday
      const today = new Date()
      const day = today.getDay()
      const diff = today.getDate() - day + (day === 0 ? -6 : 1)
      const monday = new Date(today.setDate(diff))
      const defaultWeekStart = monday.toISOString().split('T')[0]

      const schedule = getWeekSchedule(defaultWeekStart)
      return NextResponse.json(schedule)
    }

    const schedule = getWeekSchedule(weekStart)
    return NextResponse.json(schedule)
  } catch (error) {
    console.error('Error fetching week schedule:', error)
    return NextResponse.json({ error: 'Failed to fetch week schedule' }, { status: 500 })
  }
}