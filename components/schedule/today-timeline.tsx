"use client"

import { useEffect, useMemo, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { getLocalDateString } from "@/lib/date-utils"

type ScheduleStatus = "scheduled" | "in_progress" | "partially_completed" | "completed" | "cancelled"

interface TimelineBlock {
  id: number
  date: string
  startTime: string
  endTime: string
  status: ScheduleStatus
  taskTitle: string
  parentTitle?: string
  grandparentTitle?: string
  comment?: string
}

const STATUS_LABELS: Record<ScheduleStatus, string> = {
  scheduled: "未开始",
  in_progress: "进行中",
  partially_completed: "部分完成",
  completed: "已完成",
  cancelled: "已取消"
}

export function TodayTimeline() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [blocks, setBlocks] = useState<TimelineBlock[]>([])

  useEffect(() => {
    let cancelled = false

    const fetchToday = async () => {
      try {
        setLoading(true)
        setError(null)

        const today = getLocalDateString()
        const response = await fetch(`/api/schedule/day?date=${today}`)

        if (!response.ok) {
          throw new Error(`加载失败 (${response.status})`)
        }

        const data = await response.json()

        if (!cancelled) {
          setBlocks(Array.isArray(data) ? data : [])
        }
      } catch (err: any) {
        if (!cancelled) {
          setError(err?.message ?? "加载失败")
          setBlocks([])
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    fetchToday()

    return () => {
      cancelled = true
    }
  }, [])

  const sortedBlocks = useMemo(() => {
    return [...blocks].sort((a, b) => a.startTime.localeCompare(b.startTime))
  }, [blocks])

  const renderContent = () => {
    if (loading) {
      return (
        <div className="space-y-2">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-9 bg-gray-100 rounded animate-pulse" />
          ))}
        </div>
      )
    }

    if (error) {
      return (
        <div className="text-sm text-gray-500">
          {error}
        </div>
      )
    }

    if (sortedBlocks.length === 0) {
      return (
        <div className="text-sm text-gray-500">
          今天还没有安排。
        </div>
      )
    }

    const now = new Date()

    return (
      <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
        {sortedBlocks.map(block => {
          const start = new Date(`${block.date}T${block.startTime}`)
          const end = new Date(`${block.date}T${block.endTime}`)
          const isCurrent = now >= start && now <= end
          const isPast = now > end

          const statusLabel = STATUS_LABELS[block.status]

          return (
            <div
              key={block.id}
              className={cn(
                "flex gap-3 rounded-lg border border-transparent p-3",
                isCurrent && "border-gray-300 bg-gray-50"
              )}
            >
              <div className="w-[72px] text-[11px] font-mono text-gray-600">
                <div>{block.startTime.slice(0, 5)}</div>
                <div className="text-gray-400">{block.endTime.slice(0, 5)}</div>
              </div>

              <div className="flex-1 border-l border-gray-200 pl-3">
                <div className="flex items-start justify-between">
                  <div>
                    <div className={cn(
                      "text-sm font-medium text-gray-900",
                      isPast && !isCurrent && "text-gray-500"
                    )}>
                      {block.taskTitle}
                    </div>
                    {(block.parentTitle || block.grandparentTitle) && (
                      <div className="text-xs text-gray-500 mt-1">
                        {block.grandparentTitle && `${block.grandparentTitle} › `}
                        {block.parentTitle}
                      </div>
                    )}
                    {block.comment && (
                      <div className="text-xs text-gray-500 mt-1 line-clamp-2">
                        {block.comment}
                      </div>
                    )}
                  </div>
                  <span className={cn(
                    "text-[11px] uppercase tracking-wide text-gray-500",
                    isCurrent && "text-gray-900"
                  )}>
                    {statusLabel}
                  </span>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <Card className="border-gray-200 bg-white">
      <CardHeader className="p-4 pb-2">
        <CardTitle className="text-base font-semibold text-black">
          今日时间线
        </CardTitle>
        <CardDescription className="text-xs text-gray-500">
          展示今日全部时间安排
        </CardDescription>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        {renderContent()}
      </CardContent>
    </Card>
  )
}
