"use client"

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Edit2 } from 'lucide-react'
import VoiceRecorder from '@/components/ui/voice-recorder'

interface VoiceInputProps {
  onSubmit: (text: string) => void
  initialValue?: string
  loading?: boolean
}

/**
 * 每日生活记录语音输入组件
 *
 * 集成了 VoiceRecorder 可复用组件
 * 支持语音输入和手动文本编辑
 */
export default function VoiceInput({ onSubmit, initialValue = '', loading = false }: VoiceInputProps) {
  const [transcript, setTranscript] = useState(initialValue)
  const [useVoice, setUseVoice] = useState(true)
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)

  const handleVoiceComplete = (text: string) => {
    const cleaned = text.trim()
    setTranscript(cleaned)

    if (cleaned) {
      setUseVoice(false)
    }
  }

  const handleSubmit = () => {
    if (transcript.trim()) {
      onSubmit(transcript.trim())
    }
  }

  useEffect(() => {
    if (!useVoice && textareaRef.current) {
      const textarea = textareaRef.current
      textarea.value = transcript
      textarea.style.height = 'auto'
      textarea.style.height = `${textarea.scrollHeight}px`
      textarea.focus()
      const cursor = transcript.length
      textarea.setSelectionRange(cursor, cursor)
    }
  }, [transcript, useVoice])

  return (
    <div className="space-y-6">
      {/* 切换按钮 */}
      <div className="flex justify-center gap-2">
        <Button
          variant={useVoice ? 'default' : 'outline'}
          size="sm"
          onClick={() => setUseVoice(true)}
        >
          语音输入
        </Button>
        <Button
          variant={!useVoice ? 'default' : 'outline'}
          size="sm"
          onClick={() => setUseVoice(false)}
        >
          <Edit2 className="w-4 h-4 mr-2" />
          文本编辑
        </Button>
      </div>

      {/* 语音输入模式 */}
      {useVoice && (
        <VoiceRecorder
          language="zh"
          onTranscriptComplete={handleVoiceComplete}
          placeholder="您的语音会实时显示在这里，也可以切换到文本编辑模式..."
          showManualFinalize={true}
        />
      )}

      {/* 文本编辑模式 */}
      {!useVoice && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <Edit2 className="w-4 h-4 text-gray-500" />
            <span className="text-sm text-gray-600">
              手动编辑文本
            </span>
          </div>
          <Textarea
            ref={textareaRef}
            value={transcript}
            onChange={(e) => setTranscript(e.target.value)}
            placeholder="请输入今天的生活回顾..."
            className="min-h-[300px] text-base"
            disabled={loading}
          />
          <div className="text-right text-sm text-gray-500">
            已输入 {transcript.length} 字
          </div>
          <Button
            onClick={handleSubmit}
            disabled={!transcript.trim() || loading}
            className="w-full"
            size="lg"
          >
            {loading ? '分析中...' : '提交并分析'}
          </Button>
        </div>
      )}

      {/* 输入建议 */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-sm text-gray-600">
        <p className="font-medium mb-2">💡 输入建议：</p>
        <ul className="space-y-1 list-disc list-inside text-xs">
          <li>说说今天几点起床，计划几点睡觉</li>
          <li>描述三餐吃了什么（可选）</li>
          <li>说说上午、下午、晚上都做了什么，心情如何</li>
          <li>分享今天的困惑、想法或启发（可选）</li>
        </ul>
        <p className="mt-2 text-xs text-gray-500">
          AI 会自动从您的描述中提取结构化信息
        </p>
      </div>
    </div>
  )
}
