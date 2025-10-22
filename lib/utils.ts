import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * 格式化日期时间为易读格式
 * @param dateString - ISO 格式的日期字符串
 * @returns 格式化后的日期时间字符串，如 "2025年1月12日 14:30"
 */
export function formatDateTime(dateString?: string): string {
  if (!dateString) return ""
  const date = new Date(dateString)
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(date)
}

/**
 * 格式化为相对时间显示
 * @param dateString - ISO 格式的日期字符串
 * @returns 相对时间字符串，如 "今天 14:30" / "昨天 14:30" / "2025年1月12日"
 */
export function formatRelativeTime(dateString?: string): string {
  if (!dateString) return ""

  const date = new Date(dateString)
  const now = new Date()

  // 计算日期差异
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const targetDate = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const diffDays = Math.floor((today.getTime() - targetDate.getTime()) / (1000 * 60 * 60 * 24))

  const timeStr = new Intl.DateTimeFormat("zh-CN", {
    hour: "2-digit",
    minute: "2-digit"
  }).format(date)

  if (diffDays === 0) {
    return `今天 ${timeStr}`
  } else if (diffDays === 1) {
    return `昨天 ${timeStr}`
  } else if (diffDays < 7) {
    return `${diffDays}天前 ${timeStr}`
  } else {
    // 超过7天显示完整日期
    return new Intl.DateTimeFormat("zh-CN", {
      year: "numeric",
      month: "long",
      day: "numeric"
    }).format(date)
  }
}

/**
 * 获取日期的 YYYY-MM-DD 格式
 * @param date - Date 对象或日期字符串
 * @returns YYYY-MM-DD 格式的日期字符串
 */
export function formatDateOnly(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}