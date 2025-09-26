'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { X, Clock, Calendar, AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ScheduleBlock } from '@/lib/schedule-db'
import { getLocalDateString } from '@/lib/date-utils'

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

interface TimeSettingModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (scheduleBlock: Omit<ScheduleBlock, 'id'>) => void
  onUpdate?: (blockId: number, scheduleBlock: Partial<ScheduleBlock>) => void
  mode?: 'create' | 'edit'
  existingBlock?: ScheduleBlock
  task?: Task | null  // Made optional for quick create
  date: string
  categories?: TaskCategory[]
  conflicts?: ScheduleBlock[]
  suggestedStartTime?: string
  suggestedEndTime?: string
  quickCreate?: boolean  // New prop for quick create mode
}

interface QuickTimeOption {
  label: string
  duration: number // minutes
}

const quickTimeOptions: QuickTimeOption[] = [
  { label: '30分钟', duration: 30 },
  { label: '1小时', duration: 60 },
  { label: '2小时', duration: 120 },
  { label: '半天', duration: 240 }
]

export function TimeSettingModal({
  isOpen,
  onClose,
  onConfirm,
  onUpdate,
  mode = 'create',
  existingBlock,
  task,
  date,
  categories = [],
  conflicts = [],
  suggestedStartTime = '09:00',
  suggestedEndTime = '10:00',
  quickCreate = false
}: TimeSettingModalProps) {
  const [startTime, setStartTime] = useState('09:00')
  const [endTime, setEndTime] = useState('10:00')
  const [comment, setComment] = useState('')
  const [quickTitle, setQuickTitle] = useState('')  // New state for quick create title
  const [categoryId, setCategoryId] = useState<number | null>(null)
  const [checking, setChecking] = useState(false)
  const [currentConflicts, setCurrentConflicts] = useState<ScheduleBlock[]>([])

  // Reset form when modal opens/closes or task changes
  useEffect(() => {
    if (isOpen) {
      if (mode === 'edit' && existingBlock) {
        // Pre-fill with existing block data
        setStartTime(existingBlock.startTime)
        setEndTime(existingBlock.endTime)
        setComment(existingBlock.comment || '')
        setCategoryId(existingBlock.categoryId || null)
        setQuickTitle('')
        setCurrentConflicts([])
      } else {
        // Create mode with suggested times (with or without task)
        setStartTime(suggestedStartTime)
        setEndTime(suggestedEndTime)
        setComment('')
        setCategoryId(task?.categoryId || null)  // Use task's category if available
        setQuickTitle('')
        setCurrentConflicts([])
      }
    }
  }, [isOpen, mode, existingBlock, task, suggestedStartTime, suggestedEndTime])

  const checkConflicts = useCallback(async () => {
    if (!date || !startTime || !endTime || startTime >= endTime) return

    setChecking(true)
    try {
      let url = `/api/schedule/conflicts?date=${date}&start=${startTime}&end=${endTime}`
      // In edit mode, exclude the current block from conflict checking
      if (mode === 'edit' && existingBlock?.id) {
        url += `&excludeId=${existingBlock.id}`
      }

      const response = await fetch(url)
      const conflicts = await response.json()
      setCurrentConflicts(conflicts)
    } catch (error) {
      console.error('Error checking conflicts:', error)
    } finally {
      setChecking(false)
    }
  }, [date, endTime, existingBlock?.id, mode, startTime])

  // Check conflicts when time changes
  useEffect(() => {
    if (!isOpen || !date) {
      return
    }

    if (startTime && endTime && startTime < endTime) {
      void checkConflicts()
    }
  }, [checkConflicts, date, endTime, isOpen, startTime])

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '未选择日期'

    const targetDate = new Date(`${dateStr}T12:00:00`)
    const todayStr = getLocalDateString()
    const today = new Date(`${todayStr}T12:00:00`)
    const diffMs = targetDate.getTime() - today.getTime()
    const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24))

    const dayOfWeek = ['日', '一', '二', '三', '四', '五', '六'][targetDate.getDay()]
    const dateFormat = `${targetDate.getMonth() + 1}/${targetDate.getDate()}`

    if (diffDays === 0) return `${dateFormat} (今天) 周${dayOfWeek}`
    if (diffDays === 1) return `${dateFormat} (明天) 周${dayOfWeek}`
    if (diffDays > 0) return `${dateFormat} (${diffDays}天后) 周${dayOfWeek}`
    return `${dateFormat} (${Math.abs(diffDays)}天前) 周${dayOfWeek}`
  }

  const calculateDuration = () => {
    if (!startTime || !endTime) return 0
    const start = new Date(`1970-01-01T${startTime}`)
    const end = new Date(`1970-01-01T${endTime}`)
    return (end.getTime() - start.getTime()) / (1000 * 60) // minutes
  }

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    if (hours === 0) return `${mins}分钟`
    if (mins === 0) return `${hours}小时`
    return `${hours}小时${mins}分钟`
  }

  const applyQuickTime = (option: QuickTimeOption) => {
    const start = new Date(`1970-01-01T${startTime}`)
    const end = new Date(start.getTime() + option.duration * 60 * 1000)
    setEndTime(end.toTimeString().slice(0, 5))
  }

  const handleConfirm = () => {
    if (!startTime || !endTime || startTime >= endTime) return

    // Get category info
    const category = categoryId ? categories.find(cat => cat.id === categoryId) : null

    if (mode === 'edit' && existingBlock && onUpdate) {
      // Edit mode - update existing block
      const updates: Partial<ScheduleBlock> = {
        date,
        startTime,
        endTime,
        comment: comment.trim() || undefined,
        categoryId,
        categoryName: category?.name || null,
        categoryColor: category?.color || null
      }
      onUpdate(existingBlock.id!, updates)
    } else if (mode === 'create') {
      if (quickCreate && !task) {
        // Quick create mode - create standalone schedule without task
        if (!quickTitle.trim()) return  // Title is required for quick create

        const scheduleBlock: Omit<ScheduleBlock, 'id'> = {
          taskId: 0,  // Special ID for standalone schedules
          date,
          startTime,
          endTime,
          comment: comment.trim() || undefined,
          status: 'scheduled',
          taskTitle: quickTitle.trim(),  // Use the quick create title
          parentTitle: undefined,
          grandparentTitle: undefined,
          categoryId,
          categoryName: category?.name || null,
          categoryColor: category?.color || null
        }
        onConfirm(scheduleBlock)
      } else if (task) {
        // Create mode with task - create new block
        const scheduleBlock: Omit<ScheduleBlock, 'id'> = {
          taskId: task.id,
          date,
          startTime,
          endTime,
          comment: comment.trim() || undefined,
          status: 'scheduled',
          taskTitle: task.title,
          parentTitle: task.parentTitle || undefined,
          grandparentTitle: task.grandparentTitle || undefined,
          categoryId,
          categoryName: category?.name || null,
          categoryColor: category?.color || null
        }
        onConfirm(scheduleBlock)
      }
    }

    onClose()
  }

  if (!isOpen) {
    return null
  }

  if (mode === 'create' && !task && !quickCreate) {
    console.log('TimeSettingModal create mode requires task or quickCreate flag')
    return null
  }

  if (mode === 'edit' && !existingBlock) {
    console.log('TimeSettingModal edit mode requires existingBlock')
    return null
  }

  console.log('TimeSettingModal rendering in', mode, 'mode')

  const duration = calculateDuration()
  const hasConflicts = currentConflicts.length > 0
  const isValidTime = startTime < endTime

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60]">
      <Card className="w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-semibold">
              {mode === 'edit' ? '编辑任务时间' : '安排任务时间'}
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Quick Create Title Input or Task Info */}
          {quickCreate && !task ? (
            <div className="space-y-2">
              <Label htmlFor="quickTitle">任务名称 *</Label>
              <Input
                id="quickTitle"
                placeholder="输入任务名称（如：开会、休息、学习）"
                value={quickTitle}
                onChange={(e) => setQuickTitle(e.target.value)}
                className="w-full"
                autoFocus
              />
            </div>
          ) : (
            <div className="p-3 bg-gray-50 rounded-lg">
              {mode === 'edit' && existingBlock ? (
                <div>
                  <div className="font-medium text-gray-900">{existingBlock.taskTitle}</div>
                  <div className="text-sm text-gray-600 mt-1">
                    {existingBlock.grandparentTitle && existingBlock.parentTitle
                      ? `${existingBlock.grandparentTitle} › ${existingBlock.parentTitle}`
                      : existingBlock.parentTitle
                    }
                  </div>
                </div>
              ) : task ? (
                <div>
                  <div className="font-medium text-gray-900">{task.title}</div>
                  <div className="text-sm text-gray-600 mt-1">
                    {task.level === 2 && task.grandparentTitle && task.parentTitle
                      ? `${task.grandparentTitle} › ${task.parentTitle}`
                      : task.parentTitle
                    }
                  </div>
                  {task.deadline && (
                    <div className="text-sm text-orange-600 mt-1">
                      📅 截止: {new Date(task.deadline).toLocaleDateString()}
                    </div>
                  )}
                </div>
              ) : null}
            </div>
          )}

          {/* Date Info */}
          <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg">
            <Calendar className="w-4 h-4 text-blue-600" />
            <span className="font-medium text-blue-900">
              {formatDate(date)}
            </span>
          </div>

          {/* Time Settings */}
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="start-time" className="text-sm font-medium">
                  开始时间
                </Label>
                <Input
                  id="start-time"
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="end-time" className="text-sm font-medium">
                  结束时间
                </Label>
                <Input
                  id="end-time"
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="mt-1"
                />
              </div>
            </div>

            {/* Duration Display */}
            {isValidTime && (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Clock className="w-4 h-4" />
                <span>时长: {formatDuration(duration)}</span>
              </div>
            )}

            {/* Invalid time warning */}
            {!isValidTime && startTime && endTime && (
              <div className="flex items-center gap-2 text-sm text-red-600">
                <AlertTriangle className="w-4 h-4" />
                <span>结束时间必须晚于开始时间</span>
              </div>
            )}

            {/* Quick Time Options */}
            <div>
              <Label className="text-sm font-medium">快捷时长</Label>
              <div className="flex gap-2 mt-1 flex-wrap">
                {quickTimeOptions.map((option) => (
                  <Button
                    key={option.duration}
                    variant="outline"
                    size="sm"
                    onClick={() => applyQuickTime(option)}
                    className="text-xs"
                  >
                    {option.label}
                  </Button>
                ))}
              </div>
            </div>

            {/* Category Selection */}
            <div>
              <Label className="text-sm font-medium">分类</Label>
              <select
                value={categoryId || ''}
                onChange={(e) => setCategoryId(e.target.value ? Number(e.target.value) : null)}
                className="w-full mt-1 text-sm border border-gray-300 rounded-md px-3 py-2 bg-white focus:border-blue-500 focus:outline-none"
              >
                <option value="">无分类</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Conflicts Warning */}
          {hasConflicts && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center gap-2 text-red-800 font-medium mb-2">
                <AlertTriangle className="w-4 h-4" />
                时间冲突
              </div>
              <div className="space-y-1">
                {currentConflicts.map((conflict) => (
                  <div key={conflict.id} className="text-sm text-red-700">
                    {conflict.startTime} - {conflict.endTime}: {conflict.taskTitle}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Comment */}
          <div>
            <Label htmlFor="comment" className="text-sm font-medium">
              备注 (可选)
            </Label>
            <Textarea
              id="comment"
              placeholder="添加备注信息..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={3}
              className="mt-1 resize-none"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-2">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1"
            >
              取消
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={!isValidTime || checking || (quickCreate && !task && !quickTitle.trim())}
              className="flex-1"
            >
              {checking ? '检查中...' : (mode === 'edit' ? '确认更新' : '确认安排')}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
