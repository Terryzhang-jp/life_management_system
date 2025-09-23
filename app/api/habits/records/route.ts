import { NextRequest, NextResponse } from 'next/server'
import habitsDbManager from '@/lib/habits-db'

// GET - 获取习惯记录
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const routineId = searchParams.get('routineId')
    const type = searchParams.get('type') // 'today' | 'heatmap' | 'range'

    if (type === 'today') {
      // 获取今日记录
      const records = await habitsDbManager.getTodayRecords()
      return NextResponse.json(records)
    }


    // 获取指定范围的记录
    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: 'startDate and endDate are required' },
        { status: 400 }
      )
    }

    const records = await habitsDbManager.getRecords(
      startDate,
      endDate,
      routineId ? parseInt(routineId) : undefined
    )

    return NextResponse.json(records)

  } catch (error) {
    console.error('Failed to get habit records:', error)
    return NextResponse.json(
      { error: 'Failed to get habit records' },
      { status: 500 }
    )
  }
}

// POST - 创建打卡记录
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { routineId, recordDate, description, photoPath } = body

    // 验证必需字段
    if (!routineId || !recordDate) {
      return NextResponse.json(
        { error: 'routineId and recordDate are required' },
        { status: 400 }
      )
    }

    // 验证日期格式
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/
    if (!dateRegex.test(recordDate)) {
      return NextResponse.json(
        { error: 'recordDate must be in YYYY-MM-DD format' },
        { status: 400 }
      )
    }

    // 验证routineId是否为数字
    if (isNaN(parseInt(routineId))) {
      return NextResponse.json(
        { error: 'routineId must be a valid number' },
        { status: 400 }
      )
    }

    const recordId = await habitsDbManager.addRecord({
      routineId: parseInt(routineId),
      recordDate,
      description,
      photoPath
    })

    return NextResponse.json({
      success: true,
      id: recordId,
      message: 'Habit record created successfully'
    })

  } catch (error) {
    console.error('Failed to create habit record:', error)
    return NextResponse.json(
      { error: 'Failed to create habit record' },
      { status: 500 }
    )
  }
}

// DELETE - 删除打卡记录
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { error: 'Record ID is required' },
        { status: 400 }
      )
    }

    if (isNaN(parseInt(id))) {
      return NextResponse.json(
        { error: 'Record ID must be a valid number' },
        { status: 400 }
      )
    }

    await habitsDbManager.deleteRecord(parseInt(id))

    return NextResponse.json({
      success: true,
      message: 'Habit record deleted successfully'
    })

  } catch (error) {
    console.error('Failed to delete habit record:', error)
    return NextResponse.json(
      { error: 'Failed to delete habit record' },
      { status: 500 }
    )
  }
}