"use client"

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Loader2 } from 'lucide-react'
import { MoodInfo, ReviewEvent } from '@/lib/daily-reviews-db'

interface ReviewStep2Props {
  primaryMood: MoodInfo
  secondaryMood: MoodInfo | null
  events: ReviewEvent[]
  onSubmit: (feelingsInput: string) => void
  loading: boolean
}

const moodEmoji: Record<string, string> = {
  '开心': '😊',
  '平静': '😌',
  '焦虑': '😰',
  '沮丧': '😔',
  '愤怒': '😠'
}

const categoryEmoji: Record<string, string> = {
  '工作': '💼',
  '生活': '🏠',
  '健康': '💪',
  '社交': '👥',
  '情绪': '💭'
}

export default function ReviewStep2({
  primaryMood,
  secondaryMood,
  events,
  onSubmit,
  loading
}: ReviewStep2Props) {
  const [feelingsInput, setFeelingsInput] = useState('')

  const handleSubmit = () => {
    if (feelingsInput.trim()) {
      onSubmit(feelingsInput.trim())
    }
  }

  return (
    <div className="space-y-8">
      {/* AI 分析结果 */}
      <div className="space-y-6">
        <div className="space-y-2">
          <h3 className="text-xl font-light tracking-wide text-gray-900">AI 分析结果</h3>
          <div className="h-px bg-gray-200 w-16"></div>
        </div>

        {/* 心情 */}
        <div className="border border-gray-200 p-6">
          <p className="text-xs text-gray-400 uppercase tracking-wider mb-4">心情状态</p>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3">
              <span className="text-2xl opacity-80">{moodEmoji[primaryMood.type] || '😐'}</span>
              <div>
                <span className="font-light text-lg">{primaryMood.type}</span>
                <span className="text-gray-400 text-sm ml-2">({primaryMood.score}/10)</span>
              </div>
            </div>
            {secondaryMood && (
              <>
                <span className="text-gray-300">|</span>
                <div className="flex items-center gap-3">
                  <span className="text-xl opacity-70">{moodEmoji[secondaryMood.type] || '😐'}</span>
                  <div>
                    <span className="text-sm text-gray-600">{secondaryMood.type}</span>
                    <span className="text-gray-400 text-xs ml-2">({secondaryMood.score}/10)</span>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* 事件列表 */}
        <div className="border border-gray-200 p-6">
          <p className="text-xs text-gray-400 uppercase tracking-wider mb-4">
            提取到 {events.length} 个事件
          </p>
          <div className="space-y-4">
            {events.map((event, index) => (
              <div key={index} className="flex items-start gap-3 pb-4 border-b border-gray-100 last:border-0 last:pb-0">
                <span className="text-lg opacity-60">{categoryEmoji[event.category] || '·'}</span>
                <div className="flex-1">
                  <div className="font-light text-gray-900">{event.keyword}</div>
                  <div className="text-sm text-gray-500 mt-1">{event.description}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 用户评价输入 */}
      <div className="space-y-4">
        <div className="space-y-2">
          <h3 className="text-xl font-light tracking-wide text-gray-900">你对这些事件的感受？</h3>
          <div className="h-px bg-gray-200 w-16"></div>
          <p className="text-sm text-gray-500 leading-relaxed">
            用自然语言描述你对这些事件的评价和感受
          </p>
        </div>

        <Textarea
          value={feelingsInput}
          onChange={(e) => setFeelingsInput(e.target.value)}
          placeholder="完成任务很有成就感，会议让我感觉有点压力，身体累是正常的..."
          className="min-h-[180px] text-base border-gray-300 focus:border-gray-900 rounded-none resize-none"
          disabled={loading}
        />
      </div>

      <div className="flex justify-end pt-4">
        <Button
          onClick={handleSubmit}
          disabled={!feelingsInput.trim() || loading}
          className="min-w-[140px] bg-gray-900 hover:bg-gray-800 text-white rounded-none"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              分析中
            </>
          ) : (
            '生成最终分析'
          )}
        </Button>
      </div>

      {loading && (
        <p className="text-xs text-gray-400 text-center tracking-wide">
          AI 正在解析你的评价
        </p>
      )}
    </div>
  )
}