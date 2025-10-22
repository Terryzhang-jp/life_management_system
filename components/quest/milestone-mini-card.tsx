'use client'

import React, { useState } from 'react'
import { cn } from '@/lib/utils'
import { ChevronDown, ChevronUp, CheckCircle2, Circle } from 'lucide-react'
import type { MilestoneProgress } from '@/lib/quest-progress-types'

/**
 * MilestoneMiniCard - Milestone进度迷你卡片组件
 *
 * 设计理念：
 * - 可折叠的Milestone卡片
 * - 显示Checkpoint完成进度
 * - 简约的黑白灰配色
 * - 清晰的完成状态标识
 */

export interface MilestoneMiniCardProps {
  /** Milestone进度数据 */
  milestone: MilestoneProgress

  /** 是否默认展开 */
  defaultExpanded?: boolean

  /** 是否已完成 */
  isCompleted?: boolean

  /** 点击时的回调 */
  onClick?: () => void

  /** 自定义className */
  className?: string
}

export default function MilestoneMiniCard({
  milestone,
  defaultExpanded = false,
  isCompleted = false,
  onClick,
  className
}: MilestoneMiniCardProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded)

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation()
    setIsExpanded(!isExpanded)
  }

  const handleCardClick = () => {
    if (onClick) {
      onClick()
    }
  }

  return (
    <div
      className={cn(
        'border rounded-lg bg-white transition-all duration-200',
        onClick && 'cursor-pointer hover:shadow-md',
        isCompleted && 'border-green-200 bg-green-50',
        !isCompleted && 'border-gray-200',
        className
      )}
      onClick={handleCardClick}
    >
      {/* 头部：标题 + 进度 + 展开按钮 */}
      <div className="flex items-center justify-between p-4">
        {/* 左侧：状态图标 + 标题 */}
        <div className="flex items-start gap-3 flex-1 min-w-0">
          {/* 完成状态图标 */}
          <div className="flex-shrink-0 mt-0.5">
            {isCompleted ? (
              <CheckCircle2 className="w-5 h-5 text-green-600" />
            ) : (
              <Circle className="w-5 h-5 text-gray-400" />
            )}
          </div>

          {/* 标题和进度 */}
          <div className="flex-1 min-w-0">
            <h4
              className={cn(
                'text-sm font-medium truncate',
                isCompleted && 'line-through text-gray-500',
                !isCompleted && 'text-gray-900'
              )}
            >
              {milestone.title}
            </h4>

            {/* Checkpoint进度文字 */}
            <p className="text-xs text-gray-500 mt-1">
              {milestone.completedCheckpoints} / {milestone.totalCheckpoints} Checkpoints
            </p>
          </div>
        </div>

        {/* 右侧：进度百分比 + 展开按钮 */}
        <div className="flex items-center gap-3 flex-shrink-0">
          {/* 进度百分比 */}
          <span className="text-lg font-bold text-gray-900">
            {milestone.progress}%
          </span>

          {/* 展开/收起按钮 */}
          {milestone.totalCheckpoints > 0 && (
            <button
              onClick={handleToggle}
              className="p-1 rounded hover:bg-gray-100 transition-colors"
              aria-label={isExpanded ? 'Collapse' : 'Expand'}
            >
              {isExpanded ? (
                <ChevronUp className="w-4 h-4 text-gray-600" />
              ) : (
                <ChevronDown className="w-4 h-4 text-gray-600" />
              )}
            </button>
          )}
        </div>
      </div>

      {/* 展开内容：进度条 */}
      {isExpanded && milestone.totalCheckpoints > 0 && (
        <div className="px-4 pb-4">
          {/* 分隔线 */}
          <div className="border-t border-gray-200 mb-3" />

          {/* Checkpoint进度条 */}
          <div className="space-y-2">
            {/* 进度条标签 */}
            <div className="flex justify-between text-xs text-gray-600">
              <span>Checkpoints Progress</span>
              <span>
                {milestone.completedCheckpoints} / {milestone.totalCheckpoints}
              </span>
            </div>

            {/* 进度条 */}
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className={cn(
                  'h-full rounded-full transition-all duration-500',
                  isCompleted ? 'bg-green-600' : 'bg-gray-900'
                )}
                style={{ width: `${milestone.progress}%` }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * 使用示例：
 *
 * 1. 基础用法
 * <MilestoneMiniCard
 *   milestone={{
 *     milestoneId: 1,
 *     title: '完成原型设计',
 *     progress: 60,
 *     completedCheckpoints: 3,
 *     totalCheckpoints: 5
 *   }}
 * />
 *
 * 2. 已完成的Milestone
 * <MilestoneMiniCard
 *   milestone={milestoneData}
 *   isCompleted={true}
 * />
 *
 * 3. 默认展开
 * <MilestoneMiniCard
 *   milestone={milestoneData}
 *   defaultExpanded={true}
 * />
 *
 * 4. 带点击事件
 * <MilestoneMiniCard
 *   milestone={milestoneData}
 *   onClick={() => {
 *     console.log('Navigate to milestone detail')
 *   }}
 * />
 *
 * 5. Milestone列表展示
 * {milestones.map(m => (
 *   <MilestoneMiniCard
 *     key={m.milestoneId}
 *     milestone={m}
 *     isCompleted={m.progress === 100}
 *     className="mb-3"
 *   />
 * ))}
 */
