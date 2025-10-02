import { NextRequest, NextResponse } from 'next/server'
import tasksDbManager from '@/lib/tasks-db'
import completedTasksDbManager from '@/lib/completed-tasks-db'

export async function GET() {
  try {
    const tasks = await tasksDbManager.getAllTasks()

    // 获取所有任务的ID
    const allTaskIds: number[] = []
    Object.values(tasks).forEach((taskArray: any[]) => {
      taskArray.forEach((task: any) => {
        if (task.id) allTaskIds.push(task.id)
      })
    })

    // 批量查询完成状态
    const completionStatusMap = completedTasksDbManager.getTasksCompletionStatus(allTaskIds)

    // 将完成状态添加到任务中
    const tasksWithCompletion = {
      routines: tasks.routines.map(task => ({
        ...task,
        completion: task.id ? completionStatusMap.get(task.id) : { taskId: 0, isCompleted: false }
      })),
      longTermTasks: tasks.longTermTasks.map(task => ({
        ...task,
        completion: task.id ? completionStatusMap.get(task.id) : { taskId: 0, isCompleted: false }
      })),
      shortTermTasks: tasks.shortTermTasks.map(task => ({
        ...task,
        completion: task.id ? completionStatusMap.get(task.id) : { taskId: 0, isCompleted: false }
      }))
    }

    return NextResponse.json(tasksWithCompletion)
  } catch (error) {
    console.error('Error fetching tasks:', error)
    return NextResponse.json(
      { error: 'Failed to fetch tasks' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const id = await tasksDbManager.addTask(body)
    return NextResponse.json({ id })
  } catch (error) {
    console.error('Error adding task:', error)
    return NextResponse.json(
      { error: 'Failed to add task' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, ...updates } = body
    await tasksDbManager.updateTask(id, updates)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error updating task:', error)
    return NextResponse.json(
      { error: 'Failed to update task' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { error: 'Task ID is required' },
        { status: 400 }
      )
    }

    await tasksDbManager.deleteTask(parseInt(id))
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting task:', error)
    return NextResponse.json(
      { error: 'Failed to delete task' },
      { status: 500 }
    )
  }
}