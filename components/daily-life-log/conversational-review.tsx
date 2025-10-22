"use client"

import { useState, useEffect, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Sparkles, Check, Mic, Type, Loader2, ArrowRight } from 'lucide-react'
import { DailyLifeLog, CompletenessCheck } from '@/lib/daily-life-log-db'
import VoiceRecorder from '@/components/ui/voice-recorder'

interface ConversationalReviewProps {
  extractedData: Partial<DailyLifeLog>
  completeness: CompletenessCheck
  rawInput: string
  date: string
  onUpdate: (updatedData: Partial<DailyLifeLog>, newRawInput: string) => void
  onConfirm: (data: Partial<DailyLifeLog>) => void
  onBack: () => void
  loading?: boolean
}

export default function ConversationalReview({
  extractedData,
  completeness,
  rawInput,
  date,
  onUpdate,
  onConfirm,
  onBack,
  loading = false
}: ConversationalReviewProps) {
  const [aiMessage, setAiMessage] = useState('')
  const [loadingMessage, setLoadingMessage] = useState(false)
  const [extracting, setExtracting] = useState(false)
  const [useVoice, setUseVoice] = useState(true)
  const [manualText, setManualText] = useState('')

  const loadAIMessage = async () => {
    try {
      setLoadingMessage(true)

      const response = await fetch('/api/daily-life-log/dialogue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          extractedData,
          completeness,
          date
        })
      })

      if (response.ok) {
        const data = await response.json()
        setAiMessage(data.message)
      }
    } catch (error) {
      console.error('Failed to load AI message:', error)
      setAiMessage('准备好补充更多信息了吗？')
    } finally {
      setLoadingMessage(false)
    }
  }

  const extractedDataKey = useMemo(() => JSON.stringify(extractedData), [extractedData])
  const completenessKey = useMemo(() => JSON.stringify(completeness), [completeness])

  useEffect(() => {
    loadAIMessage()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (extractedDataKey !== '{}') {
      loadAIMessage()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [extractedDataKey, completenessKey])

  const handleVoiceComplete = async (supplementText: string) => {
    await handleSupplementSubmit(supplementText)
  }

  const handleManualSubmit = async () => {
    if (manualText.trim()) {
      await handleSupplementSubmit(manualText.trim())
      setManualText('')
    }
  }

  const handleSupplementSubmit = async (supplementText: string) => {
    try {
      setExtracting(true)

      const combinedInput = `${rawInput}\n\n补充信息：\n${supplementText}`

      const extractResponse = await fetch('/api/daily-life-log/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rawInput: supplementText,
          existingRawInput: rawInput,
          existingData: extractedData
        })
      })

      if (!extractResponse.ok) {
        throw new Error('提取补充信息失败')
      }

      const extractData = await extractResponse.json()

      const mergeResponse = await fetch('/api/daily-life-log/merge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          oldData: extractedData,
          newExtractedData: extractData.extractedData
        })
      })

      let mergedData
      if (mergeResponse.ok) {
        const mergeData = await mergeResponse.json()
        mergedData = mergeData.mergedData
      } else {
        mergedData = { ...extractedData }
        Object.keys(extractData.extractedData).forEach((key) => {
          const newValue = extractData.extractedData[key]
          if (newValue !== null && newValue !== undefined && newValue !== '') {
            mergedData[key as keyof DailyLifeLog] = newValue
          }
        })
      }

      onUpdate(mergedData, combinedInput)
    } catch (error) {
      console.error('Error processing supplement:', error)
      alert('处理补充信息失败，请重试')
    } finally {
      setExtracting(false)
    }
  }

  const renderRecordedInfo = () => {
    const items: { icon: string; label: string; value: string }[] = []

    if (extractedData.wakeTime) items.push({ icon: '⏰', label: '起床', value: extractedData.wakeTime })
    if (extractedData.plannedSleepTime) items.push({ icon: '🌙', label: '计划睡觉', value: extractedData.plannedSleepTime })

    if (extractedData.breakfastDescription) items.push({ icon: '🍳', label: '早餐', value: extractedData.breakfastDescription })
    if (extractedData.lunchDescription) items.push({ icon: '🥗', label: '午餐', value: extractedData.lunchDescription })
    if (extractedData.dinnerDescription) items.push({ icon: '🍽️', label: '晚餐', value: extractedData.dinnerDescription })

    if (extractedData.morningActivity) items.push({ icon: '🌅', label: '上午', value: extractedData.morningActivity })
    if (extractedData.morningMood) items.push({ icon: '🙂', label: '上午心情', value: extractedData.morningMood })

    if (extractedData.afternoonActivity) items.push({ icon: '☀️', label: '下午', value: extractedData.afternoonActivity })
    if (extractedData.afternoonMood) items.push({ icon: '😊', label: '下午心情', value: extractedData.afternoonMood })

    if (extractedData.eveningActivity) items.push({ icon: '🌆', label: '晚上', value: extractedData.eveningActivity })
    if (extractedData.eveningMood) items.push({ icon: '😌', label: '晚上心情', value: extractedData.eveningMood })

    if (extractedData.nightActivity) items.push({ icon: '🌃', label: '深夜', value: extractedData.nightActivity })
    if (extractedData.nightMood) items.push({ icon: '🌙', label: '深夜心情', value: extractedData.nightMood })

    if (extractedData.confusions) items.push({ icon: '🤔', label: '困惑', value: extractedData.confusions })
    if (extractedData.thoughts) items.push({ icon: '💭', label: '想法', value: extractedData.thoughts })
    if (extractedData.insights) items.push({ icon: '💡', label: '启发', value: extractedData.insights })

    if (items.length === 0) {
      return (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white/70 px-5 py-8 text-center text-sm text-slate-500">
          还没有内容，等你来补充今日的第一条记录。
        </div>
      )
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {items.map((item, index) => (
          <div
            key={index}
            className="rounded-2xl border border-white/60 bg-white/80 backdrop-blur-sm shadow-sm p-4 flex items-start gap-3"
          >
            <div className="h-8 w-8 rounded-full bg-gradient-to-br from-[#4f46e5]/15 to-[#7c3aed]/20 flex items-center justify-center text-lg">
              <span>{item.icon}</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-semibold uppercase tracking-widest text-slate-400">
                {item.label}
              </div>
              <div className="mt-1 text-sm text-slate-900 leading-relaxed break-words">
                {item.value}
              </div>
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <section className="rounded-3xl border border-white/70 bg-white/80 shadow-sm px-6 py-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-[#4f46e5]/15 to-[#7c3aed]/20 flex items-center justify-center text-[#4f46e5]">
            <Check className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-slate-900">已记录信息</h3>
            <p className="text-sm text-slate-500 mt-1">当前已捕捉的生活片段</p>
          </div>
        </div>
        {renderRecordedInfo()}
      </section>

      {!completeness.isComplete && (
        <section className="rounded-3xl border border-white/80 bg-white/90 shadow-sm p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-[#38bdf8]/15 to-[#c084fc]/20 flex items-center justify-center text-[#2563eb]">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-lg font-semibold text-slate-900">AI 助手建议</h4>
              <p className="text-sm text-slate-500 mt-1">我们发现还有一些细节值得补充</p>
            </div>
          </div>
          <div className="rounded-2xl border border-dashed border-indigo-200 bg-indigo-50/60 px-5 py-4">
            {loadingMessage ? (
              <div className="flex items-center gap-2 text-indigo-500 text-sm">
                <Loader2 className="w-4 h-4 animate-spin" />
                正在分析新的线索...
              </div>
            ) : (
              <div className="text-sm leading-relaxed text-slate-700 whitespace-pre-line">
                {aiMessage.split('**').map((part, index) =>
                  index % 2 === 1 ? (
                    <strong key={index} className="font-semibold text-slate-900">
                      {part}
                    </strong>
                  ) : (
                    <span key={index}>{part}</span>
                  )
                )}
              </div>
            )}
          </div>
        </section>
      )}

      {!completeness.isComplete && (
        <section className="rounded-3xl bg-gradient-to-br from-[#eef2ff] via-[#f8fafc] to-white border border-white/80 shadow-sm p-8 space-y-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h4 className="text-lg font-semibold text-slate-900">补充生活细节</h4>
              <p className="text-sm text-slate-500 mt-1">
                通过语音叙述或文字补充，把今天的故事说完整。
              </p>
            </div>
            <div className="inline-flex items-center rounded-full bg-white/90 shadow-inner p-1 border border-white">
              <button
                type="button"
                onClick={() => setUseVoice(true)}
                className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-full transition-all ${
                  useVoice ? 'bg-gradient-to-r from-[#4f46e5] to-[#7c3aed] text-white shadow-lg' : 'text-slate-500'
                }`}
              >
                <Mic className="w-4 h-4" />
                语音输入
              </button>
              <button
                type="button"
                onClick={() => setUseVoice(false)}
                className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-full transition-all ${
                  !useVoice ? 'bg-gradient-to-r from-[#ec4899] to-[#f97316] text-white shadow-lg' : 'text-slate-500'
                }`}
              >
                <Type className="w-4 h-4" />
                文本输入
              </button>
            </div>
          </div>

          <div className="rounded-3xl border border-white/80 bg-white/80 shadow-inner p-6">
            {useVoice ? (
              <VoiceRecorder
                language="zh"
                onTranscriptComplete={handleVoiceComplete}
                placeholder="开启记录，用自然的语气讲述你想补充的故事..."
                showManualFinalize={true}
              />
            ) : (
              <div className="space-y-4">
                <textarea
                  value={manualText}
                  onChange={(e) => setManualText(e.target.value)}
                  placeholder="请写下今天的关键瞬间、情绪波动或任何你想记住的细节..."
                  className="w-full min-h-[160px] rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 leading-relaxed shadow-sm focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200 focus:outline-none resize-none"
                  disabled={extracting}
                />
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-sm text-slate-500">
                  <span>已输入 {manualText.length} 字</span>
                  <Button
                    onClick={handleManualSubmit}
                    disabled={!manualText.trim() || extracting}
                    className="rounded-full px-6"
                  >
                    {extracting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    {extracting ? '分析中...' : '提交补充'}
                    {!extracting && <ArrowRight className="w-4 h-4 ml-2" />}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        <Button
          onClick={() => onConfirm(extractedData)}
          variant={completeness.isComplete ? 'default' : 'outline'}
          size="lg"
          className="flex-1 rounded-full"
          disabled={loading || extracting}
        >
          {loading ? '保存中...' : completeness.isComplete ? '✓ 完成并保存' : '暂存现有内容'}
        </Button>

        <Button
          onClick={onBack}
          variant="ghost"
          size="lg"
          disabled={loading || extracting}
          className="rounded-full"
        >
          重新输入
        </Button>
      </div>

      {extracting && (
        <div className="text-center py-4 text-sm text-indigo-500 flex items-center justify-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin" />
          正在分析补充内容，请稍候...
        </div>
      )}
    </div>
  )
}
