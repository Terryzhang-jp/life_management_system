import { NextResponse } from 'next/server'
import { formatWorkspaceContext, contextToMarkdown } from '@/lib/workspace/context-formatter'

/**
 * GET - 获取工作台上下文数据
 * 返回格式化后的Markdown文本，用于LLM或前端显示
 */
export async function GET() {
  try {
    // 构建完整上下文
    const context = await formatWorkspaceContext()

    // 转换为Markdown
    const markdown = contextToMarkdown(context)

    return NextResponse.json({
      success: true,
      context,
      markdown
    })

  } catch (error: any) {
    console.error('Failed to get workspace context:', error)
    return NextResponse.json(
      {
        error: 'Failed to get workspace context',
        details: error.message
      },
      { status: 500 }
    )
  }
}
