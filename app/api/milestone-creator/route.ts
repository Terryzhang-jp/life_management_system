import { NextRequest, NextResponse } from 'next/server'
import { MILESTONE_CREATOR_SYSTEM_PROMPT } from '@/lib/quest/milestone-creator-prompt'
import OpenAI from 'openai'

/**
 * Milestone Creator API
 * 智能自适应的milestone创建系统
 *
 * 使用gpt-4o-mini-2024-07-18模型（最新最智能的mini版本）
 */

interface Message {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { message, history, context } = body

    console.log('[Milestone Creator] New message:', message)
    console.log('[Milestone Creator] Context:', context)

    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      )
    }

    // 检查API Key
    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { error: 'API Key not configured' },
        { status: 500 }
      )
    }

    const client = new OpenAI({ apiKey })

    // 构建消息历史
    const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
      {
        role: 'system',
        content: MILESTONE_CREATOR_SYSTEM_PROMPT
      }
    ]

    // 如果有context，添加到system message
    if (context && Object.keys(context).length > 0) {
      messages.push({
        role: 'system',
        content: `当前已收集的信息：\n${JSON.stringify(context, null, 2)}\n\n基于这些信息，决定下一个问题或生成milestone。`
      })
    }

    // 添加历史对话（最近10轮）
    if (history && Array.isArray(history)) {
      const recentHistory = history.slice(-20)  // 最近10轮 = 20条消息
      recentHistory.forEach((msg: Message) => {
        if (msg.role === 'user' || msg.role === 'assistant') {
          messages.push({
            role: msg.role,
            content: msg.content
          })
        }
      })
    }

    // 添加当前用户消息
    messages.push({
      role: 'user',
      content: message
    })

    console.log('[Milestone Creator] Calling OpenAI with', messages.length, 'messages')

    // 调用OpenAI API
    const completion = await client.chat.completions.create({
      model: 'gpt-5-mini-2025-08-07',  // 使用GPT-5 mini模型
      messages,
      // GPT-5 mini只支持temperature=1（默认值），不支持自定义
      max_completion_tokens: 3000,  // GPT-5使用max_completion_tokens而非max_tokens
      response_format: { type: 'json_object' }  // 强制JSON输出
    })

    const responseContent = completion.choices[0]?.message?.content

    if (!responseContent) {
      throw new Error('No response from OpenAI')
    }

    console.log('[Milestone Creator] Response length:', responseContent.length)

    // 解析JSON响应
    let parsedResponse
    try {
      parsedResponse = JSON.parse(responseContent)
    } catch (parseError) {
      console.error('[Milestone Creator] Failed to parse JSON:', responseContent)
      throw new Error('Invalid JSON response from AI')
    }

    // 返回结构化响应
    return NextResponse.json({
      success: true,
      response: parsedResponse,
      usage: {
        prompt_tokens: completion.usage?.prompt_tokens,
        completion_tokens: completion.usage?.completion_tokens,
        total_tokens: completion.usage?.total_tokens
      }
    })

  } catch (error: any) {
    console.error('[Milestone Creator] Error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to process request'
      },
      { status: 500 }
    )
  }
}
