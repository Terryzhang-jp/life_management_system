import { NextRequest, NextResponse } from 'next/server'
import questsDbManager from '@/lib/quests-db'

// GET - 获取Quests (支持visionId查询)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const visionId = searchParams.get('visionId')
    const id = searchParams.get('id')

    // 如果指定id，获取单个quest
    if (id) {
      const quest = await questsDbManager.getQuest(parseInt(id))
      return NextResponse.json(quest)
    }

    // 如果指定visionId，获取该vision的quests
    if (visionId) {
      const quests = await questsDbManager.getQuestsByVision(parseInt(visionId))
      return NextResponse.json(quests)
    }

    // 否则获取所有quests
    const quests = await questsDbManager.getAllQuests()
    return NextResponse.json(quests)
  } catch (error) {
    console.error('Failed to get quests:', error)
    return NextResponse.json(
      { error: 'Failed to get quests' },
      { status: 500 }
    )
  }
}

// POST - 创建Quest
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { visionId, type, title, why, status } = body

    if (!visionId) {
      return NextResponse.json(
        { error: 'Vision ID is required' },
        { status: 400 }
      )
    }

    if (!title?.trim()) {
      return NextResponse.json(
        { error: 'Title is required' },
        { status: 400 }
      )
    }

    if (!why?.trim()) {
      return NextResponse.json(
        { error: 'Why is required' },
        { status: 400 }
      )
    }

    const id = await questsDbManager.addQuest({
      visionId: parseInt(visionId),
      type: type || 'main',
      title: title.trim(),
      why: why.trim(),
      status: status || 'active'
    })

    return NextResponse.json({
      success: true,
      id,
      message: 'Quest created successfully'
    })

  } catch (error) {
    console.error('Failed to create quest:', error)
    return NextResponse.json(
      { error: 'Failed to create quest' },
      { status: 500 }
    )
  }
}

// PUT - 更新Quest
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, type, title, why, status } = body

    if (!id) {
      return NextResponse.json(
        { error: 'Quest ID is required' },
        { status: 400 }
      )
    }

    await questsDbManager.updateQuest(id, {
      type,
      title,
      why,
      status
    })

    return NextResponse.json({
      success: true,
      message: 'Quest updated successfully'
    })

  } catch (error) {
    console.error('Failed to update quest:', error)
    return NextResponse.json(
      { error: 'Failed to update quest' },
      { status: 500 }
    )
  }
}

// DELETE - 删除Quest
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { error: 'Quest ID is required' },
        { status: 400 }
      )
    }

    await questsDbManager.deleteQuest(parseInt(id))

    return NextResponse.json({
      success: true,
      message: 'Quest deleted successfully'
    })

  } catch (error) {
    console.error('Failed to delete quest:', error)
    return NextResponse.json(
      { error: 'Failed to delete quest' },
      { status: 500 }
    )
  }
}
