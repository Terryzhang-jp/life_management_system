/**
 * Agent Chat Panel - 浮动聊天界面
 *
 * 设计:
 * - 初始状态: 底部居中小输入框，透明背景
 * - 展开状态: 右侧完整聊天面板
 * - 类似 LangChain Docs Assistant
 */

'use client'

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { X, Send, Sparkles, ChevronDown, ChevronUp } from 'lucide-react'
import type { ChatMessage } from '@/lib/agent/agent-types'

interface AgentChatPanelProps {
  onScheduleUpdated?: () => void // 当日程更新时的回调
}

export default function AgentChatPanel({ onScheduleUpdated }: AgentChatPanelProps = {}) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false) // 是否展开
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // 自动滚动到底部
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    if (isExpanded) {
      scrollToBottom()
    }
  }, [messages, isExpanded])

  const handleSend = async () => {
    if (!input.trim() || loading) return

    const userMessage = input.trim()
    setInput('')

    // 展开聊天面板
    if (!isExpanded) {
      setIsExpanded(true)
    }

    // 添加用户消息
    const newUserMessage: ChatMessage = {
      role: 'user',
      content: userMessage,
      timestamp: new Date().toISOString(),
    }
    setMessages(prev => [...prev, newUserMessage])
    setLoading(true)

    try {
      const response = await fetch('/api/agent/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage,
          threadId: 'user_default'
        }),
      })

      const data = await response.json()

      if (data.success) {
        const assistantMessage: ChatMessage = {
          role: 'assistant',
          content: data.reply,
          plan: data.plan,
          reflection: data.reflection,
          learnings: data.learnings,
          thoughts: data.thoughts,
          toolCalls: data.toolCalls,
          timestamp: new Date().toISOString(),
        }
        setMessages(prev => [...prev, assistantMessage])

        // 检测是否调用了 schedule 相关工具，触发刷新
        if (data.toolCalls && onScheduleUpdated) {
          const scheduleTools = [
            'createScheduleBlock',
            'updateScheduleBlock',
            'deleteScheduleBlock',
          ]
          const hasScheduleUpdate = data.toolCalls.some((call: any) =>
            scheduleTools.includes(call.name)
          )
          if (hasScheduleUpdate) {
            // 延迟一点时间再刷新，确保数据库操作完成
            setTimeout(() => {
              onScheduleUpdated()
            }, 300)
          }
        }
      } else {
        throw new Error(data.error || '请求失败')
      }
    } catch (error: any) {
      console.error('发送失败:', error)
      const errorMessage: ChatMessage = {
        role: 'assistant',
        content: `❌ 错误: ${error.message}`,
        timestamp: new Date().toISOString(),
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleClose = () => {
    setIsExpanded(false)
  }

  return (
    <>
      {/* 初始状态: 底部居中小输入框 */}
      {!isExpanded && (
        <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 z-50">
          <div className="bg-white/90 backdrop-blur-md border border-gray-200 rounded-full shadow-lg px-6 py-3 flex items-center gap-3 min-w-[500px]">
            <Sparkles className="w-5 h-5 text-gray-400" />
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask a question..."
              disabled={loading}
              className="flex-1 border-0 bg-transparent focus:ring-0 focus-visible:ring-0 text-sm"
            />
            <button
              onClick={handleSend}
              disabled={loading || !input.trim()}
              className="p-2 rounded-full hover:bg-gray-100 disabled:opacity-50 transition-colors"
            >
              <ChevronUp className="w-5 h-5 text-gray-600" />
            </button>
          </div>
        </div>
      )}

      {/* 展开状态: 右侧完整聊天面板 */}
      {isExpanded && (
        <div className="fixed right-6 bottom-6 top-6 w-[480px] z-50 flex flex-col bg-white rounded-2xl shadow-2xl border border-gray-200">
          {/* 顶部栏 */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-gray-600" />
              <h2 className="text-base font-semibold text-gray-900">Assistant</h2>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleClose}
                className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <ChevronDown className="w-5 h-5 text-gray-600" />
              </button>
              <button
                onClick={() => setMessages([])}
                className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <X className="w-5 h-5 text-gray-600" />
              </button>
            </div>
          </div>

          {/* 消息列表 */}
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
            {messages.length === 0 && (
              <div className="text-center text-gray-400 mt-12">
                <Sparkles className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p className="text-sm text-gray-500">你好</p>
                <p className="text-xs text-gray-400 mt-2">
                  I can only help with questions about this product
                </p>
              </div>
            )}

            {messages.map((msg, index) => (
              <div key={index}>
                {msg.role === 'user' ? (
                  // 用户消息
                  <div className="flex justify-end">
                    <div className="bg-gray-100 text-gray-900 px-4 py-2.5 rounded-2xl rounded-tr-sm max-w-[85%]">
                      <div className="text-sm">{msg.content}</div>
                    </div>
                  </div>
                ) : (
                  // AI 消息
                  <div className="space-y-2">
                    {/* 最终回复 */}
                    <div className="bg-white text-gray-900 px-4 py-2.5 rounded-2xl rounded-tl-sm border border-gray-200 max-w-[85%]">
                      <div className="text-sm whitespace-pre-wrap">
                        {msg.content}
                      </div>
                    </div>

                    {/* 工具调用展示（折叠） */}
                    {msg.toolCalls && msg.toolCalls.length > 0 && (
                      <details className="text-xs text-gray-500 ml-2">
                        <summary className="cursor-pointer hover:text-gray-700">
                          🔧 调用了 {msg.toolCalls.length} 个工具
                        </summary>
                        <div className="mt-2 space-y-1 ml-4">
                          {msg.toolCalls.map((call, i) => (
                            <div key={i}>
                              <span className="font-mono">{call.name}</span>
                            </div>
                          ))}
                        </div>
                      </details>
                    )}
                  </div>
                )}
              </div>
            ))}

            {/* 加载中 */}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-white px-4 py-2.5 rounded-2xl rounded-tl-sm border border-gray-200">
                  <div className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-pulse"></div>
                    <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-pulse delay-100"></div>
                    <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-pulse delay-200"></div>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* 底部输入框 */}
          <div className="px-6 py-4 border-t border-gray-200">
            <div className="flex items-center gap-2 bg-gray-50 rounded-xl px-4 py-2 border border-gray-200 focus-within:border-gray-300 focus-within:bg-white transition-colors">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask a question..."
                disabled={loading}
                className="flex-1 border-0 bg-transparent focus:ring-0 focus-visible:ring-0 text-sm px-0"
              />
              <button
                onClick={handleSend}
                disabled={loading || !input.trim()}
                className="p-1.5 rounded-lg hover:bg-gray-200 disabled:opacity-50 transition-colors"
              >
                <Send className="w-4 h-4 text-gray-600" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
