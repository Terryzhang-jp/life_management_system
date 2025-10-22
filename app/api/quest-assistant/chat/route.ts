import { NextRequest } from 'next/server'
import { QUEST_AGENT_PROMPT } from '@/lib/quest/system-prompt'
import OpenAI from 'openai'
import {
  get_visions,
  get_quests_by_vision,
  create_quest,
  get_milestones,
  create_milestone,
  get_checkpoints,
  create_checkpoint
} from '@/lib/quest/tools'

function encodeSse(data: any, encoder: TextEncoder) {
  return encoder.encode(`data: ${JSON.stringify(data)}\n\n`)
}

// OpenAI Function Definitions（手动构建schema，确保包含type: "object"）
const openai_functions: OpenAI.Chat.Completions.ChatCompletionTool[] = [
  {
    type: 'function',
    function: {
      name: 'get_visions',
      description: '获取所有可用的Visions（愿景）列表。Vision是Quest的上层目标，代表用户的长期愿景。',
      parameters: {
        type: 'object',
        properties: {},
        required: []
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_quests_by_vision',
      description: '获取指定Vision下的所有Quests。用于了解用户在某个愿景下已经有哪些Quest。',
      parameters: {
        type: 'object',
        properties: {
          visionId: {
            type: 'number',
            description: 'Vision的ID'
          }
        },
        required: ['visionId']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'create_quest',
      description: '创建一个新的Quest。Quest必须关联到一个Vision，并明确说明为什么要做这个Quest（why）。Quest分为main（主线）和side（支线）两种类型。',
      parameters: {
        type: 'object',
        properties: {
          visionId: {
            type: 'number',
            description: '关联的Vision ID'
          },
          type: {
            type: 'string',
            enum: ['main', 'side'],
            description: 'Quest类型：main=主线Quest，side=支线Quest'
          },
          title: {
            type: 'string',
            description: 'Quest标题，简洁明确，例如"在HCI顶会发表论文"'
          },
          why: {
            type: 'string',
            description: '为什么要做这个Quest？对Vision有什么贡献？必须说明动机和意义'
          }
        },
        required: ['visionId', 'type', 'title', 'why']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_milestones',
      description: '获取指定Quest的所有Milestones。Milestone是Quest的里程碑，有current/next/future/completed四种状态。',
      parameters: {
        type: 'object',
        properties: {
          questId: {
            type: 'number',
            description: 'Quest的ID'
          }
        },
        required: ['questId']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'create_milestone',
      description: `创建一个新的Milestone（里程碑）。Milestone必须符合SMART原则：
- Specific（具体）：明确的标题和完成标准
- Measurable（可衡量）：有清晰的产出或完成标志
- Achievable（可实现）：时间和资源合理
- Relevant（相关）：与Quest目标相关
- Time-bound（有时限）：有预期完成时间

创建时需要明确说明完成标准(completionCriteria)和为什么这个Milestone重要(why)。`,
      parameters: {
        type: 'object',
        properties: {
          questId: {
            type: 'number',
            description: '关联的Quest ID'
          },
          title: {
            type: 'string',
            description: 'Milestone标题，例如"完成文献综述"'
          },
          completionCriteria: {
            type: 'string',
            description: '完成标准（What）：具体要产出什么？如何判断完成？例如"完成30篇论文阅读和5000字综述文档"'
          },
          why: {
            type: 'string',
            description: '为什么这个Milestone重要？对Quest有什么帮助？'
          },
          status: {
            type: 'string',
            enum: ['current', 'next', 'future'],
            description: 'Milestone状态：current=当前正在做，next=下一个要做，future=未来计划'
          }
        },
        required: ['questId', 'title', 'completionCriteria']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_checkpoints',
      description: '获取指定Milestone的所有Checkpoints。Checkpoint是Milestone的具体执行任务。',
      parameters: {
        type: 'object',
        properties: {
          milestoneId: {
            type: 'number',
            description: 'Milestone的ID'
          }
        },
        required: ['milestoneId']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'create_checkpoint',
      description: '为Milestone创建一个Checkpoint（检查点/子任务）。Checkpoint是Milestone的具体执行步骤，应该是可操作的、明确的小任务。',
      parameters: {
        type: 'object',
        properties: {
          milestoneId: {
            type: 'number',
            description: '关联的Milestone ID'
          },
          title: {
            type: 'string',
            description: 'Checkpoint标题，简洁明确，例如"搜集30篇论文"'
          },
          description: {
            type: 'string',
            description: 'Checkpoint的详细描述，说明具体如何执行'
          }
        },
        required: ['milestoneId', 'title']
      }
    }
  }
]

/**
 * POST - Quest AI Agent 流式聊天API
 * 接收用户消息，返回流式响应
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { message, history } = body

    console.log('[Quest Agent] New message:', message)
    console.log('[Quest Agent] History length:', history?.length || 0)

    if (!message || typeof message !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Message is required' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      )
    }

    // 构建消息历史
    const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
      {
        role: 'system',
        content: QUEST_AGENT_PROMPT
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

    console.log('[Quest Agent] Initializing OpenAI client...')

    // 从环境变量获取 API Key
    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      console.error('[Quest Agent] OpenAI API Key not found')
      return new Response(
        JSON.stringify({ error: 'API Key not configured' }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        }
      )
    }

    const client = new OpenAI({ apiKey })

    const stream = new ReadableStream({
      async start(controller) {
        const send = (payload: any) => {
          controller.enqueue(encodeSse(payload, encoder))
        }

        let assistantText = ''
        let conversationMessages = [...messages] // 复制消息列表用于多轮对话

        try {
          console.log('[Quest Agent] Starting OpenAI stream...')

          // 循环处理多轮function calling
          let continueLoop = true
          let maxIterations = 5 // 防止无限循环

          while (continueLoop && maxIterations > 0) {
            maxIterations--

            // 调用OpenAI streaming API with function calling
            const completion = await client.chat.completions.create({
              model: 'gpt-4o-mini',
              messages: conversationMessages,
              temperature: 0.1,
              max_tokens: 2048,
              tools: openai_functions,
              tool_choice: 'auto',
              stream: true
            })

            let functionCalls: Array<{ id: string; name: string; arguments: string }> = []
            let currentAssistantMessage = ''
            let finishReason: string | null = null

            for await (const chunk of completion) {
              const delta = chunk.choices[0]?.delta
              finishReason = chunk.choices[0]?.finish_reason || finishReason

              if (!delta) continue

              // 处理文本内容
              if (delta.content) {
                currentAssistantMessage += delta.content
                assistantText += delta.content
                send({ type: 'content', content: delta.content, done: false })
              }

              // 处理function call
              if (delta.tool_calls && delta.tool_calls.length > 0) {
                delta.tool_calls.forEach(toolCall => {
                  if (!toolCall.function) return

                  const callId = toolCall.id || 'default'
                  let existingCall = functionCalls.find(c => c.id === callId)

                  if (!existingCall && toolCall.function.name) {
                    // 新的function call
                    existingCall = {
                      id: callId,
                      name: toolCall.function.name,
                      arguments: toolCall.function.arguments || ''
                    }
                    functionCalls.push(existingCall)
                  } else if (existingCall && toolCall.function.arguments) {
                    // 累加arguments
                    existingCall.arguments += toolCall.function.arguments
                  }
                })
              }
            }

            // 处理完成的function calls
            if (finishReason === 'tool_calls' && functionCalls.length > 0) {
              console.log('[Quest Agent] Processing', functionCalls.length, 'tool calls')

              // 添加assistant消息到对话历史
              conversationMessages.push({
                role: 'assistant',
                content: currentAssistantMessage || null,
                tool_calls: functionCalls.map(fc => ({
                  id: fc.id,
                  type: 'function' as const,
                  function: {
                    name: fc.name,
                    arguments: fc.arguments
                  }
                }))
              })

              // 执行所有tool calls
              for (const fc of functionCalls) {
                console.log('[Quest Agent] Tool call:', fc.name)
                console.log('[Quest Agent] Tool arguments:', fc.arguments)

                let parsedArgs
                try {
                  parsedArgs = fc.arguments ? JSON.parse(fc.arguments) : {}
                } catch (parseError: any) {
                  console.error('[Quest Agent] Failed to parse arguments:', fc.arguments)
                  send({
                    type: 'tool_result',
                    toolName: fc.name,
                    result: { success: false, error: 'Failed to parse function arguments' }
                  })
                  continue
                }

                send({
                  type: 'tool_call',
                  toolName: fc.name,
                  args: parsedArgs
                })

                // 执行对应的工具函数
                let toolResult
                try {
                  const args = parsedArgs

                  switch (fc.name) {
                    case 'get_visions':
                      toolResult = await get_visions.execute(args)
                      break
                    case 'get_quests_by_vision':
                      toolResult = await get_quests_by_vision.execute(args)
                      break
                    case 'create_quest':
                      toolResult = await create_quest.execute(args)
                      break
                    case 'get_milestones':
                      toolResult = await get_milestones.execute(args)
                      break
                    case 'create_milestone':
                      toolResult = await create_milestone.execute(args)
                      break
                    case 'get_checkpoints':
                      toolResult = await get_checkpoints.execute(args)
                      break
                    case 'create_checkpoint':
                      toolResult = await create_checkpoint.execute(args)
                      break
                    default:
                      toolResult = { success: false, error: 'Unknown tool' }
                  }

                  console.log('[Quest Agent] Tool result:', fc.name, toolResult)

                  send({
                    type: 'tool_result',
                    toolName: fc.name,
                    result: toolResult
                  })

                  // 添加tool结果到对话历史
                  conversationMessages.push({
                    role: 'tool',
                    tool_call_id: fc.id,
                    content: JSON.stringify(toolResult)
                  })

                } catch (execError: any) {
                  console.error('[Quest Agent] Tool execution error:', execError)
                  const errorResult = { success: false, error: execError.message }

                  send({
                    type: 'tool_result',
                    toolName: fc.name,
                    result: errorResult
                  })

                  conversationMessages.push({
                    role: 'tool',
                    tool_call_id: fc.id,
                    content: JSON.stringify(errorResult)
                  })
                }
              }

              // 继续下一轮，让AI处理tool结果
              functionCalls = []
            } else {
              // 没有更多function calls，结束循环
              continueLoop = false
            }
          }

          console.log('[Quest Agent] Stream completed')
          console.log('[Quest Agent] Assistant text length:', assistantText.length)

          send({ type: 'content', content: '', done: true })
          controller.close()

        } catch (error: any) {
          console.error('[Quest Agent] Stream processing error:', error)
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
    console.error('[Quest Agent] API error:', error)
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
