"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { useManualMode } from "@/hooks/use-manual-mode"
import { ManualModeToggle } from "@/components/quest/manual-mode-toggle"
import { DailyCommitForm } from "@/components/quest/daily-commit-form"
import { CommitHistory } from "@/components/quest/commit-history"
import { QuestProgressBar, MomentumBadge, MilestoneCreatorDialog } from "@/components/quest"
import {
  ArrowLeft, Plus, CheckCircle, Circle, Save, X, Sparkles
} from "lucide-react"
import type { QuestProgress } from "@/lib/quest-progress-types"

/**
 * Quest详情页 - 完全重构版
 *
 * 设计理念：
 * - 左侧面板: Quest信息 + 多段式进度条展示所有Milestone
 * - 右侧主区域: Current Milestone的Checkpoint详细展示
 * - 进度可视化优先: 清晰展示Quest → Milestone → Checkpoint的层级进度
 * - 简约风格: 黑/白/灰配色，大字体，清晰层级
 */

interface Vision {
  id?: number
  title: string
  description?: string
}

interface Quest {
  id?: number
  visionId: number
  type: 'main' | 'side'
  title: string
  why: string
  status: string
  lastActivityAt?: string
  targetDate?: string
}

interface Milestone {
  id?: number
  questId: number
  title: string
  completionCriteria: string
  why?: string
  status: 'current' | 'next' | 'future' | 'completed'
  completedAt?: string
  orderIndex?: number
}

interface Checkpoint {
  id?: number
  milestoneId: number
  title: string
  description?: string
  isCompleted: boolean
  completedAt?: string
  progress?: number  // 0-100
}

export default function QuestDetailPage() {
  const params = useParams()
  const { toast } = useToast()
  const { isUnlocked } = useManualMode()
  const questId = parseInt(params.id as string)

  // 数据状态
  const [vision, setVision] = useState<Vision | null>(null)
  const [quest, setQuest] = useState<Quest | null>(null)
  const [milestones, setMilestones] = useState<Milestone[]>([])
  const [checkpoints, setCheckpoints] = useState<{ [key: number]: Checkpoint[] }>({})
  const [questProgress, setQuestProgress] = useState<QuestProgress | null>(null)
  const [loading, setLoading] = useState(false)

  // Milestone表单
  const [showMilestoneForm, setShowMilestoneForm] = useState(false)
  const [milestoneTitle, setMilestoneTitle] = useState("")
  const [milestoneCriteria, setMilestoneCriteria] = useState("")
  const [milestoneWhy, setMilestoneWhy] = useState("")
  const [milestoneStatus, setMilestoneStatus] = useState<Milestone['status']>('future')

  // Checkpoint表单
  const [showCheckpointForm, setShowCheckpointForm] = useState(false)
  const [checkpointTitle, setCheckpointTitle] = useState("")

  // AI Milestone Creator
  const [showAICreator, setShowAICreator] = useState(false)

  useEffect(() => {
    fetchQuest()
    fetchMilestones()
    fetchQuestProgress()
  }, [questId])

  const fetchQuest = async () => {
    try {
      const response = await fetch(`/api/quests?id=${questId}`)
      if (response.ok) {
        const data = await response.json()
        setQuest(data)
        // 获取Vision
        if (data.visionId) {
          const visionRes = await fetch('/api/visions')
          if (visionRes.ok) {
            const visions = await visionRes.json()
            const foundVision = visions.find((v: Vision) => v.id === data.visionId)
            if (foundVision) setVision(foundVision)
          }
        }
      }
    } catch (error) {
      console.error('Failed to fetch quest:', error)
    }
  }

  const fetchMilestones = async () => {
    try {
      const response = await fetch(`/api/milestones?questId=${questId}`)
      if (response.ok) {
        const data = await response.json()
        setMilestones(data)
        data.forEach((m: Milestone) => {
          if (m.id) fetchCheckpoints(m.id)
        })
      }
    } catch (error) {
      console.error('Failed to fetch milestones:', error)
    }
  }

  const fetchCheckpoints = async (milestoneId: number) => {
    try {
      const response = await fetch(`/api/checkpoints?milestoneId=${milestoneId}`)
      if (response.ok) {
        const data = await response.json()
        setCheckpoints(prev => ({ ...prev, [milestoneId]: data }))
      }
    } catch (error) {
      console.error('Failed to fetch checkpoints:', error)
    }
  }

  const fetchQuestProgress = async () => {
    try {
      const response = await fetch(`/api/quests/progress?id=${questId}`)
      if (response.ok) {
        const result = await response.json()
        if (result.success && result.data) {
          setQuestProgress(result.data)
        }
      }
    } catch (error) {
      console.error('Failed to fetch quest progress:', error)
    }
  }

  const addMilestone = async () => {
    if (!milestoneTitle.trim() || !milestoneCriteria.trim()) {
      toast({ title: "请填写标题和完成标准", variant: "destructive" })
      return
    }

    setLoading(true)
    try {
      const response = await fetch('/api/milestones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questId,
          title: milestoneTitle.trim(),
          completionCriteria: milestoneCriteria.trim(),
          why: milestoneWhy.trim() || undefined,
          status: milestoneStatus
        })
      })

      if (response.ok) {
        await fetchMilestones()
        await fetchQuestProgress()
        setMilestoneTitle("")
        setMilestoneCriteria("")
        setMilestoneWhy("")
        setMilestoneStatus('future')
        setShowMilestoneForm(false)
        toast({ title: "Milestone已添加 🎯" })
      }
    } catch (error) {
      toast({ title: "添加失败", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  const updateMilestoneStatus = async (id: number, newStatus: Milestone['status']) => {
    setLoading(true)
    try {
      const response = await fetch('/api/milestones', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id,
          status: newStatus,
          completedAt: newStatus === 'completed' ? new Date().toISOString() : undefined
        })
      })

      if (response.ok) {
        await fetchMilestones()
        await fetchQuestProgress()
        toast({ title: newStatus === 'completed' ? "Milestone已完成! 🎉" : "状态已更新" })
      }
    } catch (error) {
      toast({ title: "更新失败", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  const deleteMilestone = async (id: number) => {
    if (!confirm('确定要删除这个Milestone吗？')) return

    setLoading(true)
    try {
      const response = await fetch(`/api/milestones?id=${id}`, { method: 'DELETE' })
      if (response.ok) {
        await fetchMilestones()
        await fetchQuestProgress()
        toast({ title: "Milestone已删除" })
      }
    } catch (error) {
      toast({ title: "删除失败", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  const addCheckpoint = async () => {
    const currentMilestone = milestones.find(m => m.status === 'current')
    if (!currentMilestone?.id) return

    if (!checkpointTitle.trim()) return

    setLoading(true)
    try {
      const response = await fetch('/api/checkpoints', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          milestoneId: currentMilestone.id,
          title: checkpointTitle.trim(),
          isCompleted: false
        })
      })

      if (response.ok) {
        await fetchCheckpoints(currentMilestone.id)
        await fetchQuestProgress()
        setCheckpointTitle("")
        setShowCheckpointForm(false)
        toast({ title: "Checkpoint已添加" })
      }
    } catch (error) {
      toast({ title: "添加失败", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  const toggleCheckpoint = async (checkpointId: number, milestoneId: number, currentStatus: boolean) => {
    setLoading(true)
    try {
      const response = await fetch('/api/checkpoints', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: checkpointId,
          isCompleted: !currentStatus
        })
      })

      if (response.ok) {
        await fetchCheckpoints(milestoneId)
        await fetchQuestProgress()
      }
    } catch (error) {
      toast({ title: "更新失败", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  const currentMilestone = milestones.find(m => m.status === 'current')
  const nextMilestone = milestones.find(m => m.status === 'next')
  const completedMilestones = milestones.filter(m => m.status === 'completed')
  const futureMilestones = milestones.filter(m => m.status === 'future')

  const currentCheckpoints = currentMilestone?.id ? checkpoints[currentMilestone.id] || [] : []

  if (!quest) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white">
      {/* 顶部导航 */}
      <div className="border-b border-gray-100 bg-white sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-8 py-6">
          <div className="flex items-center justify-between mb-4">
            <Link href="/quests">
              <Button variant="ghost" size="sm" className="text-gray-600 hover:text-gray-900">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Quests
              </Button>
            </Link>
            <h1 className="text-sm font-medium text-gray-500 uppercase tracking-wider">Quest Timeline</h1>
            <div className="w-32" />
          </div>
          <div className="flex justify-end">
            <ManualModeToggle />
          </div>
        </div>
      </div>

      {/* 主内容区域：左右分栏 */}
      <div className="max-w-7xl mx-auto px-8 py-12">
        <div className="grid grid-cols-12 gap-12">

          {/* 左侧面板：Quest Info + 进度总览 (35%) */}
          <div className="col-span-12 lg:col-span-4 space-y-10">

            {/* Vision */}
            {vision && (
              <div>
                <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-3">Vision</p>
                <h2 className="text-lg font-semibold text-gray-900 mb-2 leading-tight">{vision.title}</h2>
                {vision.description && (
                  <p className="text-sm text-gray-600 leading-relaxed">{vision.description}</p>
                )}
              </div>
            )}

            {/* Quest */}
            <div className="border-t border-gray-100 pt-10">
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-3">Quest</p>
              <h2 className="text-2xl font-bold text-gray-900 mb-4 leading-tight">{quest.title}</h2>
              <div className="space-y-3">
                <div>
                  <p className="text-xs font-medium text-gray-500 mb-2">Why</p>
                  <p className="text-sm text-gray-700 leading-relaxed">{quest.why}</p>
                </div>
              </div>
            </div>

            {/* 整体进度 */}
            {questProgress && (
              <div className="border-t border-gray-100 pt-10">
                <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-6">Overall Progress</p>

                <div className="space-y-6">
                  {/* 进度条 + Momentum */}
                  <div className="space-y-4">
                    <QuestProgressBar
                      progress={questProgress.overallProgress}
                      showDetails={true}
                      completedMilestones={questProgress.completedMilestones}
                      totalMilestones={questProgress.totalMilestones}
                      height="lg"
                    />
                    <MomentumBadge
                      status={questProgress.momentumStatus}
                      lastActivityAt={questProgress.lastActivityAt}
                      showTime={true}
                      size="md"
                    />
                  </div>

                  {/* 多段式Milestone进度条 */}
                  <div className="space-y-3">
                    <p className="text-xs font-medium text-gray-500">Milestone Timeline</p>
                    <div className="space-y-2">
                      {milestones.map((milestone, index) => {
                        const milestoneCheckpoints = milestone.id ? checkpoints[milestone.id] || [] : []
                        const completedCount = milestoneCheckpoints.filter(cp => cp.isCompleted).length
                        const totalCount = milestoneCheckpoints.length
                        const progress = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0

                        return (
                          <div key={milestone.id} className="space-y-1">
                            <div className="flex items-center justify-between text-xs">
                              <div className="flex items-center gap-2">
                                {milestone.status === 'completed' && (
                                  <CheckCircle className="w-3 h-3 text-green-600" />
                                )}
                                {milestone.status === 'current' && (
                                  <Circle className="w-3 h-3 text-blue-600 fill-blue-600" />
                                )}
                                {(milestone.status === 'next' || milestone.status === 'future') && (
                                  <Circle className="w-3 h-3 text-gray-400" />
                                )}
                                <span className={`font-medium ${
                                  milestone.status === 'completed' ? 'text-gray-500 line-through' :
                                  milestone.status === 'current' ? 'text-gray-900' :
                                  'text-gray-600'
                                }`}>
                                  {milestone.title}
                                </span>
                              </div>
                              <span className="text-gray-500">{progress}%</span>
                            </div>
                            <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all duration-500 ${
                                  milestone.status === 'completed' ? 'bg-green-600' :
                                  milestone.status === 'current' ? 'bg-blue-600' :
                                  'bg-gray-400'
                                }`}
                                style={{ width: `${progress}%` }}
                              />
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Actions */}
            {isUnlocked && (
              <div className="border-t border-gray-100 pt-10 space-y-3">
                <Button
                  onClick={() => setShowAICreator(true)}
                  className="w-full justify-center bg-amber-600 hover:bg-amber-700 text-white font-medium"
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  AI Create Milestone
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => setShowMilestoneForm(true)}
                  className="w-full justify-center text-gray-600 hover:text-gray-900 hover:bg-gray-50 font-medium"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Manual Add
                </Button>
              </div>
            )}

            {/* Commit History */}
            <div className="border-t border-gray-100 pt-10">
              <CommitHistory questId={questId} limit={5} />
            </div>

          </div>

          {/* 右侧主区域：Current Milestone详情 (65%) */}
          <div className="col-span-12 lg:col-span-8 space-y-12">

            {/* Daily Commit Form */}
            {currentMilestone && (
              <DailyCommitForm
                questId={questId}
                milestoneId={currentMilestone.id}
                onCommitCreated={() => {
                  fetchQuestProgress()
                  toast({ title: "已提交，AI 正在评估进度..." })
                }}
              />
            )}

            {/* Add Milestone Form */}
            {showMilestoneForm && (
              <div className="border-2 border-blue-400 rounded-lg p-6 space-y-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-gray-900">Create New Milestone</h3>
                  <Button variant="ghost" size="sm" onClick={() => setShowMilestoneForm(false)}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>
                <Input
                  placeholder="Milestone标题 (例: 完成第一篇论文投稿)"
                  value={milestoneTitle}
                  onChange={(e) => setMilestoneTitle(e.target.value)}
                  autoFocus
                />
                <Textarea
                  placeholder="完成标准 (What defines completion?)"
                  value={milestoneCriteria}
                  onChange={(e) => setMilestoneCriteria(e.target.value)}
                  className="min-h-[80px]"
                />
                <Textarea
                  placeholder="为什么这个milestone重要？(可选)"
                  value={milestoneWhy}
                  onChange={(e) => setMilestoneWhy(e.target.value)}
                  className="min-h-[60px]"
                />
                <div className="flex gap-2">
                  <select
                    className="flex-1 p-2 border rounded"
                    value={milestoneStatus}
                    onChange={(e) => setMilestoneStatus(e.target.value as Milestone['status'])}
                  >
                    <option value="current">Current (正在进行)</option>
                    <option value="next">Next (下一个)</option>
                    <option value="future">Future (未来计划)</option>
                  </select>
                </div>
                <div className="flex gap-2 pt-2">
                  <Button onClick={addMilestone} disabled={loading}>
                    <Save className="w-4 h-4 mr-2" />
                    Create Milestone
                  </Button>
                  <Button variant="outline" onClick={() => setShowMilestoneForm(false)}>
                    Cancel
                  </Button>
                </div>
              </div>
            )}

            {/* Current Milestone - Hero Section */}
            {currentMilestone && (
              <div>
                <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-6">Current Milestone</p>
                <h2 className="text-4xl font-bold text-gray-900 mb-10 leading-tight tracking-tight">{currentMilestone.title}</h2>

                <div className="space-y-6 mb-10">
                  <div>
                    <p className="text-xs font-medium text-gray-500 mb-2">Completion Criteria</p>
                    <p className="text-base text-gray-700 leading-relaxed">{currentMilestone.completionCriteria}</p>
                  </div>

                  {currentMilestone.why && (
                    <div>
                      <p className="text-xs font-medium text-gray-500 mb-2">Why Important</p>
                      <p className="text-base text-gray-700 leading-relaxed">{currentMilestone.why}</p>
                    </div>
                  )}
                </div>

                {/* Checkpoints */}
                <div className="border-t border-gray-100 pt-8">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-4">
                      <p className="text-sm font-medium text-gray-900">Checkpoints</p>
                      <span className="text-sm text-gray-500">
                        {currentCheckpoints.filter(cp => cp.isCompleted).length} / {currentCheckpoints.length} completed
                      </span>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {currentCheckpoints.map((cp) => (
                      <div
                        key={cp.id}
                        className="flex items-start gap-4 group p-3 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        <input
                          type="checkbox"
                          checked={cp.isCompleted}
                          onChange={() => toggleCheckpoint(cp.id!, currentMilestone.id!, cp.isCompleted)}
                          className="w-5 h-5 rounded border-gray-300 cursor-pointer mt-0.5 flex-shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <span className={`text-sm block transition-all ${
                              cp.isCompleted ? 'line-through text-gray-400' : 'text-gray-900'
                            }`}>
                              {cp.title}
                            </span>
                            {cp.progress !== undefined && cp.progress > 0 && !cp.isCompleted && (
                              <span className="text-xs font-medium text-blue-600 ml-2">
                                {cp.progress}%
                              </span>
                            )}
                          </div>
                          {cp.progress !== undefined && cp.progress > 0 && !cp.isCompleted && (
                            <div className="h-1 bg-gray-200 rounded-full overflow-hidden mb-1">
                              <div
                                className="h-full bg-blue-600 rounded-full transition-all duration-500"
                                style={{ width: `${cp.progress}%` }}
                              />
                            </div>
                          )}
                          {cp.description && (
                            <p className="text-xs text-gray-500 mt-1">{cp.description}</p>
                          )}
                        </div>
                      </div>
                    ))}

                    {currentCheckpoints.length === 0 && (
                      <div className="text-center py-8 text-gray-400">
                        <p className="text-sm">No checkpoints yet. Add the first one!</p>
                      </div>
                    )}

                    {/* Add Checkpoint Form */}
                    {isUnlocked && (
                      showCheckpointForm ? (
                        <div className="flex gap-2 mt-4 p-3 bg-gray-50 rounded-lg">
                          <Input
                            placeholder="New checkpoint..."
                            value={checkpointTitle}
                            onChange={(e) => setCheckpointTitle(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault()
                                addCheckpoint()
                              }
                            }}
                            className="flex-1"
                            autoFocus
                          />
                          <Button size="sm" onClick={addCheckpoint} disabled={loading}>
                            <Plus className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setShowCheckpointForm(false)}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setShowCheckpointForm(true)}
                          className="w-full mt-2 text-gray-500 hover:text-gray-900"
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          Add Checkpoint
                        </Button>
                      )
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-4 mt-10 pt-10 border-t border-gray-100">
                  <Button
                    onClick={() => updateMilestoneStatus(currentMilestone.id!, 'completed')}
                    disabled={loading}
                    className="flex-1 bg-gray-900 hover:bg-gray-800 text-white"
                  >
                    Mark as Completed
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => deleteMilestone(currentMilestone.id!)}
                    className="text-gray-400 hover:text-red-600"
                  >
                    Delete
                  </Button>
                </div>
              </div>
            )}

            {/* 无 Current Milestone 提示 */}
            {!currentMilestone && (
              <div className="text-center py-16">
                <p className="text-gray-400 mb-6">No current milestone</p>
                {nextMilestone && (
                  <Button
                    onClick={() => updateMilestoneStatus(nextMilestone.id!, 'current')}
                    className="bg-gray-900 hover:bg-gray-800 text-white"
                  >
                    Start &quot;{nextMilestone.title}&quot;
                  </Button>
                )}
              </div>
            )}

            {/* Next Milestone */}
            {nextMilestone && (
              <div className="border-t border-gray-100 pt-12">
                <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-4">Up Next</p>
                <h3 className="text-2xl font-bold text-gray-900 mb-4 leading-tight">{nextMilestone.title}</h3>
                <p className="text-sm text-gray-600 mb-6 leading-relaxed">{nextMilestone.completionCriteria}</p>
                <div className="flex gap-4">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => updateMilestoneStatus(nextMilestone.id!, 'current')}
                    className="text-gray-600 hover:text-gray-900"
                  >
                    Start Working
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => deleteMilestone(nextMilestone.id!)}
                    className="text-gray-400 hover:text-red-600"
                  >
                    Delete
                  </Button>
                </div>
              </div>
            )}

            {/* Future Milestones */}
            {futureMilestones.length > 0 && (
              <div className="border-t border-gray-100 pt-12">
                <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-6">Future Milestones</p>
                <div className="space-y-6">
                  {futureMilestones.map((milestone) => (
                    <div key={milestone.id} className="flex items-start justify-between gap-6 group">
                      <div className="flex-1">
                        <h4 className="text-lg font-semibold text-gray-900 mb-2 leading-tight">{milestone.title}</h4>
                        <p className="text-sm text-gray-500">{milestone.completionCriteria}</p>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => deleteMilestone(milestone.id!)}
                        className="text-gray-300 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Completed Milestones */}
            {completedMilestones.length > 0 && (
              <div className="border-t border-gray-100 pt-12">
                <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-6">Completed</p>
                <div className="space-y-4">
                  {completedMilestones.map((milestone) => (
                    <div key={milestone.id}>
                      <h4 className="text-base font-semibold text-gray-400 mb-1 leading-tight line-through">{milestone.title}</h4>
                      {milestone.completedAt && (
                        <p className="text-xs text-gray-400">
                          {new Date(milestone.completedAt).toLocaleDateString('en-US', {
                            year: 'numeric', month: 'short', day: 'numeric'
                          })}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Empty State */}
            {milestones.length === 0 && !showMilestoneForm && (
              <div className="text-center py-24">
                <p className="text-gray-400 mb-8">No milestones yet.</p>
                {isUnlocked && (
                  <Button
                    onClick={() => setShowMilestoneForm(true)}
                    className="bg-gray-900 hover:bg-gray-800 text-white"
                  >
                    Add First Milestone
                  </Button>
                )}
                {!isUnlocked && (
                  <p className="text-sm text-blue-600">Use Quest Assistant to create Milestones</p>
                )}
              </div>
            )}

          </div>
        </div>
      </div>

      {/* AI Milestone Creator Dialog */}
      <MilestoneCreatorDialog
        questId={questId}
        isOpen={showAICreator}
        onClose={() => setShowAICreator(false)}
        onMilestoneCreated={() => {
          fetchMilestones()
          fetchQuestProgress()
        }}
      />
    </div>
  )
}
