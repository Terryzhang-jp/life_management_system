'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { X, ArrowLeft, Clock, Edit, Trash2, Play, Square, CheckCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ScheduleBlock } from '@/lib/schedule-db'

interface DayViewProps {
  isOpen: boolean
  onClose: () => void
  date: string
  blocks: ScheduleBlock[]
  onUpdateStatus: (blockId: number, status: ScheduleBlock['status']) => void
  onEditBlock: (block: ScheduleBlock) => void
  onDeleteBlock: (blockId: number) => void
}

interface TimeSlot {
  hour: number
  label: string
  blocks: ScheduleBlock[]
}

export function DayView({
  isOpen,
  onClose,
  date,
  blocks = [],
  onUpdateStatus,
  onEditBlock,
  onDeleteBlock
}: DayViewProps) {
  const [selectedBlock, setSelectedBlock] = useState<ScheduleBlock | null>(null)

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    const today = new Date()
    const diffDays = Math.ceil((date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

    const dayOfWeek = ['日', '一', '二', '三', '四', '五', '六'][date.getDay()]
    const dateFormat = `${date.getMonth() + 1}月${date.getDate()}日`

    if (diffDays === 0) return `${dateFormat} (今天) 周${dayOfWeek}`
    if (diffDays === 1) return `${dateFormat} (明天) 周${dayOfWeek}`
    if (diffDays > 0) return `${dateFormat} (${diffDays}天后) 周${dayOfWeek}`
    return `${dateFormat} (${Math.abs(diffDays)}天前) 周${dayOfWeek}`
  }

  // Generate time slots from 7:00 to 23:00
  const generateTimeSlots = (): TimeSlot[] => {
    const slots: TimeSlot[] = []

    for (let hour = 7; hour <= 23; hour++) {
      const hourBlocks = blocks.filter(block => {
        const blockStartHour = parseInt(block.startTime.split(':')[0])
        const blockEndHour = parseInt(block.endTime.split(':')[0])
        return blockStartHour <= hour && blockEndHour > hour
      })

      slots.push({
        hour,
        label: `${hour.toString().padStart(2, '0')}:00`,
        blocks: hourBlocks
      })
    }

    return slots
  }

  const getStatusIcon = (status: ScheduleBlock['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-600" />
      case 'in_progress':
        return <Play className="w-4 h-4 text-yellow-600" />
      case 'cancelled':
        return <Square className="w-4 h-4 text-gray-400" />
      default:
        return <Clock className="w-4 h-4 text-blue-600" />
    }
  }

  const getStatusColor = (status: ScheduleBlock['status']) => {
    switch (status) {
      case 'completed': return 'bg-green-100 border-green-200 text-green-800'
      case 'in_progress': return 'bg-yellow-100 border-yellow-200 text-yellow-800'
      case 'cancelled': return 'bg-gray-100 border-gray-200 text-gray-600'
      default: return 'bg-blue-100 border-blue-200 text-blue-800'
    }
  }

  const getNextStatus = (currentStatus: ScheduleBlock['status']): ScheduleBlock['status'] => {
    switch (currentStatus) {
      case 'scheduled': return 'in_progress'
      case 'in_progress': return 'completed'
      default: return 'scheduled'
    }
  }

  const getStatusLabel = (status: ScheduleBlock['status']) => {
    switch (status) {
      case 'completed': return '已完成'
      case 'in_progress': return '进行中'
      case 'cancelled': return '已取消'
      default: return '计划中'
    }
  }

  const calculateBlockHeight = (block: ScheduleBlock) => {
    const start = new Date(`1970-01-01T${block.startTime}`)
    const end = new Date(`1970-01-01T${block.endTime}`)
    const duration = (end.getTime() - start.getTime()) / (1000 * 60) // minutes
    return Math.max(40, duration * 0.8) // Minimum 40px, 0.8px per minute
  }

  const calculateBlockPosition = (block: ScheduleBlock, hour: number) => {
    const blockStart = new Date(`1970-01-01T${block.startTime}`)
    const blockStartHour = blockStart.getHours()
    const blockStartMinute = blockStart.getMinutes()

    if (blockStartHour === hour) {
      return blockStartMinute * (60 / 60) // Position within the hour slot
    }
    return 0
  }

  const timeSlots = generateTimeSlots()

  if (!isOpen) return null

  // Calculate summary stats
  const completedBlocks = blocks.filter(b => b.status === 'completed').length
  const totalBlocks = blocks.length
  const totalMinutes = blocks.reduce((sum, block) => {
    const start = new Date(`1970-01-01T${block.startTime}`)
    const end = new Date(`1970-01-01T${block.endTime}`)
    return sum + (end.getTime() - start.getTime()) / (1000 * 60)
  }, 0)

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <Card className="w-full max-w-4xl mx-4 max-h-[90vh] flex flex-col">
        <CardHeader className="pb-4 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="sm" onClick={onClose}>
                <ArrowLeft className="w-4 h-4" />
              </Button>
              <div>
                <CardTitle className="text-lg font-semibold">
                  {formatDate(date)}
                </CardTitle>
                <div className="flex items-center gap-4 text-sm text-gray-600 mt-1">
                  <span>{totalBlocks} 个任务</span>
                  <span>{completedBlocks}/{totalBlocks} 已完成</span>
                  <span>{Math.round(totalMinutes / 60 * 10) / 10}小时</span>
                </div>
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="flex-1 overflow-y-auto">
          {blocks.length === 0 ? (
            <div className="flex items-center justify-center h-64 text-gray-500">
              <div className="text-center">
                <Clock className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <div className="text-lg font-medium">这一天还没有安排任务</div>
                <div className="text-sm mt-1">从左侧任务池拖拽任务到日程中</div>
              </div>
            </div>
          ) : (
            <div className="space-y-1">
              {timeSlots.map((slot) => (
                <div key={slot.hour} className="flex">
                  {/* Time Label */}
                  <div className="w-16 flex-shrink-0 text-sm text-gray-500 pt-2">
                    {slot.label}
                  </div>

                  {/* Time Slot Content */}
                  <div className="flex-1 min-h-[60px] border-l border-gray-100 pl-4 relative">
                    {slot.blocks.length === 0 ? (
                      <div className="h-full border-b border-gray-50"></div>
                    ) : (
                      slot.blocks.map((block) => {
                        const isBlockStart = parseInt(block.startTime.split(':')[0]) === slot.hour

                        if (!isBlockStart) return null

                        return (
                          <div
                            key={block.id}
                            className={cn(
                              'absolute left-4 right-4 rounded-lg border p-3 cursor-pointer transition-all hover:shadow-md',
                              getStatusColor(block.status),
                              selectedBlock?.id === block.id && 'ring-2 ring-blue-500'
                            )}
                            style={{
                              top: calculateBlockPosition(block, slot.hour),
                              height: calculateBlockHeight(block)
                            }}
                            onClick={() => setSelectedBlock(selectedBlock?.id === block.id ? null : block)}
                          >
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                {getStatusIcon(block.status)}
                                <span className="font-medium text-sm">
                                  {block.taskTitle}
                                </span>
                              </div>

                              <Badge variant="outline" className="text-xs">
                                {getStatusLabel(block.status)}
                              </Badge>
                            </div>

                            <div className="text-xs opacity-75 mb-2">
                              {block.startTime} - {block.endTime}
                              {block.parentTitle && (
                                <span className="ml-2">
                                  {block.grandparentTitle && `${block.grandparentTitle} › `}
                                  {block.parentTitle}
                                </span>
                              )}
                            </div>

                            {block.comment && (
                              <div className="text-xs opacity-75 italic">
                                {block.comment}
                              </div>
                            )}

                            {/* Action Buttons */}
                            {selectedBlock?.id === block.id && (
                              <div className="flex gap-1 mt-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    onUpdateStatus(block.id!, getNextStatus(block.status))
                                  }}
                                  className="h-6 text-xs"
                                >
                                  {block.status === 'scheduled' && '开始'}
                                  {block.status === 'in_progress' && '完成'}
                                  {block.status === 'completed' && '重置'}
                                  {block.status === 'cancelled' && '重置'}
                                </Button>

                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    onEditBlock(block)
                                  }}
                                  className="h-6 text-xs"
                                >
                                  <Edit className="w-3 h-3" />
                                </Button>

                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    if (confirm('确定删除这个时间安排吗？')) {
                                      onDeleteBlock(block.id!)
                                    }
                                  }}
                                  className="h-6 text-xs text-red-600 hover:text-red-700"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </Button>

                                {block.status !== 'cancelled' && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      onUpdateStatus(block.id!, 'cancelled')
                                    }}
                                    className="h-6 text-xs text-gray-600"
                                  >
                                    取消
                                  </Button>
                                )}
                              </div>
                            )}
                          </div>
                        )
                      })
                    )}

                    {/* Hour divider line */}
                    <div className="absolute bottom-0 left-0 right-4 border-b border-gray-100"></div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}