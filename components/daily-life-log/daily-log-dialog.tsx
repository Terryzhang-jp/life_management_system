"use client"

import { useState, useEffect } from 'react'
import { X, Mic, ListChecks, BookOpen } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import VoiceInput from './voice-input'
import ConversationalReview from './conversational-review'
import LogDisplay from './log-display'
import { DailyLifeLog, CompletenessCheck } from '@/lib/daily-life-log-db'

interface DailyLogDialogProps {
  isOpen: boolean
  onClose: () => void
  date: string
}

type Step = 'input' | 'review' | 'display'

export default function DailyLogDialog({ isOpen, onClose, date }: DailyLogDialogProps) {
  const { toast } = useToast()
  const [step, setStep] = useState<Step>('input')
  const [loading, setLoading] = useState(false)

  // 数据状态
  const [rawInput, setRawInput] = useState('')
  const [extractedData, setExtractedData] = useState<Partial<DailyLifeLog>>({})
  const [completeness, setCompleteness] = useState<CompletenessCheck>({
    isComplete: false,
    missingFields: [],
    warnings: []
  })
  const [savedLog, setSavedLog] = useState<DailyLifeLog | null>(null)

  // 加载已有记录
  const loadExistingLog = async () => {
    try {
      const response = await fetch(`/api/daily-life-log?date=${date}`)
      if (response.ok) {
        const data = await response.json()
        if (data.exists && data.log) {
          const log: DailyLifeLog = data.log
          setSavedLog(log)
          setRawInput(log.rawInput)
          setExtractedData({
            wakeTime: log.wakeTime,
            plannedSleepTime: log.plannedSleepTime,
            breakfastDescription: log.breakfastDescription,
            lunchDescription: log.lunchDescription,
            dinnerDescription: log.dinnerDescription,
            morningActivity: log.morningActivity,
            morningMood: log.morningMood,
            afternoonActivity: log.afternoonActivity,
            afternoonMood: log.afternoonMood,
            eveningActivity: log.eveningActivity,
            eveningMood: log.eveningMood,
            nightActivity: log.nightActivity,
            nightMood: log.nightMood,
            confusions: log.confusions,
            thoughts: log.thoughts,
            insights: log.insights
          })
          // 如果已完成，直接显示
          if (log.status === 'completed') {
            setStep('display')
          }
        }
      }
    } catch (error) {
      console.error('Error loading existing log:', error)
    }
  }

  // 对话框打开时加载数据
  useEffect(() => {
    if (isOpen) {
      loadExistingLog()
    } else {
      // 关闭时重置状态
      setStep('input')
      setRawInput('')
      setExtractedData({})
      setCompleteness({
        isComplete: false,
        missingFields: [],
        warnings: []
      })
      setSavedLog(null)
    }
  }, [isOpen, date])

  // Step 1: 提交语音/文本输入
  const handleInputSubmit = async (input: string) => {
    try {
      setLoading(true)
      setRawInput(input)

      // 调用 AI 提取 API
      const extractResponse = await fetch('/api/daily-life-log/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rawInput: input })
      })

      if (!extractResponse.ok) {
        const errorData = await extractResponse.json()
        throw new Error(errorData.error || 'AI 提取失败')
      }

      const extractData = await extractResponse.json()

      setExtractedData(extractData.extractedData)
      setCompleteness(extractData.completeness)

      setStep('review')

      toast({
        title: "分析完成！",
        description: "请检查并补充缺失的信息"
      })
    } catch (error: any) {
      console.error('Error in input submit:', error)
      toast({
        title: "错误",
        description: error.message || "分析失败，请重试",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  // 客户端完整性检查函数（与服务器端逻辑一致）
  const checkCompletenessClient = (log: Partial<DailyLifeLog>): CompletenessCheck => {
    const missing: string[] = []

    // Check core required fields
    if (!log.wakeTime) missing.push('wakeTime')
    if (!log.plannedSleepTime) missing.push('plannedSleepTime')

    // Check individual meals
    if (!log.breakfastDescription) missing.push('breakfastDescription')
    if (!log.lunchDescription) missing.push('lunchDescription')
    if (!log.dinnerDescription) missing.push('dinnerDescription')

    // Check activities for each time period
    if (!log.morningActivity) missing.push('morningActivity')
    if (!log.morningMood) missing.push('morningMood')
    if (!log.afternoonActivity) missing.push('afternoonActivity')
    if (!log.afternoonMood) missing.push('afternoonMood')
    if (!log.eveningActivity) missing.push('eveningActivity')
    if (!log.eveningMood) missing.push('eveningMood')

    // Optional fields
    if (!log.nightActivity) missing.push('nightActivity')
    if (!log.nightMood) missing.push('nightMood')
    if (!log.confusions) missing.push('confusions')
    if (!log.thoughts) missing.push('thoughts')
    if (!log.insights) missing.push('insights')

    // 完整性判断：必须有起床/睡觉时间、至少一顿饭、至少一个时段的活动
    const hasMeals = log.breakfastDescription || log.lunchDescription || log.dinnerDescription
    const hasActivities = log.morningActivity || log.afternoonActivity || log.eveningActivity || log.nightActivity

    return {
      isComplete: !!(log.wakeTime && log.plannedSleepTime && hasMeals && hasActivities),
      missingFields: missing,
      warnings: []
    }
  }

  // 处理数据更新（从对话式补充）
  const handleDataUpdate = (updatedData: Partial<DailyLifeLog>, newRawInput: string) => {
    console.log('🎯 handleDataUpdate called with:', updatedData)

    // 创建新对象引用，确保 React 检测到变化
    const newData = { ...updatedData }
    console.log('🆕 Created new data object:', newData)
    setExtractedData(newData)
    setRawInput(newRawInput)

    // 重新检查完整性
    const newCompleteness = checkCompletenessClient(newData)
    console.log('✅ New completeness:', newCompleteness)
    setCompleteness(newCompleteness)
  }

  // Step 2: 确认数据并保存
  const handleDataConfirm = async (data: Partial<DailyLifeLog>) => {
    try {
      setLoading(true)

      // 重新检查完整性
      const checkResponse = await fetch('/api/daily-life-log/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rawInput: rawInput })
      })

      if (checkResponse.ok) {
        const checkData = await checkResponse.json()
        const newCompleteness = checkData.completeness

        // 使用用户编辑后的数据更新完整性检查
        const updatedLog = {
          ...checkData.extractedData,
          ...data
        }

        // 手动重新检查完整性（基于用户编辑的数据）
        const hasMeals = updatedLog.breakfastDescription || updatedLog.lunchDescription || updatedLog.dinnerDescription
        const hasActivities = updatedLog.morningActivity || updatedLog.afternoonActivity ||
                              updatedLog.eveningActivity || updatedLog.nightActivity
        const isComplete = updatedLog.wakeTime && updatedLog.plannedSleepTime && hasMeals && hasActivities

        const status = isComplete ? 'completed' : 'draft'

        // 保存到数据库
        let saveResponse
        if (savedLog) {
          // 更新已有记录
          saveResponse = await fetch(`/api/daily-life-log?date=${date}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              extractedData: updatedLog,
              status
            })
          })
        } else {
          // 创建新记录
          saveResponse = await fetch('/api/daily-life-log', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              date,
              rawInput,
              extractedData: updatedLog,
              status
            })
          })
        }

        if (!saveResponse.ok) {
          const errorData = await saveResponse.json()
          throw new Error(errorData.error || '保存失败')
        }

        // 重新加载完整数据
        await loadExistingLog()

        setStep('display')

        toast({
          title: "保存成功！",
          description: status === 'completed' ? '今日记录已完成' : '草稿已保存'
        })
      }
    } catch (error: any) {
      console.error('Error in data confirm:', error)
      toast({
        title: "错误",
        description: error.message || "保存失败，请重试",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  // 返回编辑
  const handleBackToInput = () => {
    setStep('input')
  }

  // 从显示界面返回编辑
  const handleEditFromDisplay = () => {
    setStep('review')
  }

  if (!isOpen) {
    return null
  }

  const steps: Array<{ id: Step; label: string; description: string; icon: JSX.Element }> = [
    {
      id: 'input',
      label: '采集今日素材',
      description: '语音或文字描述你的一天，由 AI 帮你整理结构化信息。',
      icon: <Mic className="w-4 h-4" />
    },
    {
      id: 'review',
      label: '补充与确认',
      description: '查看已提取的数据，补足细节，让记录更完整。',
      icon: <ListChecks className="w-4 h-4" />
    },
    {
      id: 'display',
      label: '欣赏成品',
      description: '回顾今日的亮点与感悟，如有需要随时再编辑。',
      icon: <BookOpen className="w-4 h-4" />
    }
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-black/60 via-black/45 to-black/60 backdrop-blur">
      <div className="relative w-full max-w-5xl px-4">
        <div className="absolute -top-10 right-6">
          <Button
            variant="ghost"
            className="rounded-full bg-white/10 hover:bg-white/20 text-white"
            onClick={onClose}
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        <div className="grid md:grid-cols-[240px_1fr] gap-0 rounded-3xl bg-white shadow-[0_32px_80px_rgba(15,23,42,0.2)] overflow-hidden">
          <aside className="bg-gradient-to-br from-[#1f2937] to-[#0f172a] text-white p-8 hidden md:flex flex-col justify-between">
            <div>
              <div className="text-xs uppercase tracking-[0.4em] text-white/60 mb-6">Daily Log</div>
              <div className="text-3xl font-light leading-tight">{date}</div>
              <p className="text-sm text-white/70 mt-4">
                记录感受，捕捉灵感，让每一天的细节都有归处。
              </p>
            </div>

            <div className="space-y-6 mt-12">
              {steps.map(({ id, label, description, icon }) => {
                const active = step === id
                return (
                  <div key={id} className="flex gap-4">
                    <div
                      className={`mt-1 w-6 h-6 rounded-full flex items-center justify-center ${
                        active ? 'bg-white text-[#0f172a]' : 'border border-white/40 text-white/60'
                      }`}
                    >
                      {icon}
                    </div>
                    <div>
                      <div className={`text-sm font-medium ${active ? 'text-white' : 'text-white/70'}`}>
                        {label}
                      </div>
                      <p className="text-xs text-white/60 leading-relaxed mt-1">{description}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          </aside>

          <main className="bg-white p-8 md:p-10 max-h-[80vh] overflow-y-auto">
            <div className="md:hidden mb-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs uppercase tracking-[0.4em] text-gray-400">Daily Log</div>
                  <div className="text-2xl font-semibold text-gray-900 mt-2">{date}</div>
                </div>
                <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full">
                  <X className="w-5 h-5 text-gray-600" />
                </Button>
              </div>
              <div className="mt-4 space-y-3">
                {steps.map(({ id, label }) => (
                  <div key={id} className={`text-sm font-medium ${step === id ? 'text-gray-900' : 'text-gray-400'}`}>
                    {label}
                  </div>
                ))}
              </div>
            </div>

            {step === 'input' && (
              <VoiceInput initialValue={rawInput} onSubmit={handleInputSubmit} loading={loading} />
            )}

            {step === 'review' && (
              <ConversationalReview
                extractedData={extractedData}
                completeness={completeness}
                rawInput={rawInput}
                date={date}
                onUpdate={handleDataUpdate}
                onConfirm={handleDataConfirm}
                onBack={handleBackToInput}
                loading={loading}
              />
            )}

            {step === 'display' && savedLog && (
              <LogDisplay log={savedLog} onClose={onClose} onEdit={handleEditFromDisplay} />
            )}
          </main>
        </div>
      </div>
    </div>
  )
}
