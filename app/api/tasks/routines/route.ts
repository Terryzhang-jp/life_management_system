import { NextResponse } from 'next/server'
import { getSchedulableRoutines } from '@/lib/tasks-db'

export async function GET() {
  try {
    const routines = getSchedulableRoutines()
    return NextResponse.json(routines)
  } catch (error) {
    console.error('Error fetching schedulable routines:', error)
    return NextResponse.json({ error: 'Failed to fetch schedulable routines' }, { status: 500 })
  }
}