'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { useDraggable } from '@dnd-kit/core'
import { ChevronRight, ChevronDown, GripVertical } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

// Utility functions for date handling
const formatDate = (dateStr?: string) => {
  if (!dateStr) return null
  const date = new Date(dateStr)
  const today = new Date()
  const diffDays = Math.ceil((date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

  if (diffDays === 0) return `${date.getMonth() + 1}/${date.getDate()} (今天)`
  if (diffDays === 1) return `${date.getMonth() + 1}/${date.getDate()} (明天)`
  if (diffDays > 0) return `${date.getMonth() + 1}/${date.getDate()} (${diffDays}天后)`
  return `${date.getMonth() + 1}/${date.getDate()} (已过期)`
}

const getDueDateUrgency = (dateStr?: string) => {
  if (!dateStr) return 'none'
  const date = new Date(dateStr)
  const today = new Date()
  const diffDays = Math.ceil((date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

  if (diffDays < 0) return 'overdue'
  if (diffDays === 0) return 'today'
  if (diffDays === 1) return 'tomorrow'
  if (diffDays <= 2) return 'soon'
  return 'normal'
}

const getUrgencyColor = (urgency: string) => {
  switch (urgency) {
    case 'overdue': return 'text-red-600 bg-red-50 border-red-200'
    case 'today': return 'text-orange-600 bg-orange-50 border-orange-200'
    case 'tomorrow': return 'text-yellow-600 bg-yellow-50 border-yellow-200'
    case 'soon': return 'text-blue-600 bg-blue-50 border-blue-200'
    default: return 'text-gray-600 bg-gray-50 border-gray-200'
  }
}

interface Task {
  id: number
  title: string
  type: string
  level: number
  priority?: number
  deadline?: string
  parentId?: number
  parentTitle?: string
  grandparentId?: number
  grandparentTitle?: string
  categoryId?: number
}

interface TaskCategory {
  id?: number
  name: string
  color: string
}

interface TaskGroup {
  main: Task
  children: Task[]
}

interface DraggableTaskProps {
  task: Task
  isSchedulable: boolean
}

function DraggableTask({ task, isSchedulable }: DraggableTaskProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    isDragging
  } = useDraggable({
    id: task.id.toString(),
    disabled: !isSchedulable,
    data: {
      task
    }
  })

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`
  } : undefined

  const getPriorityColor = (priority?: number) => {
    if (!priority || priority === 999) return 'bg-gray-100 text-gray-600'
    switch (priority) {
      case 1: return 'bg-red-100 text-red-700'
      case 2: return 'bg-orange-100 text-orange-700'
      case 3: return 'bg-yellow-100 text-yellow-700'
      default: return 'bg-blue-100 text-blue-700'
    }
  }

  // Get urgency level for this task's deadline
  const urgency = task.deadline ? getDueDateUrgency(task.deadline) : 'none'

  // Determine background color based on urgency
  const getTaskBackgroundClass = () => {
    switch (urgency) {
      case 'overdue': return 'bg-red-50 border-red-300 hover:bg-red-100'
      case 'today': return 'bg-orange-50 border-orange-300 hover:bg-orange-100'
      case 'tomorrow': return 'bg-yellow-50 border-yellow-300 hover:bg-yellow-100'
      case 'soon': return 'bg-blue-50 border-blue-300 hover:bg-blue-100'
      default: return isSchedulable ? 'hover:bg-gray-50 border-gray-200' : 'bg-gray-50 border-gray-100'
    }
  }


  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'flex items-center gap-2 p-2 rounded border transition-all',
        isSchedulable
          ? `cursor-move ${getTaskBackgroundClass()}`
          : 'cursor-not-allowed bg-gray-50 border-gray-100 opacity-60',
        isDragging && 'opacity-50 z-50'
      )}
      {...listeners}
      {...attributes}
    >
      {isSchedulable && (
        <GripVertical className="w-4 h-4 text-gray-400" />
      )}

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className={cn(
            'text-sm font-medium truncate',
            task.level === 2 ? 'text-gray-900' : 'text-gray-700'
          )}>
            {task.title}
          </span>

          {task.priority && task.priority !== 999 && (
            <Badge variant="outline" className={cn('text-xs', getPriorityColor(task.priority))}>
              {task.priority}
            </Badge>
          )}

        </div>

        {task.deadline && (
          <div className={cn(
            "text-xs font-medium",
            urgency === 'overdue' && "text-red-600",
            urgency === 'today' && "text-orange-600",
            urgency === 'tomorrow' && "text-yellow-700",
            urgency === 'soon' && "text-blue-600",
            urgency === 'normal' && "text-gray-500"
          )}>
            {urgency === 'overdue' && '⚠️ '}
            {urgency === 'today' && '🔥 '}
            {urgency === 'tomorrow' && '⏰ '}
            📅 {formatDate(task.deadline)}
          </div>
        )}

        <div className="text-xs text-gray-400">
          {task.level === 2 ? (
            <span>{task.grandparentTitle} › {task.parentTitle}</span>
          ) : (
            <span>{task.parentTitle}</span>
          )}
        </div>
      </div>
    </div>
  )
}

interface TaskPoolProps {
  className?: string
  categories?: TaskCategory[]
  selectedCategoryFilter?: number | null
  onCategoryFilterChange?: (categoryId: number | null) => void
  refreshToken?: number
}

export function TaskPool({ className, categories = [], selectedCategoryFilter, onCategoryFilterChange, refreshToken = 0 }: TaskPoolProps) {
  const [tasks, setTasks] = useState<Task[]>([])
  const [taskGroups, setTaskGroups] = useState<TaskGroup[]>([])
  const [expandedGroups, setExpandedGroups] = useState<Set<number>>(new Set())
  const [loading, setLoading] = useState(true)
  const [dueTasks, setDueTasks] = useState<Task[]>([])
  const [dueTasksLoading, setDueTasksLoading] = useState(true)

  // Calculate dynamic height based on expanded groups and content
  const expandedCount = expandedGroups.size
  const hasExpandedGroups = expandedCount > 0
  const totalChildrenInExpanded = Array.from(expandedGroups).reduce((sum, groupId) => {
    const group = taskGroups.find(g => g.main.id === groupId)
    return sum + (group?.children.length || 0)
  }, 0)

  // Filter tasks based on selected category
  const filteredTaskGroups = useMemo(() => {
    if (!selectedCategoryFilter) return taskGroups

    return taskGroups
      .map(group => ({
        ...group,
        children: group.children.filter(task => task.categoryId === selectedCategoryFilter)
      }))
      .filter(group => group.children.length > 0)
  }, [taskGroups, selectedCategoryFilter])

  const filteredDueTasks = useMemo(() => {
    if (!selectedCategoryFilter) return dueTasks
    return dueTasks.filter(task => task.categoryId === selectedCategoryFilter)
  }, [dueTasks, selectedCategoryFilter])

  const fetchDueTasks = useCallback(async () => {
    setDueTasksLoading(true)
    try {
      const response = await fetch('/api/tasks/due-soon?days=2')
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      const data = await response.json()

      if (Array.isArray(data)) {
        setDueTasks(data)
      } else {
        console.error('Due tasks API did not return an array:', data)
        setDueTasks([])
      }
    } catch (error) {
      console.error('Failed to fetch due tasks:', error)
      setDueTasks([])
    } finally {
      setDueTasksLoading(false)
    }
  }, [])

  useEffect(() => {
    // Group tasks by main task (grandparent for level 2, parent for level 1)
    const groups: { [key: string]: TaskGroup } = {}

    tasks.forEach(task => {
      let groupKey: string
      let mainTask: Task

      if (task.level === 2 && task.grandparentId) {
        // Level 2 task - group by grandparent
        groupKey = `main_${task.grandparentId}`
        mainTask = {
          id: task.grandparentId,
          title: task.grandparentTitle || 'Unknown',
          type: task.type,
          level: 0,
          parentId: undefined,
          parentTitle: undefined,
          grandparentId: undefined,
          grandparentTitle: undefined
        }
      } else {
        // Level 1 task without children - group by parent
        groupKey = `main_${task.parentId}`
        mainTask = {
          id: task.parentId || 0,
          title: task.parentTitle || 'Unknown',
          type: task.type,
          level: 0,
          parentId: undefined,
          parentTitle: undefined,
          grandparentId: undefined,
          grandparentTitle: undefined
        }
      }

      if (!groups[groupKey]) {
        groups[groupKey] = {
          main: mainTask,
          children: []
        }
      }

      groups[groupKey].children.push(task)
    })

    // Sort children by priority
    Object.values(groups).forEach(group => {
      group.children.sort((a, b) => {
        const priorityA = a.priority === 999 ? Infinity : (a.priority || Infinity)
        const priorityB = b.priority === 999 ? Infinity : (b.priority || Infinity)
        return priorityA - priorityB
      })
    })

    setTaskGroups(Object.values(groups))
  }, [tasks])

  const fetchSchedulableTasks = useCallback(async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/tasks/schedulable')
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      const data = await response.json()

      // Ensure data is an array
      if (Array.isArray(data)) {
        setTasks(data)
      } else {
        console.error('API did not return an array:', data)
        setTasks([])
      }
    } catch (error) {
      console.error('Failed to fetch schedulable tasks:', error)
      setTasks([]) // Set empty array on error
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void fetchSchedulableTasks()
    void fetchDueTasks()
  }, [fetchSchedulableTasks, fetchDueTasks, refreshToken])

  const toggleGroup = (groupId: number) => {
    const newExpanded = new Set(expandedGroups)
    if (newExpanded.has(groupId)) {
      newExpanded.delete(groupId)
    } else {
      newExpanded.add(groupId)
    }
    setExpandedGroups(newExpanded)
  }

  if (loading) {
    return (
      <Card className={className}>
        <CardContent className="p-4">
          <div className="animate-pulse space-y-3">
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            <div className="space-y-2">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-8 bg-gray-100 rounded"></div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardContent className="p-4">
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">任务池</h3>
              <p className="text-sm text-gray-500">拖拽子子任务到日程中</p>
            </div>

            {/* Category Filter */}
            {categories.length > 0 && (
              <div className="flex items-center gap-2">
                <label className="text-xs font-medium text-gray-600">分类筛选:</label>
                <select
                  value={selectedCategoryFilter || ''}
                  onChange={(e) => {
                    const value = e.target.value ? Number(e.target.value) : null
                    onCategoryFilterChange?.(value)
                  }}
                  className="px-2 py-1 border rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="">全部</option>
                  {categories.filter(c => c.id !== undefined).map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>

        {/* Due Soon Alert */}
        {!dueTasksLoading && filteredDueTasks.length > 0 && (
          <div className="mb-6 p-4 bg-gradient-to-r from-orange-50 to-red-50 border-2 border-orange-200 rounded-lg shadow-sm">
            <div className="flex items-center gap-3 mb-3">
              <span className="text-xl">⚠️</span>
              <h4 className="font-semibold text-lg text-orange-800">近期到期任务</h4>
              <span className="text-sm text-orange-700 bg-orange-100 px-3 py-1 rounded-full font-medium">
                {filteredDueTasks.length}个
              </span>
            </div>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {filteredDueTasks.map((task) => {
                const urgency = getDueDateUrgency(task.deadline)
                return (
                  <div
                    key={task.id}
                    className={cn(
                      "flex items-center justify-between p-3 rounded-lg border text-sm shadow-sm",
                      getUrgencyColor(urgency)
                    )}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="truncate font-semibold">{task.title}</div>
                      <div className="text-xs opacity-75 mt-1">
                        {task.level === 2 && task.grandparentTitle && task.parentTitle
                          ? `${task.grandparentTitle} › ${task.parentTitle}`
                          : task.parentTitle
                        }
                      </div>
                    </div>
                    <div className="text-sm font-semibold ml-3">
                      {formatDate(task.deadline)}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        <div className={cn(
          "space-y-2 overflow-y-auto transition-all duration-300 ease-in-out",
          // Dynamic height based on content and due tasks alert
          filteredDueTasks.length > 0 ? (
            totalChildrenInExpanded > 10 ? "max-h-[65vh]" :
            hasExpandedGroups ? "max-h-[55vh]" : "max-h-[40vh]"
          ) : (
            totalChildrenInExpanded > 10 ? "max-h-[80vh]" :
            hasExpandedGroups ? "max-h-[70vh]" : "max-h-[50vh]"
          )
        )}>
          {filteredTaskGroups.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <div className="text-sm">
                {selectedCategoryFilter ? '该分类下暂无可调度任务' : '暂无可调度任务'}
              </div>
              <div className="text-xs mt-1">
                只有子子任务和无子任务的子任务可以调度
              </div>
            </div>
          ) : (
            filteredTaskGroups.map((group) => {
              const isExpanded = expandedGroups.has(group.main.id)

              return (
                <div key={group.main.id} className="space-y-1">
                  {/* Main Task Header */}
                  <div
                    className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded cursor-pointer"
                    onClick={() => toggleGroup(group.main.id)}
                  >
                    {isExpanded ? (
                      <ChevronDown className="w-4 h-4 text-gray-400" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-gray-400" />
                    )}
                    <span className="font-medium text-gray-900 flex-1">
                      {group.main.title}
                    </span>
                    <Badge variant="outline" className="text-xs">
                      {group.children.length}
                    </Badge>
                  </div>

                  {/* Children Tasks */}
                  {isExpanded && (
                    <div className="ml-6 space-y-1">
                      {group.children.map(task => (
                        <DraggableTask
                          key={task.id}
                          task={task}
                          isSchedulable={true}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>
      </CardContent>
    </Card>
  )
}
