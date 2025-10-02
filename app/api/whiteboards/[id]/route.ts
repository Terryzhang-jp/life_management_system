import { NextRequest, NextResponse } from 'next/server'
import whiteboardDbManager from '@/lib/whiteboard-db'

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = parseInt(params.id)
    if (isNaN(id)) {
      return NextResponse.json({ error: 'Invalid whiteboard ID' }, { status: 400 })
    }

    const whiteboard = await whiteboardDbManager.getWhiteboard(id)
    if (!whiteboard) {
      return NextResponse.json({ error: 'Whiteboard not found' }, { status: 404 })
    }

    return NextResponse.json(whiteboard)
  } catch (error) {
    console.error('Error fetching whiteboard:', error)
    return NextResponse.json({ error: 'Failed to fetch whiteboard' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = parseInt(params.id)
    if (isNaN(id)) {
      return NextResponse.json({ error: 'Invalid whiteboard ID' }, { status: 400 })
    }

    const body = await request.json()
    await whiteboardDbManager.updateWhiteboard(id, body)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error updating whiteboard:', error)
    return NextResponse.json({ error: 'Failed to update whiteboard' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = parseInt(params.id)
    if (isNaN(id)) {
      return NextResponse.json({ error: 'Invalid whiteboard ID' }, { status: 400 })
    }

    await whiteboardDbManager.deleteWhiteboard(id)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting whiteboard:', error)
    return NextResponse.json({ error: 'Failed to delete whiteboard' }, { status: 500 })
  }
}