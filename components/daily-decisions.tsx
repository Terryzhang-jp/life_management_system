"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Plus, Edit2, Trash2, Check, RotateCcw, ChevronDown, ChevronUp } from "lucide-react"
import { DecisionForm } from "./decision-form"
import { useToast } from "@/hooks/use-toast"
import { DailyDecision } from "@/lib/decisions-db"
import { checkAndRefreshDecisions, calculateDelayDays } from "@/lib/decision-refresh"

interface DailyDecisionsProps {
  className?: string
}

export function DailyDecisions({ className }: DailyDecisionsProps) {
  const { toast } = useToast()
  const [decisions, setDecisions] = useState<DailyDecision[]>([])
  const [delayedDecisions, setDelayedDecisions] = useState<DailyDecision[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingDelayed, setLoadingDelayed] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [showDelayed, setShowDelayed] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)

  // 获取今日决策
  const fetchTodayDecisions = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/decisions?type=today')
      if (response.ok) {
        const data = await response.json()
        setDecisions(data)
      }
    } catch (error) {
      console.error('Failed to fetch decisions:', error)
    } finally {
      setLoading(false)
    }
  }

  // 获取延期决策
  const fetchDelayedDecisions = async () => {
    try {
      setLoadingDelayed(true)
      const response = await fetch('/api/decisions?type=delayed')
      if (response.ok) {
        const data = await response.json()
        setDelayedDecisions(data)
      }
    } catch (error) {
      console.error('Failed to fetch delayed decisions:', error)
    } finally {
      setLoadingDelayed(false)
    }
  }

  // 切换延期决策显示
  const toggleDelayedSection = () => {
    if (!showDelayed) {
      fetchDelayedDecisions()
    }
    setShowDelayed(!showDelayed)
  }

  useEffect(() => {
    // 组件加载时检查是否需要刷新
    const initializeDecisions = async () => {
      try {
        const result = await checkAndRefreshDecisions()
        if (result.needsRefresh && result.processedCount && result.processedCount > 0) {
          toast({
            title: "决策已刷新",
            description: `${result.processedCount} 个过期决策已转为延期状态`,
          })
        }
      } catch (error) {
        console.error('Auto refresh error:', error)
      }

      // 获取今日决策
      fetchTodayDecisions()

      // 获取延期决策数量以显示按钮
      fetchDelayedDecisions()
    }

    initializeDecisions()
  }, [refreshKey, toast])

  // 当新决策添加时刷新数据
  const handleDecisionAdded = () => {
    setRefreshKey(prev => prev + 1)
    if (showDelayed) {
      fetchDelayedDecisions() // 同时刷新延期决策
    }
    setShowForm(false)
  }

  // 完成/取消完成决策
  const handleToggleDecisionStatus = async (id: number, currentStatus: string) => {
    const newStatus = currentStatus === 'completed' ? 'pending' : 'completed'

    try {
      const response = await fetch('/api/decisions', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          id,
          status: newStatus
        })
      })

      if (response.ok) {
        toast({
          title: "成功",
          description: newStatus === 'completed' ? "决策已完成" : "决策已取消完成"
        })
        setRefreshKey(prev => prev + 1)
        if (showDelayed) {
          fetchDelayedDecisions() // 刷新延期决策
        }
      } else {
        const error = await response.json()
        throw new Error(error.error || 'Status update failed')
      }
    } catch (error) {
      console.error('Status update error:', error)
      toast({
        title: "更新失败",
        description: error instanceof Error ? error.message : "更新决策状态失败",
        variant: "destructive"
      })
    }
  }

  // 删除决策（保留用于延期决策）
  const handleDeleteDecision = async (id: number) => {
    if (!confirm('确定要删除这个决策吗？')) return

    try {
      const response = await fetch(`/api/decisions?id=${id}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        toast({
          title: "成功",
          description: "决策已删除"
        })
        setRefreshKey(prev => prev + 1)
        if (showDelayed) {
          fetchDelayedDecisions() // 刷新延期决策
        }
      } else {
        const error = await response.json()
        throw new Error(error.error || 'Delete failed')
      }
    } catch (error) {
      console.error('Delete error:', error)
      toast({
        title: "删除失败",
        description: error instanceof Error ? error.message : "删除决策失败",
        variant: "destructive"
      })
    }
  }

  if (loading) {
    return (
      <div className={`bg-white rounded-lg border p-4 ${className}`}>
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-sm font-medium">今日三大决策</h3>
        </div>
        <div className="animate-pulse space-y-2">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-12 bg-gray-200 rounded"></div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className={`bg-white rounded-lg border p-4 ${className}`}>
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-sm font-medium">今日三大决策</h3>
        {decisions.length < 3 && (
          <Button
            onClick={() => setShowForm(true)}
            size="sm"
            variant="outline"
            className="flex items-center gap-1 text-xs"
          >
            <Plus className="h-3 w-3" />
            添加
          </Button>
        )}
      </div>

      {/* 决策列表 */}
      <div className="space-y-2">
        {decisions.map((decision, index) => (
          <Card key={decision.id} className={`border ${decision.status === 'completed' ? 'border-green-200 bg-green-50' : 'border-gray-200'}`}>
            <CardContent className="p-3">
              <div className="flex justify-between items-start gap-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-xs font-medium ${decision.status === 'completed' ? 'text-green-600' : 'text-blue-600'}`}>
                      决策 {index + 1}
                    </span>
                    {decision.status === 'completed' && (
                      <span className="text-xs text-green-500">已完成</span>
                    )}
                  </div>
                  <p className={`text-sm ${decision.status === 'completed' ? 'text-gray-600 line-through' : 'text-gray-800'}`}>
                    {decision.decision}
                  </p>
                </div>
                <Button
                  onClick={() => handleToggleDecisionStatus(decision.id!, decision.status)}
                  size="sm"
                  variant="ghost"
                  className={`h-6 w-6 p-0 ${decision.status === 'completed' ? 'text-green-500 hover:text-gray-500' : 'text-gray-400 hover:text-green-500'}`}
                >
                  {decision.status === 'completed' ? (
                    <RotateCcw className="h-3 w-3" />
                  ) : (
                    <Check className="h-3 w-3" />
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}

        {/* 空白占位符 */}
        {decisions.length < 3 && (
          Array.from({ length: 3 - decisions.length }).map((_, index) => (
            <Card key={`empty-${index}`} className="border border-dashed border-gray-300">
              <CardContent className="p-3">
                <div className="flex items-center justify-center h-8">
                  <span className="text-xs text-gray-400">
                    决策 {decisions.length + index + 1} - 待添加
                  </span>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* 延期决策区域 */}
      {delayedDecisions.length > 0 && (
        <div className="mt-4 border-t pt-3">
          <Button
            onClick={toggleDelayedSection}
            variant="ghost"
            className="w-full justify-between p-2 h-8 text-xs"
          >
            <span className="text-orange-600">
              延期决策 ({delayedDecisions.length})
            </span>
            {showDelayed ? (
              <ChevronUp className="h-3 w-3" />
            ) : (
              <ChevronDown className="h-3 w-3" />
            )}
          </Button>

          {showDelayed && (
            <div className="mt-2 space-y-2">
              {loadingDelayed ? (
                <div className="animate-pulse space-y-2">
                  {[1, 2].map(i => (
                    <div key={i} className="h-12 bg-gray-200 rounded"></div>
                  ))}
                </div>
              ) : (
                delayedDecisions.map((decision) => {
                  const delayDays = calculateDelayDays(decision.date)
                  return (
                    <Card key={decision.id} className="border border-orange-200 bg-orange-50">
                      <CardContent className="p-3">
                        <div className="flex justify-between items-start gap-2">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-xs text-orange-600 font-medium">
                                延期 {delayDays} 天
                              </span>
                              <span className="text-xs text-gray-500">
                                {decision.date}
                              </span>
                            </div>
                            <p className="text-sm text-gray-800">{decision.decision}</p>
                          </div>
                          <div className="flex gap-1">
                            <Button
                              onClick={() => handleToggleDecisionStatus(decision.id!, decision.status)}
                              size="sm"
                              variant="ghost"
                              className="h-6 w-6 p-0 text-gray-400 hover:text-green-500"
                              title="完成"
                            >
                              <Check className="h-3 w-3" />
                            </Button>
                            <Button
                              onClick={() => handleDeleteDecision(decision.id!)}
                              size="sm"
                              variant="ghost"
                              className="h-6 w-6 p-0 text-gray-400 hover:text-red-500"
                              title="删除"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })
              )}
            </div>
          )}
        </div>
      )}

      {/* 说明文字 */}
      <div className="mt-3 text-xs text-gray-500">
        <p>灵感来自亚马逊创始人：每天只需做出3个好决策</p>
      </div>

      {/* 弹框表单 */}
      {showForm && (
        <DecisionForm
          onDecisionAdded={handleDecisionAdded}
          onClose={() => setShowForm(false)}
        />
      )}
    </div>
  )
}