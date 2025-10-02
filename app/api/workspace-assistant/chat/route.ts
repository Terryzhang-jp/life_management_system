import { NextRequest } from 'next/server'
import { contextToMarkdown, formatWorkspaceContext } from '@/lib/workspace/context-formatter'
import { SYSTEM_PROMPT } from '@/lib/workspace/system-prompt'
import { streamText, tool } from 'ai'
import { google } from '@ai-sdk/google'
import { CreateTaskSchema, UpdateTaskSchema } from '@/lib/workspace/task-tools'
import tasksDbManager from '@/lib/tasks-db'
import {
  ConversationState,
  checkExpiry,
  updateFocusTask,
  addRecentTask,
  updateIntent,
  initializeState
} from '@/lib/workspace/conversation-state'
import { extractEntities, resolveTaskName } from '@/lib/workspace/entity-extractor'

type DecisionPayload = {
  state: string
  reasoning: string
  [key: string]: unknown
}

function extractJsonObjects(input: string): string[] {
  const results: string[] = []
  let start = -1
  let depth = 0
  let inString = false
  let escape = false

  for (let i = 0; i < input.length; i++) {
    const char = input[i]

    if (inString) {
      if (escape) {
        escape = false
      } else if (char === '\\') {
        escape = true
      } else if (char === '"') {
        inString = false
      }
      continue
    }

    if (char === '"') {
      inString = true
      continue
    }

    if (char === '{') {
      if (depth === 0) {
        start = i
      }
      depth++
      continue
    }

    if (char === '}') {
      if (depth > 0) {
        depth--
        if (depth === 0 && start !== -1) {
          results.push(input.slice(start, i + 1))
          start = -1
        }
      }
    }
  }

  return results
}

function normalizeSingleQuotesJson(input: string): string | null {
  const trimmed = input.trim()
  if (!trimmed.includes("'")) return null
  if (trimmed.includes('"')) return null
  return trimmed.replace(/'/g, '"')
}

function parseJsonSafely<T>(input: string): T | null {
  try {
    return JSON.parse(input) as T
  } catch {
    const normalized = normalizeSingleQuotesJson(input)
    if (!normalized) return null
    try {
      return JSON.parse(normalized) as T
    } catch {
      return null
    }
  }
}

function resolveDecision(candidate: any): DecisionPayload | null {
  if (!candidate || typeof candidate !== 'object') return null

  if (typeof candidate.state === 'string' && typeof candidate.reasoning === 'string') {
    return candidate as DecisionPayload
  }

  if (candidate.decision) {
    return resolveDecision(candidate.decision)
  }

  return null
}

function parseDecision(content: string): DecisionPayload | null {
  const decisionMatch = content.match(/```decision\s*\n([\s\S]*?)\n```/)
  if (decisionMatch) {
    const parsed = parseJsonSafely<DecisionPayload | { decision: DecisionPayload }>(decisionMatch[1])
    const resolved = resolveDecision(parsed)
    if (resolved) return resolved
  }

  const jsonBlocks = extractJsonObjects(content)
  for (const block of jsonBlocks) {
    const parsed = parseJsonSafely<DecisionPayload | { decision: DecisionPayload }>(block)
    const resolved = resolveDecision(parsed)
    if (resolved) return resolved
  }

  return null
}

function parseToolCall(content: string): { toolName: string; args: any } | null {
  const toolCallMatch = content.match(/```tool-call\s*\n([\s\S]*?)\n```/)
  if (!toolCallMatch) return null

  const parsed = parseJsonSafely<any>(toolCallMatch[1])
  if (!parsed || typeof parsed !== 'object') return null

  if (parsed.toolName && parsed.args) {
    return { toolName: parsed.toolName, args: parsed.args }
  }

  return null
}

function encodeSse(data: any, encoder: TextEncoder) {
  return encoder.encode(`data: ${JSON.stringify(data)}\n\n`)
}

function parseToolInput(rawInput: unknown): Record<string, any> {
  if (!rawInput) return {}
  if (typeof rawInput === 'object') return rawInput as Record<string, any>
  if (typeof rawInput === 'string') {
    try {
      return JSON.parse(rawInput)
    } catch {
      return {}
    }
  }
  return {}
}

function extractLastTaskId(messages: Array<{ role: string; content: string }>): number | null {
  const taskIdRegex = /(ID[:：#]\s*|任务ID[:：#\s]*)(\d+)/gi

  for (let i = messages.length - 1; i >= 0; i--) {
    const content = messages[i]?.content
    if (!content) continue

    let match: RegExpExecArray | null
    while ((match = taskIdRegex.exec(content)) !== null) {
      const value = Number(match[2])
      if (!Number.isNaN(value)) {
        return value
      }
    }
  }

  return null
}

/**
 * 构建上下文提示（基于对话状态）
 */
function buildContextPrompt(state: ConversationState): string {
  let context = ''

  // 如果有焦点任务
  if (state.focusTask) {
    context += `【当前上下文】用户正在操作任务："${state.focusTask.title}"（ID:${state.focusTask.id}，${state.focusTask.type}类型，层级${state.focusTask.level}）\n`
  }

  // 最近提到的任务
  if (state.recentTasks && state.recentTasks.length > 0) {
    const taskNames = state.recentTasks.map(t => `"${t.title}"(ID:${t.id})`).join('、')
    context += `【最近提到】${taskNames}\n`
  }

  // 上次操作意图
  if (state.lastIntent) {
    const intentNames: Record<string, string> = {
      'create': '创建任务',
      'update': '更新任务',
      'query': '查询任务',
      'delete': '删除任务'
    }
    context += `【上次操作】${intentNames[state.lastIntent]}\n`
  }

  return context.trim()
}

async function enrichToolCallArgs(
  toolName: string,
  rawArgs: Record<string, any>,
  options: {
    combinedHistory: Array<{ role: string; content: string }>
  }
): Promise<Record<string, any>> {
  const args = { ...rawArgs }

  if (toolName !== 'create_task') {
    return args
  }

  const parentIdValue = args.parentId
  let parentId = typeof parentIdValue === 'number' ? parentIdValue : undefined

  if (!parentId && (args.level === 'sub' || args.level === 'subsub' || !args.level)) {
    const inferredId = extractLastTaskId(options.combinedHistory)
    if (typeof inferredId === 'number') {
      parentId = inferredId
    }
  }

  if (parentId != null) {
    args.parentId = parentId

    const parentTask = tasksDbManager.getTask(parentId)
    if (parentTask) {
      if (!args.type) {
        args.type = parentTask.type
      }

      if (!args.level) {
        if ((parentTask.level ?? 0) <= 0) {
          args.level = 'sub'
        } else {
          args.level = 'subsub'
        }
      }
    }
  }

  if (!args.level) {
    args.level = 'main'
  }

  if (args.level === 'main') {
    delete args.parentId
  }

  return args
}

/**
 * POST - 流式聊天API
 * 接收用户消息，返回流式响应
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { message, history, enableEdit = false, state: clientState } = body

    console.log('[Chat API] enableEdit:', enableEdit, 'message:', message)

    if (!message || typeof message !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Message is required' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      )
    }

    // 初始化或恢复对话状态
    let conversationState: ConversationState = clientState || initializeState()

    // 检查状态过期
    conversationState = checkExpiry(conversationState)

    // 快速提取实体（正则）
    const extractedEntity = extractEntities(message, conversationState)
    console.log('Extracted entity:', extractedEntity)

    // 1. 获取工作台上下文
    const context = await formatWorkspaceContext()
    const contextMarkdown = contextToMarkdown(context)

    // 2. 构建消息历史
    const messages: Array<{ role: 'system' | 'user' | 'assistant', content: string }> = [
      {
        role: 'system',
        content: SYSTEM_PROMPT
      },
      {
        role: 'system',
        content: `以下是用户的完整任务上下文数据：\n\n${contextMarkdown}`
      }
    ]

    // 注入对话状态上下文（如果有）
    const stateContext = buildContextPrompt(conversationState)
    if (stateContext) {
      messages.push({
        role: 'system',
        content: stateContext
      })
    }

    // 添加历史对话（滑动窗口：最近3轮）
    if (history && Array.isArray(history)) {
      const recentHistory = history.slice(-6)  // 3轮 = 6条消息（user+assistant）
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

    // 3. API Key
    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY

    const encoder = new TextEncoder()
    const combinedHistory = [...(history ?? []), { role: 'user', content: message }]

    const tools = enableEdit
      ? {
          create_task: tool({
            description: '创建新的任务',
            inputSchema: CreateTaskSchema  // AI SDK 5.0 使用 inputSchema
          }),
          update_task: tool({
            description: '更新已存在的任务',
            inputSchema: UpdateTaskSchema
          })
        }
      : undefined

    console.log('[DEBUG] Initializing streamText...')
    console.log('[DEBUG] API Key available:', !!process.env.GEMINI_API_KEY || !!process.env.GOOGLE_GENERATIVE_AI_API_KEY)
    console.log('[DEBUG] enableEdit:', enableEdit)
    console.log('[DEBUG] Message count:', messages.length)

    let result
    try {
      result = streamText({
        model: google('gemini-2.0-flash-exp'),  // 换成 Gemini 2.0 Flash
        messages,
        temperature: 0.1,  // 降低温度确保格式稳定
        maxOutputTokens: 2048,  // AI SDK 5.0 使用 maxOutputTokens
        tools,
        toolChoice: enableEdit ? 'auto' : 'none'
      })
      console.log('[DEBUG] streamText initialized successfully')
    } catch (initError: any) {
      console.error('[ERROR] Failed to initialize streamText:', initError)
      throw new Error(`Failed to initialize AI model: ${initError.message}`)
    }

    const stream = new ReadableStream({
      async start(controller) {
        const send = (payload: any) => {
          controller.enqueue(encodeSse(payload, encoder))
        }

        let assistantText = ''
        const partialToolInputs = new Map<
          string,
          {
            toolName: string
            text: string
          }
        >()

        try {
          console.log('[DEBUG] Starting fullStream iteration')
          let chunkCount = 0
          let hasReceivedData = false

          for await (const part of result.fullStream as AsyncIterable<any>) {
            chunkCount++
            hasReceivedData = true
            console.log(`[DEBUG] Stream part #${chunkCount}:`, part.type, 'Keys:', Object.keys(part))

            // Log any error or finish_reason
            if (part.type === 'error' || part.error) {
              console.error('[ERROR] Stream error part:', JSON.stringify(part, null, 2))
            }
            if (part.type === 'finish-step') {
              console.log('[DEBUG] Finish-step reason:', part.finishReason)

              // 捕获错误信息
              if (part.finishReason === 'error') {
                console.error('[ERROR] Gemini API returned error in finish-step')
                console.error('[ERROR] Full part:', JSON.stringify(part, null, 2))

                // 尝试从response中提取错误信息
                if (part.response) {
                  console.error('[ERROR] Response:', JSON.stringify(part.response, null, 2))
                }

                // 发送错误到前端
                send({
                  type: 'error',
                  error: 'Gemini API返回错误。请检查您的prompt或稍后重试。'
                })
              }
            }
            if (part.type === 'finish') {
              console.log('[DEBUG] Finish reason:', part.finishReason)
              console.log('[DEBUG] Total usage:', part.totalUsage)
            }

            switch (part.type) {
              case 'text-delta': {
                assistantText += part.text
                if (part.text) {
                  send({ type: 'content', content: part.text, done: false })
                }
                break
              }
              case 'tool-input-start': {
                partialToolInputs.set(part.toolCallId, {
                  toolName: part.toolName,
                  text: ''
                })
                break
              }
              case 'tool-input-delta': {
                const target = partialToolInputs.get(part.toolCallId)
                if (target) {
                  target.text += part.inputTextDelta ?? ''
                }
                break
              }
              case 'tool-call': {
                // AI SDK 5.0 原生 tool calling
                if (!enableEdit) break

                console.log('[DEBUG] tool-call event:', part.toolName, 'input:', part.input)

                const rawInput = part.input ?? {}
                const parsedArgs = parseToolInput(rawInput)
                const enrichedArgs = await enrichToolCallArgs(part.toolName, parsedArgs, {
                  combinedHistory
                })

                send({
                  type: 'tool_calls',
                  toolCalls: [
                    {
                      toolName: part.toolName,
                      args: enrichedArgs
                    }
                  ]
                })

                break
              }
              case 'tool-input-available': {
                if (!enableEdit) break

                const pending = partialToolInputs.get(part.toolCallId)
                const rawInput = part.input ?? pending?.text ?? {}
                const parsedArgs = parseToolInput(rawInput)
                const enrichedArgs = await enrichToolCallArgs(part.toolName, parsedArgs, {
                  combinedHistory
                })

                partialToolInputs.delete(part.toolCallId)

                send({
                  type: 'tool_calls',
                  toolCalls: [
                    {
                      toolName: part.toolName,
                      args: enrichedArgs
                    }
                  ]
                })

                break
              }
              case 'tool-input-error': {
                send({
                  type: 'decision_error',
                  message: '助手提供的工具参数不完整，请补充信息后重试。'
                })
                break
              }
              default:
                break
            }
          }

          console.log('[DEBUG] Stream iteration completed')
          console.log('[DEBUG] Total chunks received:', chunkCount)
          console.log('[DEBUG] Received any data:', hasReceivedData)
          console.log('[DEBUG] Assistant text length:', assistantText.length)

          if (!hasReceivedData) {
            console.error('[ERROR] No data received from stream!')
            send({ type: 'error', error: 'LLM返回空响应。可能是API速率限制或配额已用完。请稍后重试。' })
            controller.close()
            return
          }

          if (assistantText.length === 0) {
            console.error('[ERROR] Assistant text is empty despite receiving stream parts')
            console.error('[ERROR] This usually indicates Gemini API rate limiting')
            send({
              type: 'error',
              error: 'Gemini API返回空响应。可能触发了速率限制，请等待几秒后重试。'
            })
            controller.close()
            return
          }

          const decision = parseDecision(assistantText)
          if (decision) {
            console.log('Decision:', decision)
            send({ type: 'decision', decision })
          }

          // 解析并发送tool-call（如果有）
          const toolCall = parseToolCall(assistantText)
          console.log('[DEBUG] Full assistant response:', assistantText)
          console.log('[DEBUG] Parsed tool call:', toolCall)
          console.log('[DEBUG] enableEdit:', enableEdit)

          if (toolCall && enableEdit) {
            console.log('Tool call parsed:', toolCall)

            // Enrich tool call arguments
            const enrichedArgs = await enrichToolCallArgs(toolCall.toolName, toolCall.args, {
              combinedHistory
            })

            send({
              type: 'tool_calls',
              toolCalls: [{
                toolName: toolCall.toolName,
                args: enrichedArgs
              }]
            })
          }

          // 发送状态更新
          send({ type: 'state_update', state: conversationState })

          send({ type: 'content', content: '', done: true })
          controller.close()
        } catch (error: any) {
          console.error('[ERROR] Stream processing error:', error)
          console.error('[ERROR] Error stack:', error.stack)
          console.error('[ERROR] Error details:', JSON.stringify(error, Object.getOwnPropertyNames(error)))
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
    console.error('Chat API error:', error)
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
