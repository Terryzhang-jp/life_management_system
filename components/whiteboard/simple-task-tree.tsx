"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ChevronDown, ChevronRight, HelpCircle, CheckSquare, Square } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Task {
  id?: number
  type: 'routine' | 'long-term' | 'short-term'
  title: string
  description?: string
  priority?: number
  parentId?: number
  level?: number
  deadline?: string
  isUnclear?: boolean
  unclearReason?: string
  hasUnclearChildren?: boolean
  categoryId?: number
  completion?: {
    isCompleted: boolean
    completedAt?: string
    completionComment?: string
  }
  createdAt?: string
  updatedAt?: string
  children?: Task[] // 子任务数组
}

interface TasksData {
  routines: Task[]
  longTermTasks: Task[]
  shortTermTasks: Task[]
}

interface SimpleTaskTreeProps {
  className?: string
}

export default function SimpleTaskTree({ className }: SimpleTaskTreeProps) {
  const [tasks, setTasks] = useState<TasksData>({
    routines: [],
    longTermTasks: [],
    shortTermTasks: []
  })
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(false)

  // 加载所有任务和子任务
  const loadAllTasks = async () => {
    try {
      setLoading(true)

      // 1. 加载主任务
      const mainResponse = await fetch('/api/tasks')
      if (!mainResponse.ok) throw new Error('Failed to load main tasks')
      const mainTasks = await mainResponse.json()

      // 2. 为每个主任务加载完整的子任务树
      const enhancedTasks = {
        routines: await Promise.all(mainTasks.routines.map(loadTaskWithChildren)),
        longTermTasks: await Promise.all(mainTasks.longTermTasks.map(loadTaskWithChildren)),
        shortTermTasks: await Promise.all(mainTasks.shortTermTasks.map(loadTaskWithChildren))
      }

      setTasks(enhancedTasks)
    } catch (error) {
      console.error('Error loading tasks:', error)
    } finally {
      setLoading(false)
    }
  }

  // 递归加载任务的所有子任务
  const loadTaskWithChildren = async (task: Task): Promise<Task> => {
    try {
      // 加载子任务 (level 1)
      const subResponse = await fetch(`/api/tasks/subtasks?parentId=${task.id}&level=1`)
      let subTasks: Task[] = []

      if (subResponse.ok) {
        subTasks = await subResponse.json()

        // 为每个子任务加载子子任务 (level 2)
        subTasks = await Promise.all(subTasks.map(async (subTask) => {
          const subSubResponse = await fetch(`/api/tasks/subtasks?parentId=${subTask.id}&level=2`)
          let subSubTasks: Task[] = []

          if (subSubResponse.ok) {
            subSubTasks = await subSubResponse.json()
          }

          return { ...subTask, children: subSubTasks }
        }))
      }

      return { ...task, children: subTasks }
    } catch (error) {
      console.error('Error loading task children:', error)
      return { ...task, children: [] }
    }
  }

  useEffect(() => {
    loadAllTasks()
  }, [])

  // 切换展开状态
  const toggleExpanded = (taskId: string) => {
    const newExpanded = new Set(expanded)
    if (newExpanded.has(taskId)) {
      newExpanded.delete(taskId)
    } else {
      newExpanded.add(taskId)
    }
    setExpanded(newExpanded)
  }

  // 获取优先级颜色
  const getPriorityColor = (priority: number) => {
    if (priority === 1) return 'text-red-600'
    if (priority === 2) return 'text-orange-600'
    if (priority === 3) return 'text-yellow-600'
    if (priority <= 5) return 'text-blue-600'
    return 'text-gray-500'
  }

  // 渲染单个任务
  const renderTask = (task: Task, level: number = 0): React.ReactNode => {
    const taskKey = `${task.id}-${level}`
    const isExpanded = expanded.has(taskKey)
    const hasChildren = task.children && task.children.length > 0
    const isCompleted = task.completion?.isCompleted || false

    const indentClass = level === 0 ? '' : level === 1 ? 'ml-6' : 'ml-12'

    return (
      <div key={taskKey} className={cn('select-none', indentClass)}>
        {/* 任务行 */}
        <div
          className={cn(
            'flex items-center gap-2 py-1 px-2 rounded hover:bg-gray-100',
            isCompleted && 'opacity-60'
          )}
        >
          {/* 展开按钮 */}
          <div className="w-5 h-5 flex items-center justify-center">
            {hasChildren ? (
              <Button
                variant="ghost"
                size="sm"
                className="h-4 w-4 p-0"
                onClick={() => toggleExpanded(taskKey)}
              >
                {isExpanded ? (
                  <ChevronDown className="h-3 w-3" />
                ) : (
                  <ChevronRight className="h-3 w-3" />
                )}
              </Button>
            ) : (
              <div className="w-1 h-1 bg-gray-300 rounded-full" />
            )}
          </div>

          {/* 完成状态 */}
          <div className="flex-shrink-0">
            {isCompleted ? (
              <CheckSquare className="h-4 w-4 text-green-600" />
            ) : (
              <Square className="h-4 w-4 text-gray-400" />
            )}
          </div>

          {/* 任务内容 */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  'text-sm truncate',
                  isCompleted ? 'line-through text-gray-500' : 'text-gray-900'
                )}
                title={task.description}
              >
                {task.title}
              </span>

              {typeof task.id === 'number' && (
                <span className="text-xs text-gray-400 font-mono">
                  ID:{task.id}
                </span>
              )}

              {/* 层级标识 */}
              {level > 0 && (
                <span className="text-xs text-gray-400 font-mono">
                  L{level}
                </span>
              )}

              {/* 优先级 */}
              {task.priority && task.priority <= 5 && (
                <span className={cn('text-xs font-medium', getPriorityColor(task.priority))}>
                  {task.priority}
                </span>
              )}

              {/* 模糊状态 */}
              {task.isUnclear && (
                <HelpCircle
                  className="h-3 w-3 text-orange-500"
                />
              )}

              {/* 有模糊子任务 */}
              {task.hasUnclearChildren && !task.isUnclear && (
                <HelpCircle
                  className="h-3 w-3 text-yellow-500"
                />
              )}
            </div>
          </div>
        </div>

        {/* 子任务 */}
        {isExpanded && hasChildren && (
          <div className="mt-1">
            {task.children!.map(child => renderTask(child, level + 1))}
          </div>
        )}
      </div>
    )
  }

  // 渲染任务组
  const renderTaskGroup = (title: string, tasks: Task[], description: string) => (
    <div className="mb-6">
      <div className="flex items-center gap-2 mb-2">
        <h3 className="font-medium text-gray-900">{title}</h3>
        <span className="text-xs text-gray-500">({tasks.length})</span>
      </div>
      <p className="text-xs text-gray-500 mb-3">{description}</p>
      <div className="space-y-1">
        {tasks.length > 0 ? (
          tasks.map(task => renderTask(task, 0))
        ) : (
          <div className="text-xs text-gray-400 italic py-2">暂无任务</div>
        )}
      </div>
    </div>
  )

  if (loading) {
    return (
      <Card className={cn('h-full flex flex-col', className)}>
        <CardHeader className="pb-3 flex-shrink-0">
          <CardTitle className="text-lg">任务全览</CardTitle>
        </CardHeader>
        <CardContent className="pt-0 flex-1 flex items-center justify-center">
          <div className="text-gray-500">加载中...</div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={cn('h-full flex flex-col', className)}>
      <CardHeader className="pb-3 flex-shrink-0">
        <CardTitle className="text-lg">任务全览</CardTitle>
        <p className="text-sm text-gray-600">点击箭头展开查看完整任务层级</p>
      </CardHeader>
      <CardContent className="pt-0 flex-1 overflow-hidden">
        <div className="h-full overflow-y-auto pr-2">
          {renderTaskGroup(
            '📋 日常习惯',
            tasks.routines,
            '终身性的习惯和实践'
          )}

          {renderTaskGroup(
            '🎯 长期任务',
            tasks.longTermTasks,
            '持续几个月到几年的项目'
          )}

          {renderTaskGroup(
            '⚡ 短期任务',
            tasks.shortTermTasks,
            '持续几小时到几天的任务'
          )}
        </div>
      </CardContent>
    </Card>
  )
}
