import { NextRequest, NextResponse } from 'next/server'
import tasksDbManager from '@/lib/tasks-db'

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

    const hierarchy = await tasksDbManager.getTaskHierarchy(parseInt(taskId))
    return NextResponse.json(hierarchy)
  } catch (error) {
    console.error('Error fetching task hierarchy:', error)
    return NextResponse.json(
      { error: 'Failed to fetch task hierarchy' },
      { status: 500 }
    )
  }
}