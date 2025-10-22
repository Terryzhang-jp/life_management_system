import { NextRequest, NextResponse } from 'next/server'
import checkpointsDbManager from '@/lib/checkpoints-db'

// GET - 获取Checkpoints (支持milestoneId查询)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const milestoneId = searchParams.get('milestoneId')

    if (!milestoneId) {
      return NextResponse.json(
        { error: 'Milestone ID is required' },
        { status: 400 }
      )
    }

    const checkpoints = await checkpointsDbManager.getCheckpointsByMilestone(parseInt(milestoneId))
    return NextResponse.json(checkpoints)
  } catch (error) {
    console.error('Failed to get checkpoints:', error)
    return NextResponse.json(
      { error: 'Failed to get checkpoints' },
      { status: 500 }
    )
  }
}

// POST - 创建Checkpoint
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { milestoneId, title, description, isCompleted, orderIndex } = body

    if (!milestoneId) {
      return NextResponse.json(
        { error: 'Milestone ID is required' },
        { status: 400 }
      )
    }

    if (!title?.trim()) {
      return NextResponse.json(
        { error: 'Title is required' },
        { status: 400 }
      )
    }

    const id = await checkpointsDbManager.addCheckpoint({
      milestoneId: parseInt(milestoneId),
      title: title.trim(),
      description: description?.trim(),
      isCompleted: isCompleted || false,
      orderIndex
    })

    return NextResponse.json({
      success: true,
      id,
      message: 'Checkpoint created successfully'
    })

  } catch (error) {
    console.error('Failed to create checkpoint:', error)
    return NextResponse.json(
      { error: 'Failed to create checkpoint' },
      { status: 500 }
    )
  }
}

// PUT - 更新Checkpoint
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, title, description, isCompleted, orderIndex } = body

    if (!id) {
      return NextResponse.json(
        { error: 'Checkpoint ID is required' },
        { status: 400 }
      )
    }

    await checkpointsDbManager.updateCheckpoint(id, {
      title,
      description,
      isCompleted,
      orderIndex
    })

    return NextResponse.json({
      success: true,
      message: 'Checkpoint updated successfully'
    })

  } catch (error) {
    console.error('Failed to update checkpoint:', error)
    return NextResponse.json(
      { error: 'Failed to update checkpoint' },
      { status: 500 }
    )
  }
}

// DELETE - 删除Checkpoint
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { error: 'Checkpoint ID is required' },
        { status: 400 }
      )
    }

    await checkpointsDbManager.deleteCheckpoint(parseInt(id))

    return NextResponse.json({
      success: true,
      message: 'Checkpoint deleted successfully'
    })

  } catch (error) {
    console.error('Failed to delete checkpoint:', error)
    return NextResponse.json(
      { error: 'Failed to delete checkpoint' },
      { status: 500 }
    )
  }
}
