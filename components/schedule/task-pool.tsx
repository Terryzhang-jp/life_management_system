'use client'

import { useState, useEffect } from 'react'
import { useDraggable } from '@dnd-kit/core'
import { ChevronRight, ChevronDown, GripVertical } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

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

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'flex items-center gap-2 p-2 rounded border transition-all',
        isSchedulable
          ? 'cursor-move hover:bg-gray-50 border-gray-200'
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
          <div className="text-xs text-gray-500">
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
}

export function TaskPool({ className }: TaskPoolProps) {
  const [tasks, setTasks] = useState<Task[]>([])
  const [taskGroups, setTaskGroups] = useState<TaskGroup[]>([])
  const [expandedGroups, setExpandedGroups] = useState<Set<number>>(new Set())
  const [loading, setLoading] = useState(true)

  // Calculate dynamic height based on expanded groups and content
  const expandedCount = expandedGroups.size
  const hasExpandedGroups = expandedCount > 0
  const totalChildrenInExpanded = Array.from(expandedGroups).reduce((sum, groupId) => {
    const group = taskGroups.find(g => g.main.id === groupId)
    return sum + (group?.children.length || 0)
  }, 0)

  useEffect(() => {
    fetchSchedulableTasks()
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

  const fetchSchedulableTasks = async () => {
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
  }

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
          <h3 className="text-lg font-semibold text-gray-900">任务池</h3>
          <p className="text-sm text-gray-500">拖拽子子任务到日程中</p>
        </div>

        <div className={cn(
          "space-y-2 overflow-y-auto transition-all duration-300 ease-in-out",
          // Dynamic height based on content
          totalChildrenInExpanded > 10 ? "max-h-[80vh]" :
          hasExpandedGroups ? "max-h-[70vh]" : "max-h-[50vh]"
        )}>
          {taskGroups.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <div className="text-sm">暂无可调度任务</div>
              <div className="text-xs mt-1">
                只有子子任务和无子任务的子任务可以调度
              </div>
            </div>
          ) : (
            taskGroups.map((group) => {
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