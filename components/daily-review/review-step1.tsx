"use client"

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Loader2 } from 'lucide-react'

interface ReviewStep1Props {
  initialValue: string
  onSubmit: (input: string) => void
  loading: boolean
}

export default function ReviewStep1({ initialValue, onSubmit, loading }: ReviewStep1Props) {
  const [input, setInput] = useState(initialValue)

  const handleSubmit = () => {
    if (input.trim()) {
      onSubmit(input.trim())
    }
  }

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h3 className="text-xl font-light tracking-wide text-gray-900">今天过得怎么样？</h3>
        <div className="h-px bg-gray-200 w-16"></div>
        <p className="text-sm text-gray-500 leading-relaxed">
          用自己的话描述今天的感受、发生的事情、心情状态
        </p>
      </div>

      <Textarea
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="今天完成了三个任务，感觉还不错，但下午开会有点焦虑..."
        className="min-h-[240px] text-base border-gray-300 focus:border-gray-900 rounded-none resize-none"
        disabled={loading}
      />

      <div className="flex justify-end pt-4">
        <Button
          onClick={handleSubmit}
          disabled={!input.trim() || loading}
          className="min-w-[140px] bg-gray-900 hover:bg-gray-800 text-white rounded-none"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              分析中
            </>
          ) : (
            '提交分析'
          )}
        </Button>
      </div>

      {loading && (
        <p className="text-xs text-gray-400 text-center tracking-wide">
          AI 正在分析你的心情和事件
        </p>
      )}
    </div>
  )
}