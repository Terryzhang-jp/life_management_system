'use client'

import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { useDroppable } from '@dnd-kit/core'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ChevronLeft, ChevronRight, Clock, Edit, Trash2, Play, CheckCircle, Clock3 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ScheduleBlock, WeekSchedule } from '@/lib/schedule-db'
import { calculateBlockLayouts, calculateBlockVerticalLayout } from '@/lib/schedule-layout'
import { Tooltip } from '@/components/ui/tooltip'
import { getLocalDateString } from '@/lib/date-utils'

interface TimeSlotDropZoneProps {
  date: string
  hour: number
  blocks: ScheduleBlock[]
  onBlockClick: (block: ScheduleBlock) => void
  onBlockEdit: (block: ScheduleBlock) => void
  onBlockDelete: (blockId: number) => void
  onSlotClick?: (date: string, hour: number) => void
}

function TimeSlotDropZone({
  date,
  hour,
  blocks = [],
  onBlockClick,
  onBlockEdit,
  onBlockDelete,
  onSlotClick
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

  // Calculate layouts for blocks in this time slot
  const blockLayouts = useMemo(() => {
    // Get all blocks that overlap with this hour's time window
    const hourStart = hour * 60
    const hourEnd = (hour + 1) * 60

    const overlappingBlocks = blocks.filter(block => {
      const [startHour, startMin] = block.startTime.split(':').map(Number)
      const [endHour, endMin] = block.endTime.split(':').map(Number)
      const blockStart = startHour * 60 + startMin
      const blockEnd = endHour * 60 + endMin

      // Check if block overlaps with this hour
      return blockStart < hourEnd && blockEnd > hourStart
    })

    return calculateBlockLayouts(overlappingBlocks)
  }, [blocks, hour])

  const getStatusColor = (status: ScheduleBlock['status']) => {
    switch (status) {
      case 'completed': return 'bg-white border-2 border-green-600 text-green-700 hover:bg-green-50'
      case 'in_progress': return 'bg-white border-2 border-yellow-600 text-yellow-700 hover:bg-yellow-50'
      case 'partially_completed': return 'bg-white border-2 border-orange-500 text-orange-700 hover:bg-orange-50'
      case 'cancelled': return 'bg-white border-2 border-gray-500 text-gray-600 hover:bg-gray-50'
      default: return 'bg-white border-2 border-gray-800 text-gray-800 hover:bg-gray-50'
    }
  }

  // Calculate display level based on block height (copied from day-view)
  const getDisplayLevel = (heightInPixels: number) => {
    if (heightInPixels < 25) return 'minimal'      // < 25px: Only show colored block + tooltip
    if (heightInPixels < 45) return 'title-only'   // < 45px: Title only (no time)
    if (heightInPixels < 65) return 'basic'        // < 65px: Title + time
    return 'full'                                  // >= 65px: All information
  }

  const getStatusIcon = (status: ScheduleBlock['status']) => {
    switch (status) {
      case 'completed': return <CheckCircle className="w-3 h-3" />
      case 'in_progress': return <Play className="w-3 h-3" />
      case 'partially_completed': return <Clock3 className="w-3 h-3" />
      default: return null
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
        'relative h-15 border-b border-gray-100 transition-colors cursor-pointer',
        isSleepTime && 'bg-gray-50',
        isOver && 'bg-blue-50 border-blue-300',
        'hover:bg-gray-50'
      )}
      style={{ height: '60px' }} // 60px per hour
      onClick={(e) => {
        // Only trigger if clicking on empty space, not on existing blocks
        if (e.target === e.currentTarget && onSlotClick) {
          onSlotClick(date, hour)
        }
      }}
    >
      {/* Time slot blocks */}
      {hourBlocks.map((block) => {
        const layout = blockLayouts.get(block.id!)
        if (!layout) return null

        const blockHeight = calculateBlockHeight(block)
        const displayLevel = getDisplayLevel(blockHeight)
        const statusIcon = getStatusIcon(block.status)

        return (
          <div
            key={block.id}
            className={cn(
              'absolute rounded-md px-1.5 py-1 cursor-pointer text-xs font-medium transition-all group overflow-hidden',
              getStatusColor(block.status),
              'hover:shadow-md hover:z-20'
            )}
            style={{
              top: calculateBlockOffset(block),
              height: blockHeight,
              minHeight: '20px',
              left: `${layout.left}%`,
              width: `calc(${layout.width}% - 2px)`,
              zIndex: 10,
              maxWidth: `calc(${layout.width}% - 2px)`
            }}
            onClick={(e) => {
              e.stopPropagation()
              onBlockClick(block)
            }}
          >
            {displayLevel === 'minimal' ? (
              <Tooltip content={`${block.taskTitle} (${block.startTime} - ${block.endTime})`}>
                <div className="w-full h-full" />
              </Tooltip>
            ) : (
              <div className="flex flex-col h-full">
                <div className="flex items-start justify-between mb-1">
                  <div className="flex-1 min-w-0">
                    {(displayLevel === 'basic' || displayLevel === 'full') && (
                      <div className="text-xs text-gray-600 font-mono mb-0.5">
                        {block.startTime.slice(0, 5)} - {block.endTime.slice(0, 5)}
                      </div>
                    )}

                    <Tooltip content={block.taskTitle}>
                      <div
                        className={cn(
                          'w-full font-medium text-gray-900 leading-tight break-words overflow-hidden',
                          displayLevel === 'title-only' ? 'text-xs line-clamp-3' : 'text-xs line-clamp-2'
                        )}
                        style={{
                          wordBreak: 'break-all',
                          overflowWrap: 'anywhere',
                          maxWidth: '100%'
                        }}
                      >
                        {block.taskTitle}
                      </div>
                    </Tooltip>
                  </div>

                  {(displayLevel === 'basic' || displayLevel === 'full') && (
                    <div className="flex gap-0.5 ml-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          onBlockEdit(block)
                        }}
                        className="p-0.5 hover:bg-blue-100 rounded"
                      >
                        <Edit className="w-2.5 h-2.5" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          if (confirm('确定删除这个时间安排吗？')) {
                            onBlockDelete(block.id!)
                          }
                        }}
                        className="p-0.5 hover:bg-red-100 text-red-500 rounded"
                      >
                        <Trash2 className="w-2.5 h-2.5" />
                      </button>
                    </div>
                  )}
                </div>

                {block.parentTitle && displayLevel === 'full' && (
                  <Tooltip content={`${block.grandparentTitle ? `${block.grandparentTitle} › ` : ''}${block.parentTitle}`}>
                    <div
                      className="w-full text-xs text-gray-500 line-clamp-1 break-words overflow-hidden"
                      style={{
                        wordBreak: 'break-all',
                        overflowWrap: 'anywhere',
                        maxWidth: '100%'
                      }}
                    >
                      {block.grandparentTitle && `${block.grandparentTitle} › `}
                      {block.parentTitle}
                    </div>
                  </Tooltip>
                )}

                {block.comment && displayLevel === 'full' && (
                  <Tooltip content={block.comment}>
                    <div
                      className="w-full text-xs text-gray-600 mt-1 italic line-clamp-2 break-words overflow-hidden"
                      style={{
                        wordBreak: 'break-all',
                        overflowWrap: 'anywhere',
                        maxWidth: '100%'
                      }}
                    >
                      {block.comment}
                    </div>
                  </Tooltip>
                )}

                {statusIcon && (displayLevel === 'basic' || displayLevel === 'full') && (
                  <div className="mt-auto pt-1">
                    {statusIcon}
                  </div>
                )}
              </div>
            )}
          </div>
        )
      })}


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
  onSlotClick?: (date: string, hour: number) => void
  className?: string
}

export function TimelineWeekView({
  weekSchedule,
  currentWeekStart,
  onWeekChange,
  onBlockClick,
  onBlockEdit,
  onBlockDelete,
  onSlotClick,
  className
}: TimelineWeekViewProps) {
  const [currentTime, setCurrentTime] = useState(new Date())
  const timeGridRef = useRef<HTMLDivElement>(null)

  // Update current time every minute
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 60000) // Update every minute

    return () => clearInterval(timer)
  }, [])

  // Generate week dates
  const weekDates = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const date = new Date(currentWeekStart)
      date.setDate(date.getDate() + i)
      return date.toISOString().split('T')[0]
    })
  }, [currentWeekStart])

  // Check if a date is today
  const isDateToday = (dateStr: string) => {
    const today = getLocalDateString()
    return dateStr === today
  }

  // Calculate current time position for timeline
  const getCurrentTimePosition = useCallback(() => {
    const now = currentTime
    const currentHour = now.getHours()
    const currentMinute = now.getMinutes()

    // Calculate position: base position (currentHour * 60px) + offset for minutes
    // No header offset needed since this is positioned relative to the time slots grid
    const basePosition = currentHour * 60 // 60px per hour (matches style={{ height: '60px' }})
    const minuteOffset = (currentMinute / 60) * 60 // proportional offset within the hour

    return basePosition + minuteOffset
  }, [currentTime])

  // Auto-scroll to current time when component mounts or time/week changes
  useEffect(() => {
    if (timeGridRef.current && weekDates.some(date => isDateToday(date))) {
      const currentPosition = getCurrentTimePosition()
      if (currentPosition !== null) {
        // Add header height for scroll calculation since we're scrolling the entire container
        const scrollTop = Math.max(0, currentPosition + 48 - 150) // +48 for header, -150 for padding
        setTimeout(() => {
          timeGridRef.current?.scrollTo({
            top: scrollTop,
            behavior: 'smooth'
          })
        }, 100) // Small delay to ensure DOM is ready
      }
    }
  }, [currentWeekStart, currentTime, weekDates, getCurrentTimePosition]) // Trigger when week changes or time updates

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
        <div ref={timeGridRef} className="flex max-h-[70vh] overflow-y-auto">
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
            <div className="flex relative">
              {/* Current Time Indicator - only show if today is in current week */}
              {weekDates.some(date => isDateToday(date)) && (
                <div
                  className="absolute left-0 right-0 z-20 pointer-events-none"
                  style={{ top: `${getCurrentTimePosition()}px` }}
                >
                  {/* Time label */}
                  <div className="absolute left-2 -top-2.5 bg-red-500 text-white text-xs px-2 py-0.5 rounded-full font-mono z-30">
                    {currentTime.toLocaleTimeString('zh-CN', {
                      hour: '2-digit',
                      minute: '2-digit',
                      hour12: false
                    })}
                  </div>
                  {/* Red line across all days */}
                  <div className="h-0.5 bg-red-500 shadow-lg ml-16"></div>
                  {/* Circle indicator at the beginning of today's column */}
                  {weekDates.map((date, index) =>
                    isDateToday(date) ? (
                      <div
                        key={`indicator-${date}`}
                        className="absolute w-2 h-2 bg-red-500 rounded-full -top-1 z-30"
                        style={{ left: `${64 + (index * (100 / 7))}%` }}
                      />
                    ) : null
                  )}
                </div>
              )}

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
                      onSlotClick={onSlotClick}
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
