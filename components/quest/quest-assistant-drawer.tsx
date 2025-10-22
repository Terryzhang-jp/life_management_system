"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Send, Loader2, X, Bot, User, Target } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

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

interface QuestAssistantDrawerProps {
  isOpen: boolean
  onClose: () => void
  onQuestCreated?: () => void
}

export default function QuestAssistantDrawer({ isOpen, onClose, onQuestCreated }: QuestAssistantDrawerProps) {
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

  const buildToolSummary = (toolName: string, result: ToolResult['result']) => {
    if (!result) return ''

    if (result.error) {
      return result.error
    }

    // 使用result.message或默认消息
    return result.message || '操作已完成'
  }

  const handleSend = async () => {
    const userMessage = input.trim()
    if (!userMessage || loading) return

    console.log('[Quest Assistant] Sending message:', userMessage)

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
      const response = await fetch('/api/quest-assistant/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage,
          history: messages
        })
      })

      console.log('[Quest Assistant] Response status:', response.status)

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
              console.log('[Quest Assistant] SSE event:', data.type)

              switch (data.type) {
                case 'content':
                  if (data.content) {
                    assistantMessage += data.content
                    setStreamingMessage(assistantMessage)
                  }
                  if (data.done) {
                    let finalContent = assistantMessage

                    if (!finalContent.trim() && currentToolResults.length > 0) {
                      const fallback = currentToolResults
                        .map(resultEntry => resultEntry.result?.message || resultEntry.result?.error)
                        .filter(Boolean)
                        .join('\n')

                      finalContent = fallback || finalContent
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
                  }
                  break

                case 'tool_call':
                  console.log('[Quest Assistant] Tool call:', data.toolName)
                  currentToolCalls.push({
                    toolName: data.toolName,
                    args: data.args
                  })
                  break

                case 'tool_result': {
                  console.log('[Quest Assistant] Tool result:', data.toolName, 'success:', data.result?.success)
                  const resultPayload = data.result

                  currentToolResults.push({
                    toolName: data.toolName,
                    result: resultPayload
                  })

                  if (resultPayload) {
                    const summaryText = buildToolSummary(data.toolName, resultPayload)
                    if (summaryText) {
                      const prefix = assistantMessage.trim() ? '\n\n' : ''
                      assistantMessage += `${prefix}${summaryText}`
                      setStreamingMessage(assistantMessage)
                    }
                  }

                  // 如果创建了Quest/Milestone，刷新数据
                  if (
                    resultPayload?.success &&
                    onQuestCreated &&
                    ['create_quest', 'create_milestone', 'create_checkpoint'].includes(data.toolName)
                  ) {
                    try {
                      onQuestCreated()
                    } catch (callbackError) {
                      console.error('[Quest Assistant] onQuestCreated callback error:', callbackError)
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
              console.error('[Quest Assistant] Failed to parse SSE data:', e)
            }
          }
        }
      }

      if (!messageDelivered) {
        let fallbackContent = assistantMessage

        if (!fallbackContent.trim() && currentToolResults.length > 0) {
          fallbackContent = currentToolResults
            .map(resultEntry => buildToolSummary(resultEntry.toolName, resultEntry.result))
            .filter(Boolean)
            .join('\n')
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
        }
      }
    } catch (error: any) {
      console.error('[Quest Assistant] Error:', error)
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
      'get_visions': '获取愿景',
      'get_quests_by_vision': '获取Quest',
      'create_quest': '创建Quest',
      'get_milestones': '获取Milestones',
      'create_milestone': '创建Milestone',
      'get_checkpoints': '获取Checkpoints',
      'create_checkpoint': '创建Checkpoint'
    }[toolName] || toolName

    return (
      <div className="mt-2 p-2 bg-blue-50 rounded text-sm">
        <div className="font-medium text-blue-700">🔧 {toolNameCn}</div>
        <div className="mt-1 text-gray-600 text-xs">
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
        <div className="mt-1 text-gray-600 text-xs">
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
      <div className="absolute right-0 top-0 h-full w-1/3 min-w-[450px] bg-white shadow-xl pointer-events-auto flex flex-col">
        {/* 标题栏 */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2">
            <Target className="w-5 h-5 text-amber-600" />
            <h2 className="text-lg font-semibold">Quest Assistant</h2>
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
              <Target className="w-12 h-12 mx-auto mb-2 text-amber-400" />
              <p>你好！我是你的Quest规划助手。</p>
              <p className="text-sm mt-2">你可以问我：</p>
              <ul className="text-sm mt-2 text-left max-w-xs mx-auto space-y-1">
                <li>• 我想创建一个Quest</li>
                <li>• 帮我创建一个Milestone</li>
                <li>• 这个Milestone需要哪些Checkpoints？</li>
              </ul>
            </div>
          )}

          {messages.map((msg, idx) => (
            <div key={idx} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`flex gap-2 max-w-[85%] ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                {/* 头像 */}
                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                  msg.role === 'user' ? 'bg-amber-600' : 'bg-gray-300'
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
                      ? 'bg-amber-600 text-white'
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
              className="h-full bg-amber-600 hover:bg-amber-700"
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
