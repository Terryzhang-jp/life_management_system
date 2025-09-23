import { NextRequest, NextResponse } from 'next/server'
import tasksDbManager from '@/lib/tasks-db'
import completedTasksDbManager from '@/lib/completed-tasks-db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const parentId = searchParams.get('parentId')
    const level = searchParams.get('level')

    if (!parentId) {
      return NextResponse.json(
        { error: 'Parent ID is required' },
        { status: 400 }
      )
    }

    const subTasks = await tasksDbManager.getSubTasks(
      parseInt(parentId),
      level ? parseInt(level) : 1
    )

    const taskIds = subTasks.map(task => task.id).filter((id): id is number => Boolean(id))
    const completionMap = completedTasksDbManager.getTasksCompletionStatus(taskIds)

    const subTasksWithCompletion = subTasks.map(task => ({
      ...task,
      completion: task.id ? completionMap.get(task.id) ?? { taskId: task.id, isCompleted: false } : { taskId: 0, isCompleted: false }
    }))

    return NextResponse.json(subTasksWithCompletion)
  } catch (error) {
    console.error('Error fetching subtasks:', error)
    return NextResponse.json(
      { error: 'Failed to fetch subtasks' },
      { status: 500 }
    )
  }
}
