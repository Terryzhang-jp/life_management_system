import { NextRequest, NextResponse } from 'next/server'
import thoughtsDbManager from '@/lib/thoughts-db'

export async function GET() {
  try {
    const thoughts = await thoughtsDbManager.getAllThoughts()
    return NextResponse.json(thoughts)
  } catch (error) {
    console.error('Error fetching thoughts:', error)
    return NextResponse.json(
      { error: 'Failed to fetch thoughts' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { content, page } = body

    if (!content || !content.trim()) {
      return NextResponse.json(
        { error: 'Content is required' },
        { status: 400 }
      )
    }

    const id = await thoughtsDbManager.addThought(content, page)
    return NextResponse.json({ id })
  } catch (error) {
    console.error('Error adding thought:', error)
    return NextResponse.json(
      { error: 'Failed to add thought' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, content } = body

    if (!id || !content || !content.trim()) {
      return NextResponse.json(
        { error: 'ID and content are required' },
        { status: 400 }
      )
    }

    await thoughtsDbManager.updateThought(id, content)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error updating thought:', error)
    return NextResponse.json(
      { error: 'Failed to update thought' },
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
        { error: 'ID is required' },
        { status: 400 }
      )
    }

    await thoughtsDbManager.deleteThought(parseInt(id))
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting thought:', error)
    return NextResponse.json(
      { error: 'Failed to delete thought' },
      { status: 500 }
    )
  }
}