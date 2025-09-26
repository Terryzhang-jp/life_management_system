"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { getLocalDateString } from "@/lib/date-utils"
import { useRouter } from "next/navigation"

type ScheduleStatus = "scheduled" | "in_progress" | "partially_completed" | "completed" | "cancelled"

interface PastBlock {
  id: number
  date: string
  startTime: string
  endTime: string
  status: ScheduleStatus
  taskTitle: string
  parentTitle?: string
  grandparentTitle?: string
  comment?: string
  categoryName?: string | null
  categoryColor?: string | null
}

interface FetchState {
  loading: boolean
  error: string | null
}

const STATUS_LABELS: Record<Exclude<ScheduleStatus, "completed" | "cancelled">, string> = {
  scheduled: "未开始",
  in_progress: "进行中",
  partially_completed: "部分完成"
}

const LIMIT_DAYS = 14
const MAX_ITEMS = 80

export function PastIncompleteList() {
  const router = useRouter()
  const [blocks, setBlocks] = useState<PastBlock[]>([])
  const [{ loading, error }, setFetchState] = useState<FetchState>({ loading: true, error: null })
  const [updatingIds, setUpdatingIds] = useState<Set<number>>(new Set())

  const loadBlocks = useCallback(async () => {
    try {
      setFetchState({ loading: true, error: null })
      const params = new URLSearchParams({
        days: LIMIT_DAYS.toString(),
        limit: MAX_ITEMS.toString()
      })

      const response = await fetch(`/api/schedule/past-incomplete?${params.toString()}`)
      if (!response.ok) {
        throw new Error(`加载失败 (${response.status})`)
      }

      const data = await response.json()
      setBlocks(Array.isArray(data) ? data : [])
    } catch (err: any) {
      setBlocks([])
      setFetchState({ loading: false, error: err?.message ?? "加载失败" })
      return
    }

    setFetchState({ loading: false, error: null })
  }, [])

  useEffect(() => {
    void loadBlocks()
  }, [loadBlocks])

  const markCompleted = useCallback(async (block: PastBlock) => {
    try {
      setUpdatingIds(prev => new Set(prev).add(block.id))
      const response = await fetch(`/api/schedule/blocks?id=${block.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ status: "completed" })
      })

      if (!response.ok) {
        throw new Error("标记失败")
      }

      setBlocks(prev => prev.filter(item => item.id !== block.id))
    } catch (error) {
      console.error("Error marking schedule block completed:", error)
    } finally {
      setUpdatingIds(prev => {
        const next = new Set(prev)
        next.delete(block.id)
        return next
      })
    }
  }, [])

  const groupedBlocks = useMemo(() => {
    const groups = new Map<string, PastBlock[]>()
    blocks.forEach(block => {
      if (!groups.has(block.date)) {
        groups.set(block.date, [])
      }
      groups.get(block.date)!.push(block)
    })
    return Array.from(groups.entries()).sort((a, b) => b[0].localeCompare(a[0]))
  }, [blocks])

  const formatDate = (dateStr: string) => {
    const anchor = new Date(`${dateStr}T12:00:00`)
    const todayStr = getLocalDateString()
    const today = new Date(`${todayStr}T12:00:00`)
    const diff = Math.round((today.getTime() - anchor.getTime()) / (1000 * 60 * 60 * 24))

    const dayOfWeek = "日一二三四五六"[anchor.getDay()]
    const formatted = `${anchor.getMonth() + 1}/${anchor.getDate()} 周${dayOfWeek}`

    if (diff === 1) return `${formatted} · 昨天`
    if (diff > 1) return `${formatted} · ${diff}天前`
    return formatted
  }

  const renderContent = () => {
    if (loading) {
      return (
        <div className="space-y-2">
          {[1, 2, 3].map(key => (
            <div key={key} className="h-10 rounded bg-gray-100 animate-pulse" />
          ))}
        </div>
      )
    }

    if (error) {
      return (
        <div className="flex flex-col items-start gap-3 text-sm text-gray-500">
          <span>{error}</span>
          <Button variant="outline" size="sm" onClick={() => void loadBlocks()}>
            重试
          </Button>
        </div>
      )
    }

    if (blocks.length === 0) {
      return (
        <div className="text-sm text-gray-500">
          过去 {LIMIT_DAYS} 天的安排都已完成，保持住这个节奏！
        </div>
      )
    }

    return (
      <div className="space-y-5 max-h-72 overflow-y-auto pr-1">
        {groupedBlocks.map(([date, items]) => (
          <div key={date} className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                {formatDate(date)}
              </span>
              <Badge variant="secondary" className="bg-gray-100 text-gray-600">
                {items.length} 项未完成
              </Badge>
            </div>

            <div className="space-y-3">
              {items.map(item => {
                const statusLabel = STATUS_LABELS[item.status as keyof typeof STATUS_LABELS] || "未开始"
                const isUpdating = updatingIds.has(item.id)

                return (
                  <div
                    key={item.id}
                    className="flex flex-col gap-2 rounded-lg border border-gray-200 bg-white p-3 shadow-sm"
                  >
                    <div className="flex flex-col gap-1">
                      <div className="text-sm font-medium text-gray-900">
                        {item.taskTitle}
                      </div>
                      {(item.parentTitle || item.grandparentTitle) && (
                        <div className="text-xs text-gray-500">
                          {item.grandparentTitle && `${item.grandparentTitle} › `}
                          {item.parentTitle}
                        </div>
                      )}
                      <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
                        <span className="font-mono text-gray-600">
                          {item.startTime.slice(0, 5)} - {item.endTime.slice(0, 5)}
                        </span>
                        <span>·</span>
                        <span>{statusLabel}</span>
                        {item.categoryName && (
                          <span
                            className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5"
                            style={{ borderColor: item.categoryColor || undefined }}
                          >
                            <span
                              className="h-2 w-2 rounded-full"
                              style={{ backgroundColor: item.categoryColor || "#d1d5db" }}
                            />
                            {item.categoryName}
                          </span>
                        )}
                      </div>
                      {item.comment && (
                        <div className="text-xs text-gray-500 line-clamp-2">
                          {item.comment}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        className={cn(
                          "h-8",
                          isUpdating && "pointer-events-none opacity-75"
                        )}
                        onClick={() => void markCompleted(item)}
                      >
                        标记为完成
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8"
                        onClick={() => {
                          router.push("/schedule")
                        }}
                      >
                        跳转到日程
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <Card className="border-gray-200 bg-white h-full">
      <CardHeader className="p-4 pb-2">
        <CardTitle className="text-base font-semibold text-black">
          过去未完成安排
        </CardTitle>
        <CardDescription className="text-xs text-gray-500">
          回顾最近的遗漏安排，及时补上或处理掉它们
        </CardDescription>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        {renderContent()}
      </CardContent>
    </Card>
  )
}
