import { NextRequest, NextResponse } from 'next/server'
import {
  getAllNotes,
  createNote,
  updateNote,
  deleteNote,
  togglePin,
  type KeepNote
} from '@/lib/keep-db'

/**
 * GET /api/keep
 * 获取所有笔记（包含标签信息）
 * Query params:
 *   - startDate: YYYY-MM-DD 格式的开始日期（可选）
 *   - endDate: YYYY-MM-DD 格式的结束日期（可选）
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('startDate') || undefined
    const endDate = searchParams.get('endDate') || undefined

    const notes = getAllNotes({
      startDate,
      endDate
    })

    return NextResponse.json(notes)
  } catch (error) {
    console.error('获取笔记失败:', error)
    return NextResponse.json(
      { error: '获取笔记失败' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/keep
 * 创建新笔记
 * Body: { content, color, isPinned, labels? }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { title, content, noteType, checklistItems, color, isPinned, labels } = body

    if (!content || !content.trim()) {
      return NextResponse.json(
        { error: '笔记内容不能为空' },
        { status: 400 }
      )
    }

    const noteData: Omit<KeepNote, 'id' | 'createdAt' | 'updatedAt'> = {
      title: title || undefined,
      content: content.trim(),
      noteType: noteType || 'text',
      checklistItems: checklistItems || undefined,
      color: color || '#ffffff',
      isPinned: isPinned || false,
      labels: labels || []
    }

    const noteId = createNote(noteData)
    return NextResponse.json({ id: noteId, success: true })
  } catch (error) {
    console.error('创建笔记失败:', error)
    return NextResponse.json(
      { error: '创建笔记失败' },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/keep
 * 更新笔记
 * Body: { id, content?, color?, isPinned?, labels? }
 * 特殊操作: { id, action: 'toggle-pin' } - 切换置顶状态
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, action } = body

    if (!id) {
      return NextResponse.json(
        { error: '笔记ID不能为空' },
        { status: 400 }
      )
    }

    // 特殊操作：切换置顶
    if (action === 'toggle-pin') {
      togglePin(id)
      return NextResponse.json({ success: true })
    }

    // 常规更新
    const updates: Partial<KeepNote> = {}
    if (body.title !== undefined) updates.title = body.title
    if (body.content !== undefined) updates.content = body.content
    if (body.noteType !== undefined) updates.noteType = body.noteType
    if (body.checklistItems !== undefined) updates.checklistItems = body.checklistItems
    if (body.color !== undefined) updates.color = body.color
    if (body.isPinned !== undefined) updates.isPinned = body.isPinned
    if (body.labels !== undefined) updates.labels = body.labels

    updateNote(id, updates)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('更新笔记失败:', error)
    return NextResponse.json(
      { error: '更新笔记失败' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/keep?id=<id>
 * 删除笔记
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { error: '笔记ID不能为空' },
        { status: 400 }
      )
    }

    deleteNote(parseInt(id))
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('删除笔记失败:', error)
    return NextResponse.json(
      { error: '删除笔记失败' },
      { status: 500 }
    )
  }
}
