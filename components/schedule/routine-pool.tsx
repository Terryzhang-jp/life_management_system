'use client'

import { useState, useEffect } from 'react'
import { useDraggable } from '@dnd-kit/core'
import { ChevronRight, ChevronDown, GripVertical, Clock } from 'lucide-react'
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

interface DraggableRoutineProps {
  task: Task
  isSchedulable: boolean
}

function DraggableRoutine({ task, isSchedulable }: DraggableRoutineProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    isDragging
  } = useDraggable({
    id: `routine-${task.id}`,
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

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'flex items-center gap-2 p-2 rounded border transition-all',
        isSchedulable
          ? 'cursor-move hover:bg-green-50 border-green-200 bg-green-50/50'
          : 'cursor-not-allowed bg-gray-50 border-gray-100 opacity-60',
        isDragging && 'opacity-50 z-50'
      )}
      {...listeners}
      {...attributes}
    >
      {isSchedulable && (
        <GripVertical className="w-4 h-4 text-green-500" />
      )}

      <Clock className="w-4 h-4 text-green-600" />

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className={cn(
            'text-sm font-medium truncate text-green-800',
            task.level === 2 ? 'text-green-900' : 'text-green-700'
          )}>
            {task.title}
          </span>

          {task.priority && task.priority !== 999 && (
            <Badge variant="outline" className={cn('text-xs', getPriorityColor(task.priority))}>
              {task.priority}
            </Badge>
          )}
        </div>

        <div className="text-xs text-green-600">
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

interface RoutinePoolProps {
  className?: string
}

export function RoutinePool({ className }: RoutinePoolProps) {
  const [routines, setRoutines] = useState<Task[]>([])
  const [routineGroups, setRoutineGroups] = useState<TaskGroup[]>([])
  const [expandedGroups, setExpandedGroups] = useState<Set<number>>(new Set())
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchSchedulableRoutines()
  }, [])

  useEffect(() => {
    // Group routines by main task (grandparent for level 2, parent for level 1, or self for level 0)
    const groups: { [key: string]: TaskGroup } = {}
    const standaloneRoutines: Task[] = [] // Level 0 tasks without children

    routines.forEach(task => {
      if (task.level === 0) {
        // Level 0 task - it's a main task itself, add directly as standalone
        standaloneRoutines.push(task)
      } else if (task.level === 2 && task.grandparentId) {
        // Level 2 task - group by grandparent
        const groupKey = `main_${task.grandparentId}`
        const mainTask: Task = {
          id: task.grandparentId,
          title: task.grandparentTitle || 'Unknown',
          type: 'routine',
          level: 0,
          parentId: undefined,
          parentTitle: undefined,
          grandparentId: undefined,
          grandparentTitle: undefined
        }

        if (!groups[groupKey]) {
          groups[groupKey] = {
            main: mainTask,
            children: []
          }
        }
        groups[groupKey].children.push(task)
      } else if (task.level === 1 && task.parentId) {
        // Level 1 task without children - group by parent
        const groupKey = `main_${task.parentId}`
        const mainTask: Task = {
          id: task.parentId,
          title: task.parentTitle || 'Unknown',
          type: 'routine',
          level: 0,
          parentId: undefined,
          parentTitle: undefined,
          grandparentId: undefined,
          grandparentTitle: undefined
        }

        if (!groups[groupKey]) {
          groups[groupKey] = {
            main: mainTask,
            children: []
          }
        }
        groups[groupKey].children.push(task)
      }
    })

    // Sort children by priority
    Object.values(groups).forEach(group => {
      group.children.sort((a, b) => {
        const priorityA = a.priority === 999 ? Infinity : (a.priority || Infinity)
        const priorityB = b.priority === 999 ? Infinity : (b.priority || Infinity)
        return priorityA - priorityB
      })
    })

    // Sort standalone routines by priority
    standaloneRoutines.sort((a, b) => {
      const priorityA = a.priority === 999 ? Infinity : (a.priority || Infinity)
      const priorityB = b.priority === 999 ? Infinity : (b.priority || Infinity)
      return priorityA - priorityB
    })

    // Create groups for standalone routines (each is its own group with no children)
    const standaloneGroups = standaloneRoutines.map(routine => ({
      main: routine,
      children: [] as Task[]
    }))

    setRoutineGroups([...Object.values(groups), ...standaloneGroups])
  }, [routines])

  const fetchSchedulableRoutines = async () => {
    try {
      const response = await fetch('/api/tasks/routines')
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      const data = await response.json()

      // Ensure data is an array
      if (Array.isArray(data)) {
        setRoutines(data)
      } else {
        console.error('API did not return an array:', data)
        setRoutines([])
      }
    } catch (error) {
      console.error('Failed to fetch schedulable routines:', error)
      setRoutines([]) // Set empty array on error
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
              {[1, 2].map(i => (
                <div key={i} className="h-8 bg-gray-100 rounded"></div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={cn("border-green-200 bg-green-50/30", className)}>
      <CardContent className="p-4">
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-green-900 flex items-center gap-2">
            <Clock className="w-5 h-5" />
            日常习惯
          </h3>
          <p className="text-sm text-green-700">每天重复的任务</p>
        </div>

        <div className="space-y-2 max-h-[40vh] overflow-y-auto">
          {routineGroups.length === 0 ? (
            <div className="text-center py-8 text-green-600">
              <div className="text-sm">暂无日常习惯</div>
              <div className="text-xs mt-1">
                创建 routine 类型的任务后会显示在这里
              </div>
            </div>
          ) : (
            routineGroups.map((group) => {
              const isExpanded = expandedGroups.has(group.main.id)
              const hasChildren = group.children.length > 0

              // If this is a standalone routine (no children), render it directly as draggable
              if (!hasChildren) {
                return (
                  <DraggableRoutine
                    key={group.main.id}
                    task={group.main}
                    isSchedulable={true}
                  />
                )
              }

              // Otherwise render as expandable group
              return (
                <div key={group.main.id} className="space-y-1">
                  {/* Main Task Header */}
                  <div
                    className="flex items-center gap-2 p-2 hover:bg-green-100 rounded cursor-pointer"
                    onClick={() => toggleGroup(group.main.id)}
                  >
                    {isExpanded ? (
                      <ChevronDown className="w-4 h-4 text-green-600" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-green-600" />
                    )}
                    <span className="font-medium text-green-900 flex-1">
                      {group.main.title}
                    </span>
                    <Badge variant="outline" className="text-xs bg-green-100 text-green-700 border-green-300">
                      {group.children.length}
                    </Badge>
                  </div>

                  {/* Children Tasks */}
                  {isExpanded && (
                    <div className="ml-6 space-y-1">
                      {group.children.map(task => (
                        <DraggableRoutine
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