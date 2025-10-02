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
}

interface TasksData {
  routines: Task[]
  longTermTasks: Task[]
  shortTermTasks: Task[]
}

interface TaskTreePanelProps {
  className?: string
}

export default function TaskTreePanel({ className }: TaskTreePanelProps) {
  const [tasks, setTasks] = useState<TasksData>({
    routines: [],
    longTermTasks: [],
    shortTermTasks: []
  })
  const [expandedTasks, setExpandedTasks] = useState<Set<number>>(new Set())
  const [expandedSubTasks, setExpandedSubTasks] = useState<Set<number>>(new Set())
  const [subTasks, setSubTasks] = useState<{ [key: number]: Task[] }>({})
  const [subSubTasks, setSubSubTasks] = useState<{ [key: number]: Task[] }>({})
  const [loading, setLoading] = useState(false)

  // 加载主任务
  const loadTasks = async () => {
    try {
      const response = await fetch('/api/tasks')
      if (response.ok) {
        const data = await response.json()
        setTasks(data)
      }
    } catch (error) {
      console.error('Error loading tasks:', error)
    }
  }

  // 加载子任务
  const loadSubTasks = async (parentId: number, level: number = 1) => {
    try {
      const response = await fetch(`/api/tasks/subtasks?parentId=${parentId}&level=${level}`)
      if (response.ok) {
        const data = await response.json()
        if (level === 1) {
          setSubTasks(prev => ({ ...prev, [parentId]: data }))
        } else if (level === 2) {
          setSubSubTasks(prev => ({ ...prev, [parentId]: data }))
        }
      }
    } catch (error) {
      console.error('Error loading subtasks:', error)
    }
  }

  useEffect(() => {
    loadTasks()
  }, [])

  // 切换主任务展开状态
  const toggleTaskExpanded = async (taskId: number) => {
    const newExpanded = new Set(expandedTasks)
    if (newExpanded.has(taskId)) {
      newExpanded.delete(taskId)
      // 清除相关的子任务数据
      const newSubTasks = { ...subTasks }
      delete newSubTasks[taskId]
      setSubTasks(newSubTasks)
    } else {
      newExpanded.add(taskId)
      // 异步加载子任务
      loadSubTasks(taskId, 1)
    }
    setExpandedTasks(newExpanded)
  }

  // 切换子任务展开状态
  const toggleSubTaskExpanded = async (subTaskId: number) => {
    const newExpanded = new Set(expandedSubTasks)
    if (newExpanded.has(subTaskId)) {
      newExpanded.delete(subTaskId)
      // 清除相关的子子任务数据
      const newSubSubTasks = { ...subSubTasks }
      delete newSubSubTasks[subTaskId]
      setSubSubTasks(newSubSubTasks)
    } else {
      newExpanded.add(subTaskId)
      // 异步加载子子任务
      loadSubTasks(subTaskId, 2)
    }
    setExpandedSubTasks(newExpanded)
  }

  // 获取优先级颜色
  const getPriorityColor = (priority: number) => {
    if (priority === 1) return 'text-red-600'
    if (priority === 2) return 'text-orange-600'
    if (priority === 3) return 'text-yellow-600'
    if (priority <= 5) return 'text-blue-600'
    return 'text-gray-500'
  }

  // 渲染任务项
  const renderTask = (task: Task, level: number = 0) => {
    const isCompleted = task.completion?.isCompleted || false
    const isExpanded = level === 0 ? expandedTasks.has(task.id!) : expandedSubTasks.has(task.id!)

    // 检查是否有子任务可以显示
    const hasChildren = level === 0
      ? (subTasks[task.id!]?.length > 0)
      : (level === 1 ? (subSubTasks[task.id!]?.length > 0) : false)

    return (
      <div key={task.id} className={cn('select-none', level > 0 && 'ml-4')}>
        {/* 任务主体 */}
        <div
          className={cn(
            'flex items-center gap-2 py-1 px-2 rounded hover:bg-gray-100 cursor-pointer',
            isCompleted && 'opacity-60'
          )}
        >
          {/* 展开/收起按钮 */}
          {level < 2 ? (
            // 对于主任务，总是显示展开按钮（因为可能有子任务）
            // 对于子任务，只有在已展开并加载了子子任务时，或已知有子子任务时才显示
            (level === 0 || hasChildren || isExpanded) ? (
              <Button
                variant="ghost"
                size="sm"
                className="h-5 w-5 p-0"
                onClick={() => level === 0 ? toggleTaskExpanded(task.id!) : toggleSubTaskExpanded(task.id!)}
              >
                {isExpanded ? (
                  <ChevronDown className="h-3 w-3" />
                ) : (
                  <ChevronRight className="h-3 w-3" />
                )}
              </Button>
            ) : (
              <div className="h-5 w-5" />
            )
          ) : (
            <div className="h-5 w-5" />
          )}

          {/* 完成状态 */}
          <div className="flex-shrink-0">
            {isCompleted ? (
              <CheckSquare className="h-4 w-4 text-green-600" />
            ) : (
              <Square className="h-4 w-4 text-gray-400" />
            )}
          </div>

          {/* 任务标题 */}
          <div className="flex-1 min-w-0">
            <span
              className={cn(
                'text-sm',
                isCompleted ? 'line-through text-gray-500' : 'text-gray-900'
              )}
              title={task.description}
            >
              {task.title}
            </span>
          </div>

          {/* 状态指示器 */}
          <div className="flex items-center gap-1 flex-shrink-0">
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

        {/* 子任务 */}
        {isExpanded && (
          <div className="ml-2">
            {/* 主任务的子任务 */}
            {level === 0 && (
              subTasks[task.id!]?.length > 0 ? (
                subTasks[task.id!].map(subTask => (
                  <div key={subTask.id}>
                    {renderTask(subTask, 1)}
                    {/* 子子任务 */}
                    {expandedSubTasks.has(subTask.id!) && (
                      subSubTasks[subTask.id!]?.length > 0 ? (
                        subSubTasks[subTask.id!].map(subSubTask => renderTask(subSubTask, 2))
                      ) : (
                        <div className="ml-6 text-xs text-gray-400 py-1">暂无子子任务</div>
                      )
                    )}
                  </div>
                ))
              ) : (
                <div className="ml-4 text-xs text-gray-400 py-1">暂无子任务</div>
              )
            )}

            {/* 子任务的子子任务 */}
            {level === 1 && (
              subSubTasks[task.id!]?.length > 0 ? (
                subSubTasks[task.id!].map(subSubTask => renderTask(subSubTask, 2))
              ) : (
                <div className="ml-4 text-xs text-gray-400 py-1">暂无子子任务</div>
              )
            )}
          </div>
        )}
      </div>
    )
  }

  // 渲染任务组
  const renderTaskGroup = (title: string, tasks: Task[], description: string) => (
    <div className="mb-4">
      <div className="flex items-center gap-2 mb-2">
        <h3 className="font-medium text-gray-900">{title}</h3>
        <span className="text-xs text-gray-500">({tasks.length})</span>
      </div>
      <p className="text-xs text-gray-500 mb-2">{description}</p>
      <div className="space-y-1">
        {tasks.map(task => renderTask(task))}
        {tasks.length === 0 && (
          <div className="text-xs text-gray-400 italic py-2">暂无任务</div>
        )}
      </div>
    </div>
  )

  return (
    <Card className={cn('h-full flex flex-col', className)}>
      <CardHeader className="pb-3 flex-shrink-0">
        <CardTitle className="text-lg">任务全览</CardTitle>
        <p className="text-sm text-gray-600">点击展开查看任务层级结构</p>
      </CardHeader>
      <CardContent className="pt-0 flex-1 overflow-hidden">
        <div className="h-full overflow-y-auto pr-2">
          <div className="space-y-6">
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
        </div>
      </CardContent>
    </Card>
  )
}