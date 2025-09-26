import { NextRequest, NextResponse } from 'next/server'
import { getPastIncompleteBlocks } from '@/lib/schedule-db'
import { getLocalDateString } from '@/lib/date-utils'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const beforeParam = searchParams.get('before') || undefined
    const limitParam = searchParams.get('limit')
    const daysParam = searchParams.get('days')

    const limit = (() => {
      const parsed = limitParam ? parseInt(limitParam, 10) : NaN
      if (!Number.isFinite(parsed) || parsed <= 0) return 50
      return Math.min(parsed, 200)
    })()

    const beforeDate = beforeParam && beforeParam.trim()
      ? beforeParam.trim()
      : getLocalDateString()

    let sinceDate: string | undefined
    const days = daysParam ? parseInt(daysParam, 10) : NaN
    if (Number.isFinite(days) && days > 0) {
      const anchor = new Date(`${beforeDate}T12:00:00`)
      anchor.setDate(anchor.getDate() - days)
      sinceDate = anchor.toISOString().split('T')[0]
    }

    const blocks = getPastIncompleteBlocks(beforeDate, {
      sinceDate,
      limit
    })

    return NextResponse.json(blocks)
  } catch (error) {
    console.error('Error fetching past incomplete schedule blocks:', error)
    return NextResponse.json(
      { error: 'Failed to fetch past incomplete schedule blocks' },
      { status: 500 }
    )
  }
}
