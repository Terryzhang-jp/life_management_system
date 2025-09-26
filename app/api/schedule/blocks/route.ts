import { NextRequest, NextResponse } from 'next/server'
import {
  createScheduleBlock,
  updateScheduleBlock,
  deleteScheduleBlock,
  getScheduleBlockById,
  ScheduleBlock
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
    const body = await request.json() as ScheduleBlock

    // Allow overlapping time blocks - no conflict checking
    const newBlock = createScheduleBlock(body)
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
    const newStatus = body.status ?? existingBlock.status
    const statusChanged = body.status !== undefined && body.status !== existingBlock.status

    // Allow overlapping time blocks - no conflict checking
    updateScheduleBlock(blockId, body)

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
