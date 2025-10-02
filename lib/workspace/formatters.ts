/**
 * 格式化工具函数
 * 将原始数据转换为 LLM 可理解的文本格式
 */

/**
 * 格式化优先级
 */
export function formatPriority(priority?: number): string {
  if (!priority || priority === 999) return '无优先级'

  const labels: Record<number, string> = {
    1: 'P1 (最重要)',
    2: 'P2 (重要)',
    3: 'P3 (较重要)',
    4: 'P4 (一般)',
    5: 'P5 (较低)'
  }

  return labels[priority] || `P${priority}`
}

/**
 * 计算日期差（天数）
 */
export function daysBetween(date1: string, date2: string): number {
  const d1 = new Date(date1)
  const d2 = new Date(date2)
  const diffTime = d2.getTime() - d1.getTime()
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
}

/**
 * 格式化相对时间
 */
export function formatRelativeTime(dateStr: string, today: string): string {
  const days = daysBetween(dateStr, today)

  if (days === 0) return '今天'
  if (days === 1) return '明天'
  if (days === -1) return '昨天'
  if (days > 0) return `${days}天后`
  return `${Math.abs(days)}天前`
}

/**
 * 格式化截止日期（带状态）
 */
export function formatDeadline(deadline: string, today: string): string {
  const days = daysBetween(today, deadline)

  if (days < 0) {
    return `${deadline} (已逾期${Math.abs(days)}天)`
  }

  if (days === 0) return `${deadline} (今天到期)`
  if (days === 1) return `${deadline} (明天到期)`
  if (days <= 3) return `${deadline} (${days}天后)`

  return `${deadline} (${days}天后)`
}

/**
 * 格式化创建时间
 */
export function formatCreatedAt(createdAt: string, today: string): string {
  const days = daysBetween(createdAt, today)
  return `${days}天前创建`
}

/**
 * 判断是否紧急（3天内deadline）
 */
export function isUrgent(deadline?: string, today?: string): boolean {
  if (!deadline || !today) return false
  const days = daysBetween(today, deadline)
  return days >= 0 && days <= 3
}

/**
 * 判断是否逾期
 */
export function isOverdue(deadline?: string, today?: string): boolean {
  if (!deadline || !today) return false
  const days = daysBetween(today, deadline)
  return days < 0
}
