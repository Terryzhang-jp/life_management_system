"use client"

import { useState, useEffect, useCallback } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ChevronDown, ChevronUp, Send } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface DailyReview {
  energy: number
  focus: number
  mood: number
  sleep: number
  deepWorkBlocks: number
  connections: number
  learning: number
  exercise: number
  hasReview: boolean
  hasRefusal: boolean
  hasExploration: boolean
  deepWorkNotes?: string
  deliverables: number
  deliverableTypes?: string[]
  lateScreen: boolean
  excessCoffee: boolean
  noExercise: boolean
  customViolation?: string
  customViolationHit: boolean
  distractions?: string[]
  tomorrowTask?: string
  tomorrowTimeSlot?: string
  tomorrowDuration?: string
  tomorrowDoD?: string
  tomorrowAlarm: boolean
  tomorrowNotes?: string
  mvp?: string
  processScore?: number
  outputScore?: number
  totalScore?: number
}

export default function DailyReviewQuick() {
  const { toast } = useToast()
  const [expanded, setExpanded] = useState(false)
  const [review, setReview] = useState<DailyReview>({
    energy: 0,
    focus: 0,
    mood: 0,
    sleep: 0,
    deepWorkBlocks: 0,
    connections: 0,
    learning: 0,
    exercise: 0,
    hasReview: false,
    hasRefusal: false,
    hasExploration: false,
    deliverables: 0,
    lateScreen: false,
    excessCoffee: false,
    noExercise: false,
    customViolationHit: false,
    tomorrowAlarm: false,
    processScore: 0,
    outputScore: 0,
    totalScore: 0
  })

  useEffect(() => {
    loadTodayReview()
  }, [])

  const loadTodayReview = async () => {
    try {
      const response = await fetch('/api/daily-review-quick?type=today')
      if (response.ok) {
        const data = await response.json()
        if (data) {
          setReview(data)
        }
      }
    } catch (error) {
      console.error('Failed to load review:', error)
    }
  }

  const saveReview = async (updates: Partial<DailyReview>) => {
    const newReview = { ...review, ...updates }
    setReview(newReview)

    try {
      const response = await fetch('/api/daily-review-quick', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newReview)
      })

      if (response.ok) {
        const data = await response.json()
        setReview(data)
      }
    } catch (error) {
      console.error('Failed to save review:', error)
    }
  }

  const getEncouragementMessage = (totalScore: number) => {
    if (totalScore >= 25) {
      return "🎉 超级棒！今天是高效的一天，继续保持这个状态！"
    } else if (totalScore >= 18) {
      return "👏 很不错！稳扎稳打，明天再接再厉！"
    } else if (totalScore >= 12) {
      return "💪 不错的开始！每一步都是进步，加油！"
    } else if (totalScore >= 6) {
      return "🌱 今天也许不够完美，但你已经在路上了！"
    } else {
      return "🌟 休息也是一种力量，明天会更好！"
    }
  }

  const handleSubmit = () => {
    const message = getEncouragementMessage(review.totalScore || 0)
    toast({
      title: "今日回顾已提交",
      description: message,
      duration: 4000,
    })
    setExpanded(false)
  }

  const ScoreButton = ({ value, current, onClick, label }: any) => (
    <button
      onClick={() => onClick(value)}
      className={`px-3 py-1 rounded text-sm transition-all ${
        current === value
          ? 'bg-blue-500 text-white'
          : 'bg-gray-100 hover:bg-gray-200'
      }`}
    >
      {label ?? value}
    </button>
  )

  return (
    <Card className={`transition-all ${expanded ? 'p-6' : 'p-4'} h-auto`}>
      {/* 顶部得分显示 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-6">
          <div className="text-center">
            <div className="text-3xl font-bold text-blue-600">{review.totalScore || 0}</div>
            <div className="text-xs text-gray-500">总分</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-semibold text-green-600">{review.processScore || 0}</div>
            <div className="text-xs text-gray-500">过程P</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-semibold text-purple-600">{review.outputScore || 0}</div>
            <div className="text-xs text-gray-500">产出O</div>
          </div>
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => setExpanded(!expanded)}
          className="ml-auto"
        >
          每日速填
          {expanded ? <ChevronUp className="ml-1 h-4 w-4" /> : <ChevronDown className="ml-1 h-4 w-4" />}
        </Button>
      </div>

      {expanded && (
        <div className="space-y-6 pt-4 mt-4 border-t">
          {/* 1) 今日快照 */}
          <div>
            <h3 className="text-sm font-semibold mb-2 text-gray-600">1. 今日快照（不计分）</h3>
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <span className="text-sm w-12">精力</span>
                <div className="flex gap-1">
                  {[0, 1, 2, 3, 4, 5].map(v => (
                    <ScoreButton key={v} value={v} current={review.energy} onClick={(val: number) => saveReview({ energy: val })} />
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm w-12">专注</span>
                <div className="flex gap-1">
                  {[0, 1, 2, 3, 4, 5].map(v => (
                    <ScoreButton key={v} value={v} current={review.focus} onClick={(val: number) => saveReview({ focus: val })} />
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm w-12">情绪</span>
                <div className="flex gap-1">
                  {[0, 1, 2, 3, 4, 5].map(v => (
                    <ScoreButton key={v} value={v} current={review.mood} onClick={(val: number) => saveReview({ mood: val })} />
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm w-12">睡眠</span>
                <div className="flex gap-1">
                  {[
                    { v: 0, l: '≤5h' },
                    { v: 1, l: '5.5-6h' },
                    { v: 2, l: '6-6.5h' },
                    { v: 3, l: '6.5-7h' },
                    { v: 4, l: '7-8h' },
                    { v: 5, l: '≥8h' }
                  ].map(({ v, l }) => (
                    <ScoreButton key={v} value={v} current={review.sleep} onClick={(val: number) => saveReview({ sleep: val })} label={l} />
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* 2) 行动剂量 */}
          <div>
            <h3 className="text-sm font-semibold mb-2 text-gray-600">2. 行动剂量（计分）</h3>
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <span className="text-sm w-28">深度工作块</span>
                <div className="flex gap-1">
                  {[
                    { v: 0, l: '0' },
                    { v: 1, l: '1(3分)' },
                    { v: 2, l: '2(6分)' },
                    { v: 3, l: '3(9分)' },
                    { v: 4, l: '4+(12分)' }
                  ].map(({ v, l }) => (
                    <ScoreButton key={v} value={v} current={review.deepWorkBlocks} onClick={(val: number) => saveReview({ deepWorkBlocks: val })} label={l} />
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm w-28">外联/跟进</span>
                <div className="flex gap-1">
                  {[
                    { v: 0, l: '0' },
                    { v: 1, l: '1(2分)' },
                    { v: 2, l: '2(4分)' },
                    { v: 3, l: '3+(6分)' }
                  ].map(({ v, l }) => (
                    <ScoreButton key={v} value={v} current={review.connections} onClick={(val: number) => saveReview({ connections: val })} label={l} />
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm w-28">学习/检索</span>
                <div className="flex gap-1">
                  {[
                    { v: 0, l: '0' },
                    { v: 1, l: '1(1分)' },
                    { v: 2, l: '2+(2分)' }
                  ].map(({ v, l }) => (
                    <ScoreButton key={v} value={v} current={review.learning} onClick={(val: number) => saveReview({ learning: val })} label={l} />
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm w-28">运动分钟</span>
                <div className="flex gap-1">
                  {[
                    { v: 0, l: '0' },
                    { v: 10, l: '10(1分)' },
                    { v: 20, l: '20(2分)' },
                    { v: 30, l: '30+(3分)' }
                  ].map(({ v, l }) => (
                    <ScoreButton key={v} value={v} current={review.exercise} onClick={(val: number) => saveReview({ exercise: val })} label={l} />
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-4 text-sm">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={review.hasReview}
                    onChange={(e) => saveReview({ hasReview: e.target.checked })}
                    className="w-4 h-4"
                  />
                  复盘/记录 (1分)
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={review.hasRefusal}
                    onChange={(e) => saveReview({ hasRefusal: e.target.checked })}
                    className="w-4 h-4"
                  />
                  拒绝无效事项 (1分)
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={review.hasExploration}
                    onChange={(e) => saveReview({ hasExploration: e.target.checked })}
                    className="w-4 h-4"
                  />
                  探索位≥10′ (1分)
                </label>
              </div>
            </div>
          </div>

          {/* 3) 交付物 */}
          <div>
            <h3 className="text-sm font-semibold mb-2 text-gray-600">3. 交付物（DoD）</h3>
            <div className="flex items-center gap-3">
              <span className="text-sm w-28">完成数量</span>
              <div className="flex gap-1">
                {[
                  { v: 0, l: '0' },
                  { v: 1, l: '1(6分)' },
                  { v: 2, l: '2+(12分)' }
                ].map(({ v, l }) => (
                  <ScoreButton key={v} value={v} current={review.deliverables} onClick={(val: number) => saveReview({ deliverables: val })} label={l} />
                ))}
              </div>
            </div>
          </div>

          {/* 4) 红线与罚分 */}
          <div>
            <h3 className="text-sm font-semibold mb-2 text-gray-600">4. 红线与罚分</h3>
            <div className="flex items-center gap-4 text-sm">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={review.lateScreen}
                  onChange={(e) => saveReview({ lateScreen: e.target.checked })}
                  className="w-4 h-4"
                />
                23:30后用电脑/手机 (-3分)
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={review.excessCoffee}
                  onChange={(e) => saveReview({ excessCoffee: e.target.checked })}
                  className="w-4 h-4"
                />
                咖啡&gt;2杯 (-2分)
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={review.noExercise}
                  onChange={(e) => saveReview({ noExercise: e.target.checked })}
                  className="w-4 h-4"
                />
                运动&lt;10分钟 (-2分)
              </label>
            </div>
          </div>

          {/* 6) 明日一锤子 */}
          <div>
            <h3 className="text-sm font-semibold mb-2 text-gray-600">6. 明日一锤子</h3>
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <span className="text-sm w-20">任务类</span>
                <div className="flex gap-1">
                  {['论文', '代码', '招募访谈', '学习', '健康', '其他'].map(t => (
                    <ScoreButton
                      key={t}
                      value={t}
                      current={review.tomorrowTask}
                      onClick={(val: string) => saveReview({ tomorrowTask: val })}
                    />
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm w-20">时间段</span>
                <div className="flex gap-1">
                  {['07-10', '10-13', '13-16', '16-19', '19-22'].map(t => (
                    <ScoreButton
                      key={t}
                      value={t}
                      current={review.tomorrowTimeSlot}
                      onClick={(val: string) => saveReview({ tomorrowTimeSlot: val })}
                    />
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm w-20">时长</span>
                <div className="flex gap-1">
                  {['25′', '45′', '90′'].map(t => (
                    <ScoreButton
                      key={t}
                      value={t}
                      current={review.tomorrowDuration}
                      onClick={(val: string) => saveReview({ tomorrowDuration: val })}
                    />
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm w-20">DoD</span>
                <div className="flex gap-1">
                  {['图表草稿', 'PR合并', '预约3封', '访谈1次', '运动30′', '其他'].map(t => (
                    <ScoreButton
                      key={t}
                      value={t}
                      current={review.tomorrowDoD}
                      onClick={(val: string) => saveReview({ tomorrowDoD: val })}
                    />
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 cursor-pointer text-sm">
                  <input
                    type="checkbox"
                    checked={review.tomorrowAlarm}
                    onChange={(e) => saveReview({ tomorrowAlarm: e.target.checked })}
                    className="w-4 h-4"
                  />
                  设置闹钟
                </label>
              </div>
            </div>
          </div>

          {/* 7) 今日MVP */}
          <div>
            <h3 className="text-sm font-semibold mb-2 text-gray-600">7. 今日MVP（≤5字）</h3>
            <Input
              value={review.mvp || ''}
              onChange={(e) => saveReview({ mvp: e.target.value })}
              placeholder="最有价值的动作/产出"
              maxLength={5}
              className="max-w-xs"
            />
          </div>

          {/* 提交按钮 */}
          <div className="pt-4 border-t">
            <Button
              onClick={handleSubmit}
              className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
            >
              <Send className="mr-2 h-4 w-4" />
              提交今日回顾
            </Button>
          </div>
        </div>
      )}
    </Card>
  )
}
