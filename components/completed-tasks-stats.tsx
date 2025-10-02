"use client"

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { ChevronDown, ChevronUp } from 'lucide-react'

interface CompletedTask {
  id: number
  taskId: number
  taskTitle: string
  taskLevel: number
  completedAt: string
}

interface MainTaskGroup {
  mainTaskTitle: string
  count: number
  tasks: CompletedTask[]
}

type TimeRange = 1 | 3 | 7

export default function CompletedTasksStats() {
  const [timeRange, setTimeRange] = useState<TimeRange>(7)
  const [data, setData] = useState<MainTaskGroup[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())

  useEffect(() => {
    fetchData()
  }, [timeRange])

  const fetchData = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/completed-tasks?action=group-by-main&days=${timeRange}`)
      if (response.ok) {
        const result = await response.json()
        setData(result)
      }
    } catch (error) {
      console.error('Failed to fetch completed tasks stats:', error)
    } finally {
      setLoading(false)
    }
  }

  const toggleGroup = (mainTaskTitle: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev)
      if (next.has(mainTaskTitle)) {
        next.delete(mainTaskTitle)
      } else {
        next.add(mainTaskTitle)
      }
      return next
    })
  }

  const totalCount = data.reduce((sum, group) => sum + group.count, 0)

  const timeRangeLabels: Record<TimeRange, string> = {
    1: '过去1天',
    3: '过去3天',
    7: '过去7天'
  }

  return (
    <Card className="p-6">
      <div className="space-y-4">
        {/* 标题和时间范围切换 */}
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900">完成任务统计</h3>
          <div className="flex gap-2">
            {([1, 3, 7] as TimeRange[]).map(days => (
              <button
                key={days}
                onClick={() => setTimeRange(days)}
                className={`
                  px-3 py-1 text-sm rounded transition-colors
                  ${timeRange === days
                    ? 'bg-gray-900 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }
                `}
              >
                {timeRangeLabels[days]}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="text-center py-8 text-gray-500">加载中...</div>
        ) : data.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            {timeRangeLabels[timeRange]}无完成任务
          </div>
        ) : (
          <>
            {/* 总计 */}
            <div className="border-t border-b border-gray-200 py-3">
              <div className="text-sm text-gray-600">
                {timeRangeLabels[timeRange]}共完成
                <span className="text-xl font-semibold text-gray-900 mx-2">{totalCount}</span>
                件任务
              </div>
            </div>

            {/* 主任务分组列表 */}
            <div className="space-y-2">
              {data.map((group) => {
                const isExpanded = expandedGroups.has(group.mainTaskTitle)

                return (
                  <div key={group.mainTaskTitle} className="border border-gray-200 rounded">
                    {/* 主任务行 */}
                    <button
                      onClick={() => toggleGroup(group.mainTaskTitle)}
                      className="w-full flex items-center justify-between p-3 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-medium text-gray-900">
                          {group.mainTaskTitle}
                        </span>
                        <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded">
                          {group.count} 件
                        </span>
                      </div>
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4 text-gray-400" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-gray-400" />
                      )}
                    </button>

                    {/* 展开的任务列表 */}
                    {isExpanded && (
                      <div className="border-t border-gray-200 bg-gray-50 px-3 py-2">
                        <div className="space-y-1">
                          {group.tasks.map((task) => (
                            <div
                              key={task.id}
                              className="flex items-center justify-between text-sm py-1"
                            >
                              <span className="text-gray-700">
                                {task.taskLevel === 1 && '└─ '}
                                {task.taskLevel === 2 && '　└─ '}
                                {task.taskTitle}
                              </span>
                              <span className="text-xs text-gray-400">
                                {new Date(task.completedAt).toLocaleDateString('zh-CN', {
                                  month: 'numeric',
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>
    </Card>
  )
}
