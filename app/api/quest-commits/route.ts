import { NextRequest, NextResponse } from 'next/server'
import { questCommitsDb } from '@/lib/quest-commits-db'

/**
 * GET - 获取 Quest 的 commits
 * Query params:
 *   - questId: number (required)
 *   - startDate?: string (YYYY-MM-DD)
 *   - endDate?: string (YYYY-MM-DD)
 *   - limit?: number
 *   - offset?: number
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const questId = searchParams.get('questId')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const limit = searchParams.get('limit')
    const offset = searchParams.get('offset')

    if (!questId) {
      return NextResponse.json(
        { success: false, error: 'questId is required' },
        { status: 400 }
      )
    }

    let commits

    if (startDate && endDate) {
      commits = questCommitsDb.getByDateRange(Number(questId), startDate, endDate)
    } else {
      commits = questCommitsDb.getByQuestId(Number(questId), {
        limit: limit ? Number(limit) : undefined,
        offset: offset ? Number(offset) : undefined
      })
    }

    return NextResponse.json({
      success: true,
      commits
    })

  } catch (error: any) {
    console.error('GET /api/quest-commits error:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}

/**
 * POST - 创建新的 commit
 * Body:
 *   - questId: number
 *   - milestoneId?: number
 *   - commitDate: string (YYYY-MM-DD)
 *   - content: string
 *   - attachments?: string (JSON array)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { questId, milestoneId, commitDate, content, attachments } = body

    if (!questId || !commitDate || !content) {
      return NextResponse.json(
        { success: false, error: 'questId, commitDate, and content are required' },
        { status: 400 }
      )
    }

    const commit = questCommitsDb.create({
      questId,
      milestoneId: milestoneId || null,
      commitDate,
      content,
      attachments: attachments || null
    })

    return NextResponse.json({
      success: true,
      commit
    })

  } catch (error: any) {
    console.error('POST /api/quest-commits error:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}

/**
 * PUT - 更新 commit
 * Body:
 *   - id: number
 *   - content?: string
 *   - attachments?: string
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, ...updates } = body

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'id is required' },
        { status: 400 }
      )
    }

    const success = questCommitsDb.update(id, updates)

    if (!success) {
      return NextResponse.json(
        { success: false, error: 'Commit not found' },
        { status: 404 }
      )
    }

    const commit = questCommitsDb.getById(id)

    return NextResponse.json({
      success: true,
      commit
    })

  } catch (error: any) {
    console.error('PUT /api/quest-commits error:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}

/**
 * DELETE - 删除 commit
 * Query params:
 *   - id: number
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'id is required' },
        { status: 400 }
      )
    }

    const success = questCommitsDb.delete(Number(id))

    if (!success) {
      return NextResponse.json(
        { success: false, error: 'Commit not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true
    })

  } catch (error: any) {
    console.error('DELETE /api/quest-commits error:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}
