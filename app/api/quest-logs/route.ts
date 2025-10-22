import { NextRequest, NextResponse } from 'next/server'
import questLogsDbManager from '@/lib/quest-logs-db'

// GET - 获取Quest Logs (支持milestoneId和日期范围查询)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const milestoneId = searchParams.get('milestoneId')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    if (!milestoneId) {
      return NextResponse.json(
        { error: 'Milestone ID is required' },
        { status: 400 }
      )
    }

    // 如果指定了日期范围
    if (startDate && endDate) {
      const logs = await questLogsDbManager.getLogsByDateRange(
        parseInt(milestoneId),
        startDate,
        endDate
      )
      return NextResponse.json(logs)
    }

    // 否则获取所有logs
    const logs = await questLogsDbManager.getLogsByMilestone(parseInt(milestoneId))
    return NextResponse.json(logs)
  } catch (error) {
    console.error('Failed to get quest logs:', error)
    return NextResponse.json(
      { error: 'Failed to get quest logs' },
      { status: 500 }
    )
  }
}

// POST - 创建Quest Log
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { milestoneId, date, timeSpent, inputDescription, outputDescription, evidenceFiles } = body

    if (!milestoneId) {
      return NextResponse.json(
        { error: 'Milestone ID is required' },
        { status: 400 }
      )
    }

    if (!date) {
      return NextResponse.json(
        { error: 'Date is required' },
        { status: 400 }
      )
    }

    if (timeSpent === undefined || timeSpent < 0) {
      return NextResponse.json(
        { error: 'Time spent is required and must be >= 0' },
        { status: 400 }
      )
    }

    if (!inputDescription?.trim()) {
      return NextResponse.json(
        { error: 'Input description is required' },
        { status: 400 }
      )
    }

    const id = await questLogsDbManager.addLog({
      milestoneId: parseInt(milestoneId),
      date,
      timeSpent,
      inputDescription: inputDescription.trim(),
      outputDescription: outputDescription?.trim(),
      evidenceFiles
    })

    return NextResponse.json({
      success: true,
      id,
      message: 'Quest log created successfully'
    })

  } catch (error) {
    console.error('Failed to create quest log:', error)
    return NextResponse.json(
      { error: 'Failed to create quest log' },
      { status: 500 }
    )
  }
}

// PUT - 更新Quest Log
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, date, timeSpent, inputDescription, outputDescription, evidenceFiles } = body

    if (!id) {
      return NextResponse.json(
        { error: 'Log ID is required' },
        { status: 400 }
      )
    }

    await questLogsDbManager.updateLog(id, {
      date,
      timeSpent,
      inputDescription,
      outputDescription,
      evidenceFiles
    })

    return NextResponse.json({
      success: true,
      message: 'Quest log updated successfully'
    })

  } catch (error) {
    console.error('Failed to update quest log:', error)
    return NextResponse.json(
      { error: 'Failed to update quest log' },
      { status: 500 }
    )
  }
}

// DELETE - 删除Quest Log
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { error: 'Log ID is required' },
        { status: 400 }
      )
    }

    await questLogsDbManager.deleteLog(parseInt(id))

    return NextResponse.json({
      success: true,
      message: 'Quest log deleted successfully'
    })

  } catch (error) {
    console.error('Failed to delete quest log:', error)
    return NextResponse.json(
      { error: 'Failed to delete quest log' },
      { status: 500 }
    )
  }
}
