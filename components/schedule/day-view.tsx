'use client'

import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Edit, Trash2, Play, CheckCircle, Clock3, Circle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ScheduleBlock } from '@/lib/schedule-db'

interface TaskCategory {
  id?: number
  name: string
  color: string
  icon?: string
  order?: number
}
import { calculateBlockLayouts, calculateBlockVerticalLayout } from '@/lib/schedule-layout'
import { Tooltip } from '@/components/ui/tooltip'

interface DayViewProps {
  isOpen: boolean
  onClose: () => void
  date: string
  blocks: ScheduleBlock[]
  categories: TaskCategory[]
  onUpdateStatus: (blockId: number, status: ScheduleBlock['status']) => void
  onUpdateCategory: (blockId: number, categoryId: number | null) => void
  onEditBlock: (block: ScheduleBlock) => void
  onDeleteBlock: (blockId: number) => void
}

export function DayView({
  isOpen,
  onClose,
  date,
  blocks = [],
  categories = [],
  onUpdateStatus,
  onUpdateCategory,
  onEditBlock,
  onDeleteBlock
}: DayViewProps) {
  const MINUTE_HEIGHT = 2 // pixels per minute for better readability
  // Removed fixed MIN_BLOCK_HEIGHT to allow natural sizing based on duration
  const [selectedBlock, setSelectedBlock] = useState<ScheduleBlock | null>(null)
  const [currentTime, setCurrentTime] = useState(new Date())
  const scrollRef = useRef<HTMLDivElement>(null)

  // Calculate layouts for all blocks using the new algorithm
  const blockLayouts = useMemo(() => {
    return calculateBlockLayouts(blocks)
  }, [blocks])

  // Calculate display level based on block height
  const getDisplayLevel = (heightInPixels: number): 'minimal' | 'title-only' | 'basic' | 'full' => {
    if (heightInPixels < 25) return 'minimal'      // < 25px: Only show task title
    if (heightInPixels < 45) return 'title-only'   // < 45px: Title only (no time)
    if (heightInPixels < 65) return 'basic'        // < 65px: Title + time
    return 'full'                                  // >= 65px: All information
  }

  const isToday = useCallback(() => {
    const today = new Date()
    const viewDate = new Date(date)
    return today.toDateString() === viewDate.toDateString()
  }, [date])

  const getCurrentTimePosition = useCallback(() => {
    if (!isToday()) return null
    const now = currentTime
    const currentHour = now.getHours()
    const currentMinute = now.getMinutes()
    const startMinutes = currentHour * 60 + currentMinute
    return startMinutes * MINUTE_HEIGHT
  }, [currentTime, isToday])

  // Update current time every minute
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 60000)
    return () => clearInterval(timer)
  }, [])

  // Auto-scroll to current time
  useEffect(() => {
    if (isToday() && scrollRef.current) {
      const currentPosition = getCurrentTimePosition()
      if (currentPosition !== null) {
        setTimeout(() => {
          scrollRef.current?.scrollTo({
            top: Math.max(0, currentPosition - 200),
            behavior: 'smooth'
          })
        }, 100)
      }
    }
  }, [getCurrentTimePosition, isOpen, isToday])

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

  const getStatusIcon = (status: ScheduleBlock['status']) => {
    switch (status) {
      case 'completed': return <CheckCircle className="w-4 h-4" />
      case 'in_progress': return <Play className="w-4 h-4" />
      case 'partially_completed': return <Clock3 className="w-4 h-4" />
      case 'scheduled': return <Circle className="w-4 h-4" />
      default: return null
    }
  }

  const getBlockCategory = (block: ScheduleBlock) => {
    if (!block.categoryId) return null
    // If block already has category info, use it
    if (block.categoryName && block.categoryColor) {
      return {
        id: block.categoryId,
        name: block.categoryName,
        color: block.categoryColor
      }
    }
    // Otherwise, find from categories array
    return categories.find(category => category.id === block.categoryId)
  }

  // Generate 24 hour time slots
  const generateTimeSlots = () => {
    return Array.from({ length: 24 }, (_, i) => ({
      hour: i,
      label: `${i.toString().padStart(2, '0')}:00`
    }))
  }

  const timeSlots = generateTimeSlots()

  if (!isOpen) return null

  const totalBlocks = blocks.length
  const completedBlocks = blocks.filter(b => b.status === 'completed').length

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-4xl max-h-[90vh] bg-white">
        {/* Header */}
        <CardHeader className="border-b border-gray-200 pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="sm" onClick={onClose}>
                <ArrowLeft className="w-4 h-4" />
              </Button>
              <div>
                <CardTitle className="text-lg font-medium text-black">
                  {formatDate(date)}
                </CardTitle>
                <div className="text-sm text-gray-600 mt-1">
                  {totalBlocks} 个任务 · {completedBlocks} 已完成
                </div>
              </div>
            </div>
          </div>
        </CardHeader>

        {/* Content */}
        <CardContent ref={scrollRef} className="p-0 overflow-y-auto max-h-[calc(90vh-120px)]">
          {blocks.length === 0 ? (
            <div className="flex items-center justify-center h-64 text-gray-400">
              <div className="text-center">
                <div className="text-lg">这一天还没有安排任务</div>
                <div className="text-sm mt-1">从左侧任务池拖拽任务到日程中</div>
              </div>
            </div>
          ) : (
            <div className="flex min-h-full">
              {/* Time grid - left column */}
              <div className="w-16 border-r border-gray-200 flex-shrink-0 bg-gray-50">
                {timeSlots.map((slot) => (
                  <div
                    key={slot.hour}
                    className="flex items-start justify-center pt-1 text-xs text-gray-600 border-b border-gray-100"
                    style={{ height: `${60 * MINUTE_HEIGHT}px` }}
                  >
                    {slot.label}
                  </div>
                ))}
              </div>

              {/* Main content area - right column */}
              <div className="flex-1 relative bg-white">
                {/* Background grid lines */}
                <div className="absolute inset-0">
                {timeSlots.map((slot) => (
                  <div
                    key={slot.hour}
                    className="border-b border-gray-100"
                    style={{ height: `${60 * MINUTE_HEIGHT}px` }}
                  />
                ))}
                </div>

                {/* Current time line */}
                {isToday() && getCurrentTimePosition() !== null && (
                  <div
                    className="absolute left-0 right-0 z-20 pointer-events-none"
                    style={{ top: `${getCurrentTimePosition()}px` }}
                  >
                    <div className="h-0.5 bg-red-500 shadow-sm"></div>
                    <div className="absolute -left-16 -top-2.5 bg-red-500 text-white text-xs px-2 py-0.5 rounded font-mono z-30">
                      {currentTime.toLocaleTimeString('zh-CN', {
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: false
                      })}
                    </div>
                  </div>
                )}

                {/* Task blocks */}
                <div className="relative" style={{ height: `${24 * 60 * MINUTE_HEIGHT}px` }}>
                  {blocks.map((block) => {
                    const layout = blockLayouts.get(block.id!)
                    const verticalLayout = calculateBlockVerticalLayout(block, MINUTE_HEIGHT)
                    const displayLevel = getDisplayLevel(verticalLayout.height)

                    if (!layout) return null

                    return (
                      <div
                        key={block.id}
                        className={cn(
                          'absolute bg-white border-2 rounded-md cursor-pointer hover:shadow-lg transition-all group',
                          // Adjust padding based on display level
                          displayLevel === 'minimal' ? 'p-1' : 'p-2',
                          block.status === 'completed' && 'border-green-600 text-green-700 hover:bg-green-50',
                          block.status === 'in_progress' && 'border-yellow-600 text-yellow-700 hover:bg-yellow-50',
                          block.status === 'partially_completed' && 'border-orange-500 text-orange-700 hover:bg-orange-50',
                          block.status === 'cancelled' && 'border-gray-500 text-gray-600 hover:bg-gray-50 opacity-60',
                          block.status === 'scheduled' && 'border-gray-800 text-gray-800 hover:bg-gray-50',
                          selectedBlock?.id === block.id && 'ring-2 ring-blue-400 shadow-lg'
                        )}
                        style={{
                          top: `${verticalLayout.top}px`,
                          height: `${verticalLayout.height}px`,
                          left: `calc(${layout.left}% + 4px)`,
                          width: `calc(${layout.width}% - 8px)`,
                          zIndex: selectedBlock?.id === block.id ? 20 : 10
                        }}
                        onClick={() => setSelectedBlock(selectedBlock?.id === block.id ? null : block)}
                      >
                        {/* Status Quick Actions - show when block is selected */}
                        {selectedBlock?.id === block.id && (
                          <div className="absolute -top-10 left-0 right-0 bg-white border rounded-md shadow-lg p-2 z-30 flex gap-1 justify-center">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={(e) => {
                                e.stopPropagation()
                                onUpdateStatus(block.id!, 'scheduled')
                              }}
                              className={cn(
                                "h-6 px-2 text-xs",
                                block.status === 'scheduled' && "bg-gray-100"
                              )}
                              title="未开始"
                            >
                              <Circle className="w-3 h-3 mr-1" />
                              未开始
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={(e) => {
                                e.stopPropagation()
                                onUpdateStatus(block.id!, 'in_progress')
                              }}
                              className={cn(
                                "h-6 px-2 text-xs",
                                block.status === 'in_progress' && "bg-yellow-100"
                              )}
                              title="进行中"
                            >
                              <Play className="w-3 h-3 mr-1" />
                              进行中
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={(e) => {
                                e.stopPropagation()
                                onUpdateStatus(block.id!, 'partially_completed')
                              }}
                              className={cn(
                                "h-6 px-2 text-xs",
                                block.status === 'partially_completed' && "bg-orange-100"
                              )}
                              title="部分完成"
                            >
                              <Clock3 className="w-3 h-3 mr-1" />
                              部分完成
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={(e) => {
                                e.stopPropagation()
                                onUpdateStatus(block.id!, 'completed')
                              }}
                              className={cn(
                                "h-6 px-2 text-xs",
                                block.status === 'completed' && "bg-green-100"
                              )}
                              title="已完成"
                            >
                              <CheckCircle className="w-3 h-3 mr-1" />
                              已完成
                            </Button>
                          </div>
                        )}

                        {/* For minimal blocks, wrap entire block in Tooltip */}
                        {displayLevel === 'minimal' ? (
                          <Tooltip content={`${block.taskTitle} (${block.startTime} - ${block.endTime})`}>
                            <div className="w-full h-full"></div>
                          </Tooltip>
                        ) : (
                          <div className="flex flex-col h-full">
                          {/* Conditional content based on display level */}
                          <div className="flex items-start justify-between mb-1">
                            <div className="flex-1 min-w-0">
                              {/* Time info - only show for 'basic' and 'full' levels */}
                              {(displayLevel === 'basic' || displayLevel === 'full') && (
                                <div className="text-xs text-gray-600 font-mono mb-0.5">
                                  {block.startTime} - {block.endTime}
                                </div>
                              )}

                              {/* Task title with category badge - always show except for 'minimal' */}
                              <div className="flex items-start gap-1 w-full">
                                  <Tooltip content={block.taskTitle}>
                                    <div className={cn(
                                      "flex-1 font-medium text-gray-900 leading-tight break-words",
                                      displayLevel === 'title-only' ? "text-xs line-clamp-3" : "text-sm line-clamp-2"
                                    )}>
                                      {block.taskTitle}
                                    </div>
                                  </Tooltip>
                                  {/* Category badge for all levels except minimal */}
                                  {getBlockCategory(block) && (
                                    <span
                                      className="text-xs px-1 py-0.5 rounded text-white font-medium flex-shrink-0"
                                      style={{ backgroundColor: getBlockCategory(block)?.color }}
                                      title={`分类: ${getBlockCategory(block)?.name}`}
                                    >
                                      {getBlockCategory(block)?.name}
                                    </span>
                                  )}
                                </div>
                            </div>

                            {/* Edit and Delete buttons - show for basic and full levels */}
                            {(displayLevel === 'basic' || displayLevel === 'full') && (
                              <div className="flex gap-0.5 ml-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    onEditBlock(block)
                                  }}
                                  className="h-4 w-4 p-0 hover:bg-blue-100 rounded"
                                >
                                  <Edit className="w-2.5 h-2.5" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    if (confirm('确定删除这个时间安排吗？')) {
                                      onDeleteBlock(block.id!)
                                      setSelectedBlock(null)
                                    }
                                  }}
                                  className="h-4 w-4 p-0 hover:bg-red-100 text-red-500 rounded"
                                >
                                  <Trash2 className="w-2.5 h-2.5" />
                                </Button>
                              </div>
                            )}
                          </div>

                          {/* Parent info and Category selector - only show for 'full' level */}
                          {displayLevel === 'full' && (
                            <div className="space-y-1">
                              {block.parentTitle && (
                                <Tooltip content={`${block.grandparentTitle ? `${block.grandparentTitle} › ` : ''}${block.parentTitle}`}>
                                  <div className="w-full text-xs text-gray-500 line-clamp-1 break-words">
                                    {block.grandparentTitle && `${block.grandparentTitle} › `}
                                    {block.parentTitle}
                                  </div>
                                </Tooltip>
                              )}

                              {/* Category selector */}
                              <div className="flex items-center gap-1">
                                <span className="text-xs text-gray-500 flex-shrink-0">分类:</span>
                                <select
                                  value={block.categoryId || ''}
                                  onChange={(e) => {
                                    e.stopPropagation()
                                    const categoryId = e.target.value ? Number(e.target.value) : null
                                    onUpdateCategory(block.id!, categoryId)
                                  }}
                                  className="text-xs border-0 border-b border-gray-200 bg-transparent px-0 py-0 focus:border-gray-400 focus:outline-none w-16"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <option value="">无</option>
                                  {categories.map((category) => (
                                    <option key={category.id} value={category.id}>
                                      {category.name}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            </div>
                          )}

                          {/* Comment - only show for 'full' level */}
                          {block.comment && displayLevel === 'full' && (
                            <Tooltip content={block.comment}>
                              <div className="w-full text-xs text-gray-600 mt-1 italic line-clamp-2 break-words">
                                {block.comment}
                              </div>
                            </Tooltip>
                          )}

                          {/* Status icon - only show for 'basic' and 'full' levels */}
                          {getStatusIcon(block.status) && (displayLevel === 'basic' || displayLevel === 'full') && (
                            <div className="mt-auto pt-1">
                              {getStatusIcon(block.status)}
                            </div>
                          )}
                          </div>
                        )}

                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
