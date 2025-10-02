"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { ChevronDown, ChevronUp } from "lucide-react"

interface CompletedTask {
  id: number
  taskId: number
  taskType: string
  taskTitle: string
  taskLevel: number
  mainTaskTitle?: string
  completionComment?: string
  completedAt: string
}

interface MainTaskGroup {
  mainTaskTitle: string
  count: number
  tasks: CompletedTask[]
}

const formatDate = (dateString?: string) => {
  if (!dateString) return { date: "", time: "" }
  const d = new Date(dateString)
  return {
    date: new Intl.DateTimeFormat("zh-CN", {
      year: "numeric",
      month: "long",
      day: "numeric"
    }).format(d),
    time: new Intl.DateTimeFormat("zh-CN", {
      hour: "2-digit",
      minute: "2-digit"
    }).format(d)
  }
}

const taskTypeLabels: Record<string, string> = {
  routine: "日常习惯",
  "long-term": "长期任务",
  "short-term": "短期任务"
}

const taskLevelLabels = ["主任务", "子任务", "子子任务"]

type ViewMode = "timeline" | "grouped"

export default function CompletedTasksTimelinePage() {
  const [viewMode, setViewMode] = useState<ViewMode>("timeline")
  const [completedTasks, setCompletedTasks] = useState<CompletedTask[]>([])
  const [groupedData, setGroupedData] = useState<MainTaskGroup[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)
      // 获取所有完成任务
      const tasksResponse = await fetch("/api/completed-tasks")
      if (tasksResponse.ok) {
        const tasks = await tasksResponse.json()
        setCompletedTasks(tasks)
      }

      // 获取分组数据（所有时间）
      const groupedResponse = await fetch("/api/completed-tasks?action=group-by-main&days=9999")
      if (groupedResponse.ok) {
        const grouped = await groupedResponse.json()
        setGroupedData(grouped)
      }
    } catch (error) {
      console.error("Failed to fetch completed tasks:", error)
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

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-4xl mx-auto px-6 py-12">
        {/* 头部 */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-light tracking-wide text-gray-900 mb-2">
            已完成任务
          </h1>
          <p className="text-sm text-gray-500 tracking-wide">
            回顾每一次完成的任务与心得
          </p>

          {/* 视图切换 */}
          <div className="flex justify-center gap-2 mt-6">
            <button
              onClick={() => setViewMode("timeline")}
              className={`
                px-4 py-2 text-sm transition-colors
                ${viewMode === "timeline"
                  ? "bg-gray-900 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }
              `}
            >
              时间线视图
            </button>
            <button
              onClick={() => setViewMode("grouped")}
              className={`
                px-4 py-2 text-sm transition-colors
                ${viewMode === "grouped"
                  ? "bg-gray-900 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }
              `}
            >
              按任务分组
            </button>
          </div>

          <div className="flex justify-center gap-6 mt-4 text-sm text-gray-600">
            <Link href="/tasks" className="hover:text-gray-900 transition-colors">
              ← 返回任务管理
            </Link>
            <Link href="/past" className="hover:text-gray-900 transition-colors">
              ← 返回过去主页
            </Link>
          </div>
        </div>

        {/* 内容区域 */}
        {loading ? (
          <div className="text-center py-20 text-gray-400">加载中...</div>
        ) : completedTasks.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <p className="text-sm tracking-wide">尚未有完成任务的记录</p>
            <p className="text-xs mt-2">继续加油 💪</p>
          </div>
        ) : viewMode === "timeline" ? (
          /* 时间线视图 */
          <div className="relative pl-8">
            <div className="absolute left-0 top-0 bottom-0 w-px bg-gray-900" />
            <div className="space-y-4">
              {completedTasks.map((task: CompletedTask) => {
                const { date, time } = formatDate(task.completedAt)
                return (
                  <div key={task.id} className="relative">
                    <div className="absolute -left-[33px] top-4 w-2 h-2 bg-gray-900" />
                    <div className="border border-gray-200 bg-white">
                      <div className="p-4 space-y-3">
                        <div className="text-xs uppercase tracking-wider text-gray-400">
                          {date} · {time}
                        </div>
                        <h2 className="text-lg font-light tracking-wide text-gray-900">
                          {task.taskTitle}
                        </h2>
                        <div className="flex flex-wrap gap-2">
                          <span className="text-xs px-2 py-1 border border-gray-300 text-gray-600">
                            {taskTypeLabels[task.taskType] || task.taskType}
                          </span>
                          <span className="text-xs px-2 py-1 border border-gray-300 text-gray-600">
                            {taskLevelLabels[task.taskLevel] || "任务"}
                          </span>
                          {task.mainTaskTitle && (
                            <span className="text-xs px-2 py-1 border border-gray-300 text-gray-600">
                              主任务：{task.mainTaskTitle}
                            </span>
                          )}
                        </div>
                        {task.completionComment && (
                          <>
                            <div className="h-px bg-gray-200" />
                            <div className="bg-gray-50 p-3">
                              <p className="text-xs uppercase tracking-wider text-gray-400 mb-1">
                                完成感悟
                              </p>
                              <p className="text-sm text-gray-600 leading-relaxed">
                                {task.completionComment}
                              </p>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ) : (
          /* 按任务分组视图 */
          <div className="space-y-3">
            {groupedData.map((group) => {
              const isExpanded = expandedGroups.has(group.mainTaskTitle)
              return (
                <div key={group.mainTaskTitle} className="border border-gray-200">
                  <button
                    onClick={() => toggleGroup(group.mainTaskTitle)}
                    className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-light tracking-wide text-gray-900">
                        {group.mainTaskTitle}
                      </span>
                      <span className="text-xs px-2 py-0.5 border border-gray-300 text-gray-600">
                        {group.count} 件
                      </span>
                    </div>
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4 text-gray-400" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-gray-400" />
                    )}
                  </button>
                  {isExpanded && (
                    <div className="border-t border-gray-200 bg-gray-50">
                      <div className="p-4 space-y-2">
                        {group.tasks.map((task) => {
                          const { date, time } = formatDate(task.completedAt)
                          return (
                            <div
                              key={task.id}
                              className="flex items-start justify-between text-sm py-2 border-b border-gray-200 last:border-0"
                            >
                              <div className="flex-1">
                                <div className="text-gray-900 font-light">
                                  {task.taskLevel === 1 && "└─ "}
                                  {task.taskLevel === 2 && "　└─ "}
                                  {task.taskTitle}
                                </div>
                                {task.completionComment && (
                                  <div className="text-xs text-gray-500 mt-1 pl-4">
                                    {task.completionComment}
                                  </div>
                                )}
                              </div>
                              <div className="text-xs text-gray-400 ml-4 whitespace-nowrap">
                                {date} {time}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
