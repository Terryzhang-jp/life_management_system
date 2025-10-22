/**
 * Daily Life Log Database Operations
 *
 * 每日生活记录数据库操作
 * 功能：语音输入 + AI结构化提取 + 完整性检查
 */

import Database from 'better-sqlite3'
import path from 'path'

const dbPath = path.join(process.cwd(), 'data', 'daily_life_log.db')
const db = new Database(dbPath)

// 初始化数据库表
export function initDailyLifeLogDB() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS daily_life_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date DATE NOT NULL UNIQUE,

      -- Core required fields
      wake_time TEXT,
      planned_sleep_time TEXT,

      -- Meals (optional descriptions)
      breakfast_description TEXT,
      lunch_description TEXT,
      dinner_description TEXT,

      -- Time period activities + mood
      morning_activity TEXT,
      morning_mood TEXT,
      afternoon_activity TEXT,
      afternoon_mood TEXT,
      evening_activity TEXT,
      evening_mood TEXT,
      night_activity TEXT,
      night_mood TEXT,

      -- Thoughts (optional)
      confusions TEXT,
      thoughts TEXT,
      insights TEXT,

      -- Metadata
      raw_input TEXT NOT NULL,
      status TEXT DEFAULT 'draft',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `)

  console.log('✅ Daily Life Log数据库初始化完成')
}

// 初始化数据库
initDailyLifeLogDB()

// ========== TypeScript 接口定义 ==========

export interface DailyLifeLog {
  id?: number
  date: string  // YYYY-MM-DD

  // Core required fields
  wakeTime: string | null          // HH:MM format
  plannedSleepTime: string | null  // HH:MM format

  // Meals (optional descriptions)
  breakfastDescription?: string | null
  lunchDescription?: string | null
  dinnerDescription?: string | null

  // Time period activities + mood
  morningActivity: string | null
  morningMood: string | null
  afternoonActivity: string | null
  afternoonMood: string | null
  eveningActivity: string | null
  eveningMood: string | null
  nightActivity: string | null
  nightMood: string | null

  // Thoughts (optional)
  confusions?: string | null
  thoughts?: string | null
  insights?: string | null

  // Metadata
  rawInput: string
  status: 'draft' | 'completed'
  createdAt?: string
  updatedAt?: string
}

export interface CompletenessCheck {
  isComplete: boolean
  missingFields: string[]
  warnings: string[]
}

// ========== 辅助函数 ==========

function rowToLog(row: any): DailyLifeLog {
  return {
    id: row.id,
    date: row.date,
    wakeTime: row.wake_time,
    plannedSleepTime: row.planned_sleep_time,
    breakfastDescription: row.breakfast_description,
    lunchDescription: row.lunch_description,
    dinnerDescription: row.dinner_description,
    morningActivity: row.morning_activity,
    morningMood: row.morning_mood,
    afternoonActivity: row.afternoon_activity,
    afternoonMood: row.afternoon_mood,
    eveningActivity: row.evening_activity,
    eveningMood: row.evening_mood,
    nightActivity: row.night_activity,
    nightMood: row.night_mood,
    confusions: row.confusions,
    thoughts: row.thoughts,
    insights: row.insights,
    rawInput: row.raw_input,
    status: row.status as 'draft' | 'completed',
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}

// ========== CRUD 操作 ==========

/**
 * 创建新的日志记录
 */
export function createLog(log: Omit<DailyLifeLog, 'id' | 'createdAt' | 'updatedAt'>): number {
  const result = db.prepare(`
    INSERT INTO daily_life_logs (
      date, wake_time, planned_sleep_time,
      breakfast_description, lunch_description, dinner_description,
      morning_activity, morning_mood,
      afternoon_activity, afternoon_mood,
      evening_activity, evening_mood,
      night_activity, night_mood,
      confusions, thoughts, insights,
      raw_input, status
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    log.date,
    log.wakeTime || null,
    log.plannedSleepTime || null,
    log.breakfastDescription || null,
    log.lunchDescription || null,
    log.dinnerDescription || null,
    log.morningActivity || null,
    log.morningMood || null,
    log.afternoonActivity || null,
    log.afternoonMood || null,
    log.eveningActivity || null,
    log.eveningMood || null,
    log.nightActivity || null,
    log.nightMood || null,
    log.confusions || null,
    log.thoughts || null,
    log.insights || null,
    log.rawInput,
    log.status || 'draft'
  )

  return result.lastInsertRowid as number
}

/**
 * 根据日期获取日志
 */
export function getLogByDate(date: string): DailyLifeLog | null {
  const row = db.prepare(`
    SELECT * FROM daily_life_logs
    WHERE date = ?
  `).get(date)

  if (!row) return null
  return rowToLog(row)
}

/**
 * 获取所有日志（支持日期范围过滤）
 */
export function getAllLogs(options?: {
  startDate?: string
  endDate?: string
  status?: 'draft' | 'completed'
}): DailyLifeLog[] {
  let query = 'SELECT * FROM daily_life_logs WHERE 1=1'
  const params: any[] = []

  if (options?.startDate) {
    query += ' AND date >= ?'
    params.push(options.startDate)
  }

  if (options?.endDate) {
    query += ' AND date <= ?'
    params.push(options.endDate)
  }

  if (options?.status) {
    query += ' AND status = ?'
    params.push(options.status)
  }

  query += ' ORDER BY date DESC'

  const rows = db.prepare(query).all(...params)
  return rows.map(rowToLog)
}

/**
 * 更新日志
 */
export function updateLog(date: string, updates: Partial<DailyLifeLog>): void {
  const fields: string[] = []
  const values: any[] = []

  if (updates.wakeTime !== undefined) {
    fields.push('wake_time = ?')
    values.push(updates.wakeTime)
  }

  if (updates.plannedSleepTime !== undefined) {
    fields.push('planned_sleep_time = ?')
    values.push(updates.plannedSleepTime)
  }

  if (updates.breakfastDescription !== undefined) {
    fields.push('breakfast_description = ?')
    values.push(updates.breakfastDescription)
  }

  if (updates.lunchDescription !== undefined) {
    fields.push('lunch_description = ?')
    values.push(updates.lunchDescription)
  }

  if (updates.dinnerDescription !== undefined) {
    fields.push('dinner_description = ?')
    values.push(updates.dinnerDescription)
  }

  if (updates.morningActivity !== undefined) {
    fields.push('morning_activity = ?')
    values.push(updates.morningActivity)
  }

  if (updates.morningMood !== undefined) {
    fields.push('morning_mood = ?')
    values.push(updates.morningMood)
  }

  if (updates.afternoonActivity !== undefined) {
    fields.push('afternoon_activity = ?')
    values.push(updates.afternoonActivity)
  }

  if (updates.afternoonMood !== undefined) {
    fields.push('afternoon_mood = ?')
    values.push(updates.afternoonMood)
  }

  if (updates.eveningActivity !== undefined) {
    fields.push('evening_activity = ?')
    values.push(updates.eveningActivity)
  }

  if (updates.eveningMood !== undefined) {
    fields.push('evening_mood = ?')
    values.push(updates.eveningMood)
  }

  if (updates.nightActivity !== undefined) {
    fields.push('night_activity = ?')
    values.push(updates.nightActivity)
  }

  if (updates.nightMood !== undefined) {
    fields.push('night_mood = ?')
    values.push(updates.nightMood)
  }

  if (updates.confusions !== undefined) {
    fields.push('confusions = ?')
    values.push(updates.confusions)
  }

  if (updates.thoughts !== undefined) {
    fields.push('thoughts = ?')
    values.push(updates.thoughts)
  }

  if (updates.insights !== undefined) {
    fields.push('insights = ?')
    values.push(updates.insights)
  }

  if (updates.rawInput !== undefined) {
    fields.push('raw_input = ?')
    values.push(updates.rawInput)
  }

  if (updates.status !== undefined) {
    fields.push('status = ?')
    values.push(updates.status)
  }

  fields.push('updated_at = CURRENT_TIMESTAMP')

  if (fields.length > 0) {
    values.push(date)
    db.prepare(`
      UPDATE daily_life_logs
      SET ${fields.join(', ')}
      WHERE date = ?
    `).run(...values)
  }
}

/**
 * 删除日志
 */
export function deleteLog(date: string): void {
  db.prepare('DELETE FROM daily_life_logs WHERE date = ?').run(date)
}

// ========== 完整性检查 ==========

/**
 * 检查日志的完整性
 * 返回字段名而不是中文描述，供对话API使用
 */
export function checkCompleteness(log: Partial<DailyLifeLog>): CompletenessCheck {
  const missing: string[] = []
  const warnings: string[] = []

  // Check core required fields
  if (!log.wakeTime) missing.push('wakeTime')
  if (!log.plannedSleepTime) missing.push('plannedSleepTime')

  // Check individual meals
  if (!log.breakfastDescription) missing.push('breakfastDescription')
  if (!log.lunchDescription) missing.push('lunchDescription')
  if (!log.dinnerDescription) missing.push('dinnerDescription')

  // Check activities for each time period
  if (!log.morningActivity) missing.push('morningActivity')
  if (!log.morningMood) missing.push('morningMood')
  if (!log.afternoonActivity) missing.push('afternoonActivity')
  if (!log.afternoonMood) missing.push('afternoonMood')
  if (!log.eveningActivity) missing.push('eveningActivity')
  if (!log.eveningMood) missing.push('eveningMood')

  // Optional fields
  if (!log.nightActivity) missing.push('nightActivity')
  if (!log.nightMood) missing.push('nightMood')
  if (!log.confusions) missing.push('confusions')
  if (!log.thoughts) missing.push('thoughts')
  if (!log.insights) missing.push('insights')

  // 完整性判断：必须有起床/睡觉时间、至少一顿饭、至少一个时段的活动
  const hasMeals = log.breakfastDescription || log.lunchDescription || log.dinnerDescription
  const hasActivities = log.morningActivity || log.afternoonActivity || log.eveningActivity || log.nightActivity

  return {
    isComplete: !!(log.wakeTime && log.plannedSleepTime && hasMeals && hasActivities),
    missingFields: missing,
    warnings
  }
}

export default {
  createLog,
  getLogByDate,
  getAllLogs,
  updateLog,
  deleteLog,
  checkCompleteness
}
