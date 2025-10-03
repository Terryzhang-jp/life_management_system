import { NextRequest, NextResponse } from 'next/server'
import { updateTasksOrder } from '@/lib/tasks-db'

/**
 * POST /api/tasks/reorder
 * 批量更新任务排序
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { taskOrders } = body

    if (!Array.isArray(taskOrders)) {
      return NextResponse.json(
        { error: 'taskOrders must be an array' },
        { status: 400 }
      )
    }

    // 验证数据格式
    for (const item of taskOrders) {
      if (typeof item.id !== 'number' || typeof item.sortOrder !== 'number') {
        return NextResponse.json(
          { error: 'Each item must have id (number) and sortOrder (number)' },
          { status: 400 }
        )
      }
    }

    await updateTasksOrder(taskOrders)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error updating tasks order:', error)
    return NextResponse.json(
      { error: 'Failed to update tasks order' },
      { status: 500 }
    )
  }
}
