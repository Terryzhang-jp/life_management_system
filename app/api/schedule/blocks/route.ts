import { NextRequest, NextResponse } from 'next/server'
import {
  createScheduleBlock,
  updateScheduleBlock,
  deleteScheduleBlock,
  ScheduleBlock
} from '@/lib/schedule-db'

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

    const body = await request.json() as Partial<ScheduleBlock>

    // Allow overlapping time blocks - no conflict checking
    updateScheduleBlock(parseInt(id), body)
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