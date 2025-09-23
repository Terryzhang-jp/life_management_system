import { NextRequest, NextResponse } from 'next/server'
import decisionsDbManager from '@/lib/decisions-db'

// GET - 获取决策
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const date = searchParams.get('date')
    const type = searchParams.get('type') // 'today' | 'date' | 'delayed'

    if (type === 'today') {
      // 获取今日决策
      const decisions = await decisionsDbManager.getTodayDecisions()
      return NextResponse.json(decisions)
    }

    if (type === 'delayed') {
      // 获取延期决策
      const decisions = await decisionsDbManager.getDelayedDecisions()
      return NextResponse.json(decisions)
    }

    if (date) {
      // 获取指定日期的决策
      const decisions = await decisionsDbManager.getDecisionsByDate(date)
      return NextResponse.json(decisions)
    }

    // 默认返回今日决策
    const decisions = await decisionsDbManager.getTodayDecisions()
    return NextResponse.json(decisions)

  } catch (error) {
    console.error('Failed to get decisions:', error)
    return NextResponse.json(
      { error: 'Failed to get decisions' },
      { status: 500 }
    )
  }
}

// POST - 创建决策
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { decision, date, status } = body

    // 验证必需字段
    if (!decision || !date) {
      return NextResponse.json(
        { error: 'decision and date are required' },
        { status: 400 }
      )
    }

    // 验证日期格式
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/
    if (!dateRegex.test(date)) {
      return NextResponse.json(
        { error: 'date must be in YYYY-MM-DD format' },
        { status: 400 }
      )
    }

    // 验证状态
    if (status && !['pending', 'completed', 'delayed'].includes(status)) {
      return NextResponse.json(
        { error: 'status must be pending, completed, or delayed' },
        { status: 400 }
      )
    }

    // 检查当天是否已有3个pending/completed决策（不包括delayed）
    const existingDecisions = await decisionsDbManager.getDecisionsByDate(date)
    const activeDecisions = existingDecisions.filter(d => d.status !== 'delayed')
    if (activeDecisions.length >= 3) {
      return NextResponse.json(
        { error: 'Maximum 3 active decisions per day allowed' },
        { status: 400 }
      )
    }

    const decisionId = await decisionsDbManager.addDecision({
      decision: decision.trim(),
      date,
      status: status || 'pending'
    })

    return NextResponse.json({
      success: true,
      id: decisionId,
      message: 'Decision created successfully'
    })

  } catch (error) {
    console.error('Failed to create decision:', error)
    return NextResponse.json(
      { error: 'Failed to create decision' },
      { status: 500 }
    )
  }
}

// PUT - 更新决策
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, decision, status } = body

    if (!id) {
      return NextResponse.json(
        { error: 'id is required' },
        { status: 400 }
      )
    }

    if (isNaN(parseInt(id))) {
      return NextResponse.json(
        { error: 'id must be a valid number' },
        { status: 400 }
      )
    }

    // 验证状态
    if (status && !['pending', 'completed', 'delayed'].includes(status)) {
      return NextResponse.json(
        { error: 'status must be pending, completed, or delayed' },
        { status: 400 }
      )
    }

    // 更新决策内容
    if (decision) {
      await decisionsDbManager.updateDecision(parseInt(id), decision.trim())
    }

    // 更新决策状态
    if (status) {
      await decisionsDbManager.updateDecisionStatus(parseInt(id), status)
    }

    return NextResponse.json({
      success: true,
      message: 'Decision updated successfully'
    })

  } catch (error) {
    console.error('Failed to update decision:', error)
    return NextResponse.json(
      { error: 'Failed to update decision' },
      { status: 500 }
    )
  }
}

// DELETE - 删除决策
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { error: 'Decision ID is required' },
        { status: 400 }
      )
    }

    if (isNaN(parseInt(id))) {
      return NextResponse.json(
        { error: 'Decision ID must be a valid number' },
        { status: 400 }
      )
    }

    await decisionsDbManager.deleteDecision(parseInt(id))

    return NextResponse.json({
      success: true,
      message: 'Decision deleted successfully'
    })

  } catch (error) {
    console.error('Failed to delete decision:', error)
    return NextResponse.json(
      { error: 'Failed to delete decision' },
      { status: 500 }
    )
  }
}