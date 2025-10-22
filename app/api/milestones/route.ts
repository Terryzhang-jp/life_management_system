import { NextRequest, NextResponse } from 'next/server'
import milestonesDbManager from '@/lib/milestones-db'

// GET - 获取Milestones (支持questId和status查询)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const questId = searchParams.get('questId')
    const status = searchParams.get('status')

    if (!questId) {
      return NextResponse.json(
        { error: 'Quest ID is required' },
        { status: 400 }
      )
    }

    // 如果指定status=current，获取当前milestone
    if (status === 'current') {
      const milestone = await milestonesDbManager.getCurrentMilestone(parseInt(questId))
      return NextResponse.json(milestone)
    }

    // 否则获取该quest的所有milestones
    const milestones = await milestonesDbManager.getMilestonesByQuest(parseInt(questId))
    return NextResponse.json(milestones)
  } catch (error) {
    console.error('Failed to get milestones:', error)
    return NextResponse.json(
      { error: 'Failed to get milestones' },
      { status: 500 }
    )
  }
}

// POST - 创建Milestone
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { questId, title, completionCriteria, why, status, orderIndex } = body

    if (!questId) {
      return NextResponse.json(
        { error: 'Quest ID is required' },
        { status: 400 }
      )
    }

    if (!title?.trim()) {
      return NextResponse.json(
        { error: 'Title is required' },
        { status: 400 }
      )
    }

    if (!completionCriteria?.trim()) {
      return NextResponse.json(
        { error: 'Completion criteria is required' },
        { status: 400 }
      )
    }

    const id = await milestonesDbManager.addMilestone({
      questId: parseInt(questId),
      title: title.trim(),
      completionCriteria: completionCriteria.trim(),
      why: why?.trim(),
      status: status || 'future',
      orderIndex
    })

    return NextResponse.json({
      success: true,
      id,
      message: 'Milestone created successfully'
    })

  } catch (error) {
    console.error('Failed to create milestone:', error)
    return NextResponse.json(
      { error: 'Failed to create milestone' },
      { status: 500 }
    )
  }
}

// PUT - 更新Milestone
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, title, completionCriteria, why, status, orderIndex, evidenceFiles, reflection, completedAt } = body

    if (!id) {
      return NextResponse.json(
        { error: 'Milestone ID is required' },
        { status: 400 }
      )
    }

    await milestonesDbManager.updateMilestone(id, {
      title,
      completionCriteria,
      why,
      status,
      orderIndex,
      evidenceFiles,
      reflection,
      completedAt
    })

    return NextResponse.json({
      success: true,
      message: 'Milestone updated successfully'
    })

  } catch (error) {
    console.error('Failed to update milestone:', error)
    return NextResponse.json(
      { error: 'Failed to update milestone' },
      { status: 500 }
    )
  }
}

// DELETE - 删除Milestone
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { error: 'Milestone ID is required' },
        { status: 400 }
      )
    }

    await milestonesDbManager.deleteMilestone(parseInt(id))

    return NextResponse.json({
      success: true,
      message: 'Milestone deleted successfully'
    })

  } catch (error) {
    console.error('Failed to delete milestone:', error)
    return NextResponse.json(
      { error: 'Failed to delete milestone' },
      { status: 500 }
    )
  }
}
