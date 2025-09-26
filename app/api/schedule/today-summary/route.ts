import { NextRequest, NextResponse } from 'next/server'
import { getDailyScheduleSummary } from '@/lib/schedule-db'
import { getLocalDateString } from '@/lib/date-utils'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const dateParam = searchParams.get('date')
    const date = dateParam && /\d{4}-\d{2}-\d{2}/.test(dateParam)
      ? dateParam
      : getLocalDateString()

    const summary = getDailyScheduleSummary(date)
    return NextResponse.json(summary)
  } catch (error) {
    console.error('Error fetching daily schedule summary:', error)
    return NextResponse.json(
      { error: 'Failed to fetch daily schedule summary' },
      { status: 500 }
    )
  }
}
