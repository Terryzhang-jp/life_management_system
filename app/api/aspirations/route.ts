import { NextRequest, NextResponse } from 'next/server'
import aspirationsDbManager from '@/lib/aspirations-db'

// GET - 获取所有心愿
export async function GET() {
  try {
    const aspirations = await aspirationsDbManager.getAllAspirations()
    return NextResponse.json(aspirations)
  } catch (error) {
    console.error('Failed to get aspirations:', error)
    return NextResponse.json(
      { error: 'Failed to get aspirations' },
      { status: 500 }
    )
  }
}

// POST - 创建心愿
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { title, description, tags } = body

    if (!title?.trim()) {
      return NextResponse.json(
        { error: 'Title is required' },
        { status: 400 }
      )
    }

    const id = await aspirationsDbManager.addAspiration({
      title: title.trim(),
      description: description?.trim() || '',
      tags: tags || []
    })

    return NextResponse.json({
      success: true,
      id,
      message: 'Aspiration created successfully'
    })

  } catch (error) {
    console.error('Failed to create aspiration:', error)
    return NextResponse.json(
      { error: 'Failed to create aspiration' },
      { status: 500 }
    )
  }
}

// PUT - 更新心愿
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, title, description, tags } = body

    if (!id) {
      return NextResponse.json(
        { error: 'Aspiration ID is required' },
        { status: 400 }
      )
    }

    await aspirationsDbManager.updateAspiration(id, {
      title,
      description,
      tags
    })

    return NextResponse.json({
      success: true,
      message: 'Aspiration updated successfully'
    })

  } catch (error) {
    console.error('Failed to update aspiration:', error)
    return NextResponse.json(
      { error: 'Failed to update aspiration' },
      { status: 500 }
    )
  }
}

// DELETE - 删除心愿
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { error: 'Aspiration ID is required' },
        { status: 400 }
      )
    }

    await aspirationsDbManager.deleteAspiration(parseInt(id))

    return NextResponse.json({
      success: true,
      message: 'Aspiration deleted successfully'
    })

  } catch (error) {
    console.error('Failed to delete aspiration:', error)
    return NextResponse.json(
      { error: 'Failed to delete aspiration' },
      { status: 500 }
    )
  }
}
