import { NextRequest, NextResponse } from 'next/server'
import tasksDbManager from '@/lib/tasks-db'

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
    return NextResponse.json(subTasks)
  } catch (error) {
    console.error('Error fetching subtasks:', error)
    return NextResponse.json(
      { error: 'Failed to fetch subtasks' },
      { status: 500 }
    )
  }
}