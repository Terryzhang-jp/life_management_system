import { NextRequest } from 'next/server'
import { SCHEDULE_AGENT_PROMPT } from '@/lib/schedule/system-prompt'
import { streamText } from 'ai'
import { google } from '@ai-sdk/google'
import { scheduleTools } from '@/lib/schedule/tools'
import { getLocalDateString } from '@/lib/date-utils'

function encodeSse(data: any, encoder: TextEncoder) {
  return encoder.encode(`data: ${JSON.stringify(data)}\n\n`)
}

/**
 * POST - Schedule AI Agent 流式聊天API
 * 接收用户消息，返回流式响应
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { message, history } = body

    console.log('[Schedule Agent] New message:', message)
    console.log('[Schedule Agent] History length:', history?.length || 0)

    if (!message || typeof message !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Message is required' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      )
    }

    // 计算当前本地日期（默认 Asia/Shanghai）并写入系统上下文
    const today = getLocalDateString()
    const contextualPrompt = `${SCHEDULE_AGENT_PROMPT}\n\n# 当前上下文\n- 今天日期：${today}\n- 默认时区：Asia/Shanghai`

    // 构建消息历史
    const messages: Array<{ role: 'system' | 'user' | 'assistant', content: string }> = [
      {
        role: 'system',
        content: contextualPrompt
      }
    ]

    // 添加历史对话（最近5轮 = 10条消息）
    if (history && Array.isArray(history)) {
      const recentHistory = history.slice(-10)
      recentHistory.forEach((msg: any) => {
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

    const encoder = new TextEncoder()

    console.log('[Schedule Agent] Initializing streamText...')

    let result
    try {
      result = streamText({
        model: google('gemini-2.0-flash-exp'),
        messages,
        temperature: 0.1,
        maxOutputTokens: 2048,
        tools: scheduleTools,
        toolChoice: 'auto'
      })
      console.log('[Schedule Agent] streamText initialized successfully')
    } catch (initError: any) {
      console.error('[Schedule Agent] Failed to initialize streamText:', initError)
      throw new Error(`Failed to initialize AI model: ${initError.message}`)
    }

    const stream = new ReadableStream({
      async start(controller) {
        const send = (payload: any) => {
          controller.enqueue(encodeSse(payload, encoder))
        }

        let assistantText = ''

        try {
          console.log('[Schedule Agent] Starting fullStream iteration')
          let chunkCount = 0
          let hasReceivedData = false

          for await (const part of result.fullStream as AsyncIterable<any>) {
            chunkCount++
            hasReceivedData = true
            console.log(`[Schedule Agent] Stream part #${chunkCount}:`, part.type)

            // 处理错误
            if (part.type === 'error' || part.error) {
              console.error('[Schedule Agent] Stream error:', JSON.stringify(part, null, 2))
            }

            if (part.type === 'finish-step') {
              console.log('[Schedule Agent] Finish-step reason:', part.finishReason)

              if (part.finishReason === 'error') {
                console.error('[Schedule Agent] API error in finish-step')
                send({
                  type: 'error',
                  error: 'AI返回错误，请稍后重试'
                })
              }
            }

            switch (part.type) {
              case 'text-delta': {
                assistantText += part.text
                if (part.text) {
                  send({ type: 'content', content: part.text, done: false })
                }
                break
              }

              case 'tool-call': {
                console.log('[Schedule Agent] Tool call:', part.toolName)

                send({
                  type: 'tool_call',
                  toolName: part.toolName,
                  args: part.input
                })
                break
              }

              case 'tool-result': {
                console.log('[Schedule Agent] Tool result:', part.toolName)
                console.log('[Schedule Agent] Full part:', JSON.stringify(part, null, 2))

                send({
                  type: 'tool_result',
                  toolName: part.toolName,
                  result: part.result ?? part.output
                })
                break
              }

              case 'step-finish': {
                console.log('[Schedule Agent] Step finished')
                break
              }

              case 'finish': {
                console.log('[Schedule Agent] Stream finished')
                console.log('[Schedule Agent] Total usage:', part.totalUsage)
                break
              }

              default:
                break
            }
          }

          console.log('[Schedule Agent] Stream iteration completed')
          console.log('[Schedule Agent] Total chunks:', chunkCount)
          console.log('[Schedule Agent] Assistant text length:', assistantText.length)

          if (!hasReceivedData) {
            console.error('[Schedule Agent] No data received from stream')
            send({ type: 'error', error: 'AI返回空响应，请稍后重试' })
            controller.close()
            return
          }

          if (assistantText.length === 0) {
            console.error('[Schedule Agent] Empty response despite stream parts')
            send({
              type: 'error',
              error: 'AI返回空响应，可能触发速率限制'
            })
            controller.close()
            return
          }

          send({ type: 'content', content: '', done: true })
          controller.close()
        } catch (error: any) {
          console.error('[Schedule Agent] Stream processing error:', error)
          send({ type: 'error', error: error.message ?? 'Unknown error' })
          controller.close()
        }
      }
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
      }
    })

  } catch (error: any) {
    console.error('[Schedule Agent] API error:', error)
    return new Response(
      JSON.stringify({
        error: 'Failed to process chat request',
        details: error.message
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    )
  }
}
