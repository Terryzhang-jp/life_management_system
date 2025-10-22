import { NextRequest, NextResponse } from 'next/server'
import { getScheduledDatesInMonth } from '@/lib/schedule-db'

export interface MonthStatus {
  [date: string]: {
    hasSchedule: boolean
  }
}

// GET: 获取某月的日程和回顾状态
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const year = parseInt(searchParams.get('year') || '')
    const month = parseInt(searchParams.get('month') || '')

    if (!year || !month || month < 1 || month > 12) {
      return NextResponse.json(
        { error: 'Invalid year or month parameter' },
        { status: 400 }
      )
    }

    // 查询日程数据
    const scheduledDates = getScheduledDatesInMonth(year, month)

    // 构建月度状态
    const monthStatus: MonthStatus = {}

    // 添加日程日期
    scheduledDates.forEach(date => {
      if (!monthStatus[date]) {
        monthStatus[date] = { hasSchedule: false }
      }
      monthStatus[date].hasSchedule = true
    })

    return NextResponse.json(monthStatus, { status: 200 })

  } catch (error: any) {
    console.error('Error fetching month status:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch month status' },
      { status: 500 }
    )
  }
}
