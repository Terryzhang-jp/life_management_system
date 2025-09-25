"use client"

import { useCallback, useEffect, useState } from "react"
import { HeatmapData } from "@/lib/habits-db"
import { getLocalDateString } from "@/lib/date-utils"

interface HabitHeatmapProps {
  className?: string
}

export function HabitHeatmap({ className }: HabitHeatmapProps) {
  const [heatmapData, setHeatmapData] = useState<HeatmapData[]>([])
  const [loading, setLoading] = useState(true)
  const [dateRange, setDateRange] = useState<string[]>([])

  // 生成最近21天的日期范围
  const generateDateRange = useCallback(() => {
    const dates: string[] = []
    const today = new Date()

    for (let i = 20; i >= 0; i--) {
      const date = new Date(today)
      date.setDate(today.getDate() - i)
      dates.push(getLocalDateString(date))
    }

    return dates
  }, [])

  // 获取热力图数据
  const fetchHeatmapData = useCallback(async () => {
    try {
      setLoading(true)
      const dates = generateDateRange()
      setDateRange(dates)

      const startDate = dates[0]
      const endDate = dates[dates.length - 1]

      // 获取所有routine任务
      const tasksResponse = await fetch('/api/tasks')
      if (!tasksResponse.ok) {
        throw new Error('Failed to fetch tasks')
      }
      const tasksData = await tasksResponse.json()
      const routines = tasksData.routines || []

      // 获取习惯记录
      const recordsResponse = await fetch(`/api/habits/records?startDate=${startDate}&endDate=${endDate}`)
      let records = []
      if (recordsResponse.ok) {
        records = await recordsResponse.json()
      }

      // 构建热力图数据
      const heatmapData: HeatmapData[] = routines.map((routine: any) => {
        const recordMap: { [date: string]: boolean } = {}

        // 为这个routine填充记录
        records
          .filter((record: any) => record.routineId === routine.id)
          .forEach((record: any) => {
            recordMap[record.recordDate] = true
          })

        return {
          routineId: routine.id,
          routineName: routine.title,
          records: recordMap
        }
      })

      setHeatmapData(heatmapData)
    } catch (error) {
      console.error('Failed to fetch heatmap data:', error)
    } finally {
      setLoading(false)
    }
  }, [generateDateRange])

  useEffect(() => {
    void fetchHeatmapData()
  }, [fetchHeatmapData])

  // 格式化日期显示
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return `${date.getMonth() + 1}/${date.getDate()}`
  }

  // 获取星期几
  const getWeekday = (dateStr: string) => {
    const date = new Date(dateStr)
    const weekdays = ['日', '一', '二', '三', '四', '五', '六']
    return weekdays[date.getDay()]
  }

  // 生成周标识（每周一显示）
  const getWeekMarkers = () => {
    const markers: { index: number; label: string }[] = []
    dateRange.forEach((date, index) => {
      const dayOfWeek = new Date(date).getDay()
      if (dayOfWeek === 1 || index === 0) { // 周一或第一天
        markers.push({
          index,
          label: formatDate(date)
        })
      }
    })
    return markers
  }

  if (loading) {
    return (
      <div className={`bg-white rounded-lg border p-4 ${className}`}>
        <h3 className="text-sm font-medium mb-3">习惯完成情况</h3>
        <div className="animate-pulse">
          <div className="space-y-2">
            {[1, 2, 3].map(i => (
              <div key={i} className="flex items-center gap-2">
                <div className="w-20 h-3 bg-gray-200 rounded"></div>
                <div className="flex gap-0.5">
                  {Array.from({ length: 21 }).map((_, j) => (
                    <div key={j} className="w-2.5 h-2.5 bg-gray-200 rounded-sm"></div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (heatmapData.length === 0) {
    return (
      <div className={`bg-white rounded-lg border p-4 ${className}`}>
        <h3 className="text-sm font-medium mb-3">习惯完成情况</h3>
        <p className="text-gray-500 text-sm">暂无日常习惯，请先在任务管理中添加 routine 类型的任务</p>
      </div>
    )
  }

  const todayStr = getLocalDateString()

  return (
    <div className={`bg-white rounded-lg border p-4 ${className}`}>
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-sm font-medium">习惯完成情况 (最近3周)</h3>
      </div>

      {/* 时间轴标记 */}
      <div className="mb-2">
        <div className="flex items-center">
          <div className="w-24"></div> {/* 习惯名称占位 */}
          <div className="flex-1 relative">
            <div className="flex">
              {getWeekMarkers().map(marker => (
                <div
                  key={marker.index}
                  className="absolute text-xs text-gray-500"
                  style={{ left: `${(marker.index * 14) + 2}px` }}
                >
                  {marker.label}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 热力图网格 */}
      <div className="space-y-1.5 mt-6">
        {heatmapData.map((habit) => (
          <div key={habit.routineId} className="flex items-center gap-2">
            {/* 习惯名称 */}
            <div className="w-24 text-xs text-gray-700 truncate" title={habit.routineName}>
              {habit.routineName}
            </div>

            {/* 日期网格 */}
            <div className="flex gap-1">
              {dateRange.map((date) => {
                const hasRecord = habit.records[date] || false
                const isToday = date === todayStr

                return (
                  <div
                    key={date}
                    className={`w-2.5 h-2.5 rounded-sm cursor-pointer transition-colors ${
                      hasRecord
                        ? 'bg-green-500 hover:bg-green-600'
                        : 'bg-gray-200 hover:bg-gray-300'
                    } ${
                      isToday ? 'ring-1 ring-blue-400' : ''
                    }`}
                    title={`${habit.routineName} - ${formatDate(date)} (${getWeekday(date)}) ${hasRecord ? '✅ 已完成' : '⚪ 未记录'}`}
                  />
                )
              })}
            </div>
          </div>
        ))}
      </div>

      {/* 图例 */}
      <div className="mt-4 flex items-center gap-4 text-xs text-gray-600">
        <div className="flex items-center gap-1">
          <div className="w-2.5 h-2.5 bg-gray-200 rounded-sm"></div>
          <span>未记录</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2.5 h-2.5 bg-green-500 rounded-sm"></div>
          <span>已完成</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2.5 h-2.5 bg-white border border-blue-400 rounded-sm"></div>
          <span>今天</span>
        </div>
      </div>
    </div>
  )
}
