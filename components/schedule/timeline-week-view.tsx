'use client'

import { useState } from 'react'
import { useDroppable } from '@dnd-kit/core'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ChevronLeft, ChevronRight, Clock, Edit, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ScheduleBlock, WeekSchedule } from '@/lib/schedule-db'

interface TimeSlotDropZoneProps {
  date: string
  hour: number
  blocks: ScheduleBlock[]
  onBlockClick: (block: ScheduleBlock) => void
  onBlockEdit: (block: ScheduleBlock) => void
  onBlockDelete: (blockId: number) => void
}

function TimeSlotDropZone({
  date,
  hour,
  blocks = [],
  onBlockClick,
  onBlockEdit,
  onBlockDelete
}: TimeSlotDropZoneProps) {
  const slotId = `${date}-${hour}`
  const { isOver, setNodeRef } = useDroppable({
    id: slotId,
    data: {
      type: 'timeslot',
      date,
      hour
    }
  })

  // Find blocks that start in this hour
  const hourBlocks = blocks.filter(block => {
    const blockStartHour = parseInt(block.startTime.split(':')[0])
    return blockStartHour === hour
  })

  const getStatusColor = (status: ScheduleBlock['status']) => {
    switch (status) {
      case 'completed': return 'bg-green-500 hover:bg-green-600 text-white'
      case 'in_progress': return 'bg-yellow-500 hover:bg-yellow-600 text-white'
      case 'cancelled': return 'bg-gray-400 hover:bg-gray-500 text-white'
      default: return 'bg-blue-500 hover:bg-blue-600 text-white'
    }
  }

  const calculateBlockHeight = (block: ScheduleBlock) => {
    const start = new Date(`1970-01-01T${block.startTime}`)
    const end = new Date(`1970-01-01T${block.endTime}`)
    const durationMinutes = (end.getTime() - start.getTime()) / (1000 * 60)
    // Each hour is 60px, so 1px per minute
    return Math.max(20, durationMinutes)
  }

  const calculateBlockOffset = (block: ScheduleBlock) => {
    const start = new Date(`1970-01-01T${block.startTime}`)
    const minutes = start.getMinutes()
    return minutes // Offset in pixels from top of hour
  }

  // Check if this hour is sleep time (11 PM - 7 AM)
  const isSleepTime = hour >= 23 || hour < 7

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'relative h-15 border-b border-gray-100 transition-colors',
        isSleepTime && 'bg-gray-50',
        isOver && 'bg-blue-50 border-blue-300'
      )}
      style={{ height: '60px' }} // 60px per hour
    >
      {/* Time slot blocks */}
      {hourBlocks.map((block) => (
        <div
          key={block.id}
          className={cn(
            'absolute left-1 right-1 rounded px-2 py-1 cursor-pointer text-xs font-medium transition-all z-10',
            getStatusColor(block.status),
            'hover:shadow-md group'
          )}
          style={{
            top: calculateBlockOffset(block),
            height: calculateBlockHeight(block),
            minHeight: '20px'
          }}
          onClick={(e) => {
            e.stopPropagation()
            onBlockClick(block)
          }}
        >
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <div className="truncate font-medium">{block.taskTitle}</div>
              <div className="text-xs opacity-90">
                {block.startTime} - {block.endTime}
              </div>
            </div>

            {/* Action buttons - show on hover */}
            <div className="hidden group-hover:flex gap-1 ml-2">
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onBlockEdit(block)
                }}
                className="p-1 hover:bg-white hover:bg-opacity-20 rounded"
              >
                <Edit className="w-3 h-3" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  if (confirm('确定删除这个时间安排吗？')) {
                    onBlockDelete(block.id!)
                  }
                }}
                className="p-1 hover:bg-white hover:bg-opacity-20 rounded"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>
      ))}

      {/* Drop zone indicator */}
      {isOver && (
        <div className={cn(
          "absolute inset-1 border-2 border-dashed rounded bg-opacity-50 flex items-center justify-center",
          isSleepTime
            ? "border-gray-400 bg-gray-100 text-gray-500"
            : "border-blue-400 bg-blue-50 text-blue-600"
        )}>
          <div className="text-xs font-medium flex items-center gap-1">
            {isSleepTime && "💤"}
            {hour.toString().padStart(2, '0')}:00
            {isSleepTime && <span className="text-xs">(睡眠时间)</span>}
          </div>
        </div>
      )}
    </div>
  )
}

interface TimelineWeekViewProps {
  weekSchedule: WeekSchedule
  currentWeekStart: string
  onWeekChange: (direction: 'prev' | 'next') => void
  onBlockClick: (block: ScheduleBlock) => void
  onBlockEdit: (block: ScheduleBlock) => void
  onBlockDelete: (blockId: number) => void
  className?: string
}

export function TimelineWeekView({
  weekSchedule,
  currentWeekStart,
  onWeekChange,
  onBlockClick,
  onBlockEdit,
  onBlockDelete,
  className
}: TimelineWeekViewProps) {
  // Generate week dates
  const weekDates = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(currentWeekStart)
    date.setDate(date.getDate() + i)
    return date.toISOString().split('T')[0]
  })

  // Generate hours (0:00 - 23:00) - Full 24 hours
  const hours = Array.from({ length: 24 }, (_, i) => i)

  const formatDateHeader = (dateStr: string) => {
    const date = new Date(dateStr)
    const today = new Date().toISOString().split('T')[0]
    const dayOfWeek = ['日', '一', '二', '三', '四', '五', '六'][date.getDay()]
    const dateNum = date.getDate()

    return {
      dayOfWeek,
      dateNum,
      isToday: dateStr === today
    }
  }

  const formatWeekDisplay = (weekStart: string) => {
    const start = new Date(weekStart)
    const end = new Date(start)
    end.setDate(end.getDate() + 6)

    const formatMonth = (date: Date) => `${date.getMonth() + 1}月`
    const formatDate = (date: Date) => `${date.getDate()}日`

    if (start.getMonth() === end.getMonth()) {
      return `${formatMonth(start)}${formatDate(start)} - ${formatDate(end)}`
    } else {
      return `${formatMonth(start)}${formatDate(start)} - ${formatMonth(end)}${formatDate(end)}`
    }
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-4">
        {/* Week Navigation */}
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onWeekChange('prev')}
          >
            <ChevronLeft className="w-4 h-4 mr-1" />
            上周
          </Button>

          <CardTitle className="text-xl">
            {formatWeekDisplay(currentWeekStart)}
          </CardTitle>

          <Button
            variant="outline"
            size="sm"
            onClick={() => onWeekChange('next')}
          >
            下周
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <div className="flex">
          {/* Time axis */}
          <div className="w-16 border-r border-gray-200 bg-gray-50">
            <div className="h-12 border-b border-gray-200"></div> {/* Header spacer */}
            {hours.map(hour => {
              const isSleepTime = hour >= 23 || hour < 7
              return (
                <div
                  key={hour}
                  className={cn(
                    "h-15 border-b border-gray-100 flex items-start justify-center pt-1",
                    isSleepTime && "bg-gray-100"
                  )}
                  style={{ height: '60px' }}
                >
                  <span className={cn(
                    "text-xs font-medium",
                    isSleepTime ? "text-gray-400" : "text-gray-600"
                  )}>
                    {hour.toString().padStart(2, '0')}:00
                  </span>
                </div>
              )
            })}
          </div>

          {/* Days grid */}
          <div className="flex-1">
            {/* Days header */}
            <div className="flex h-12 border-b border-gray-200 bg-gray-50">
              {weekDates.map((date) => {
                const { dayOfWeek, dateNum, isToday } = formatDateHeader(date)
                return (
                  <div
                    key={date}
                    className={cn(
                      'flex-1 flex flex-col items-center justify-center border-r border-gray-200 last:border-r-0',
                      isToday && 'bg-blue-100'
                    )}
                  >
                    <div className={cn(
                      'text-sm font-medium',
                      isToday ? 'text-blue-700' : 'text-gray-700'
                    )}>
                      周{dayOfWeek}
                    </div>
                    <div className={cn(
                      'text-lg font-bold',
                      isToday ? 'text-blue-900 bg-blue-200 rounded-full w-7 h-7 flex items-center justify-center' : 'text-gray-900'
                    )}>
                      {dateNum}
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Time slots grid */}
            <div className="flex">
              {weekDates.map((date) => (
                <div key={date} className="flex-1 border-r border-gray-200 last:border-r-0">
                  {hours.map(hour => (
                    <TimeSlotDropZone
                      key={`${date}-${hour}`}
                      date={date}
                      hour={hour}
                      blocks={weekSchedule[date] || []}
                      onBlockClick={onBlockClick}
                      onBlockEdit={onBlockEdit}
                      onBlockDelete={onBlockDelete}
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Summary stats */}
        <div className="p-4 bg-gray-50 border-t border-gray-200">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-blue-600">
                {Object.values(weekSchedule).reduce((sum, blocks) => sum + blocks.length, 0)}
              </div>
              <div className="text-xs text-gray-500">本周任务</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-600">
                {Object.values(weekSchedule).reduce(
                  (sum, blocks) => sum + blocks.filter(b => b.status === 'completed').length,
                  0
                )}
              </div>
              <div className="text-xs text-gray-500">已完成</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-600">
                {Math.round(
                  Object.values(weekSchedule).reduce((sum, blocks) => {
                    return sum + blocks.reduce((blockSum, block) => {
                      const start = new Date(`1970-01-01T${block.startTime}`)
                      const end = new Date(`1970-01-01T${block.endTime}`)
                      return blockSum + (end.getTime() - start.getTime()) / (1000 * 60)
                    }, 0)
                  }, 0) / 60
                )}
              </div>
              <div className="text-xs text-gray-500">总时长(小时)</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}