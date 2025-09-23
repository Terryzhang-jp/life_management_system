import { NextRequest, NextResponse } from 'next/server'
import completedTasksDbManager from '@/lib/completed-tasks-db'
import tasksDbManager from '@/lib/tasks-db'

// POST - 完成任务
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { taskId, completionComment } = body

    if (!taskId) {
      return NextResponse.json(
        { error: 'Task ID is required' },
        { status: 400 }
      )
    }

    // 获取原任务信息
    const task = tasksDbManager.getTask(taskId)
    if (!task) {
      return NextResponse.json(
        { error: 'Task not found' },
        { status: 404 }
      )
    }

    // 检查是否已经完成
    const completionInfo = completedTasksDbManager.isTaskCompleted(taskId)
    if (completionInfo.isCompleted) {
      return NextResponse.json(
        { error: 'Task is already completed' },
        { status: 409 }
      )
    }

    // 构建完成任务数据
    const completedTaskData = {
      taskId: task.id!,
      taskType: task.type,
      taskTitle: task.title,
      taskLevel: task.level || 0,
      parentTaskId: task.parentId,
      grandparentTaskId: undefined as number | undefined,
      completionComment: completionComment?.trim() || undefined
    }

    // 如果是子子任务，需要找到祖父任务
    if (task.level === 2 && task.parentId) {
      const parentTask = tasksDbManager.getTask(task.parentId)
      if (parentTask && parentTask.parentId) {
        completedTaskData.grandparentTaskId = parentTask.parentId
      }
    }

    // 记录完成
    const completedId = completedTasksDbManager.completeTask(completedTaskData)

    return NextResponse.json({
      success: true,
      id: completedId,
      message: 'Task completed successfully'
    })

  } catch (error) {
    console.error('Failed to complete task:', error)
    return NextResponse.json(
      { error: 'Failed to complete task' },
      { status: 500 }
    )
  }
}

// DELETE - 取消完成任务
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const taskId = searchParams.get('taskId')

    if (!taskId) {
      return NextResponse.json(
        { error: 'Task ID is required' },
        { status: 400 }
      )
    }

    const taskIdNum = parseInt(taskId)
    if (isNaN(taskIdNum)) {
      return NextResponse.json(
        { error: 'Task ID must be a valid number' },
        { status: 400 }
      )
    }

    // 检查任务是否已完成
    const completionInfo = completedTasksDbManager.isTaskCompleted(taskIdNum)
    if (!completionInfo.isCompleted) {
      return NextResponse.json(
        { error: 'Task is not completed' },
        { status: 404 }
      )
    }

    // 取消完成
    const success = completedTasksDbManager.uncompleteTask(taskIdNum)
    if (!success) {
      return NextResponse.json(
        { error: 'Failed to uncomplete task' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Task uncompleted successfully'
    })

  } catch (error) {
    console.error('Failed to uncomplete task:', error)
    return NextResponse.json(
      { error: 'Failed to uncomplete task' },
      { status: 500 }
    )
  }
}

// PUT - 更新完成备注
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { taskId, completionComment } = body

    if (!taskId) {
      return NextResponse.json(
        { error: 'Task ID is required' },
        { status: 400 }
      )
    }

    const taskIdNum = parseInt(taskId)
    if (isNaN(taskIdNum)) {
      return NextResponse.json(
        { error: 'Task ID must be a valid number' },
        { status: 400 }
      )
    }

    // 检查任务是否已完成
    const completionInfo = completedTasksDbManager.isTaskCompleted(taskIdNum)
    if (!completionInfo.isCompleted) {
      return NextResponse.json(
        { error: 'Task is not completed' },
        { status: 404 }
      )
    }

    // 更新备注
    const success = completedTasksDbManager.updateCompletionComment(
      taskIdNum,
      completionComment?.trim() || ''
    )

    if (!success) {
      return NextResponse.json(
        { error: 'Failed to update completion comment' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Completion comment updated successfully'
    })

  } catch (error) {
    console.error('Failed to update completion comment:', error)
    return NextResponse.json(
      { error: 'Failed to update completion comment' },
      { status: 500 }
    )
  }
}

// GET - 获取已完成任务列表和统计
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action') // 'list' | 'stats' | 'status'

    if (action === 'stats') {
      // 获取完成统计
      const taskType = searchParams.get('taskType') || undefined
      const startDate = searchParams.get('startDate') || undefined
      const endDate = searchParams.get('endDate') || undefined

      const stats = completedTasksDbManager.getCompletionStats({
        taskType,
        startDate,
        endDate
      })

      return NextResponse.json(stats)

    } else if (action === 'status') {
      // 批量检查任务完成状态
      const taskIdsParam = searchParams.get('taskIds')
      if (!taskIdsParam) {
        return NextResponse.json(
          { error: 'Task IDs are required' },
          { status: 400 }
        )
      }

      const taskIds = taskIdsParam.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id))
      if (taskIds.length === 0) {
        return NextResponse.json(
          { error: 'Valid task IDs are required' },
          { status: 400 }
        )
      }

      const statusMap = completedTasksDbManager.getTasksCompletionStatus(taskIds)
      const statusArray = Array.from(statusMap.entries()).map(([taskId, info]) => ({
        taskId,
        ...info
      }))

      return NextResponse.json(statusArray)

    } else {
      // 获取已完成任务列表 (默认行为)
      const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined
      const offset = searchParams.get('offset') ? parseInt(searchParams.get('offset')!) : undefined
      const taskType = searchParams.get('taskType') || undefined
      const startDate = searchParams.get('startDate') || undefined
      const endDate = searchParams.get('endDate') || undefined

      const completedTasks = completedTasksDbManager.getCompletedTasks({
        limit,
        offset,
        taskType,
        startDate,
        endDate
      })

      return NextResponse.json(completedTasks)
    }

  } catch (error) {
    console.error('Failed to get completed tasks:', error)
    return NextResponse.json(
      { error: 'Failed to get completed tasks' },
      { status: 500 }
    )
  }
}