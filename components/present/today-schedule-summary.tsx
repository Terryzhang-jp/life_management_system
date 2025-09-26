"use client"

import { useEffect, useMemo, useState } from "react"
import { Card } from "@/components/ui/card"

interface DailyCategorySummary {
  categoryId?: number
  categoryName: string
  categoryColor?: string
  plannedMinutes: number
  effectiveMinutes: number
}

interface DailyScheduleSummary {
  date: string
  totalPlannedMinutes: number
  totalEffectiveMinutes: number
  categories: DailyCategorySummary[]
}

const FALLBACK_COLORS = [
  "#3B82F6",
  "#10B981",
  "#F97316",
  "#8B5CF6",
  "#F59E0B",
  "#EC4899",
  "#14B8A6",
  "#EF4444"
]

const DEFAULT_WAKE_UP_HOUR = 7
const DEFAULT_SLEEP_HOUR = 23
const DEFAULT_AWAKE_MINUTES = (DEFAULT_SLEEP_HOUR - DEFAULT_WAKE_UP_HOUR) * 60
const LEGEND_COUNT = 4

function formatMinutes(minutes: number): string {
  if (minutes <= 0) return "0小时"
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  if (hours > 0 && mins > 0) {
    return `${hours}小时${mins}分钟`
  }
  if (hours > 0) {
    return `${hours}小时`
  }
  return `${mins}分钟`
}

export function TodayScheduleSummary() {
  const [summary, setSummary] = useState<DailyScheduleSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [hovered, setHovered] = useState<DailyCategorySummary | null>(null)

  useEffect(() => {
    const fetchSummary = async () => {
      setLoading(true)
      setError(null)
      try {
        const response = await fetch('/api/schedule/today-summary')
        if (!response.ok) {
          throw new Error('无法获取今日统计')
        }
        const data = await response.json()
        setSummary(data)
      } catch (err) {
        console.error(err)
        setError((err as Error).message)
        setSummary(null)
      } finally {
        setLoading(false)
      }
    }

    void fetchSummary()
  }, [])

  const categoryData = useMemo(() => {
    if (!summary) return []
    return summary.categories
      .map((category, index) => ({
        ...category,
        color: category.categoryColor || FALLBACK_COLORS[index % FALLBACK_COLORS.length]
      }))
      .filter(category => category.plannedMinutes > 0)
      .sort((a, b) => b.plannedMinutes - a.plannedMinutes)
  }, [summary])

  const totalPlanned = useMemo(() => {
    return categoryData.reduce((sum, category) => sum + category.plannedMinutes, 0)
  }, [categoryData])

  const legendCategories = useMemo(() => categoryData.slice(0, LEGEND_COUNT), [categoryData])
  const remainingAggregates = useMemo(() => {
    if (categoryData.length <= LEGEND_COUNT) {
      return null
    }
    const remaining = categoryData.slice(LEGEND_COUNT)
    return {
      count: remaining.length,
      planned: remaining.reduce((sum, cat) => sum + cat.plannedMinutes, 0),
      effective: remaining.reduce((sum, cat) => sum + cat.effectiveMinutes, 0)
    }
  }, [categoryData])

  const chartSegments = useMemo(() => {
    if (totalPlanned <= 0) return []
    const circumference = 2 * Math.PI * 60
    let cumulative = 0

    return categoryData.map(category => {
      const value = category.plannedMinutes
      const dash = (value / totalPlanned) * circumference
      const offset = cumulative / totalPlanned * circumference
      cumulative += value
      return {
        category,
        dash,
        offset
      }
    })
  }, [categoryData, totalPlanned])

  const effectiveMinutesDisplay = summary && summary.totalEffectiveMinutes > 0
    ? summary.totalEffectiveMinutes
    : DEFAULT_AWAKE_MINUTES

  return (
    <Card className="p-4">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-gray-900">今日时间概览</h2>
        <p className="text-xs text-gray-500">快速了解今天的时间投入，侧栏仅展示主要任务属性</p>
      </div>

      {loading ? (
        <div className="space-y-3">
          <div className="h-16 rounded-lg bg-gray-100 animate-pulse" />
          <div className="h-28 rounded-lg bg-gray-100 animate-pulse" />
        </div>
      ) : error ? (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      ) : summary && summary.totalPlannedMinutes > 0 ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg border border-gray-200 p-3 text-center">
              <p className="text-[11px] uppercase tracking-wide text-gray-500">有效时间</p>
              <p className="text-xl font-semibold text-gray-900 mt-1">
                {formatMinutes(effectiveMinutesDisplay)}
              </p>
            </div>
            <div className="rounded-lg border border-gray-200 p-3 text-center">
              <p className="text-[11px] uppercase tracking-wide text-gray-500">计划时间</p>
              <p className="text-xl font-semibold text-gray-900 mt-1">
                {formatMinutes(summary.totalPlannedMinutes)}
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-4 md:flex-row md:items-center">
            <div className="mx-auto flex-shrink-0">
              <svg
                width={170}
                height={170}
                viewBox="0 0 170 170"
                className="drop-shadow-sm"
              >
                <circle cx="85" cy="85" r="65" fill="#F3F4F6" />
                {chartSegments.map(({ category, dash, offset }) => (
                  <circle
                    key={`${category.categoryId ?? 'none'}-${category.categoryName}`}
                    cx="85"
                    cy="85"
                    r="65"
                    fill="transparent"
                    stroke={category.color}
                    strokeWidth={16}
                    strokeDasharray={`${dash} ${2 * Math.PI * 65}`}
                    strokeDashoffset={-offset}
                    strokeLinecap="butt"
                    opacity={hovered && hovered.categoryName !== category.categoryName ? 0.35 : 1}
                    style={{ transition: "opacity 0.2s" }}
                    onMouseEnter={() => setHovered(category)}
                    onMouseLeave={() => setHovered(null)}
                  >
                    <title>{`${category.categoryName}: 计划 ${formatMinutes(category.plannedMinutes)} · 有效 ${formatMinutes(category.effectiveMinutes)}`}</title>
                  </circle>
                ))}
                <circle cx="85" cy="85" r="52" fill="white" />
              </svg>
              <div className="-mt-24 flex flex-col items-center text-center pointer-events-none select-none">
                <p className="text-xs text-gray-500">{hovered ? hovered.categoryName : "计划时长"}</p>
                <p className="text-base font-semibold text-gray-900">
                  {hovered ? formatMinutes(hovered.plannedMinutes) : formatMinutes(summary.totalPlannedMinutes)}
                </p>
                <p className="text-[11px] text-gray-400">
                  {hovered
                    ? `有效 ${formatMinutes(hovered.effectiveMinutes)}`
                    : `有效 ${formatMinutes(effectiveMinutesDisplay)}`}
                </p>
              </div>
            </div>

            <div className="flex-1 space-y-2">
              {legendCategories.map(category => (
                <button
                  key={`${category.categoryId ?? 'none'}-${category.categoryName}`}
                  type="button"
                  onMouseEnter={() => setHovered(category)}
                  onMouseLeave={() => setHovered(null)}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-left transition hover:border-gray-300"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span
                        className="h-3 w-3 rounded-full"
                        style={{ backgroundColor: category.color }}
                      />
                      <p className="text-sm font-medium text-gray-800">{category.categoryName}</p>
                    </div>
                    <span className="text-xs text-gray-400">
                      {Math.round((category.plannedMinutes / summary.totalPlannedMinutes) * 100)}%
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-gray-500">
                    计划 {formatMinutes(category.plannedMinutes)} · 有效 {formatMinutes(category.effectiveMinutes)}
                  </p>
                </button>
              ))}

              {remainingAggregates && remainingAggregates.planned > 0 && (
                <div className="rounded-lg border border-dashed border-gray-200 px-3 py-2 text-xs text-gray-500">
                  其它 {remainingAggregates.count} 个属性 · 计划 {formatMinutes(remainingAggregates.planned)} · 有效 {formatMinutes(remainingAggregates.effective)}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-gray-200 p-6 text-center">
          <p className="text-sm text-gray-500">今天还没有安排可统计的时间块，试着在日程中规划一些任务吧。</p>
        </div>
      )}
    </Card>
  )
}
