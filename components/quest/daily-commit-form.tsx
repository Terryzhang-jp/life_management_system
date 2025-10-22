'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { useToast } from '@/hooks/use-toast'
import { Calendar, Paperclip, Send, X } from 'lucide-react'

interface DailyCommitFormProps {
  questId: number
  milestoneId?: number
  onCommitCreated?: () => void
  onCancel?: () => void
}

/**
 * Daily Commit Form - GitHub 风格的每日进度提交表单
 *
 * 功能：
 * - Markdown 内容输入
 * - 附件上传（图片/文件/链接）
 * - 日期选择（默认今天）
 * - 提交后触发 AI 评估
 */
export function DailyCommitForm({
  questId,
  milestoneId,
  onCommitCreated,
  onCancel
}: DailyCommitFormProps) {
  const { toast } = useToast()

  const [commitDate, setCommitDate] = useState(
    new Date().toISOString().split('T')[0]
  )
  const [content, setContent] = useState('')
  const [attachments, setAttachments] = useState<string[]>([])
  const [newAttachment, setNewAttachment] = useState('')
  const [loading, setLoading] = useState(false)

  const handleAddAttachment = () => {
    if (!newAttachment.trim()) return

    setAttachments([...attachments, newAttachment.trim()])
    setNewAttachment('')
  }

  const handleRemoveAttachment = (index: number) => {
    setAttachments(attachments.filter((_, i) => i !== index))
  }

  const handleSubmit = async () => {
    if (!content.trim()) {
      toast({
        title: '请输入今日进度',
        variant: 'destructive'
      })
      return
    }

    setLoading(true)

    try {
      // 1. 创建 commit
      const response = await fetch('/api/quest-commits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questId,
          milestoneId,
          commitDate,
          content: content.trim(),
          attachments: attachments.length > 0 ? JSON.stringify(attachments) : null
        })
      })

      if (!response.ok) {
        throw new Error('Failed to create commit')
      }

      const result = await response.json()

      toast({
        title: '进度已提交 🎉',
        description: 'AI 正在评估你的进度...'
      })

      // 2. 触发 AI 评估（异步）
      if (result.commit?.id) {
        // 不等待评估结果，让它在后台运行
        fetch('/api/ai-assess-commit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            commitId: result.commit.id
          })
        }).catch(console.error)
      }

      // 重置表单
      setContent('')
      setAttachments([])
      setCommitDate(new Date().toISOString().split('T')[0])

      onCommitCreated?.()

    } catch (error) {
      console.error('Submit commit error:', error)
      toast({
        title: '提交失败',
        description: '请稍后重试',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4 border border-gray-200 rounded-lg p-6 bg-white">
      {/* 头部 */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Today's Progress</h3>
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-gray-400" />
          <input
            type="date"
            value={commitDate}
            onChange={(e) => setCommitDate(e.target.value)}
            className="text-sm text-gray-600 border-0 p-0 focus:ring-0"
          />
        </div>
      </div>

      {/* 内容输入 */}
      <div>
        <Textarea
          placeholder="今天做了什么？遇到了什么问题？有什么收获？&#10;&#10;支持 Markdown 格式..."
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="min-h-[200px] font-mono text-sm"
        />
        <p className="text-xs text-gray-500 mt-2">
          提示：详细描述你的进度，AI 将根据你的描述自动评估 Checkpoint 完成度
        </p>
      </div>

      {/* 附件 */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
          <Paperclip className="w-4 h-4" />
          <span>Attachments</span>
          <span className="text-gray-400">（可选）</span>
        </div>

        {/* 已添加的附件 */}
        {attachments.length > 0 && (
          <div className="space-y-2">
            {attachments.map((att, index) => (
              <div key={index} className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                <Paperclip className="w-3 h-3 text-gray-400" />
                <span className="text-sm text-gray-700 flex-1 truncate">{att}</span>
                <button
                  onClick={() => handleRemoveAttachment(index)}
                  className="text-gray-400 hover:text-red-600"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* 添加附件 */}
        <div className="flex gap-2">
          <Input
            placeholder="图片链接、文件路径或URL..."
            value={newAttachment}
            onChange={(e) => setNewAttachment(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                handleAddAttachment()
              }
            }}
            className="flex-1"
          />
          <Button
            size="sm"
            variant="outline"
            onClick={handleAddAttachment}
            disabled={!newAttachment.trim()}
          >
            Add
          </Button>
        </div>
      </div>

      {/* 底部操作 */}
      <div className="flex justify-between items-center pt-4 border-t border-gray-100">
        <div className="text-xs text-gray-500">
          {content.length} characters
        </div>
        <div className="flex gap-2">
          {onCancel && (
            <Button
              variant="ghost"
              onClick={onCancel}
              disabled={loading}
            >
              Cancel
            </Button>
          )}
          <Button
            onClick={handleSubmit}
            disabled={loading || !content.trim()}
            className="gap-2"
          >
            <Send className="w-4 h-4" />
            {loading ? 'Submitting...' : 'Submit Progress'}
          </Button>
        </div>
      </div>
    </div>
  )
}
