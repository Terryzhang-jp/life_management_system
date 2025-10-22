import { NextRequest, NextResponse } from 'next/server'
import {
  getAllLabels,
  createLabel,
  updateLabel,
  deleteLabel,
  type KeepLabel
} from '@/lib/keep-db'

/**
 * GET /api/keep/labels
 * 获取所有标签
 */
export async function GET() {
  try {
    const labels = getAllLabels()
    return NextResponse.json(labels)
  } catch (error) {
    console.error('获取标签失败:', error)
    return NextResponse.json(
      { error: '获取标签失败' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/keep/labels
 * 创建新标签
 * Body: { name, color }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, color } = body

    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: '标签名称不能为空' },
        { status: 400 }
      )
    }

    const labelData: Omit<KeepLabel, 'id' | 'createdAt'> = {
      name: name.trim(),
      color: color || '#e8eaed'
    }

    const labelId = createLabel(labelData)
    return NextResponse.json({ id: labelId, success: true })
  } catch (error) {
    console.error('创建标签失败:', error)
    // 检查是否是唯一性约束错误
    if (error instanceof Error && error.message.includes('UNIQUE')) {
      return NextResponse.json(
        { error: '标签名称已存在' },
        { status: 409 }
      )
    }
    return NextResponse.json(
      { error: '创建标签失败' },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/keep/labels
 * 更新标签
 * Body: { id, name?, color? }
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, name, color } = body

    if (!id) {
      return NextResponse.json(
        { error: '标签ID不能为空' },
        { status: 400 }
      )
    }

    const updates: Partial<KeepLabel> = {}
    if (name !== undefined) updates.name = name
    if (color !== undefined) updates.color = color

    updateLabel(id, updates)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('更新标签失败:', error)
    if (error instanceof Error && error.message.includes('UNIQUE')) {
      return NextResponse.json(
        { error: '标签名称已存在' },
        { status: 409 }
      )
    }
    return NextResponse.json(
      { error: '更新标签失败' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/keep/labels?id=<id>
 * 删除标签（级联删除关联关系）
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { error: '标签ID不能为空' },
        { status: 400 }
      )
    }

    deleteLabel(parseInt(id))
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('删除标签失败:', error)
    return NextResponse.json(
      { error: '删除标签失败' },
      { status: 500 }
    )
  }
}
