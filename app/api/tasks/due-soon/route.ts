import { NextRequest, NextResponse } from 'next/server'
import { getTasksDueSoon } from '@/lib/tasks-db'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const days = parseInt(searchParams.get('days') || '2')

    const dueTasks = getTasksDueSoon(days)
    return NextResponse.json(dueTasks)
  } catch (error) {
    console.error('Error fetching due soon tasks:', error)
    return NextResponse.json({ error: 'Failed to fetch due soon tasks' }, { status: 500 })
  }
}