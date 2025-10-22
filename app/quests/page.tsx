"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import QuestAssistantDrawer from "@/components/quest/quest-assistant-drawer"
import { ManualModeToggle } from "@/components/quest/manual-mode-toggle"
import {
  QuestProgressBar,
  MomentumBadge,
  MilestoneMiniCard
} from "@/components/quest"
import { Sparkles, ChevronDown, ChevronUp } from "lucide-react"
import type { QuestProgress } from "@/lib/quest-progress-types"
import { useManualMode } from "@/hooks/use-manual-mode"

/**
 * Quest列表页 - 完全重构版
 *
 * 设计理念：
 * - 进度可视化优先 - 每个Quest都显示进度条
 * - Vision分组 - 按Vision组织Quest
 * - Momentum状态 - 清晰显示Quest活跃度
 * - 可展开Milestone - 预览当前Milestone和最近完成项
 * - 简约风格 - 黑/白/灰配色，大字体
 */

interface Vision {
  id?: number
  title: string
  description?: string
  createdAt?: string
  updatedAt?: string
}

interface Quest {
  id?: number
  visionId: number
  type: 'main' | 'side'
  title: string
  why: string
  status: 'active' | 'paused' | 'completed' | 'abandoned'
  lastActivityAt?: string
  targetDate?: string
  createdAt?: string
  updatedAt?: string
}

interface QuestWithProgress extends Quest {
  progress?: QuestProgress
}

export default function QuestsPage() {
  const { toast } = useToast()
  const { isUnlocked } = useManualMode()

  // 数据状态
  const [visions, setVisions] = useState<Vision[]>([])
  const [quests, setQuests] = useState<Quest[]>([])
  const [questsProgress, setQuestsProgress] = useState<Map<number, QuestProgress>>(new Map())
  const [loading, setLoading] = useState(false)
  const [progressLoading, setProgressLoading] = useState(false)

  // UI状态
  const [assistantOpen, setAssistantOpen] = useState(false)
  const [expandedQuests, setExpandedQuests] = useState<Set<number>>(new Set())

  // Vision表单状态
  const [showVisionForm, setShowVisionForm] = useState(false)
  const [visionTitle, setVisionTitle] = useState("")
  const [visionDesc, setVisionDesc] = useState("")

  // Quest表单状态
  const [showQuestForm, setShowQuestForm] = useState(false)
  const [questVisionId, setQuestVisionId] = useState<number | null>(null)
  const [questType, setQuestType] = useState<'main' | 'side'>('main')
  const [questTitle, setQuestTitle] = useState("")
  const [questWhy, setQuestWhy] = useState("")

  useEffect(() => {
    fetchVisions()
    fetchQuests()
  }, [])

  // 当Quests加载完成后，批量获取进度
  useEffect(() => {
    if (quests.length > 0) {
      fetchQuestsProgress()
    }
  }, [quests])

  const fetchVisions = async () => {
    try {
      const response = await fetch('/api/visions')
      if (response.ok) {
        const data = await response.json()
        setVisions(data)
      }
    } catch (error) {
      console.error('Failed to fetch visions:', error)
    }
  }

  const fetchQuests = async () => {
    try {
      const response = await fetch('/api/quests')
      if (response.ok) {
        const data = await response.json()
        setQuests(data)
      }
    } catch (error) {
      console.error('Failed to fetch quests:', error)
    }
  }

  /**
   * 批量获取Quest进度
   */
  const fetchQuestsProgress = async () => {
    setProgressLoading(true)
    try {
      const questIds = quests.filter(q => q.id).map(q => q.id!)
      if (questIds.length === 0) return

      const response = await fetch(`/api/quests/progress?ids=${questIds.join(',')}`)
      if (response.ok) {
        const result = await response.json()
        if (result.success && result.data) {
          const progressMap = new Map<number, QuestProgress>()
          result.data.forEach((progress: QuestProgress) => {
            progressMap.set(progress.questId, progress)
          })
          setQuestsProgress(progressMap)
        }
      }
    } catch (error) {
      console.error('Failed to fetch quests progress:', error)
    } finally {
      setProgressLoading(false)
    }
  }

  // Vision CRUD
  const addVision = async () => {
    if (!visionTitle.trim()) {
      toast({ title: "请输入愿景标题", variant: "destructive" })
      return
    }

    setLoading(true)
    try {
      const response = await fetch('/api/visions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: visionTitle.trim(), description: visionDesc.trim() })
      })

      if (response.ok) {
        await fetchVisions()
        setVisionTitle("")
        setVisionDesc("")
        setShowVisionForm(false)
        toast({ title: "愿景已添加 ✨" })
      }
    } catch (error) {
      toast({ title: "添加失败", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  const deleteVision = async (id: number) => {
    if (!confirm('确定要删除这个愿景吗？相关的Quest也会被删除。')) return

    setLoading(true)
    try {
      const response = await fetch(`/api/visions?id=${id}`, { method: 'DELETE' })
      if (response.ok) {
        await fetchVisions()
        await fetchQuests()
        toast({ title: "愿景已删除" })
      }
    } catch (error) {
      toast({ title: "删除失败", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  // Quest CRUD
  const addQuest = async () => {
    if (!questVisionId) {
      toast({ title: "请先选择一个愿景", variant: "destructive" })
      return
    }
    if (!questTitle.trim()) {
      toast({ title: "请输入Quest标题", variant: "destructive" })
      return
    }
    if (!questWhy.trim()) {
      toast({ title: "请说明为什么要做这个Quest", variant: "destructive" })
      return
    }

    setLoading(true)
    try {
      const response = await fetch('/api/quests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          visionId: questVisionId,
          type: questType,
          title: questTitle.trim(),
          why: questWhy.trim(),
          status: 'active'
        })
      })

      if (response.ok) {
        await fetchQuests()
        setQuestTitle("")
        setQuestWhy("")
        setShowQuestForm(false)
        toast({ title: "Quest已添加 🎯" })
      }
    } catch (error) {
      toast({ title: "添加失败", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  const deleteQuest = async (id: number) => {
    if (!confirm('确定要删除这个Quest吗？')) return

    setLoading(true)
    try {
      const response = await fetch(`/api/quests?id=${id}`, { method: 'DELETE' })
      if (response.ok) {
        await fetchQuests()
        toast({ title: "Quest已删除" })
      }
    } catch (error) {
      toast({ title: "删除失败", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  /**
   * 切换Quest的展开/收起状态
   */
  const toggleQuestExpanded = (questId: number) => {
    const newExpanded = new Set(expandedQuests)
    if (newExpanded.has(questId)) {
      newExpanded.delete(questId)
    } else {
      newExpanded.add(questId)
    }
    setExpandedQuests(newExpanded)
  }

  const activeQuests = quests.filter(q => q.status === 'active')

  /**
   * 按Vision分组Quest
   */
  const questsByVision = visions.map(vision => ({
    vision,
    quests: activeQuests.filter(q => q.visionId === vision.id)
  })).filter(group => group.quests.length > 0)

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-6xl mx-auto px-8 py-12">
        {/* 头部 */}
        <div className="mb-16">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-5xl font-bold text-gray-900 mb-3 tracking-tight">QUESTS</h1>
              <p className="text-sm text-gray-500">愿景驱动的人生任务系统 · 进度可视化</p>
            </div>
            <div className="flex items-center gap-4">
              <Button
                onClick={() => setAssistantOpen(true)}
                className="bg-amber-600 hover:bg-amber-700"
              >
                <Sparkles className="w-4 h-4 mr-2" />
                Quest Assistant
              </Button>
              <Link href="/future">
                <button className="text-sm text-gray-600 hover:text-gray-900 transition-colors">
                  ← 返回Future
                </button>
              </Link>
            </div>
          </div>

          {/* Manual Mode Toggle */}
          <div className="pt-6 border-t border-gray-100">
            <ManualModeToggle />
          </div>
        </div>

        {/* Visions区域 */}
        <div className="mb-24">
          <div className="flex items-center justify-between mb-12">
            <h2 className="text-xs text-gray-400 tracking-wide">visions</h2>
            {isUnlocked && (
              <button
                onClick={() => setShowVisionForm(!showVisionForm)}
                className="text-xs text-gray-400 hover:text-gray-900 transition-colors"
              >
                add
              </button>
            )}
          </div>

          <div className="space-y-12">
            {/* Vision列表 */}
            {visions.length === 0 && !showVisionForm && (
              <div className="text-center py-16 text-gray-400">
                <p className="text-sm">还没有愿景，开始创建第一个吧</p>
              </div>
            )}

            {visions.map((vision) => (
              <div key={vision.id} className="group">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold text-gray-900 mb-2 leading-tight">{vision.title}</h3>
                    {vision.description && (
                      <p className="text-sm text-gray-600 leading-relaxed">{vision.description}</p>
                    )}
                  </div>
                  <button
                    onClick={() => deleteVision(vision.id!)}
                    className="opacity-0 group-hover:opacity-100 text-xs text-gray-300 hover:text-gray-600 transition-all ml-8"
                  >
                    delete
                  </button>
                </div>
              </div>
            ))}

            {/* Vision表单 */}
            {showVisionForm && (
              <div className="border-t border-gray-200 pt-8 space-y-4">
                <Input
                  placeholder="愿景标题 (例: 成为世界级研究者)"
                  value={visionTitle}
                  onChange={(e) => setVisionTitle(e.target.value)}
                  autoFocus
                  className="border-0 border-b border-gray-200 rounded-none px-0 focus:border-gray-900 text-xl font-semibold"
                />
                <Textarea
                  placeholder="为什么这个愿景重要？对我意味着什么？"
                  value={visionDesc}
                  onChange={(e) => setVisionDesc(e.target.value)}
                  className="min-h-[100px] border-0 border-b border-gray-200 rounded-none px-0 focus:border-gray-900 resize-none"
                />
                <div className="flex gap-4 pt-4">
                  <button
                    onClick={addVision}
                    disabled={loading || !visionTitle.trim()}
                    className="text-sm text-gray-900 hover:text-gray-600 font-medium disabled:opacity-30 transition-colors"
                  >
                    保存
                  </button>
                  <button
                    onClick={() => {
                      setShowVisionForm(false)
                      setVisionTitle("")
                      setVisionDesc("")
                    }}
                    className="text-sm text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    取消
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Active Quests区域 - 按Vision分组 */}
        <div className="border-t border-gray-200 pt-24">
          <div className="flex items-center justify-between mb-12">
            <h2 className="text-xs text-gray-400 tracking-wide">active quests · progress view</h2>
            {isUnlocked && visions.length > 0 && (
              <button
                onClick={() => setShowQuestForm(!showQuestForm)}
                className="text-xs text-gray-400 hover:text-gray-900 transition-colors"
              >
                add
              </button>
            )}
          </div>

          <div className="space-y-20">
            {/* Quest表单 */}
            {showQuestForm && (
              <div className="border-t border-gray-200 pt-8 space-y-6">
                <div className="space-y-3">
                  <label className="text-xs text-gray-500 uppercase tracking-wider">选择Vision</label>
                  <select
                    className="w-full p-0 border-0 border-b border-gray-200 rounded-none focus:border-gray-900 text-base bg-transparent"
                    value={questVisionId || ''}
                    onChange={(e) => setQuestVisionId(parseInt(e.target.value))}
                  >
                    <option value="">-- 选择一个Vision --</option>
                    {visions.map(v => (
                      <option key={v.id} value={v.id}>{v.title}</option>
                    ))}
                  </select>
                </div>

                <div className="flex gap-6">
                  <button
                    onClick={() => setQuestType('main')}
                    className={`flex-1 py-2 text-sm transition-colors ${
                      questType === 'main'
                        ? 'text-gray-900 border-b-2 border-gray-900 font-medium'
                        : 'text-gray-400 border-b border-gray-200'
                    }`}
                  >
                    Main Quest
                  </button>
                  <button
                    onClick={() => setQuestType('side')}
                    className={`flex-1 py-2 text-sm transition-colors ${
                      questType === 'side'
                        ? 'text-gray-900 border-b-2 border-gray-900 font-medium'
                        : 'text-gray-400 border-b border-gray-200'
                    }`}
                  >
                    Side Quest
                  </button>
                </div>

                <Input
                  placeholder="Quest标题 (例: 在HCI顶会发表论文)"
                  value={questTitle}
                  onChange={(e) => setQuestTitle(e.target.value)}
                  className="border-0 border-b border-gray-200 rounded-none px-0 focus:border-gray-900 text-xl font-semibold"
                />
                <Textarea
                  placeholder="为什么要做这个Quest？对愿景有什么贡献？"
                  value={questWhy}
                  onChange={(e) => setQuestWhy(e.target.value)}
                  className="min-h-[100px] border-0 border-b border-gray-200 rounded-none px-0 focus:border-gray-900 resize-none"
                />

                <div className="flex gap-4 pt-4">
                  <button
                    onClick={addQuest}
                    disabled={loading}
                    className="text-sm text-gray-900 hover:text-gray-600 font-medium disabled:opacity-30 transition-colors"
                  >
                    保存
                  </button>
                  <button
                    onClick={() => {
                      setShowQuestForm(false)
                      setQuestTitle("")
                      setQuestWhy("")
                    }}
                    className="text-sm text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    取消
                  </button>
                </div>
              </div>
            )}

            {/* 无Quest提示 */}
            {activeQuests.length === 0 && !showQuestForm && (
              <div className="text-center py-16 text-gray-400">
                <p className="text-sm">还没有Active Quest</p>
                {visions.length === 0 && (
                  <p className="text-xs mt-2">请先创建一个Vision</p>
                )}
              </div>
            )}

            {/* 按Vision分组的Quest列表 */}
            {questsByVision.map(({ vision, quests: visionQuests }) => (
              <div key={vision.id} className="space-y-8">
                {/* Vision标题 */}
                <div className="border-b border-gray-100 pb-3">
                  <p className="text-xs text-gray-400">{vision.title}</p>
                </div>

                {/* Vision下的Quests */}
                <div className="space-y-12">
                  {visionQuests.map((quest) => {
                    const progress = questsProgress.get(quest.id!)
                    const isExpanded = expandedQuests.has(quest.id!)

                    return (
                      <div key={quest.id} className="group">
                        {/* Quest主要信息 */}
                        <div className="flex items-start justify-between mb-6">
                          <div className="flex-1">
                            <div className="flex items-baseline gap-4 mb-2">
                              <h3 className="text-3xl font-bold text-gray-900 leading-tight tracking-tight">
                                {quest.title}
                              </h3>
                              {quest.type === 'side' && (
                                <span className="text-xs text-gray-400 uppercase tracking-wider">side</span>
                              )}
                            </div>
                            <p className="text-sm text-gray-600 leading-relaxed max-w-2xl">
                              {quest.why}
                            </p>
                          </div>

                          {/* 操作按钮 */}
                          <div className="flex gap-6 ml-12 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Link href={`/quests/${quest.id}`}>
                              <button className="text-xs text-gray-400 hover:text-gray-900 transition-colors">
                                timeline
                              </button>
                            </Link>
                            <button
                              onClick={() => deleteQuest(quest.id!)}
                              className="text-xs text-gray-300 hover:text-gray-600 transition-colors"
                            >
                              delete
                            </button>
                          </div>
                        </div>

                        {/* 进度可视化区域 */}
                        {progress && (
                          <div className="space-y-6">
                            {/* 进度条 + Momentum状态 */}
                            <div className="flex items-end gap-6">
                              <div className="flex-1">
                                <QuestProgressBar
                                  progress={progress.overallProgress}
                                  showDetails={true}
                                  completedMilestones={progress.completedMilestones}
                                  totalMilestones={progress.totalMilestones}
                                  height="md"
                                />
                              </div>
                              <MomentumBadge
                                status={progress.momentumStatus}
                                lastActivityAt={progress.lastActivityAt}
                                showTime={true}
                                size="md"
                              />
                            </div>

                            {/* 当前Milestone */}
                            {progress.currentMilestone && (
                              <div className="pl-4 border-l-2 border-gray-200">
                                <p className="text-xs text-gray-400 mb-3">CURRENT MILESTONE</p>
                                <MilestoneMiniCard
                                  milestone={progress.currentMilestone}
                                  defaultExpanded={false}
                                />
                              </div>
                            )}

                            {/* 展开/收起按钮 */}
                            {progress.recentCompletions.length > 0 && (
                              <button
                                onClick={() => toggleQuestExpanded(quest.id!)}
                                className="flex items-center gap-2 text-xs text-gray-400 hover:text-gray-900 transition-colors"
                              >
                                {isExpanded ? (
                                  <>
                                    <ChevronUp className="w-3 h-3" />
                                    Hide recent completions
                                  </>
                                ) : (
                                  <>
                                    <ChevronDown className="w-3 h-3" />
                                    Show recent completions ({progress.recentCompletions.length})
                                  </>
                                )}
                              </button>
                            )}

                            {/* 最近完成项（可展开） */}
                            {isExpanded && progress.recentCompletions.length > 0 && (
                              <div className="pl-4 border-l-2 border-gray-200 space-y-3">
                                <p className="text-xs text-gray-400">RECENT COMPLETIONS</p>
                                <div className="space-y-2">
                                  {progress.recentCompletions.map((completion, index) => (
                                    <div key={index} className="flex items-center justify-between text-sm">
                                      <div className="flex items-center gap-3">
                                        <span className="text-xs text-gray-400 uppercase">
                                          {completion.type}
                                        </span>
                                        <span className="text-gray-700">{completion.title}</span>
                                      </div>
                                      <span className="text-xs text-gray-500">
                                        {completion.daysAgo === 0 ? 'today' : `${completion.daysAgo}d ago`}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                        {/* 进度加载中 */}
                        {!progress && progressLoading && (
                          <div className="text-xs text-gray-400 italic">Loading progress...</div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quest Assistant */}
      <QuestAssistantDrawer
        isOpen={assistantOpen}
        onClose={() => setAssistantOpen(false)}
        onQuestCreated={() => {
          fetchVisions()
          fetchQuests()
        }}
      />
    </div>
  )
}
