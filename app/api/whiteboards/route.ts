import { NextRequest, NextResponse } from 'next/server'
import whiteboardDbManager from '@/lib/whiteboard-db'

export async function GET() {
  try {
    const whiteboards = await whiteboardDbManager.getAllWhiteboards()
    return NextResponse.json(whiteboards)
  } catch (error) {
    console.error('Error fetching whiteboards:', error)
    return NextResponse.json({ error: 'Failed to fetch whiteboards' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { title } = body

    const id = await whiteboardDbManager.createWhiteboard(title)
    return NextResponse.json({ id }, { status: 201 })
  } catch (error) {
    console.error('Error creating whiteboard:', error)
    return NextResponse.json({ error: 'Failed to create whiteboard' }, { status: 500 })
  }
}