"use client"

import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import ReviewStep1 from './review-step1'
import ReviewStep2 from './review-step2'
import ReviewResult from './review-result'
import { DailyReview, MoodInfo, ReviewEvent } from '@/lib/daily-reviews-db'

interface DailyReviewDialogProps {
  isOpen: boolean
  onClose: () => void
  date: string
}

type Step = 'step1' | 'step2' | 'result'

export default function DailyReviewDialog({ isOpen, onClose, date }: DailyReviewDialogProps) {
  const { toast } = useToast()
  const [step, setStep] = useState<Step>('step1')
  const [loading, setLoading] = useState(false)

  // 数据状态
  const [initialInput, setInitialInput] = useState('')
  const [primaryMood, setPrimaryMood] = useState<MoodInfo | null>(null)
  const [secondaryMood, setSecondaryMood] = useState<MoodInfo | null>(null)
  const [events, setEvents] = useState<ReviewEvent[]>([])
  const [feelingsInput, setFeelingsInput] = useState('')
  const [aiSummary, setAiSummary] = useState('')

  // 加载已有回顾
  const loadExistingReview = async () => {
    try {
      const response = await fetch(`/api/daily-review?date=${date}`)
      if (response.ok) {
        const data = await response.json()
        if (data.exists && data.review) {
          const review: DailyReview = data.review

          setInitialInput(review.initialInput)

          if (review.status === 'completed') {
            // 已完成，直接显示结果
            setPrimaryMood(review.primaryMood || null)
            setSecondaryMood(review.secondaryMood || null)
            setEvents(review.events || [])
            setFeelingsInput(review.feelingsInput || '')
            setAiSummary(review.aiSummary || '')
            setStep('result')
          } else if (review.status === 'analyzed') {
            // 已分析，显示第二步
            setPrimaryMood(review.primaryMood || null)
            setSecondaryMood(review.secondaryMood || null)
            setEvents(review.events || [])
            setStep('step2')
          } else {
            // 草稿，显示第一步
            setStep('step1')
          }
        }
      }
    } catch (error) {
      console.error('Error loading existing review:', error)
    }
  }

  // 对话框打开时加载数据
  useEffect(() => {
    if (isOpen) {
      loadExistingReview()
    } else {
      // 关闭时重置状态
      setStep('step1')
      setInitialInput('')
      setPrimaryMood(null)
      setSecondaryMood(null)
      setEvents([])
      setFeelingsInput('')
      setAiSummary('')
    }
  }, [isOpen, date])

  // 第一步：提交初始输入
  const handleStep1Submit = async (input: string) => {
    try {
      setLoading(true)
      setInitialInput(input)

      // 创建回顾记录
      const createResponse = await fetch('/api/daily-review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date, initialInput: input })
      })

      if (!createResponse.ok) {
        throw new Error('创建回顾失败')
      }

      // 调用 AI 分析
      const analyzeResponse = await fetch('/api/daily-review/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date, initialInput: input })
      })

      if (!analyzeResponse.ok) {
        const errorData = await analyzeResponse.json()
        throw new Error(errorData.error || 'AI 分析失败')
      }

      const analyzeData = await analyzeResponse.json()

      setPrimaryMood(analyzeData.primaryMood)
      setSecondaryMood(analyzeData.secondaryMood || null)
      setEvents(analyzeData.events)

      setStep('step2')
    } catch (error: any) {
      console.error('Error in step1:', error)
      toast({
        title: "错误",
        description: error.message || "分析失败，请重试",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  // 第二步：提交评价
  const handleStep2Submit = async (feelings: string) => {
    try {
      setLoading(true)
      setFeelingsInput(feelings)

      // 调用 AI 解析评价
      const finalizeResponse = await fetch('/api/daily-review/finalize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date, events, feelingsInput: feelings })
      })

      if (!finalizeResponse.ok) {
        const errorData = await finalizeResponse.json()
        throw new Error(errorData.error || 'AI 分析失败')
      }

      const finalizeData = await finalizeResponse.json()

      setEvents(finalizeData.events)
      setAiSummary(finalizeData.aiSummary)

      setStep('result')

      toast({
        title: "完成！",
        description: "今日回顾已保存"
      })
    } catch (error: any) {
      console.error('Error in step2:', error)
      toast({
        title: "错误",
        description: error.message || "分析失败，请重试",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  // 删除并重新编辑
  const handleDelete = async () => {
    try {
      setLoading(true)

      const response = await fetch(`/api/daily-review?date=${date}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        throw new Error('删除失败')
      }

      // 重置所有状态
      setStep('step1')
      setInitialInput('')
      setPrimaryMood(null)
      setSecondaryMood(null)
      setEvents([])
      setFeelingsInput('')
      setAiSummary('')

      toast({
        title: "已删除",
        description: "可以重新编辑"
      })
    } catch (error: any) {
      console.error('Error deleting review:', error)
      toast({
        title: "错误",
        description: error.message || "删除失败",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) {
    return null
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-none shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col border border-gray-200">
        {/* 头部 */}
        <div className="flex items-center justify-between px-8 py-6 border-b border-gray-200">
          <h2 className="text-2xl font-light tracking-wide text-gray-900">今日回顾</h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="hover:bg-gray-100 rounded-none"
          >
            <X className="w-5 h-5 text-gray-600" />
          </Button>
        </div>

        {/* 内容区域 */}
        <div className="flex-1 overflow-y-auto p-8">
          {step === 'step1' && (
            <ReviewStep1
              initialValue={initialInput}
              onSubmit={handleStep1Submit}
              loading={loading}
            />
          )}

          {step === 'step2' && (
            <ReviewStep2
              primaryMood={primaryMood!}
              secondaryMood={secondaryMood}
              events={events}
              onSubmit={handleStep2Submit}
              loading={loading}
            />
          )}

          {step === 'result' && (
            <ReviewResult
              primaryMood={primaryMood!}
              secondaryMood={secondaryMood}
              events={events}
              aiSummary={aiSummary}
              onDelete={handleDelete}
              loading={loading}
            />
          )}
        </div>
      </div>
    </div>
  )
}