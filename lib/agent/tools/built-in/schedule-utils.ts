/**
 * Schedule Tools 辅助函数
 *
 * 提供日期解析、时间匹配等工具函数
 */

/**
 * 解析自然语言日期为 YYYY-MM-DD 格式
 */
export function parseDateString(dateStr: string): string {
  const normalized = dateStr.toLowerCase().trim()
  const today = new Date()

  // 处理常见的中英文日期表达
  if (normalized === 'today' || normalized === '今天') {
    return formatDate(today)
  }

  if (normalized === 'tomorrow' || normalized === '明天') {
    return formatDate(addDays(today, 1))
  }

  if (normalized === 'yesterday' || normalized === '昨天') {
    return formatDate(addDays(today, -1))
  }

  // 后天
  if (normalized === '后天' || normalized === 'day after tomorrow') {
    return formatDate(addDays(today, 2))
  }

  // 大后天
  if (normalized === '大后天') {
    return formatDate(addDays(today, 3))
  }

  // "in X days" 格式
  const inDaysMatch = normalized.match(/^in\s+(\d+)\s+days?$/)
  if (inDaysMatch) {
    const daysAhead = parseInt(inDaysMatch[1], 10)
    return formatDate(addDays(today, daysAhead))
  }

  // "X天后" 格式
  const chineseDaysMatch = normalized.match(/^(\d+)天后$/)
  if (chineseDaysMatch) {
    const daysAhead = parseInt(chineseDaysMatch[1], 10)
    return formatDate(addDays(today, daysAhead))
  }

  // YYYY-MM-DD 格式
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return dateStr
  }

  // MM-DD 格式（当年）
  if (/^\d{2}-\d{2}$/.test(dateStr)) {
    return `${today.getFullYear()}-${dateStr}`
  }

  throw new Error(`无法解析日期: ${dateStr}`)
}

/**
 * 获取今天的日期
 */
export function getTodayDate(): string {
  return formatDate(new Date())
}

/**
 * 格式化日期为 YYYY-MM-DD
 */
function formatDate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * 日期加减天数
 */
function addDays(date: Date, days: number): Date {
  const result = new Date(date)
  result.setDate(result.getDate() + days)
  return result
}
