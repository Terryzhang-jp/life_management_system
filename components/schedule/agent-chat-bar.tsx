'use client'

/**
 * Agent Chat Bar - 底部固定的 Agent 聊天组件
 *
 * 类似 LangGraph 文档中的 "Ask a question" 组件
 * 使用优化后的 Intelligent Agent API (/api/agent/chat)
 */

import { useState, useRef, useEffect } from 'react'
import { Send, Loader2, ChevronDown, ChevronUp, X, Bot } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'

interface Message {
  role: 'user' | 'assistant'
  content: string
  plan?: {
    goal: string
    steps: Array<{
      description: string
      status: 'pending' | 'in_progress' | 'completed' | 'failed'
    }>
  }
  toolCalls?: Array<{
    name: string
    args: any
    result?: string
  }>
}

interface AgentChatBarProps {
  onScheduleUpdated?: () => void
}

export function AgentChatBar({ onScheduleUpdated }: AgentChatBarProps) {
  const { toast } = useToast()
  const [isExpanded, setIsExpanded] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // 自动滚动到最新消息
  useEffect(() => {
    if (isExpanded) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, isExpanded])

  // 自动聚焦输入框
  useEffect(() => {
    if (isExpanded && textareaRef.current) {
      textareaRef.current.focus()
    }
  }, [isExpanded])

  const handleSend = async () => {
    if (!input.trim() || loading) return

    const userMessage = input.trim()
    setInput('')

    // 添加用户消息
    const newUserMessage: Message = { role: 'user', content: userMessage }
    setMessages(prev => [...prev, newUserMessage])
    setLoading(true)

    try {
      const response = await fetch('/api/agent/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMessage })
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      const data = await response.json()

      if (data.success) {
        // 添加 Agent 回复
        const assistantMessage: Message = {
          role: 'assistant',
          content: data.reply,
          plan: data.plan,
          toolCalls: data.toolCalls
        }
        setMessages(prev => [...prev, assistantMessage])

        // 如果 Agent 修改了日程，刷新页面数据
        if (data.toolCalls && data.toolCalls.length > 0) {
          onScheduleUpdated?.()
        }
      } else {
        throw new Error(data.error || '未知错误')
      }
    } catch (error) {
      console.error('Agent 请求失败:', error)
      toast({
        title: '请求失败',
        description: error instanceof Error ? error.message : '无法连接到 Agent',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 pointer-events-none">
      <div className="max-w-5xl mx-auto px-4 pb-4 pointer-events-auto">
        <Card className={cn(
          "bg-white dark:bg-gray-900 shadow-2xl border-2 transition-all duration-300",
          isExpanded ? "border-blue-500" : "border-gray-200 dark:border-gray-700"
        )}>
          {/* 展开时显示的消息历史 */}
          {isExpanded && messages.length > 0 && (
            <div className="max-h-96 overflow-y-auto p-4 space-y-3 border-b">
              {messages.map((msg, idx) => (
                <div key={idx} className={cn(
                  "flex gap-3",
                  msg.role === 'user' ? "justify-end" : "justify-start"
                )}>
                  {msg.role === 'assistant' && (
                    <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0">
                      <Bot className="w-5 h-5 text-white" />
                    </div>
                  )}

                  <div className={cn(
                    "rounded-lg px-4 py-2 max-w-[80%]",
                    msg.role === 'user'
                      ? "bg-blue-500 text-white"
                      : "bg-gray-100 dark:bg-gray-800"
                  )}>
                    <p className="text-sm whitespace-pre-wrap">{msg.content}</p>

                    {/* 显示计划步骤 */}
                    {msg.plan && msg.plan.steps.length > 0 && (
                      <div className="mt-2 pt-2 border-t border-gray-300 dark:border-gray-600">
                        <p className="text-xs font-semibold mb-1">执行步骤:</p>
                        <div className="space-y-1">
                          {msg.plan.steps.map((step, stepIdx) => (
                            <div key={stepIdx} className="flex items-start gap-2 text-xs">
                              <Badge
                                variant={step.status === 'completed' ? 'default' : 'outline'}
                                className="text-[10px] h-4 px-1"
                              >
                                {step.status === 'completed' ? '✓' : '○'}
                              </Badge>
                              <span className="flex-1">{step.description}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {msg.role === 'user' && (
                    <div className="w-8 h-8 rounded-full bg-gray-500 flex items-center justify-center flex-shrink-0 text-white text-sm font-semibold">
                      U
                    </div>
                  )}
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}

          {/* 输入区域 */}
          <div className="p-3">
            <div className="flex items-end gap-2">
              {/* 左侧：展开/收起按钮 */}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsExpanded(!isExpanded)}
                className="flex-shrink-0"
                title={isExpanded ? "收起对话" : "展开对话"}
              >
                {isExpanded ? (
                  <ChevronDown className="w-5 h-5" />
                ) : (
                  <ChevronUp className="w-5 h-5" />
                )}
              </Button>

              {/* 中间：输入框 */}
              <Textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask a question... (⌘K)"
                className="min-h-[44px] max-h-32 resize-none"
                disabled={loading}
                rows={1}
              />

              {/* 右侧：发送按钮 */}
              <Button
                onClick={handleSend}
                disabled={!input.trim() || loading}
                size="icon"
                className="flex-shrink-0 h-11 w-11"
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Send className="w-5 h-5" />
                )}
              </Button>

              {/* 右侧：清空按钮 */}
              {messages.length > 0 && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setMessages([])}
                  className="flex-shrink-0"
                  title="清空对话"
                >
                  <X className="w-5 h-5" />
                </Button>
              )}
            </div>

            {/* 提示文字 */}
            {!isExpanded && messages.length === 0 && (
              <p className="text-xs text-gray-500 mt-2 text-center">
                试试问我：&quot;今天有什么日程？&quot; 或 &quot;帮我创建明天上午10点的会议&quot;
              </p>
            )}
          </div>
        </Card>
      </div>
    </div>
  )
}
