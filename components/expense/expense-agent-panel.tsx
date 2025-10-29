/**
 * Expense Agent Panel - 开销管理 Agent 聊天界面
 *
 * 功能:
 * - 文本输入: 支持自然语言描述开销
 * - 图片上传: 支持上传票据图片进行 OCR 识别
 * - 展开/收起: 类似 Schedule Agent 的交互方式
 */

'use client'

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { X, Send, Sparkles, ChevronDown, ChevronUp, Camera } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface ExpenseAgentPanelProps {
  onExpenseUpdated?: () => void  // 当开销更新时的回调
}

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  imagePreview?: string
  timestamp: string
}

export default function ExpenseAgentPanel({ onExpenseUpdated }: ExpenseAgentPanelProps = {}) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)
  const [imageFiles, setImageFiles] = useState<File[]>([])
  const [imagePreviews, setImagePreviews] = useState<string[]>([])
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()

  // 自动滚动到底部
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    if (isExpanded) {
      scrollToBottom()
    }
  }, [messages, isExpanded])

  // 处理图片选择
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return

    // 限制最多5张图片
    if (files.length > 5) {
      toast({
        title: '图片数量超限',
        description: '最多只能上传5张图片',
        variant: 'destructive',
      })
      return
    }

    setImageFiles(files)

    // 生成预览
    const previews: string[] = []
    let loadedCount = 0

    files.forEach((file) => {
      const reader = new FileReader()
      reader.onload = (e) => {
        previews.push(e.target?.result as string)
        loadedCount++

        // 当所有图片都加载完成时，更新状态
        if (loadedCount === files.length) {
          setImagePreviews([...previews])
        }
      }
      reader.readAsDataURL(file)
    })
  }

  // 清除图片
  const clearImage = () => {
    setImageFiles([])
    setImagePreviews([])
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  // 删除单张图片
  const removeImage = (index: number) => {
    setImageFiles(prev => prev.filter((_, i) => i !== index))
    setImagePreviews(prev => prev.filter((_, i) => i !== index))
  }

  // 发送消息
  const handleSend = async () => {
    if ((!input.trim() && imageFiles.length === 0) || loading) return

    const userMessage = input.trim() || (imageFiles.length > 1 ? `请识别这${imageFiles.length}张图片` : '请识别这张图片')
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
      imagePreview: imagePreviews.length > 0 ? imagePreviews[0] : undefined,
    }
    setMessages(prev => [...prev, newUserMessage])
    setLoading(true)

    try {
      let response

      if (imageFiles.length > 0) {
        // 上传图片
        const formData = new FormData()
        formData.append('message', userMessage)

        // 添加多个图片文件
        imageFiles.forEach((file, index) => {
          formData.append(`image${index}`, file)
        })
        formData.append('imageCount', imageFiles.length.toString())

        response = await fetch('/api/expense-agent/chat', {
          method: 'POST',
          body: formData,
        })

        // 清除图片
        clearImage()
      } else {
        // 纯文本
        response = await fetch('/api/expense-agent/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: userMessage,
          }),
        })
      }

      const data = await response.json()

      if (data.success) {
        const assistantMessage: ChatMessage = {
          role: 'assistant',
          content: data.reply,
          timestamp: new Date().toISOString(),
        }
        setMessages(prev => [...prev, assistantMessage])

        // 检测是否创建了开销记录，触发刷新
        if (data.reply.includes('✅') || data.reply.includes('创建成功')) {
          if (onExpenseUpdated) {
            setTimeout(() => {
              onExpenseUpdated()
            }, 300)
          }
          toast({
            title: '开销记录已创建',
            description: '开销列表已更新',
          })
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
      toast({
        title: '发送失败',
        description: error.message,
        variant: 'destructive',
      })
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

  return (
    <>
      {/* 初始状态: 底部居中小输入框 */}
      {!isExpanded && (
        <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 z-50">
          <div className="bg-white/90 backdrop-blur-md border border-gray-200 rounded-full shadow-lg px-6 py-3 flex items-center gap-3 min-w-[500px]">
            <Sparkles className="w-5 h-5 text-green-500" />
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="记录开销..."
              disabled={loading}
              className="flex-1 border-0 bg-transparent focus:ring-0 focus-visible:ring-0 text-sm"
            />
            {/* 图片上传按钮 */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleImageSelect}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="p-2 rounded-full hover:bg-gray-100 transition-colors"
              title="上传票据图片（最多5张）"
            >
              <Camera className="w-5 h-5 text-gray-600" />
            </button>
            <button
              onClick={handleSend}
              disabled={loading || (!input.trim() && imageFiles.length === 0)}
              className="p-2 rounded-full hover:bg-gray-100 disabled:opacity-50 transition-colors"
            >
              <ChevronUp className="w-5 h-5 text-gray-600" />
            </button>
          </div>

          {/* 图片预览（小输入框模式） */}
          {imagePreviews.length > 0 && (
            <div className="mt-2 flex justify-center">
              <div className="bg-white rounded-lg shadow-md p-2 flex items-center gap-2 max-w-md overflow-x-auto">
                {imagePreviews.map((preview, index) => (
                  <div key={index} className="relative flex-shrink-0">
                    <img src={preview} alt={`Preview ${index + 1}`} className="w-12 h-12 rounded object-cover" />
                    <button
                      onClick={() => removeImage(index)}
                      className="absolute -top-1 -right-1 p-0.5 bg-red-500 hover:bg-red-600 rounded-full transition-colors"
                    >
                      <X className="w-3 h-3 text-white" />
                    </button>
                  </div>
                ))}
                <span className="text-xs text-gray-600 whitespace-nowrap ml-2">
                  {imageFiles.length} 张图片
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 展开状态: 右侧完整聊天面板 */}
      {isExpanded && (
        <div className="fixed right-6 bottom-6 top-6 w-[480px] z-50 flex flex-col bg-white rounded-2xl shadow-2xl border border-gray-200">
          {/* 顶部栏 */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-green-600" />
              <h2 className="text-base font-semibold text-gray-900">开销助手</h2>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsExpanded(false)}
                className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <ChevronDown className="w-5 h-5 text-gray-600" />
              </button>
              <button
                onClick={() => setMessages([])}
                className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                title="清空对话"
              >
                <X className="w-5 h-5 text-gray-600" />
              </button>
            </div>
          </div>

          {/* 消息列表 */}
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
            {messages.length === 0 && (
              <div className="text-center text-gray-400 mt-12">
                <Sparkles className="w-12 h-12 mx-auto mb-3 text-green-300" />
                <p className="text-sm text-gray-500">开销管理助手</p>
                <p className="text-xs text-gray-400 mt-2">
                  输入文本或上传票据图片来记录开销
                </p>
              </div>
            )}

            {messages.map((msg, index) => (
              <div key={index}>
                {msg.role === 'user' ? (
                  // 用户消息
                  <div className="flex justify-end">
                    <div className="bg-green-100 text-gray-900 px-4 py-2.5 rounded-2xl rounded-tr-sm max-w-[85%]">
                      {msg.imagePreview && (
                        <img
                          src={msg.imagePreview}
                          alt="Uploaded"
                          className="w-32 h-32 rounded-lg object-cover mb-2"
                        />
                      )}
                      <div className="text-sm">{msg.content}</div>
                    </div>
                  </div>
                ) : (
                  // AI 消息
                  <div className="flex justify-start">
                    <div className="bg-white text-gray-900 px-4 py-2.5 rounded-2xl rounded-tl-sm border border-gray-200 max-w-[85%]">
                      <div className="text-sm whitespace-pre-wrap">
                        {msg.content}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}

            {/* 加载中 */}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-white px-4 py-2.5 rounded-2xl rounded-tl-sm border border-gray-200">
                  <div className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse"></div>
                    <div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse delay-100"></div>
                    <div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse delay-200"></div>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* 底部输入框 */}
          <div className="px-6 py-4 border-t border-gray-200">
            {/* 图片预览 */}
            {imagePreviews.length > 0 && (
              <div className="mb-2 p-2 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-gray-700">
                    已选择 {imageFiles.length} 张图片
                  </span>
                  <button
                    onClick={clearImage}
                    className="text-xs text-red-500 hover:text-red-600"
                  >
                    清空全部
                  </button>
                </div>
                <div className="flex gap-2 overflow-x-auto">
                  {imagePreviews.map((preview, index) => (
                    <div key={index} className="relative flex-shrink-0">
                      <img src={preview} alt={`Preview ${index + 1}`} className="w-16 h-16 rounded object-cover" />
                      <button
                        onClick={() => removeImage(index)}
                        className="absolute -top-1 -right-1 p-0.5 bg-red-500 hover:bg-red-600 rounded-full transition-colors"
                      >
                        <X className="w-3 h-3 text-white" />
                      </button>
                      <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white text-[10px] text-center rounded-b">
                        {index + 1}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 输入框 */}
            <div className="flex items-center gap-2 bg-gray-50 rounded-xl px-4 py-2 border border-gray-200 focus-within:border-green-300 focus-within:bg-white transition-colors">
              {/* 图片上传按钮 */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handleImageSelect}
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="p-1.5 rounded-lg hover:bg-gray-200 transition-colors"
                title="上传票据图片（最多5张）"
              >
                <Camera className="w-4 h-4 text-gray-600" />
              </button>

              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="记录开销或提问..."
                disabled={loading}
                className="flex-1 border-0 bg-transparent focus:ring-0 focus-visible:ring-0 text-sm px-0"
              />

              <button
                onClick={handleSend}
                disabled={loading || (!input.trim() && imageFiles.length === 0)}
                className="p-1.5 rounded-lg hover:bg-green-100 disabled:opacity-50 transition-colors"
              >
                <Send className="w-4 h-4 text-green-600" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
