import { NextRequest, NextResponse } from 'next/server'
import tasksDbManager from '@/lib/tasks-db'

// 更新任务的模糊状态
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, isUnclear, unclearReason } = body

    if (!id) {
      return NextResponse.json(
        { error: 'Task ID is required' },
        { status: 400 }
      )
    }

    await tasksDbManager.updateTaskUnclearStatus(id, isUnclear, unclearReason)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error updating task unclear status:', error)
    return NextResponse.json(
      { error: 'Failed to update unclear status' },
      { status: 500 }
    )
  }
}

// 检查任务是否有模糊的子任务
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const taskId = searchParams.get('taskId')

    if (!taskId) {
      return NextResponse.json(
        { error: 'Task ID is required' },
        { status: 400 }
      )
    }

    const hasUnclearChildren = await tasksDbManager.checkHasUnclearChildren(parseInt(taskId))
    return NextResponse.json({ hasUnclearChildren })
  } catch (error) {
    console.error('Error checking unclear children:', error)
    return NextResponse.json(
      { error: 'Failed to check unclear children' },
      { status: 500 }
    )
  }
}