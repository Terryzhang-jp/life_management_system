'use client'

import { useState } from 'react'
import { useDroppable } from '@dnd-kit/core'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ScheduleBlock, WeekSchedule } from '@/lib/schedule-db'

interface DayDropZoneProps {
  date: string
  blocks: ScheduleBlock[]
  onDayClick: (date: string) => void
}

function DayDropZone({ date, blocks = [], onDayClick }: DayDropZoneProps) {
  const { isOver, setNodeRef } = useDroppable({
    id: date,
    data: {
      type: 'day',
      date
    }
  })

  const dateObj = new Date(date)
  const isToday = date === new Date().toISOString().split('T')[0]
  const dayOfWeek = ['日', '一', '二', '三', '四', '五', '六'][dateObj.getDay()]

  // Calculate total duration
  const totalMinutes = blocks.reduce((sum, block) => {
    const start = new Date(`1970-01-01T${block.startTime}`)
    const end = new Date(`1970-01-01T${block.endTime}`)
    return sum + (end.getTime() - start.getTime()) / (1000 * 60)
  }, 0)

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    if (hours === 0) return `${mins}m`
    if (mins === 0) return `${hours}h`
    return `${hours}h${mins}m`
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 border-green-200 text-green-800'
      case 'in_progress': return 'bg-yellow-100 border-yellow-200 text-yellow-800'
      case 'cancelled': return 'bg-gray-100 border-gray-200 text-gray-600'
      default: return 'bg-blue-100 border-blue-200 text-blue-800'
    }
  }

  return (
    <Card
      ref={setNodeRef}
      className={cn(
        'h-32 transition-all cursor-pointer hover:shadow-md',
        isOver && 'ring-2 ring-blue-500 shadow-lg',
        isToday && 'ring-2 ring-purple-300 bg-purple-50'
      )}
      onClick={() => onDayClick(date)}
    >
      <CardContent className="p-3 h-full flex flex-col">
        {/* Date Header */}
        <div className="flex items-center justify-between mb-2">
          <div className="text-center">
            <div className={cn(
              'text-xs font-medium',
              isToday ? 'text-purple-600' : 'text-gray-600'
            )}>
              {dayOfWeek}
            </div>
            <div className={cn(
              'text-lg font-bold',
              isToday ? 'text-purple-900' : 'text-gray-900'
            )}>
              {dateObj.getDate()}
            </div>
          </div>

          {blocks.length > 0 && (
            <div className="flex flex-col items-end">
              <Badge variant="outline" className="text-xs mb-1">
                {blocks.length}
              </Badge>
              {totalMinutes > 0 && (
                <div className="text-xs text-gray-500">
                  {formatDuration(totalMinutes)}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Task Blocks Preview */}
        <div className="flex-1 space-y-1 overflow-hidden">
          {blocks.length === 0 ? (
            <div className={cn(
              'h-full rounded border-2 border-dashed flex items-center justify-center',
              isOver ? 'border-blue-400 bg-blue-50' : 'border-gray-200'
            )}>
              <span className="text-xs text-gray-400">拖拽任务或创建事件</span>
            </div>
          ) : (
            blocks.slice(0, 3).map((block) => (
              <div
                key={block.id}
                className={cn(
                  'px-2 py-1 rounded border text-xs truncate',
                  getStatusColor(block.status)
                )}
              >
                <div className="font-medium truncate">{block.title}</div>
                <div className="text-xs opacity-75">
                  {block.startTime} - {block.endTime}
                </div>
              </div>
            ))
          )}

          {blocks.length > 3 && (
            <div className="text-xs text-gray-500 text-center">
              +{blocks.length - 3} 更多...
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

interface WeekViewProps {
  weekSchedule: WeekSchedule
  currentWeekStart: string
  onWeekChange: (direction: 'prev' | 'next') => void
  onDayClick: (date: string) => void
  className?: string
}

export function WeekView({
  weekSchedule,
  currentWeekStart,
  onWeekChange,
  onDayClick,
  className
}: WeekViewProps) {
  // Generate week dates
  const weekDates = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(currentWeekStart)
    date.setDate(date.getDate() + i)
    return date.toISOString().split('T')[0]
  })

  // Format week display
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
      <CardContent className="p-4">
        {/* Week Navigation */}
        <div className="flex items-center justify-between mb-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onWeekChange('prev')}
          >
            <ChevronLeft className="w-4 h-4 mr-1" />
            上周
          </Button>

          <div className="text-center">
            <h3 className="text-lg font-semibold text-gray-900">
              {formatWeekDisplay(currentWeekStart)}
            </h3>
            <p className="text-sm text-gray-500">点击日期查看详情</p>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => onWeekChange('next')}
          >
            下周
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>

        {/* Week Grid */}
        <div className="grid grid-cols-7 gap-2">
          {weekDates.map((date) => (
            <DayDropZone
              key={date}
              date={date}
              blocks={weekSchedule[date] || []}
              onDayClick={onDayClick}
            />
          ))}
        </div>

        {/* Quick Stats */}
        <div className="mt-4 pt-4 border-t border-gray-100">
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
