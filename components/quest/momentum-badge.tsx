'use client'

import React from 'react'
import { cn } from '@/lib/utils'
import type { MomentumStatus } from '@/lib/quest-progress-types'

/**
 * MomentumBadge - Quest活跃状态徽章组件
 *
 * 设计理念：
 * - 🔥 Active: 绿色，最近3天有活动
 * - ⏸️ Paused: 黄色，3-14天没活动
 * - ⚠️ Stalled: 红色，超过14天没活动
 * - 简约的配色和typography
 * - 可选的详细时间信息
 */

/**
 * 格式化相对时间（客户端实现）
 */
function formatRelativeTime(date: Date): string {
  const now = Date.now()
  const diff = now - date.getTime()

  const minutes = Math.floor(diff / (1000 * 60))
  const hours = Math.floor(diff / (1000 * 60 * 60))
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  const weeks = Math.floor(days / 7)
  const months = Math.floor(days / 30)

  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  if (hours < 24) return `${hours}h ago`
  if (days === 1) return 'yesterday'
  if (days < 7) return `${days}d ago`
  if (weeks < 4) return `${weeks}w ago`
  return `${months}mo ago`
}

export interface MomentumBadgeProps {
  /** 活跃状态 */
  status: MomentumStatus

  /** 最后活动时间 */
  lastActivityAt?: Date | null

  /** 是否显示详细时间 */
  showTime?: boolean

  /** 徽章大小 */
  size?: 'sm' | 'md' | 'lg'

  /** 自定义className */
  className?: string
}

/** 状态配置映射 */
const STATUS_CONFIG = {
  active: {
    emoji: '🔥',
    label: 'Active',
    bgColor: 'bg-green-100',
    textColor: 'text-green-800',
    borderColor: 'border-green-200'
  },
  paused: {
    emoji: '⏸️',
    label: 'Paused',
    bgColor: 'bg-yellow-100',
    textColor: 'text-yellow-800',
    borderColor: 'border-yellow-200'
  },
  stalled: {
    emoji: '⚠️',
    label: 'Stalled',
    bgColor: 'bg-red-100',
    textColor: 'text-red-800',
    borderColor: 'border-red-200'
  }
} as const

export default function MomentumBadge({
  status,
  lastActivityAt,
  showTime = false,
  size = 'md',
  className
}: MomentumBadgeProps) {
  const config = STATUS_CONFIG[status]

  // 尺寸样式映射
  const sizeMap = {
    sm: {
      container: 'px-2 py-0.5 text-xs',
      emoji: 'text-sm'
    },
    md: {
      container: 'px-3 py-1 text-sm',
      emoji: 'text-base'
    },
    lg: {
      container: 'px-4 py-1.5 text-base',
      emoji: 'text-lg'
    }
  }

  const sizeStyles = sizeMap[size]

  return (
    <div className={cn('inline-flex items-center gap-2', className)}>
      {/* 状态徽章 */}
      <span
        className={cn(
          'inline-flex items-center gap-1.5 rounded-full border font-medium',
          config.bgColor,
          config.textColor,
          config.borderColor,
          sizeStyles.container
        )}
      >
        <span className={sizeStyles.emoji}>{config.emoji}</span>
        <span>{config.label}</span>
      </span>

      {/* 详细时间信息 */}
      {showTime && lastActivityAt && (
        <span className="text-xs text-gray-500">
          {formatRelativeTime(lastActivityAt)}
        </span>
      )}
    </div>
  )
}

/**
 * 使用示例：
 *
 * 1. 基础用法
 * <MomentumBadge status="active" />
 *
 * 2. 显示详细时间
 * <MomentumBadge
 *   status="paused"
 *   lastActivityAt={new Date('2025-01-05')}
 *   showTime={true}
 * />
 *
 * 3. 自定义大小
 * <MomentumBadge
 *   status="stalled"
 *   size="lg"
 *   lastActivityAt={new Date('2024-12-15')}
 *   showTime={true}
 * />
 *
 * 4. 搭配其他元素使用
 * <div className="flex items-center justify-between">
 *   <h3>Quest Title</h3>
 *   <MomentumBadge status="active" size="sm" />
 * </div>
 */
