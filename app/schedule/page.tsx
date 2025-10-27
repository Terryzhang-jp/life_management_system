'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors
} from '@dnd-kit/core'
import { TaskPool } from '@/components/schedule/task-pool'
import { RoutinePool } from '@/components/schedule/routine-pool'
import { TimelineWeekView } from '@/components/schedule/timeline-week-view'
import { DayView } from '@/components/schedule/day-view'
import { TimeSettingModal } from '@/components/schedule/time-setting-modal'
import { QuickTaskCreateModal } from '@/components/schedule/quick-task-create-modal'
import ScheduleAssistantDrawer from '@/components/schedule/schedule-assistant-drawer'
import AgentChatPanel from '@/components/agent/agent-chat-panel'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Clock, Plus, Bot } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useToast } from '@/hooks/use-toast'
import { WeekSchedule, ScheduleBlock } from '@/lib/schedule-db'
import { cn } from '@/lib/utils'

interface Task {
  id: number
  title: string
  type: string
  level: number
  priority?: number
  deadline?: string
  categoryId?: number
  parentId?: number
  parentTitle?: string
  grandparentId?: number
  grandparentTitle?: string
}

interface TaskCategory {
  id?: number
  name: string
  color: string
  icon?: string
  order?: number
}

export default function SchedulePage() {
  const router = useRouter()
  const { toast } = useToast()

  // State management
  const [weekSchedule, setWeekSchedule] = useState<WeekSchedule>({})
  const [currentWeekStart, setCurrentWeekStart] = useState('')
  const [draggedTask, setDraggedTask] = useState<Task | null>(null)
  const [timeModalOpen, setTimeModalOpen] = useState(false)
  const [selectedDate, setSelectedDate] = useState('')
  const [dayViewOpen, setDayViewOpen] = useState(false)
  const [selectedDayBlocks, setSelectedDayBlocks] = useState<ScheduleBlock[]>([])
  const [loading, setLoading] = useState(true)
  const [suggestedStartTime, setSuggestedStartTime] = useState<string>('')
  const [suggestedEndTime, setSuggestedEndTime] = useState<string>('')
  const [editingBlock, setEditingBlock] = useState<ScheduleBlock | null>(null)
  const [quickCreateMode, setQuickCreateMode] = useState(false)  // New state for quick create
  const [categories, setCategories] = useState<TaskCategory[]>([])
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<number | null>(null)
  const [quickTaskModalOpen, setQuickTaskModalOpen] = useState(false)
  const [taskPoolRefreshToken, setTaskPoolRefreshToken] = useState(0)
  const [assistantDrawerOpen, setAssistantDrawerOpen] = useState(false)
  const [assistantNextStepRequired, setAssistantNextStepRequired] = useState(false)

  useEffect(() => {
    if (dayViewOpen && selectedDate) {
      const updatedBlocks = weekSchedule[selectedDate] || []
      setSelectedDayBlocks(updatedBlocks)
    }
  }, [dayViewOpen, selectedDate, weekSchedule])

  // Configure drag and drop sensors
  const mouseSensor = useSensor(MouseSensor, {
    activationConstraint: {
      distance: 10, // 10px movement required before drag starts
    },
  })
  const touchSensor = useSensor(TouchSensor, {
    activationConstraint: {
      delay: 250, // 250ms delay before touch drag starts
      tolerance: 10,
    },
  })
  const sensors = useSensors(mouseSensor, touchSensor)

  // Initialize current week
  useEffect(() => {
    // 使用getLocalDateString确保时区一致性
    const { getLocalDateString } = require('@/lib/date-utils')
    const todayStr = getLocalDateString() // 使用本地时区的今日日期
    const today = new Date(todayStr + 'T12:00:00') // 中午时间避免时区问题
    const day = today.getDay()
    const diff = day === 0 ? -6 : 1 - day // Get Monday (周日的话往前6天，其他往前到周一)
    const monday = new Date(today)
    monday.setDate(monday.getDate() + diff)
    const weekStart = monday.toISOString().split('T')[0]
    setCurrentWeekStart(weekStart)
  }, [])

  // Load categories
  const loadCategories = useCallback(async () => {
    try {
      const response = await fetch('/api/task-categories')
      if (response.ok) {
        const data = await response.json()
        setCategories(data)
      }
    } catch (error) {
      console.error('Error loading categories:', error)
    }
  }, [])

  useEffect(() => {
    loadCategories()
  }, [loadCategories])

  const fetchWeekSchedule = useCallback(async () => {
    if (!currentWeekStart) return

    setLoading(true)
    try {
      const response = await fetch(`/api/schedule/week?start=${currentWeekStart}`)
      if (response.ok) {
        const data = await response.json()
        setWeekSchedule(data)
      } else {
        throw new Error('Failed to fetch week schedule')
      }
    } catch (error) {
      console.error('Error fetching week schedule:', error)
      toast({
        title: "错误",
        description: "无法加载本周日程",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }, [currentWeekStart, toast])

  // Fetch week schedule when week changes
  useEffect(() => {
    if (currentWeekStart) {
      fetchWeekSchedule()
    }
  }, [currentWeekStart, fetchWeekSchedule])

  const handleWeekChange = (direction: 'prev' | 'next') => {
    const currentDate = new Date(currentWeekStart)
    const offset = direction === 'next' ? 7 : -7
    currentDate.setDate(currentDate.getDate() + offset)
    setCurrentWeekStart(currentDate.toISOString().split('T')[0])
  }

  const handleDragStart = (event: DragStartEvent) => {
    console.log('Drag started:', event.active.id)
    const task = event.active.data.current?.task
    if (task) {
      setDraggedTask(task)
      console.log('Task set for dragging:', task.title)
    }
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    console.log('Drag ended:', { activeId: active.id, overId: over?.id })

    if (!over || !draggedTask) {
      console.log('No valid drop target or no dragged task')
      setDraggedTask(null)
      return
    }

    // Check if dropped on a day (old week view)
    if (over.data.current?.type === 'day') {
      const date = over.data.current.date
      console.log('Dropped on day:', date)
      console.log('Setting modal open with task:', draggedTask?.title)
      setSelectedDate(date)
      setSuggestedStartTime('')
      setSuggestedEndTime('')
      setQuickCreateMode(false)  // Reset quick create mode
      setTimeModalOpen(true)
      // Don't clear draggedTask here - keep it for the modal
      return
    }

    // Check if dropped on a timeslot (new timeline view)
    if (over.data.current?.type === 'timeslot') {
      const { date, hour } = over.data.current
      console.log('Dropped on timeslot:', { date, hour })
      console.log('Setting modal open with task:', draggedTask?.title)

      // Pre-fill with suggested time based on hour
      const startTime = `${hour.toString().padStart(2, '0')}:00`
      const endTime = `${(hour + 1).toString().padStart(2, '0')}:00`

      setSelectedDate(date)
      setSuggestedStartTime(startTime)
      setSuggestedEndTime(endTime)
      setQuickCreateMode(false)  // Reset quick create mode
      setTimeModalOpen(true)
      // Don't clear draggedTask here - keep it for the modal
      return
    }

    // Only clear draggedTask if not dropped on a valid target
    setDraggedTask(null)
  }

  const handleTimeConfirm = async (scheduleBlock: Omit<ScheduleBlock, 'id'>) => {
    try {
      const response = await fetch('/api/schedule/blocks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(scheduleBlock)
      })

      if (response.ok) {
        const newBlock = await response.json()

        // Update local state
        setWeekSchedule(prev => ({
          ...prev,
          [scheduleBlock.date]: [
            ...(prev[scheduleBlock.date] || []),
            newBlock
          ].sort((a, b) => a.startTime.localeCompare(b.startTime))
        }))

        toast({
          title: "成功",
          description: `已安排「${newBlock.title}」在 ${scheduleBlock.date}`,
        })

        // Clear dragged task after successful scheduling
        setDraggedTask(null)
      } else {
        const error = await response.json()
        throw new Error(error.error || 'Failed to create schedule block')
      }
    } catch (error: any) {
      console.error('Error creating schedule block:', error)
      toast({
        title: "错误",
        description: error.message || "无法安排任务",
        variant: "destructive"
      })
    }
  }

  const handleTimeUpdate = async (blockId: number, updates: Partial<ScheduleBlock>) => {
    try {
      const response = await fetch(`/api/schedule/blocks?id=${blockId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updates)
      })

      if (response.ok) {
        // Update local state
        setWeekSchedule(prev => {
          const updated = { ...prev }
          Object.keys(updated).forEach(date => {
            updated[date] = updated[date].map(block => {
              if (block.id === blockId) {
                return { ...block, ...updates }
              }
              return block
            })
          })
          return updated
        })

        // Update day view blocks if open
        setSelectedDayBlocks(prev =>
          prev.map(block =>
            block.id === blockId ? { ...block, ...updates } : block
          )
        )

        toast({
          title: "成功",
          description: "任务时间已更新",
        })

        // Clear editing state
        setEditingBlock(null)
      } else {
        const error = await response.json()
        throw new Error(error.error || 'Failed to update schedule block')
      }
    } catch (error: any) {
      console.error('Error updating schedule block:', error)
      toast({
        title: "错误",
        description: error.message || "无法更新任务",
        variant: "destructive"
      })
    }
  }

  const handleBlockClick = (block: ScheduleBlock) => {
    // Handle block click - could open detail view or status change
    console.log('Block clicked:', block.title)
    // For now, open day view for this date
    setSelectedDate(block.date)
    setSelectedDayBlocks(weekSchedule[block.date] || [])
    setDayViewOpen(true)
  }

  const handleBlockEdit = (block: ScheduleBlock) => {
    console.log('Editing block:', block)
    setEditingBlock(block)
    setSelectedDate(block.date)
    setQuickCreateMode(false)
    setDraggedTask(null)
    setTimeModalOpen(true)
  }

  const handleSlotClick = (date: string, hour: number) => {
    console.log('Quick create clicked:', date, hour)
    // Set up for quick create mode
    setQuickCreateMode(true)
    setDraggedTask(null)
    setEditingBlock(null)
    setSelectedDate(date)
    // Set suggested time based on clicked hour
    const startTime = `${hour.toString().padStart(2, '0')}:00`
    const endHour = hour + 1
    const endTime = `${endHour.toString().padStart(2, '0')}:00`
    setSuggestedStartTime(startTime)
    setSuggestedEndTime(endTime)
    setTimeModalOpen(true)
  }

  const handleQuickTaskCreated = (taskTitle: string) => {
    setQuickTaskModalOpen(false)
    setTaskPoolRefreshToken(prev => prev + 1)
    toast({
      title: "成功",
      description: `已创建任务「${taskTitle}」`
    })
  }

  const handleAssistantScheduleUpdated = useCallback(() => {
    void fetchWeekSchedule()
  }, [fetchWeekSchedule])

  const handleUpdateBlockStatus = async (blockId: number, status: ScheduleBlock['status']) => {
    try {
      const response = await fetch(`/api/schedule/blocks?id=${blockId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status })
      })

      if (response.ok) {
        // Update local state
        setWeekSchedule(prev => {
          const updated = { ...prev }
          Object.keys(updated).forEach(date => {
            updated[date] = updated[date].map(block =>
              block.id === blockId ? { ...block, status } : block
            )
          })
          return updated
        })

        // Update day view blocks if open
        setSelectedDayBlocks(prev =>
          prev.map(block =>
            block.id === blockId ? { ...block, status } : block
          )
        )

        toast({
          title: "成功",
          description: "任务状态已更新",
        })
      }
    } catch (error) {
      console.error('Error updating block status:', error)
      toast({
        title: "错误",
        description: "无法更新任务状态",
        variant: "destructive"
      })
    }
  }

  const handleUpdateBlockCategory = async (blockId: number, categoryId: number | null) => {
    try {
      const response = await fetch(`/api/schedule/blocks?id=${blockId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ categoryId })
      })

      if (response.ok) {
        // Find the category info to update local state
        const category = categoryId ? categories.find(cat => cat.id === categoryId) : null

        // Update local state
        setWeekSchedule(prev => {
          const updated = { ...prev }
          Object.keys(updated).forEach(date => {
            updated[date] = updated[date].map(block =>
              block.id === blockId ? {
                ...block,
                categoryId: categoryId === null ? null : categoryId,
                categoryName: category?.name ?? null,
                categoryColor: category?.color ?? null
              } : block
            )
          })
          return updated
        })

        // Update day view blocks if open
        setSelectedDayBlocks(prev =>
          prev.map(block =>
            block.id === blockId ? {
              ...block,
              categoryId: categoryId === null ? null : categoryId,
              categoryName: category?.name ?? null,
              categoryColor: category?.color ?? null
            } : block
          )
        )

        toast({
          title: "成功",
          description: "任务分类已更新",
        })
      }
    } catch (error) {
      console.error('Error updating block category:', error)
      toast({
        title: "错误",
        description: "无法更新任务分类",
        variant: "destructive"
      })
    }
  }

  const handleEditBlock = (block: ScheduleBlock) => {
    setEditingBlock(block)
    setSelectedDate(block.date)
    setQuickCreateMode(false)
    setDraggedTask(null)
    setTimeModalOpen(true)
  }

  const handleDeleteBlock = async (blockId: number) => {
    try {
      const response = await fetch(`/api/schedule/blocks?id=${blockId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        // Update local state
        setWeekSchedule(prev => {
          const updated = { ...prev }
          Object.keys(updated).forEach(date => {
            updated[date] = updated[date].filter(block => block.id !== blockId)
          })
          return updated
        })

        // Update day view blocks if open
        setSelectedDayBlocks(prev => prev.filter(block => block.id !== blockId))

        toast({
          title: "成功",
          description: "任务安排已删除",
        })
      }
    } catch (error) {
      console.error('Error deleting block:', error)
      toast({
        title: "错误",
        description: "无法删除任务安排",
        variant: "destructive"
      })
    }
  }

  if (loading && !currentWeekStart) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="h-96 bg-gray-200 rounded"></div>
            <div className="lg:col-span-2 h-96 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="container mx-auto px-4 py-8 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              onClick={() => router.push('/')}
              className="text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              返回主页
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">日程安排</h1>
              <p className="text-gray-600 mt-1">
                拖拽子子任务到日程中进行精确时间管理
              </p>
            </div>
          </div>
          <Button
            onClick={() => setAssistantDrawerOpen(true)}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Bot className="w-4 h-4 mr-2" />
            AI 助手
            {assistantNextStepRequired && (
              <span className="ml-2 h-2 w-2 rounded-full bg-orange-400 animate-pulse" />
            )}
          </Button>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Left Panel - Task Pool and Routine Pool */}
          <div className="lg:col-span-1">
            <div className="space-y-4 sticky top-4">
              <TaskPool
                categories={categories}
                selectedCategoryFilter={selectedCategoryFilter}
                onCategoryFilterChange={setSelectedCategoryFilter}
                refreshToken={taskPoolRefreshToken}
              />
              <RoutinePool />
            </div>
          </div>

          {/* Right Panel - Timeline Week View */}
          <div className="lg:col-span-3 space-y-4">
            {/* Quick Navigation */}
            <div className="flex justify-center gap-3">
              <Button
                onClick={() => setQuickTaskModalOpen(true)}
                className="flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                快速添加任务
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  // 使用与初始化一致的时区处理方法
                  const { getLocalDateString } = require('@/lib/date-utils')
                  const todayStr = getLocalDateString() // 使用本地时区的今日日期
                  const today = new Date(todayStr + 'T12:00:00') // 中午时间避免时区问题
                  const day = today.getDay()
                  const diff = day === 0 ? -6 : 1 - day // Get Monday (周日的话往前6天，其他往前到周一)
                  const monday = new Date(today)
                  monday.setDate(monday.getDate() + diff)
                  const weekStart = monday.toISOString().split('T')[0]
                  setCurrentWeekStart(weekStart)
                }}
                className="flex items-center gap-2"
              >
                <Clock className="w-4 h-4" />
                跳转到今天
              </Button>
            </div>

            <TimelineWeekView
              weekSchedule={weekSchedule}
              currentWeekStart={currentWeekStart}
              categories={categories}
              onWeekChange={handleWeekChange}
              onBlockClick={handleBlockClick}
              onBlockEdit={handleBlockEdit}
              onBlockDelete={handleDeleteBlock}
              onSlotClick={handleSlotClick}
            />
          </div>
        </div>

        {/* Drag Overlay */}
        <DragOverlay>
          {draggedTask && (
            <Card className={cn(
              "shadow-lg rotate-2 opacity-90",
              draggedTask.type === 'routine' && "border-green-300 bg-green-50"
            )}>
              <CardContent className="p-3">
                <div className="flex items-center gap-2">
                  {draggedTask.type === 'routine' && (
                    <span className="text-green-600">🔄</span>
                  )}
                  <div>
                    <div className={cn(
                      "font-medium text-sm",
                      draggedTask.type === 'routine' ? "text-green-800" : ""
                    )}>
                      {draggedTask.title}
                    </div>
                    <div className={cn(
                      "text-xs mt-1",
                      draggedTask.type === 'routine' ? "text-green-600" : "text-gray-600"
                    )}>
                      {draggedTask.level === 2 && draggedTask.grandparentTitle && draggedTask.parentTitle
                        ? `${draggedTask.grandparentTitle} › ${draggedTask.parentTitle}`
                        : draggedTask.parentTitle
                      }
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </DragOverlay>

        {/* Time Setting Modal */}
        <TimeSettingModal
          isOpen={timeModalOpen}
          onClose={() => {
            setTimeModalOpen(false)
            setDraggedTask(null) // Clear dragged task when modal closes
            setEditingBlock(null) // Clear editing block when modal closes
            setQuickCreateMode(false) // Reset quick create mode
          }}
          onConfirm={handleTimeConfirm}
          onUpdate={handleTimeUpdate}
          mode={editingBlock ? 'edit' : 'create'}
          existingBlock={editingBlock || undefined}
          task={draggedTask}
          date={selectedDate}
          categories={categories}
          suggestedStartTime={suggestedStartTime}
          suggestedEndTime={suggestedEndTime}
          quickCreate={quickCreateMode}
        />

        <QuickTaskCreateModal
          isOpen={quickTaskModalOpen}
          onClose={() => setQuickTaskModalOpen(false)}
          onCreated={handleQuickTaskCreated}
        />

        {/* Day View Modal */}
        <DayView
          isOpen={dayViewOpen}
          onClose={() => setDayViewOpen(false)}
          date={selectedDate}
          blocks={selectedDayBlocks}
          categories={categories}
          onUpdateStatus={handleUpdateBlockStatus}
          onUpdateCategory={handleUpdateBlockCategory}
          onEditBlock={handleEditBlock}
          onDeleteBlock={handleDeleteBlock}
        />

        {/* Schedule AI Assistant Drawer */}
        <ScheduleAssistantDrawer
          isOpen={assistantDrawerOpen}
          onClose={() => {
            setAssistantDrawerOpen(false)
            setAssistantNextStepRequired(false)
          }}
          onScheduleUpdated={handleAssistantScheduleUpdated}
          onNextStepChange={setAssistantNextStepRequired}
        />
      </div>

      {/* Agent Chat Panel - Floating */}
      <AgentChatPanel onScheduleUpdated={fetchWeekSchedule} />
    </DndContext>
  )
}
