"use client"

import { useState, useRef, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Send, Loader2, Lock, Unlock } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { Badge } from "@/components/ui/badge"
import MessageItem from "./message-item"
import PendingActionCard from "./pending-action-card"
import PlanPreviewCard, { ExecutionPlan } from "./plan-preview-card"
import { PendingTaskAction } from "@/lib/workspace/task-tools"
import {
  ConversationState,
  Message,
  initializeState,
  loadStateFromStorage,
  saveStateToStorage,
  clearFocusTask,
  checkExpiry
} from "@/lib/workspace/conversation-state"
import { Note } from "@/lib/notes-db"

interface ChatInterfaceProps {
  activeNote?: Note | null
}

export default function ChatInterface({ activeNote }: ChatInterfaceProps) {
  const { toast } = useToast()
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [streamingMessage, setStreamingMessage] = useState('')
  const [enableEdit, setEnableEdit] = useState(false)  // 编辑模式开关
  const [pendingActions, setPendingActions] = useState<PendingTaskAction[]>([])  // 待确认的操作
  const [currentPlan, setCurrentPlan] = useState<ExecutionPlan | null>(null)  // 当前待确认的计划
  const [executionResult, setExecutionResult] = useState<{ success: boolean; message: string } | null>(null)  // 执行结果
  const [conversationState, setConversationState] = useState<ConversationState>(initializeState())
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // 自动滚动到底部
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // 组件加载时从localStorage恢复状态
  useEffect(() => {
    const savedState = loadStateFromStorage()
    if (savedState) {
      const validState = checkExpiry(savedState)
      setConversationState(validState)
    }
  }, [])

  // 状态变化时自动保存到localStorage
  useEffect(() => {
    saveStateToStorage(conversationState)
  }, [conversationState])

  // 页面关闭前清空focusTask
  useEffect(() => {
    const handleBeforeUnload = () => {
      const clearedState = clearFocusTask(conversationState)
      saveStateToStorage(clearedState)
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [conversationState])

  const handleSend = async () => {
    const userMessage = input.trim()
    if (!userMessage || loading) return

    console.log('Sending message:', userMessage)

    // 添加用户消息
    const userEntry: Message = {
      role: 'user',
      content: userMessage,
      displayContent: userMessage
    }

    const newMessages: Message[] = [
      ...messages,
      userEntry
    ]
    setMessages(newMessages)
    setInput('')
    setLoading(true)
    setStreamingMessage('')

    try {
      console.log('Calling API...')

      // 构建当前笔记上下文
      const activeNoteContext = activeNote ? {
        id: activeNote.id,
        title: activeNote.title,
        content: activeNote.content,
        createdAt: activeNote.createdAt
      } : null

      // 调用流式API
      const response = await fetch('/api/workspace-assistant/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage,
          history: messages,
          enableEdit,  // 传递编辑模式状态
          state: conversationState,  // 传递对话状态
          activeNoteContext  // 传递当前笔记上下文
        })
      })

      console.log('Response status:', response.status)

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
      let done = false

      while (!done) {
        const { value, done: readerDone } = await reader.read()
        done = readerDone

        if (value) {
          const chunk = decoder.decode(value)
          const lines = chunk.split('\n')

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6))
                console.log('[FRONTEND DEBUG] Received event:', data.type, data)

                if (data.type === 'error' || data.error) {
                  console.error('Stream error:', data.error)
                  throw new Error(data.error)
                }

                if (data.type === 'decision_error') {
                  if (data.message) {
                    toast({
                      title: '格式提醒',
                      description: data.message,
                      variant: 'destructive'
                    })
                  }
                  continue
                }

                // 处理文本内容
                if (data.type === 'content' && data.content) {
                  assistantMessage += data.content
                  setStreamingMessage(assistantMessage)

                  // 实时隐藏代码块：在流式更新过程中就移除decision和tool-call
                  // 这样可以避免UI跳动（代码块先显示再隐藏导致高度变化）
                  const displayMessage = assistantMessage
                    .replace(/```decision\s*\n[\s\S]*?\n```/g, '')
                    .replace(/```tool-call\s*\n[\s\S]*?\n```/g, '')
                    .trim()
                  const safeDisplayMessage = displayMessage.length > 0
                    ? displayMessage
                    : assistantMessage.trim()

                  // 实时更新助手消息（只显示自然语言部分）
                  setMessages([
                    ...newMessages,
                    {
                      role: 'assistant',
                      content: assistantMessage,
                      displayContent: safeDisplayMessage
                    }
                  ])

                  if (data.done) {
                    console.log('Stream completed')
                    done = true
                    break
                  }
                }

                // 处理工具调用
                if (data.type === 'tool_calls' && data.toolCalls) {
                  console.log('Tool calls received:', data.toolCalls)
                  const actions = convertToolCallsToActions(data.toolCalls)
                  setPendingActions(prev => [...prev, ...actions])
                }

                // 处理状态更新
                if (data.type === 'state_update' && data.state) {
                  console.log('State update received:', data.state)
                  setConversationState(data.state)
                }

                // 处理计划生成
                if (data.type === 'plan' && data.plan) {
                  console.log('Plan received:', data.plan)
                  setCurrentPlan(data.plan)
                  // 显示计划已生成的提示
                  toast({
                    title: '计划已生成',
                    description: '请查看并确认执行计划'
                  })
                }

                // 处理执行完成
                if (data.type === 'execution_complete') {
                  console.log('Execution complete:', data)
                  const success = data.success
                  const message = success ? data.summary : data.error

                  setExecutionResult({
                    success,
                    message: message || (success ? '执行成功' : '执行失败')
                  })

                  // 显示执行结果提示
                  toast({
                    title: success ? '执行成功' : '执行失败',
                    description: message,
                    variant: success ? 'default' : 'destructive'
                  })

                  // 清除当前计划
                  setCurrentPlan(null)

                  // 3秒后清除执行结果
                  setTimeout(() => {
                    setExecutionResult(null)
                  }, 3000)
                }

              } catch (parseError) {
                console.error('Parse error:', parseError, 'Line:', line)
              }
            }
          }
        }
      }

      setStreamingMessage('')

    } catch (error: any) {
      console.error('Chat error:', error)
      toast({
        title: '发送失败',
        description: error.message || '请稍后重试',
        variant: 'destructive'
      })

      // 发生错误时移除用户消息
      setMessages(messages)
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

  // 将工具调用转换为待确认操作
  const convertToolCallsToActions = (toolCalls: Array<{ toolName: string, args: any }>): PendingTaskAction[] => {
    return toolCalls.map(call => {
      const operation = call.toolName as 'create_task' | 'update_task'
      let description = ''

      if (operation === 'create_task') {
        const { type, level, title, description: desc, priority, parentId, deadline } = call.args
        const typeNames = {
          'routine': '日常习惯',
          'long-term': '长期任务',
          'short-term': '短期任务'
        }
        const levelNames = {
          'main': '主任务',
          'sub': '子任务',
          'subsub': '子子任务'
        }
        description = `创建${typeNames[type as keyof typeof typeNames]} - ${levelNames[level as keyof typeof levelNames]}：\n`
        description += `标题：${title}\n`
        if (desc) description += `描述：${desc}\n`
        if (priority && priority !== 999) description += `优先级：${priority}\n`
        if (parentId) description += `父任务ID：${parentId}\n`
        if (deadline) description += `截止日期：${deadline}\n`
      } else if (operation === 'update_task') {
        const { id, title, description: desc, priority, deadline, isUnclear, unclearReason } = call.args
        description = `更新任务 ID=${id}：\n`
        if (title) description += `新标题：${title}\n`
        if (desc) description += `新描述：${desc}\n`
        if (priority) description += `新优先级：${priority}\n`
        if (deadline) description += `新截止日期：${deadline}\n`
        if (isUnclear !== undefined) description += `模糊状态：${isUnclear ? '是' : '否'}\n`
        if (unclearReason) description += `模糊原因：${unclearReason}\n`
      }

      return {
        operation,
        params: call.args,
        description
      }
    })
  }

  // 确认执行操作
  const handleConfirmAction = async (action: PendingTaskAction) => {
    try {
      setLoading(true)

      // 调用执行API
      const response = await fetch('/api/workspace-assistant/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          operation: action.operation,
          params: action.params
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || '执行失败')
      }

      const result = await response.json()

      toast({
        title: '执行成功',
        description: result.message || '任务操作已完成'
      })

      // 从待确认列表中移除
      setPendingActions(prev => prev.filter(a => a !== action))

    } catch (error: any) {
      console.error('Execute error:', error)
      toast({
        title: '执行失败',
        description: error.message || '请稍后重试',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  // 取消操作
  const handleCancelAction = (action: PendingTaskAction) => {
    setPendingActions(prev => prev.filter(a => a !== action))
    toast({
      title: '已取消',
      description: '操作已取消'
    })
  }

  // 确认执行计划
  const handleConfirmPlan = async () => {
    if (!currentPlan) return

    try {
      setLoading(true)
      setExecutionResult(null)

      console.log('Executing plan:', currentPlan)

      // 发送包含 planToExecute 的请求
      const response = await fetch('/api/workspace-assistant/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: '执行计划',
          history: messages,
          enableEdit: true,
          state: conversationState,
          planToExecute: currentPlan  // 传递计划
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || '执行计划失败')
      }

      // 处理流式响应
      const reader = response.body?.getReader()
      const decoder = new TextDecoder()

      if (!reader) {
        throw new Error('No reader available')
      }

      let done = false

      while (!done) {
        const { value, done: readerDone } = await reader.read()
        done = readerDone

        if (value) {
          const chunk = decoder.decode(value)
          const lines = chunk.split('\n')

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6))
                console.log('[PLAN EXECUTION] Received event:', data.type, data)

                if (data.type === 'error' || data.error) {
                  console.error('Execution error:', data.error)
                  throw new Error(data.error)
                }

                // 处理执行完成事件（已在上面的 SSE 处理中统一处理）
                if (data.type === 'execution_complete') {
                  const success = data.success
                  const message = success ? data.summary : data.error

                  setExecutionResult({
                    success,
                    message: message || (success ? '执行成功' : '执行失败')
                  })

                  toast({
                    title: success ? '执行成功' : '执行失败',
                    description: message,
                    variant: success ? 'default' : 'destructive'
                  })

                  setCurrentPlan(null)

                  setTimeout(() => {
                    setExecutionResult(null)
                  }, 3000)

                  done = true
                  break
                }
              } catch (parseError) {
                console.error('Parse error:', parseError, 'Line:', line)
              }
            }
          }
        }
      }

    } catch (error: any) {
      console.error('Plan execution error:', error)
      toast({
        title: '执行失败',
        description: error.message || '请稍后重试',
        variant: 'destructive'
      })

      setExecutionResult({
        success: false,
        message: error.message || '执行失败'
      })
    } finally {
      setLoading(false)
    }
  }

  // 取消计划
  const handleCancelPlan = () => {
    setCurrentPlan(null)
    toast({
      title: '已取消',
      description: '执行计划已取消'
    })
  }

  return (
    <Card className="h-full flex flex-col overflow-hidden">
      <CardHeader className="flex-shrink-0 border-b">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-lg">思维整理工作台</CardTitle>
            <p className="text-sm text-gray-600">基于你的任务数据，降低认知负荷</p>
          </div>

          {/* 编辑模式开关 */}
          <div className="flex items-center gap-2">
            <Button
              variant={enableEdit ? "default" : "outline"}
              size="sm"
              onClick={() => {
                const newState = !enableEdit
                setEnableEdit(newState)
                toast({
                  title: newState ? "编辑模式已启用" : "编辑模式已关闭",
                  description: newState
                    ? "AI 可以建议创建或修改任务（需要你确认）"
                    : "AI 只能查看和分析任务"
                })
              }}
              className="gap-2"
            >
              {enableEdit ? (
                <>
                  <Unlock className="w-4 h-4" />
                  编辑模式
                </>
              ) : (
                <>
                  <Lock className="w-4 h-4" />
                  只读模式
                </>
              )}
            </Button>
            {enableEdit && (
              <Badge variant="destructive" className="text-xs">
                需确认
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col p-0 min-h-0 overflow-hidden">
        {/* 消息列表 */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 min-h-0">
          {messages.length === 0 && (
            <div className="text-center py-12 text-gray-400">
              <p className="text-lg mb-2">👋 你好！</p>
              <p className="text-sm">我可以帮你分析任务、规划时间、提供建议</p>
              <p className="text-sm mt-4 text-gray-500">试试问我：</p>
              <ul className="text-sm text-gray-500 mt-2 space-y-1">
                <li>&ldquo;我当前最重要的任务是什么？&rdquo;</li>
                <li>&ldquo;有哪些任务快到deadline了？&rdquo;</li>
                <li>&ldquo;我的习惯坚持情况如何？&rdquo;</li>
              </ul>
            </div>
          )}

          {messages.map((msg, index) => (
            <MessageItem key={index} role={msg.role} content={msg.displayContent} />
          ))}

          {loading && messages[messages.length - 1]?.role === 'user' && (
            <div className="flex gap-3 justify-start">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center">
                  <Loader2 className="w-5 h-5 text-white animate-spin" />
                </div>
              </div>
              <Card className="max-w-[80%] p-4 bg-gray-50">
                <p className="text-sm text-gray-500">思考中...</p>
              </Card>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* 计划预览区域 */}
        {currentPlan && (
          <div className="flex-shrink-0 p-4 border-t bg-blue-50 space-y-2">
            <p className="text-sm font-medium text-blue-700 mb-2">
              执行计划
            </p>
            <PlanPreviewCard
              plan={currentPlan}
              onConfirm={handleConfirmPlan}
              onCancel={handleCancelPlan}
              loading={loading}
            />
          </div>
        )}

        {/* 执行结果显示 */}
        {executionResult && (
          <div className={`flex-shrink-0 p-4 border-t ${executionResult.success ? 'bg-green-50' : 'bg-red-50'}`}>
            <p className={`text-sm font-medium mb-2 ${executionResult.success ? 'text-green-700' : 'text-red-700'}`}>
              {executionResult.success ? '✅ 执行成功' : '❌ 执行失败'}
            </p>
            <p className="text-sm text-gray-700 whitespace-pre-wrap">
              {executionResult.message}
            </p>
          </div>
        )}

        {/* 待确认操作区域 */}
        {pendingActions.length > 0 && (
          <div className="flex-shrink-0 p-4 border-t bg-gray-100 space-y-2">
            <p className="text-sm font-medium text-gray-700 mb-2">
              等待确认的操作 ({pendingActions.length})
            </p>
            {pendingActions.map((action, index) => (
              <PendingActionCard
                key={index}
                action={action}
                onConfirm={() => handleConfirmAction(action)}
                onCancel={() => handleCancelAction(action)}
                loading={loading}
              />
            ))}
          </div>
        )}

        {/* 输入框 */}
        <div className="flex-shrink-0 p-4 border-t bg-gray-50">
          <div className="flex gap-2">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="输入你的问题...（Enter发送，Shift+Enter换行）"
              className="min-h-[60px] resize-none"
              disabled={loading}
            />
            <Button
              onClick={handleSend}
              disabled={!input.trim() || loading}
              size="lg"
              className="px-4"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
