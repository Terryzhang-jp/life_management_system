"use client"

import { useState, useRef, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Send, Loader2, X, Bot, User } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { Badge } from "@/components/ui/badge"

interface Message {
  role: 'user' | 'assistant' | 'system'
  content: string
  toolCalls?: ToolCall[]
  toolResults?: ToolResult[]
}

interface ToolCall {
  toolName: string
  args: Record<string, any>
}

interface ToolResult {
  toolName: string
  result: {
    success: boolean
    data?: any
    message?: string
    error?: string
  }
}

interface ScheduleAssistantDrawerProps {
  isOpen: boolean
  onClose: () => void
  onScheduleUpdated?: () => void
  onNextStepChange?: (required: boolean) => void
}

export default function ScheduleAssistantDrawer({ isOpen, onClose, onScheduleUpdated, onNextStepChange }: ScheduleAssistantDrawerProps) {
  const { toast } = useToast()
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [streamingMessage, setStreamingMessage] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // 自动滚动到底部
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages, streamingMessage])

  const buildToolSummary = (toolName: string, args: Record<string, any> | undefined, result: ToolResult['result']) => {
    if (!result) return ''

    if (result.error) {
      return result.error
    }

    if (!result.success && result.message) {
      return result.message
    }

    switch (toolName) {
      case 'query_schedule': {
        const blocks = Array.isArray(result.data) ? [...(result.data as any[])] : []
        const start = args?.startDate
        const end = args?.endDate
        const rangeLabel = start && end
          ? (start === end ? `${start} 的安排：` : `${start} ~ ${end} 的安排：`)
          : '日程查询结果：'

        if (blocks.length === 0) {
          return `${rangeLabel}\n• 暂无安排`
        }

        blocks.sort((a, b) => {
          const keyA = `${a.date ?? ''}${a.startTime ?? ''}`
          const keyB = `${b.date ?? ''}${b.startTime ?? ''}`
          return keyA.localeCompare(keyB)
        })

        const lines = blocks.map(block => {
          const idPart = typeof block.id === 'number' ? `#${block.id} ` : ''
          const datePart = block.date ? `${block.date} ` : ''
          const timePart = block.startTime && block.endTime
            ? `${block.startTime}-${block.endTime} `
            : ''
          const title = block.title || block.taskTitle || '未命名日程'
          return `• ${idPart}${datePart}${timePart}${title}`.trim()
        })

        return `${rangeLabel}\n${lines.join('\n')}`
      }

      case 'create_schedule_block':
      case 'update_schedule_block':
      case 'delete_schedule_block':
        if (result.message) return result.message
        if (result.data && typeof (result.data as any).id === 'number') {
          return `操作已完成（#${(result.data as any).id})`
        }
        return '操作已完成'

      default:
        return result.message || ''
    }
  }

  const handleSend = async () => {
    const userMessage = input.trim()
    if (!userMessage || loading) return

    console.log('[Schedule Assistant] Sending message:', userMessage)

    // 添加用户消息
    const userEntry: Message = {
      role: 'user',
      content: userMessage
    }

    const newMessages: Message[] = [...messages, userEntry]
    setMessages(newMessages)
    setInput('')
    setLoading(true)
    setStreamingMessage('')

    try {
      // 调用流式API
      const response = await fetch('/api/schedule-assistant/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage,
          history: messages
        })
      })

      console.log('[Schedule Assistant] Response status:', response.status)

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to get response')
      }

      // 处理流式响应
      const reader = response.body?.getReader()
      const decoder = new TextDecoder()

      if (!reader) {
        throw new Error('No reader available')
      }

      let assistantMessage = ''
      let messageDelivered = false
      const currentToolCalls: ToolCall[] = []
      const currentToolResults: ToolResult[] = []
      let done = false

      while (!done) {
        const { value, done: readerDone } = await reader.read()
        done = readerDone

        if (value) {
          const chunk = decoder.decode(value)
          const lines = chunk.split('\n')

          for (const line of lines) {
            if (!line.trim() || !line.startsWith('data: ')) continue

            try {
              const data = JSON.parse(line.slice(6))
              console.log('[Schedule Assistant] SSE event:', data.type)

              switch (data.type) {
                case 'content':
                  if (data.content) {
                    assistantMessage += data.content
                    setStreamingMessage(assistantMessage)
                  }
                  if (data.done) {
                    let finalContent = assistantMessage
                    let extractedNextStep: boolean | undefined

                    if (!finalContent.trim() && currentToolResults.length > 0) {
                      const fallback = currentToolResults
                        .map(resultEntry => resultEntry.result?.message || resultEntry.result?.error)
                        .filter(Boolean)
                        .join('\n')

                      finalContent = fallback || finalContent
                    }

                    const markerMatch = finalContent.match(/NEXT_STEP_REQUIRED:\s*(true|false)/i)
                    if (markerMatch) {
                      extractedNextStep = markerMatch[1].toLowerCase() === 'true'
                      finalContent = finalContent.replace(/NEXT_STEP_REQUIRED:\s*(true|false)/i, '').trim()
                    }

                    // 流式内容结束，添加到消息历史
                    const assistantEntry: Message = {
                      role: 'assistant',
                      content: finalContent,
                      toolCalls: currentToolCalls.length > 0 ? currentToolCalls : undefined,
                      toolResults: currentToolResults.length > 0 ? currentToolResults : undefined
                    }
                    setMessages(prev => [...prev, assistantEntry])
                    setStreamingMessage('')
                    messageDelivered = true
                    if (onNextStepChange) {
                      onNextStepChange(extractedNextStep ?? false)
                    }
                  }
                  break

                case 'tool_call':
                  console.log('[Schedule Assistant] Tool call:', data.toolName)
                  currentToolCalls.push({
                    toolName: data.toolName,
                    args: data.args
                  })
                  break

                case 'tool_result': {
                  console.log('[Schedule Assistant] Tool result:', data.toolName, 'success:', data.result?.success)
                  const resultPayload = data.result

                  currentToolResults.push({
                    toolName: data.toolName,
                    result: resultPayload
                  })

                  if (resultPayload) {
                    const latestCall = currentToolCalls.length > 0 ? currentToolCalls[currentToolCalls.length - 1] : undefined
                    const summaryText = buildToolSummary(data.toolName, latestCall?.args, resultPayload)
                    if (summaryText) {
                      const prefix = assistantMessage.trim() ? '\n\n' : ''
                      assistantMessage += `${prefix}${summaryText}`
                      setStreamingMessage(assistantMessage)
                    }
                  }

                  if (
                    resultPayload?.success &&
                    onScheduleUpdated &&
                    ['create_schedule_block', 'update_schedule_block', 'delete_schedule_block'].includes(data.toolName)
                  ) {
                    try {
                      onScheduleUpdated()
                    } catch (callbackError) {
                      console.error('[Schedule Assistant] onScheduleUpdated callback error:', callbackError)
                    }
                  }
                  break
                }

                case 'error':
                  toast({
                    title: "错误",
                    description: data.error || '发生未知错误',
                    variant: "destructive"
                  })
                  break
              }
            } catch (e) {
              console.error('[Schedule Assistant] Failed to parse SSE data:', e)
            }
          }
        }
      }

      if (!messageDelivered) {
        let fallbackContent = assistantMessage
        let extractedNextStep: boolean | undefined

        if (!fallbackContent.trim() && currentToolResults.length > 0) {
          fallbackContent = currentToolResults
            .map(resultEntry => {
              const matchingCall = [...currentToolCalls].reverse().find(call => call.toolName === resultEntry.toolName)
              return buildToolSummary(resultEntry.toolName, matchingCall?.args, resultEntry.result)
            })
            .filter(Boolean)
            .join('\n')
        }

        const markerMatch = fallbackContent.match(/NEXT_STEP_REQUIRED:\s*(true|false)/i)
        if (markerMatch) {
          extractedNextStep = markerMatch[1].toLowerCase() === 'true'
          fallbackContent = fallbackContent.replace(/NEXT_STEP_REQUIRED:\s*(true|false)/i, '').trim()
        }

        if (fallbackContent.trim()) {
          const assistantEntry: Message = {
            role: 'assistant',
            content: fallbackContent,
            toolCalls: currentToolCalls.length > 0 ? currentToolCalls : undefined,
            toolResults: currentToolResults.length > 0 ? currentToolResults : undefined
          }
          setMessages(prev => [...prev, assistantEntry])
          setStreamingMessage('')
          messageDelivered = true
          if (onNextStepChange) {
            onNextStepChange(extractedNextStep ?? false)
          }
        }
      }

      if (!messageDelivered && onNextStepChange) {
        onNextStepChange(false)
      }
    } catch (error: any) {
      console.error('[Schedule Assistant] Error:', error)
      toast({
        title: "错误",
        description: error.message || '发送消息失败',
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const formatToolCall = (toolCall: ToolCall) => {
    const { toolName, args } = toolCall
    const toolNameCn = {
      'query_schedule': '查询日程',
      'query_tasks': '查询任务',
      'query_schedulable_tasks': '查询可调度任务',
      'create_schedule_block': '创建日程块',
      'update_schedule_block': '更新日程块',
      'delete_schedule_block': '删除日程块'
    }[toolName] || toolName

    return (
      <div className="mt-2 p-2 bg-blue-50 rounded text-sm">
        <div className="font-medium text-blue-700">🔧 {toolNameCn}</div>
        <div className="mt-1 text-gray-600">
          {Object.entries(args).map(([key, value]) => (
            <div key={key}>
              <span className="font-medium">{key}:</span> {JSON.stringify(value)}
            </div>
          ))}
        </div>
      </div>
    )
  }

  const formatToolResult = (toolResult: ToolResult) => {
    const { result } = toolResult

    // 安全检查：result 可能是 undefined
    if (!result) {
      return (
        <div className="mt-2 p-2 rounded text-sm bg-gray-50">
          <div className="text-gray-600">工具执行中...</div>
        </div>
      )
    }

    const success = result.success

    return (
      <div className={`mt-2 p-2 rounded text-sm ${success ? 'bg-green-50' : 'bg-red-50'}`}>
        <div className={`font-medium ${success ? 'text-green-700' : 'text-red-700'}`}>
          {success ? '✅ 成功' : '❌ 失败'}
        </div>
        <div className="mt-1 text-gray-600">
          {result.message || result.error || JSON.stringify(result.data)}
        </div>
      </div>
    )
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 pointer-events-none">
      {/* 背景遮罩 */}
      <div
        className="absolute inset-0 bg-black/20 pointer-events-auto"
        onClick={onClose}
      />

      {/* 抽屉主体 */}
      <div className="absolute right-0 top-0 h-full w-1/4 min-w-[400px] bg-white shadow-xl pointer-events-auto flex flex-col">
        {/* 标题栏 */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2">
            <Bot className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-semibold">日程规划助手</h2>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* 消息区域 */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 && (
            <div className="text-center text-gray-500 mt-8">
              <Bot className="w-12 h-12 mx-auto mb-2 text-blue-400" />
              <p>你好！我是你的日程规划助手。</p>
              <p className="text-sm mt-2">你可以问我：</p>
              <ul className="text-sm mt-2 text-left max-w-xs mx-auto space-y-1">
                <li>• 帮我规划下周一到周三</li>
                <li>• 我下周有哪些日程安排？</li>
                <li>• 把任务A安排到明天下午</li>
              </ul>
            </div>
          )}

          {messages.map((msg, idx) => (
            <div key={idx} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`flex gap-2 max-w-[85%] ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                {/* 头像 */}
                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                  msg.role === 'user' ? 'bg-blue-600' : 'bg-gray-300'
                }`}>
                  {msg.role === 'user' ? (
                    <User className="w-5 h-5 text-white" />
                  ) : (
                    <Bot className="w-5 h-5 text-gray-700" />
                  )}
                </div>

                {/* 消息内容 */}
                <div className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                  <div className={`px-4 py-2 rounded-lg ${
                    msg.role === 'user'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-900'
                  }`}>
                    <div className="whitespace-pre-wrap">{msg.content}</div>
                  </div>

                  {/* 工具调用 */}
                  {msg.toolCalls && msg.toolCalls.map((tc, i) => (
                    <div key={i} className="w-full">
                      {formatToolCall(tc)}
                    </div>
                  ))}

                  {/* 工具结果 */}
                  {msg.toolResults && msg.toolResults.map((tr, i) => (
                    <div key={i} className="w-full">
                      {formatToolResult(tr)}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}

          {/* 流式消息 */}
          {streamingMessage && (
            <div className="flex gap-3 justify-start">
              <div className="flex gap-2 max-w-[85%]">
                <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 bg-gray-300">
                  <Bot className="w-5 h-5 text-gray-700" />
                </div>
                <div className="flex flex-col items-start">
                  <div className="px-4 py-2 rounded-lg bg-gray-100 text-gray-900">
                    <div className="whitespace-pre-wrap">{streamingMessage}</div>
                    <span className="inline-block w-2 h-4 bg-gray-400 ml-1 animate-pulse" />
                  </div>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* 输入区域 */}
        <div className="border-t p-4">
          <div className="flex gap-2">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="输入消息... (Shift+Enter 换行)"
              className="flex-1 resize-none"
              rows={2}
              disabled={loading}
            />
            <Button
              onClick={handleSend}
              disabled={loading || !input.trim()}
              size="icon"
              className="h-full"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
