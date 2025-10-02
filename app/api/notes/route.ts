import { NextRequest, NextResponse } from 'next/server'
import notesManager from '@/lib/notes-db'

export async function GET() {
  try {
    const notes = await notesManager.getAllNotes()
    return NextResponse.json(notes)
  } catch (error) {
    console.error('Error fetching notes:', error)
    return NextResponse.json({ error: 'Failed to fetch notes' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { title } = body

    const id = await notesManager.createNote(title)
    return NextResponse.json({ id }, { status: 201 })
  } catch (error) {
    console.error('Error creating note:', error)
    return NextResponse.json({ error: 'Failed to create note' }, { status: 500 })
  }
}