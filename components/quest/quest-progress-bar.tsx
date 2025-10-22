'use client'

import React from 'react'
import { cn } from '@/lib/utils'

/**
 * QuestProgressBar - 简约风格的Quest进度条组件
 *
 * 设计理念：
 * - 黑/白/灰的简约配色
 * - 大字体，清晰的进度数字
 * - 流畅的动画效果
 * - 可选的详细信息展示
 */

export interface QuestProgressBarProps {
  /** 进度百分比 (0-100) */
  progress: number

  /** 是否显示详细信息 (完成数/总数) */
  showDetails?: boolean

  /** 已完成的Milestone数量 */
  completedMilestones?: number

  /** 总Milestone数量 */
  totalMilestones?: number

  /** 进度条高度 */
  height?: 'sm' | 'md' | 'lg'

  /** 自定义className */
  className?: string

  /** 是否显示动画 */
  animated?: boolean
}

export default function QuestProgressBar({
  progress,
  showDetails = false,
  completedMilestones = 0,
  totalMilestones = 0,
  height = 'md',
  className,
  animated = true
}: QuestProgressBarProps) {
  // 限制进度值在0-100之间
  const clampedProgress = Math.max(0, Math.min(100, progress))

  // 高度样式映射
  const heightMap = {
    sm: 'h-1.5',
    md: 'h-2.5',
    lg: 'h-4'
  }

  return (
    <div className={cn('w-full', className)}>
      {/* 进度信息行 */}
      <div className="flex items-baseline justify-between mb-2">
        {/* 进度百分比 - 大字体 */}
        <span className="text-2xl font-bold text-gray-900">
          {clampedProgress}%
        </span>

        {/* 详细信息 - 小字体灰色 */}
        {showDetails && totalMilestones > 0 && (
          <span className="text-sm text-gray-500">
            {completedMilestones} / {totalMilestones} Milestones
          </span>
        )}
      </div>

      {/* 进度条容器 */}
      <div
        className={cn(
          'w-full bg-gray-200 rounded-full overflow-hidden',
          heightMap[height]
        )}
      >
        {/* 进度填充 */}
        <div
          className={cn(
            'h-full bg-gray-900 rounded-full',
            animated && 'transition-all duration-500 ease-out'
          )}
          style={{ width: `${clampedProgress}%` }}
        />
      </div>
    </div>
  )
}

/**
 * 使用示例：
 *
 * 1. 基础用法
 * <QuestProgressBar progress={45} />
 *
 * 2. 显示详细信息
 * <QuestProgressBar
 *   progress={45}
 *   showDetails={true}
 *   completedMilestones={2}
 *   totalMilestones={5}
 * />
 *
 * 3. 自定义高度和样式
 * <QuestProgressBar
 *   progress={78}
 *   height="lg"
 *   className="mt-4"
 * />
 *
 * 4. 禁用动画
 * <QuestProgressBar
 *   progress={100}
 *   animated={false}
 * />
 */
