import Database from 'better-sqlite3'
import path from 'path'

const dbPath = path.join(process.cwd(), 'data', 'daily-review-quick.db')
const db = new Database(dbPath)

// 创建每日回顾表
db.exec(`
  CREATE TABLE IF NOT EXISTS daily_reviews (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT UNIQUE NOT NULL,

    -- 1) 今日快照（不计分）
    energy INTEGER DEFAULT 0,
    focus INTEGER DEFAULT 0,
    mood INTEGER DEFAULT 0,
    sleep INTEGER DEFAULT 0,

    -- 2) 行动剂量
    deep_work_blocks INTEGER DEFAULT 0,
    connections INTEGER DEFAULT 0,
    learning INTEGER DEFAULT 0,
    exercise INTEGER DEFAULT 0,
    has_review INTEGER DEFAULT 0,
    has_refusal INTEGER DEFAULT 0,
    has_exploration INTEGER DEFAULT 0,
    deep_work_notes TEXT,

    -- 3) 交付物
    deliverables INTEGER DEFAULT 0,
    deliverable_types TEXT,

    -- 4) 红线与罚分
    late_screen INTEGER DEFAULT 0,
    excess_coffee INTEGER DEFAULT 0,
    no_exercise INTEGER DEFAULT 0,
    custom_violation TEXT,
    custom_violation_hit INTEGER DEFAULT 0,

    -- 5) 干扰源
    distractions TEXT,

    -- 6) 明日一锤子
    tomorrow_task TEXT,
    tomorrow_time_slot TEXT,
    tomorrow_duration TEXT,
    tomorrow_dod TEXT,
    tomorrow_alarm INTEGER DEFAULT 0,
    tomorrow_notes TEXT,

    -- 7) 今日MVP
    mvp TEXT,

    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`)

export interface DailyReview {
  id?: number
  date: string

  // 1) 今日快照
  energy: number
  focus: number
  mood: number
  sleep: number

  // 2) 行动剂量
  deepWorkBlocks: number
  connections: number
  learning: number
  exercise: number
  hasReview: boolean
  hasRefusal: boolean
  hasExploration: boolean
  deepWorkNotes?: string

  // 3) 交付物
  deliverables: number
  deliverableTypes?: string[]

  // 4) 红线与罚分
  lateScreen: boolean
  excessCoffee: boolean
  noExercise: boolean
  customViolation?: string
  customViolationHit: boolean

  // 5) 干扰源
  distractions?: string[]

  // 6) 明日一锤子
  tomorrowTask?: string
  tomorrowTimeSlot?: string
  tomorrowDuration?: string
  tomorrowDoD?: string
  tomorrowAlarm: boolean
  tomorrowNotes?: string

  // 7) 今日MVP
  mvp?: string

  createdAt?: string
  updatedAt?: string
}

// 计算分数
export function calculateScores(review: DailyReview) {
  // 2) 行动剂量得分
  const deepWorkScore = [0, 3, 6, 9, 12][Math.min(review.deepWorkBlocks, 4)]
  const connectionsScore = [0, 2, 4, 6][Math.min(review.connections, 3)]
  const learningScore = [0, 1, 2][Math.min(review.learning, 2)]
  const exerciseScore = review.exercise === 0 ? 0 : review.exercise === 10 ? 1 : review.exercise === 20 ? 2 : 3
  const reviewScore = review.hasReview ? 1 : 0
  const refusalScore = review.hasRefusal ? 1 : 0
  const explorationScore = review.hasExploration ? 1 : 0

  const actionTotal = deepWorkScore + connectionsScore + learningScore + exerciseScore +
                      reviewScore + refusalScore + explorationScore

  // 3) 交付物得分
  const outputScore = [0, 6, 12][Math.min(review.deliverables, 2)]

  // 4) 罚分
  const penalties = (review.lateScreen ? 3 : 0) +
                   (review.excessCoffee ? 2 : 0) +
                   (review.noExercise ? 2 : 0) +
                   (review.customViolationHit ? 2 : 0)

  // P（过程分）= 行动剂量 - 罚分
  const processScore = actionTotal - penalties

  // 总分
  const totalScore = processScore + outputScore

  return {
    processScore,
    outputScore,
    totalScore
  }
}

// 获取今日回顾
export function getTodayReview(): DailyReview | null {
  const today = new Date().toISOString().split('T')[0]
  const row = db.prepare('SELECT * FROM daily_reviews WHERE date = ?').get(today) as any

  if (!row) return null

  return {
    id: row.id,
    date: row.date,
    energy: row.energy,
    focus: row.focus,
    mood: row.mood,
    sleep: row.sleep,
    deepWorkBlocks: row.deep_work_blocks,
    connections: row.connections,
    learning: row.learning,
    exercise: row.exercise,
    hasReview: Boolean(row.has_review),
    hasRefusal: Boolean(row.has_refusal),
    hasExploration: Boolean(row.has_exploration),
    deepWorkNotes: row.deep_work_notes,
    deliverables: row.deliverables,
    deliverableTypes: row.deliverable_types ? JSON.parse(row.deliverable_types) : [],
    lateScreen: Boolean(row.late_screen),
    excessCoffee: Boolean(row.excess_coffee),
    noExercise: Boolean(row.no_exercise),
    customViolation: row.custom_violation,
    customViolationHit: Boolean(row.custom_violation_hit),
    distractions: row.distractions ? JSON.parse(row.distractions) : [],
    tomorrowTask: row.tomorrow_task,
    tomorrowTimeSlot: row.tomorrow_time_slot,
    tomorrowDuration: row.tomorrow_duration,
    tomorrowDoD: row.tomorrow_dod,
    tomorrowAlarm: Boolean(row.tomorrow_alarm),
    tomorrowNotes: row.tomorrow_notes,
    mvp: row.mvp,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}

// 保存或更新今日回顾
export function saveTodayReview(review: Partial<DailyReview>): DailyReview {
  const today = new Date().toISOString().split('T')[0]

  const stmt = db.prepare(`
    INSERT INTO daily_reviews (
      date, energy, focus, mood, sleep,
      deep_work_blocks, connections, learning, exercise,
      has_review, has_refusal, has_exploration, deep_work_notes,
      deliverables, deliverable_types,
      late_screen, excess_coffee, no_exercise, custom_violation, custom_violation_hit,
      distractions,
      tomorrow_task, tomorrow_time_slot, tomorrow_duration, tomorrow_dod, tomorrow_alarm, tomorrow_notes,
      mvp,
      updated_at
    ) VALUES (
      ?, ?, ?, ?, ?,
      ?, ?, ?, ?,
      ?, ?, ?, ?,
      ?, ?,
      ?, ?, ?, ?, ?,
      ?,
      ?, ?, ?, ?, ?, ?,
      ?,
      CURRENT_TIMESTAMP
    )
    ON CONFLICT(date) DO UPDATE SET
      energy = excluded.energy,
      focus = excluded.focus,
      mood = excluded.mood,
      sleep = excluded.sleep,
      deep_work_blocks = excluded.deep_work_blocks,
      connections = excluded.connections,
      learning = excluded.learning,
      exercise = excluded.exercise,
      has_review = excluded.has_review,
      has_refusal = excluded.has_refusal,
      has_exploration = excluded.has_exploration,
      deep_work_notes = excluded.deep_work_notes,
      deliverables = excluded.deliverables,
      deliverable_types = excluded.deliverable_types,
      late_screen = excluded.late_screen,
      excess_coffee = excluded.excess_coffee,
      no_exercise = excluded.no_exercise,
      custom_violation = excluded.custom_violation,
      custom_violation_hit = excluded.custom_violation_hit,
      distractions = excluded.distractions,
      tomorrow_task = excluded.tomorrow_task,
      tomorrow_time_slot = excluded.tomorrow_time_slot,
      tomorrow_duration = excluded.tomorrow_duration,
      tomorrow_dod = excluded.tomorrow_dod,
      tomorrow_alarm = excluded.tomorrow_alarm,
      tomorrow_notes = excluded.tomorrow_notes,
      mvp = excluded.mvp,
      updated_at = CURRENT_TIMESTAMP
  `)

  stmt.run(
    today,
    review.energy ?? 0,
    review.focus ?? 0,
    review.mood ?? 0,
    review.sleep ?? 0,
    review.deepWorkBlocks ?? 0,
    review.connections ?? 0,
    review.learning ?? 0,
    review.exercise ?? 0,
    review.hasReview ? 1 : 0,
    review.hasRefusal ? 1 : 0,
    review.hasExploration ? 1 : 0,
    review.deepWorkNotes ?? null,
    review.deliverables ?? 0,
    review.deliverableTypes ? JSON.stringify(review.deliverableTypes) : null,
    review.lateScreen ? 1 : 0,
    review.excessCoffee ? 1 : 0,
    review.noExercise ? 1 : 0,
    review.customViolation ?? null,
    review.customViolationHit ? 1 : 0,
    review.distractions ? JSON.stringify(review.distractions) : null,
    review.tomorrowTask ?? null,
    review.tomorrowTimeSlot ?? null,
    review.tomorrowDuration ?? null,
    review.tomorrowDoD ?? null,
    review.tomorrowAlarm ? 1 : 0,
    review.tomorrowNotes ?? null,
    review.mvp ?? null
  )

  return getTodayReview()!
}

// 获取历史回顾（最近N天）
export function getRecentReviews(days: number = 7): DailyReview[] {
  const rows = db.prepare(`
    SELECT * FROM daily_reviews
    ORDER BY date DESC
    LIMIT ?
  `).all(days) as any[]

  return rows.map(row => ({
    id: row.id,
    date: row.date,
    energy: row.energy,
    focus: row.focus,
    mood: row.mood,
    sleep: row.sleep,
    deepWorkBlocks: row.deep_work_blocks,
    connections: row.connections,
    learning: row.learning,
    exercise: row.exercise,
    hasReview: Boolean(row.has_review),
    hasRefusal: Boolean(row.has_refusal),
    hasExploration: Boolean(row.has_exploration),
    deepWorkNotes: row.deep_work_notes,
    deliverables: row.deliverables,
    deliverableTypes: row.deliverable_types ? JSON.parse(row.deliverable_types) : [],
    lateScreen: Boolean(row.late_screen),
    excessCoffee: Boolean(row.excess_coffee),
    noExercise: Boolean(row.no_exercise),
    customViolation: row.custom_violation,
    customViolationHit: Boolean(row.custom_violation_hit),
    distractions: row.distractions ? JSON.parse(row.distractions) : [],
    tomorrowTask: row.tomorrow_task,
    tomorrowTimeSlot: row.tomorrow_time_slot,
    tomorrowDuration: row.tomorrow_duration,
    tomorrowDoD: row.tomorrow_dod,
    tomorrowAlarm: Boolean(row.tomorrow_alarm),
    tomorrowNotes: row.tomorrow_notes,
    mvp: row.mvp,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }))
}

export default {
  getTodayReview,
  saveTodayReview,
  getRecentReviews,
  calculateScores
}
