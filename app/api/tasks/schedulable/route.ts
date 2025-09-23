import { NextResponse } from 'next/server'
import { getAllSchedulableTasks } from '@/lib/tasks-db'

export async function GET() {
  try {
    const tasks = getAllSchedulableTasks()
    return NextResponse.json(tasks)
  } catch (error) {
    console.error('Error fetching schedulable tasks:', error)
    return NextResponse.json({ error: 'Failed to fetch schedulable tasks' }, { status: 500 })
  }
}