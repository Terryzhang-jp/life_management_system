import { NextRequest, NextResponse } from 'next/server'
import dailyLifeLogManager from '@/lib/daily-life-log-db'

/**
 * GET /api/daily-life-log?date=YYYY-MM-DD
 * 获取指定日期的日志
 *
 * GET /api/daily-life-log?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
 * 获取日期范围内的所有日志
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const date = searchParams.get('date')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    // 日期范围查询
    if (startDate && endDate) {
      const logs = dailyLifeLogManager.getAllLogs({
        startDate,
        endDate
      })
      return NextResponse.json({ logs }, { status: 200 })
    }

    // 单个日期查询
    if (date) {
      const log = dailyLifeLogManager.getLogByDate(date)

      if (!log) {
        return NextResponse.json({ exists: false }, { status: 200 })
      }

      return NextResponse.json({ exists: true, log }, { status: 200 })
    }

    return NextResponse.json({ error: 'Date or date range parameters are required' }, { status: 400 })
  } catch (error) {
    console.error('Error fetching daily life log:', error)
    return NextResponse.json({ error: 'Failed to fetch log' }, { status: 500 })
  }
}

/**
 * POST /api/daily-life-log
 * 创建新的日志记录
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { date, rawInput, extractedData, status } = body

    if (!date || !rawInput) {
      return NextResponse.json({ error: 'Date and rawInput are required' }, { status: 400 })
    }

    // 构建日志对象
    const logData = {
      date,
      rawInput,
      status: status || 'draft',
      wakeTime: extractedData?.wakeTime || null,
      plannedSleepTime: extractedData?.plannedSleepTime || null,
      breakfastDescription: extractedData?.breakfastDescription || null,
      lunchDescription: extractedData?.lunchDescription || null,
      dinnerDescription: extractedData?.dinnerDescription || null,
      morningActivity: extractedData?.morningActivity || null,
      morningMood: extractedData?.morningMood || null,
      afternoonActivity: extractedData?.afternoonActivity || null,
      afternoonMood: extractedData?.afternoonMood || null,
      eveningActivity: extractedData?.eveningActivity || null,
      eveningMood: extractedData?.eveningMood || null,
      nightActivity: extractedData?.nightActivity || null,
      nightMood: extractedData?.nightMood || null,
      confusions: extractedData?.confusions || null,
      thoughts: extractedData?.thoughts || null,
      insights: extractedData?.insights || null
    }

    const id = dailyLifeLogManager.createLog(logData)

    return NextResponse.json({ id, success: true }, { status: 201 })
  } catch (error: any) {
    console.error('Error creating daily life log:', error)

    // Handle unique constraint violation (duplicate date)
    if (error.message && error.message.includes('UNIQUE constraint')) {
      return NextResponse.json({
        error: '今天已有记录，请使用更新功能'
      }, { status: 409 })
    }

    return NextResponse.json({ error: 'Failed to create log' }, { status: 500 })
  }
}

/**
 * PUT /api/daily-life-log?date=YYYY-MM-DD
 * 更新日志记录
 */
export async function PUT(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const date = searchParams.get('date')

    if (!date) {
      return NextResponse.json({ error: 'Date parameter is required' }, { status: 400 })
    }

    const body = await request.json()
    const { extractedData, status } = body

    // 构建更新对象
    const updates: any = {}

    if (status !== undefined) {
      updates.status = status
    }

    if (extractedData) {
      if (extractedData.wakeTime !== undefined) updates.wakeTime = extractedData.wakeTime
      if (extractedData.plannedSleepTime !== undefined) updates.plannedSleepTime = extractedData.plannedSleepTime
      if (extractedData.breakfastDescription !== undefined) updates.breakfastDescription = extractedData.breakfastDescription
      if (extractedData.lunchDescription !== undefined) updates.lunchDescription = extractedData.lunchDescription
      if (extractedData.dinnerDescription !== undefined) updates.dinnerDescription = extractedData.dinnerDescription
      if (extractedData.morningActivity !== undefined) updates.morningActivity = extractedData.morningActivity
      if (extractedData.morningMood !== undefined) updates.morningMood = extractedData.morningMood
      if (extractedData.afternoonActivity !== undefined) updates.afternoonActivity = extractedData.afternoonActivity
      if (extractedData.afternoonMood !== undefined) updates.afternoonMood = extractedData.afternoonMood
      if (extractedData.eveningActivity !== undefined) updates.eveningActivity = extractedData.eveningActivity
      if (extractedData.eveningMood !== undefined) updates.eveningMood = extractedData.eveningMood
      if (extractedData.nightActivity !== undefined) updates.nightActivity = extractedData.nightActivity
      if (extractedData.nightMood !== undefined) updates.nightMood = extractedData.nightMood
      if (extractedData.confusions !== undefined) updates.confusions = extractedData.confusions
      if (extractedData.thoughts !== undefined) updates.thoughts = extractedData.thoughts
      if (extractedData.insights !== undefined) updates.insights = extractedData.insights
    }

    dailyLifeLogManager.updateLog(date, updates)

    return NextResponse.json({ success: true }, { status: 200 })
  } catch (error) {
    console.error('Error updating daily life log:', error)
    return NextResponse.json({ error: 'Failed to update log' }, { status: 500 })
  }
}

/**
 * DELETE /api/daily-life-log?date=YYYY-MM-DD
 * 删除日志记录
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const date = searchParams.get('date')

    if (!date) {
      return NextResponse.json({ error: 'Date parameter is required' }, { status: 400 })
    }

    dailyLifeLogManager.deleteLog(date)

    return NextResponse.json({ success: true }, { status: 200 })
  } catch (error) {
    console.error('Error deleting daily life log:', error)
    return NextResponse.json({ error: 'Failed to delete log' }, { status: 500 })
  }
}
