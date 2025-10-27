/**
 * Agent Chat API Endpoint
 *
 * POST /api/agent/chat
 * 接收用户消息，调用 Intelligent Agent，返回响应
 */

import { NextRequest, NextResponse } from 'next/server'
import { invokeIntelligentAgent } from '@/lib/agent/intelligent-agent-engine'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { message, threadId } = body

    // 验证消息
    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: '消息不能为空' },
        { status: 400 }
      )
    }

    // 调用 Intelligent Agent
    const result = await invokeIntelligentAgent(
      message.trim(),
      threadId || 'default'
    )

    // 返回成功响应
    return NextResponse.json({
      success: true,
      reply: result.reply,
      plan: result.plan,
      reflection: result.reflection,
      learnings: result.learnings,
      thoughts: result.thoughts,
      toolCalls: result.toolCalls,
    })
  } catch (error: any) {
    console.error('[Agent API] Error:', error)

    return NextResponse.json(
      {
        success: false,
        error: error.message || '处理请求时发生错误',
      },
      { status: 500 }
    )
  }
}
