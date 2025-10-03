import { NextRequest, NextResponse } from 'next/server'
import {
  createScheduleBlock,
  updateScheduleBlock,
  deleteScheduleBlock,
  getScheduleBlockById,
  ScheduleBlock,
  CreateScheduleBlockInput,
  ScheduleBlockType
} from '@/lib/schedule-db'
import tasksDbManager from '@/lib/tasks-db'
import type { Task } from '@/lib/tasks-db'
import completedTasksDbManager from '@/lib/completed-tasks-db'

const COMPLETED_STATUS = 'completed'

const shouldSyncTask = (taskId?: number | null): taskId is number =>
  typeof taskId === 'number' && Number.isFinite(taskId) && taskId > 0

const buildCompletedTaskPayload = (task: Task) => {
  const completedTaskData = {
    taskId: task.id!,
    taskType: task.type,
    taskTitle: task.title,
    taskLevel: task.level ?? 0,
    parentTaskId: task.parentId,
    grandparentTaskId: undefined as number | undefined,
    completionComment: undefined as string | undefined
  }

  if (task.level === 2 && task.parentId) {
    const parentTask = tasksDbManager.getTask(task.parentId)
    if (parentTask && parentTask.parentId) {
      completedTaskData.grandparentTaskId = parentTask.parentId
    }
  }

  return completedTaskData
}

const syncTaskCompletion = (taskId: number) => {
  const task = tasksDbManager.getTask(taskId)
  if (!task) {
    throw new Error(`Task not found for schedule block (taskId=${taskId})`)
  }

  const completionInfo = completedTasksDbManager.isTaskCompleted(taskId)
  if (completionInfo.isCompleted) {
    return
  }

  const payload = buildCompletedTaskPayload(task)
  completedTasksDbManager.completeTask(payload)
}

// Create a new schedule block
export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as Partial<ScheduleBlock>

    if (!body.date || !body.startTime || !body.endTime) {
      return NextResponse.json({ error: 'date, startTime and endTime are required' }, { status: 400 })
    }

    const normalizedTaskId = typeof body.taskId === 'number' && body.taskId > 0 ? body.taskId : undefined
    const blockType: ScheduleBlockType = (body.type as ScheduleBlockType | undefined) ?? (normalizedTaskId ? 'task' : 'event')

    const rawTitle = (body.title ?? body.taskTitle ?? '').trim()

    if (blockType === 'task' && !normalizedTaskId) {
      return NextResponse.json({ error: 'taskId is required when type is task' }, { status: 400 })
    }

    if (!rawTitle && blockType === 'event') {
      return NextResponse.json({ error: 'title is required for event schedules' }, { status: 400 })
    }

    const finalTitle = blockType === 'task'
      ? (body.taskTitle ?? rawTitle ?? '未命名日程')
      : rawTitle

    const payload: CreateScheduleBlockInput = {
      type: blockType,
      title: finalTitle,
      date: body.date,
      startTime: body.startTime,
      endTime: body.endTime,
      comment: body.comment,
      status: body.status,
      taskId: blockType === 'task' ? normalizedTaskId : undefined,
      taskTitle: blockType === 'task' ? (body.taskTitle ?? finalTitle) : undefined,
      parentTitle: blockType === 'task' ? (body.parentTitle ?? undefined) : undefined,
      grandparentTitle: blockType === 'task' ? (body.grandparentTitle ?? undefined) : undefined,
      categoryId: body.categoryId ?? undefined,
      categoryName: body.categoryName ?? undefined,
      categoryColor: body.categoryColor ?? undefined
    }

    // Allow overlapping time blocks - no conflict checking
    const newBlock = createScheduleBlock(payload)
    return NextResponse.json(newBlock, { status: 201 })
  } catch (error) {
    console.error('Error creating schedule block:', error)
    return NextResponse.json({ error: 'Failed to create schedule block' }, { status: 500 })
  }
}

// Update a schedule block
export async function PUT(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Block ID is required' }, { status: 400 })
    }

    const blockId = Number.parseInt(id, 10)
    if (Number.isNaN(blockId)) {
      return NextResponse.json({ error: 'Block ID must be a valid number' }, { status: 400 })
    }

    const existingBlock = getScheduleBlockById(blockId)
    if (!existingBlock) {
      return NextResponse.json({ error: 'Schedule block not found' }, { status: 404 })
    }

    const body = await request.json() as Partial<ScheduleBlock>
    const updates: Partial<ScheduleBlock> = { ...body }

    if (updates.title !== undefined && typeof updates.title === 'string') {
      updates.title = updates.title.trim()
    }

    if (updates.taskId !== undefined) {
      updates.taskId = typeof updates.taskId === 'number' && updates.taskId > 0 ? updates.taskId : null
    }

    if (updates.type === 'event') {
      updates.taskId = null
      if (updates.taskTitle === undefined) {
        updates.taskTitle = null
      }
      if (updates.parentTitle === undefined) {
        updates.parentTitle = null
      }
      if (updates.grandparentTitle === undefined) {
        updates.grandparentTitle = null
      }
    }

    const newStatus = updates.status ?? existingBlock.status
    const statusChanged = updates.status !== undefined && updates.status !== existingBlock.status

    // Allow overlapping time blocks - no conflict checking
    updateScheduleBlock(blockId, updates)

    try {
      if (
        statusChanged &&
        shouldSyncTask(existingBlock.taskId)
      ) {
        const taskId = existingBlock.taskId

        if (newStatus === COMPLETED_STATUS && existingBlock.status !== COMPLETED_STATUS) {
          syncTaskCompletion(taskId)
        } else if (existingBlock.status === COMPLETED_STATUS && newStatus !== COMPLETED_STATUS) {
          const completionInfo = completedTasksDbManager.isTaskCompleted(taskId)
          if (completionInfo.isCompleted) {
            completedTasksDbManager.uncompleteTask(taskId)
          }
        }
      }
    } catch (error) {
      console.error('Failed to synchronize task completion status:', error)
      // Attempt to revert status to previous value for consistency
      if (statusChanged) {
        try {
          updateScheduleBlock(blockId, { status: existingBlock.status })
        } catch (rollbackError) {
          console.error('Failed to rollback schedule block status:', rollbackError)
        }
      }

      return NextResponse.json({ error: 'Failed to synchronize task completion status' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error updating schedule block:', error)
    return NextResponse.json({ error: 'Failed to update schedule block' }, { status: 500 })
  }
}

// Delete a schedule block
export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Block ID is required' }, { status: 400 })
    }

    deleteScheduleBlock(parseInt(id))
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting schedule block:', error)
    return NextResponse.json({ error: 'Failed to delete schedule block' }, { status: 500 })
  }
}
