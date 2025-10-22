import { NextRequest, NextResponse } from 'next/server'
import visionsDbManager from '@/lib/visions-db'

// GET - 获取所有Visions
export async function GET() {
  try {
    const visions = await visionsDbManager.getAllVisions()
    return NextResponse.json(visions)
  } catch (error) {
    console.error('Failed to get visions:', error)
    return NextResponse.json(
      { error: 'Failed to get visions' },
      { status: 500 }
    )
  }
}

// POST - 创建Vision
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { title, description } = body

    if (!title?.trim()) {
      return NextResponse.json(
        { error: 'Title is required' },
        { status: 400 }
      )
    }

    const id = await visionsDbManager.addVision({
      title: title.trim(),
      description: description?.trim() || ''
    })

    return NextResponse.json({
      success: true,
      id,
      message: 'Vision created successfully'
    })

  } catch (error) {
    console.error('Failed to create vision:', error)
    return NextResponse.json(
      { error: 'Failed to create vision' },
      { status: 500 }
    )
  }
}

// PUT - 更新Vision
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, title, description } = body

    if (!id) {
      return NextResponse.json(
        { error: 'Vision ID is required' },
        { status: 400 }
      )
    }

    await visionsDbManager.updateVision(id, {
      title,
      description
    })

    return NextResponse.json({
      success: true,
      message: 'Vision updated successfully'
    })

  } catch (error) {
    console.error('Failed to update vision:', error)
    return NextResponse.json(
      { error: 'Failed to update vision' },
      { status: 500 }
    )
  }
}

// DELETE - 删除Vision
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { error: 'Vision ID is required' },
        { status: 400 }
      )
    }

    await visionsDbManager.deleteVision(parseInt(id))

    return NextResponse.json({
      success: true,
      message: 'Vision deleted successfully'
    })

  } catch (error) {
    console.error('Failed to delete vision:', error)
    return NextResponse.json(
      { error: 'Failed to delete vision' },
      { status: 500 }
    )
  }
}
