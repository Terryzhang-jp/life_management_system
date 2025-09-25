import { NextRequest, NextResponse } from 'next/server'
import decisionsDbManager from '@/lib/decisions-db'
import { getLocalDateString } from '@/lib/date-utils'

// POST - 处理每日自动刷新
export async function POST(request: NextRequest) {
  try {
    const today = getLocalDateString()

    // 检查今天是否已经刷新过
    const isRefreshed = await decisionsDbManager.isAlreadyRefreshed(today)
    if (isRefreshed) {
      return NextResponse.json({
        success: true,
        message: 'Already refreshed today',
        processedCount: 0
      })
    }

    // 执行刷新：将昨日及之前的pending决策转为delayed
    const result = await decisionsDbManager.refreshExpiredDecisions(today)

    return NextResponse.json({
      success: true,
      message: `Refreshed successfully, processed ${result.processedCount} decisions`,
      processedCount: result.processedCount
    })

  } catch (error) {
    console.error('Failed to refresh decisions:', error)
    return NextResponse.json(
      { error: 'Failed to refresh decisions' },
      { status: 500 }
    )
  }
}

// GET - 检查是否需要刷新
export async function GET(request: NextRequest) {
  try {
    const today = getLocalDateString()
    const isRefreshed = await decisionsDbManager.isAlreadyRefreshed(today)

    return NextResponse.json({
      needsRefresh: !isRefreshed,
      today,
      isRefreshed
    })

  } catch (error) {
    console.error('Failed to check refresh status:', error)
    return NextResponse.json(
      { error: 'Failed to check refresh status' },
      { status: 500 }
    )
  }
}
