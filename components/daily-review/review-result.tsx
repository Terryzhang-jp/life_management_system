"use client"

import { Button } from '@/components/ui/button'
import { Loader2, Trash2 } from 'lucide-react'
import { MoodInfo, ReviewEvent } from '@/lib/daily-reviews-db'

interface ReviewResultProps {
  primaryMood: MoodInfo
  secondaryMood: MoodInfo | null
  events: ReviewEvent[]
  aiSummary: string
  onDelete: () => void
  loading: boolean
}

const moodEmoji: Record<string, string> = {
  '开心': '😊',
  '平静': '😌',
  '焦虑': '😰',
  '沮丧': '😔',
  '愤怒': '😠'
}

const ratingEmoji: Record<string, string> = {
  'positive': '😊',
  'neutral': '😐',
  'negative': '😔',
  'unrated': '—'
}

const ratingText: Record<string, string> = {
  'positive': '正面',
  'neutral': '中性',
  'negative': '负面',
  'unrated': '未评价'
}

const categoryEmoji: Record<string, string> = {
  '工作': '💼',
  '生活': '🏠',
  '健康': '💪',
  '社交': '👥',
  '情绪': '💭'
}

export default function ReviewResult({
  primaryMood,
  secondaryMood,
  events,
  aiSummary,
  onDelete,
  loading
}: ReviewResultProps) {
  // 统计评价
  const positiveCount = events.filter(e => e.rating === 'positive').length
  const neutralCount = events.filter(e => e.rating === 'neutral').length
  const negativeCount = events.filter(e => e.rating === 'negative').length
  const unratedCount = events.filter(e => !e.rating).length

  return (
    <div className="space-y-8">
      <div className="text-center space-y-2 pb-6 border-b border-gray-200">
        <h3 className="text-2xl font-light tracking-wide text-gray-900">今日回顾完成</h3>
        <p className="text-xs text-gray-400 uppercase tracking-wider">已保存</p>
      </div>

      {/* 心情总结 */}
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

      {/* 事件评价 */}
      <div className="border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <p className="text-xs text-gray-400 uppercase tracking-wider">事件评价</p>
          <div className="text-xs text-gray-400">
            {positiveCount} 正面 · {neutralCount} 中性 · {negativeCount} 负面{unratedCount > 0 && ` · ${unratedCount} 未评价`}
          </div>
        </div>

        <div className="space-y-4">
          {events.map((event, index) => (
            <div key={index} className="pb-4 border-b border-gray-100 last:border-0 last:pb-0">
              <div className="flex items-start gap-3">
                <span className="text-lg opacity-60">{categoryEmoji[event.category] || '·'}</span>
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-3">
                    <span className="font-light text-gray-900">{event.keyword}</span>
                    <span className="text-xs px-2 py-1 border border-gray-200 flex items-center gap-1.5">
                      <span className="opacity-60">{ratingEmoji[event.rating || 'unrated']}</span>
                      <span className="text-gray-600">{ratingText[event.rating || 'unrated']}</span>
                    </span>
                  </div>
                  <p className="text-sm text-gray-500">{event.description}</p>
                  {event.reason && (
                    <p className="text-xs text-gray-400 pl-3 border-l border-gray-200">{event.reason}</p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* AI 总结 */}
      {aiSummary && (
        <div className="border border-gray-200 p-6 bg-gray-50">
          <p className="text-xs text-gray-400 uppercase tracking-wider mb-3">AI 总结</p>
          <p className="text-sm text-gray-700 leading-relaxed">{aiSummary}</p>
        </div>
      )}

      {/* 操作按钮 */}
      <div className="flex justify-center pt-4">
        <Button
          variant="ghost"
          onClick={onDelete}
          disabled={loading}
          className="border border-gray-300 hover:border-gray-900 hover:bg-gray-50 text-gray-700 rounded-none"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              删除中
            </>
          ) : (
            <>
              <Trash2 className="w-4 h-4 mr-2" />
              删除并重新编辑
            </>
          )}
        </Button>
      </div>
    </div>
  )
}