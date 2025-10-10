import { NextRequest, NextResponse } from 'next/server'
import exchangeRateService from '@/lib/exchange-rate-service'

/**
 * GET /api/exchange-rates?from=USD&to=CNY
 *
 * 查询汇率
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const from = searchParams.get('from')
    const to = searchParams.get('to')

    if (!from || !to) {
      return NextResponse.json(
        { error: '缺少参数: from 和 to' },
        { status: 400 }
      )
    }

    // 获取汇率
    const rate = await exchangeRateService.getRate(from.toUpperCase(), to.toUpperCase())

    return NextResponse.json({
      from: from.toUpperCase(),
      to: to.toUpperCase(),
      rate,
      timestamp: Date.now()
    })

  } catch (error) {
    console.error('汇率查询失败:', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : '查询汇率失败'
      },
      { status: 500 }
    )
  }
}
