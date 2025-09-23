import { NextRequest, NextResponse } from 'next/server'
import concernsDbManager from '@/lib/concerns-db'

// GET - 获取纠结记录
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') // 'active' | 'history' | 'stats'
    const limit = searchParams.get('limit')

    if (type === 'active') {
      // 获取未解决的纠结（最多3条）
      const concerns = concernsDbManager.getActiveConcerns()
      return NextResponse.json(concerns)
    }

    if (type === 'history') {
      // 获取历史记录
      const concerns = concernsDbManager.getResolvedConcerns(limit ? parseInt(limit) : 50)
      return NextResponse.json(concerns)
    }

    if (type === 'stats') {
      // 获取统计信息
      const stats = concernsDbManager.getStats()
      return NextResponse.json(stats)
    }

    // 默认返回未解决的纠结
    const concerns = concernsDbManager.getActiveConcerns()
    return NextResponse.json(concerns)

  } catch (error) {
    console.error('Failed to get concerns:', error)
    return NextResponse.json(
      { error: 'Failed to get concerns' },
      { status: 500 }
    )
  }
}

// POST - 创建新纠结
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { concern } = body

    // 验证必需字段
    if (!concern || !concern.trim()) {
      return NextResponse.json(
        { error: 'Concern content is required' },
        { status: 400 }
      )
    }

    // 检查是否已达到3条限制
    if (concernsDbManager.hasReachedLimit()) {
      return NextResponse.json(
        { error: '最多只能有3条未解决的纠结' },
        { status: 400 }
      )
    }

    const concernId = concernsDbManager.addConcern(concern.trim())

    return NextResponse.json({
      success: true,
      id: concernId,
      message: 'Concern created successfully'
    })

  } catch (error) {
    console.error('Failed to create concern:', error)
    return NextResponse.json(
      { error: 'Failed to create concern' },
      { status: 500 }
    )
  }
}

// PUT - 更新纠结
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, concern, action } = body

    if (!id) {
      return NextResponse.json(
        { error: 'ID is required' },
        { status: 400 }
      )
    }

    if (isNaN(parseInt(id))) {
      return NextResponse.json(
        { error: 'ID must be a valid number' },
        { status: 400 }
      )
    }

    // 根据action执行不同操作
    if (action === 'resolve') {
      // 标记为已解决
      concernsDbManager.resolveConcern(parseInt(id))
      return NextResponse.json({
        success: true,
        message: 'Concern resolved successfully'
      })
    }

    if (action === 'unresolve') {
      // 恢复为未解决
      // 先检查是否会超过3条限制
      if (concernsDbManager.hasReachedLimit()) {
        return NextResponse.json(
          { error: '最多只能有3条未解决的纠结' },
          { status: 400 }
        )
      }
      concernsDbManager.unresolveConcern(parseInt(id))
      return NextResponse.json({
        success: true,
        message: 'Concern unresolved successfully'
      })
    }

    // 更新纠结内容
    if (concern && concern.trim()) {
      concernsDbManager.updateConcern(parseInt(id), concern.trim())
      return NextResponse.json({
        success: true,
        message: 'Concern updated successfully'
      })
    }

    return NextResponse.json(
      { error: 'Invalid action or missing concern content' },
      { status: 400 }
    )

  } catch (error) {
    console.error('Failed to update concern:', error)
    return NextResponse.json(
      { error: 'Failed to update concern' },
      { status: 500 }
    )
  }
}

// DELETE - 删除纠结
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { error: 'Concern ID is required' },
        { status: 400 }
      )
    }

    if (isNaN(parseInt(id))) {
      return NextResponse.json(
        { error: 'Concern ID must be a valid number' },
        { status: 400 }
      )
    }

    concernsDbManager.deleteConcern(parseInt(id))

    return NextResponse.json({
      success: true,
      message: 'Concern deleted successfully'
    })

  } catch (error) {
    console.error('Failed to delete concern:', error)
    return NextResponse.json(
      { error: 'Failed to delete concern' },
      { status: 500 }
    )
  }
}