import Database from 'better-sqlite3'
import path from 'path'

export interface MoodInfo {
  type: '开心' | '平静' | '焦虑' | '沮丧' | '愤怒'
  score: number // 1-10
}

export interface ReviewEvent {
  keyword: string
  description: string
  category: string // 工作/生活/健康/社交/情绪
  rating?: 'positive' | 'neutral' | 'negative'
  reason?: string
}

export interface DailyReview {
  id?: number
  date: string // YYYY-MM-DD

  // 用户输入
  initialInput: string
  feelingsInput?: string

  // AI 分析结果
  primaryMood?: MoodInfo
  secondaryMood?: MoodInfo
  events?: ReviewEvent[]
  aiSummary?: string

  status: 'draft' | 'analyzed' | 'completed' // 状态：草稿/已分析/已完成

  createdAt?: string
  updatedAt?: string
}

class DailyReviewsManager {
  private db: Database.Database | null = null
  private dbPath: string

  constructor() {
    this.dbPath = path.join(process.cwd(), 'data', 'daily_reviews.db')
  }

  private getDb() {
    if (!this.db) {
      const fs = require('fs')
      const dataDir = path.dirname(this.dbPath)
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true })
      }

      this.db = new Database(this.dbPath)
      this.initTables()
    }
    return this.db
  }

  private initTables() {
    const db = this.getDb()

    db.exec(`
      CREATE TABLE IF NOT EXISTS daily_reviews (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        date DATE NOT NULL UNIQUE,

        initial_input TEXT NOT NULL,
        feelings_input TEXT,

        primary_mood_type TEXT,
        primary_mood_score INTEGER,
        secondary_mood_type TEXT,
        secondary_mood_score INTEGER,

        events TEXT, -- JSON format
        ai_summary TEXT,

        status TEXT DEFAULT 'draft',

        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `)
  }

  // 获取今日回顾
  async getTodayReview(date: string): Promise<DailyReview | null> {
    const db = this.getDb()
    const row = db.prepare('SELECT * FROM daily_reviews WHERE date = ?').get(date) as any

    if (!row) {
      return null
    }

    return this.rowToReview(row)
  }

  // 创建回顾
  async createReview(data: {
    date: string
    initialInput: string
  }): Promise<number> {
    const db = this.getDb()

    const result = db.prepare(`
      INSERT INTO daily_reviews (date, initial_input, status)
      VALUES (?, ?, 'draft')
    `).run(data.date, data.initialInput)

    return result.lastInsertRowid as number
  }

  // 更新分析结果（第一次AI调用后）
  async updateAnalysis(data: {
    date: string
    primaryMood: MoodInfo
    secondaryMood?: MoodInfo
    events: ReviewEvent[]
  }): Promise<void> {
    const db = this.getDb()

    db.prepare(`
      UPDATE daily_reviews
      SET
        primary_mood_type = ?,
        primary_mood_score = ?,
        secondary_mood_type = ?,
        secondary_mood_score = ?,
        events = ?,
        status = 'analyzed',
        updated_at = CURRENT_TIMESTAMP
      WHERE date = ?
    `).run(
      data.primaryMood.type,
      data.primaryMood.score,
      data.secondaryMood?.type || null,
      data.secondaryMood?.score || null,
      JSON.stringify(data.events),
      data.date
    )
  }

  // 更新最终结果（第二次AI调用后）
  async updateFinalize(data: {
    date: string
    feelingsInput: string
    events: ReviewEvent[]
    aiSummary: string
  }): Promise<void> {
    const db = this.getDb()

    db.prepare(`
      UPDATE daily_reviews
      SET
        feelings_input = ?,
        events = ?,
        ai_summary = ?,
        status = 'completed',
        updated_at = CURRENT_TIMESTAMP
      WHERE date = ?
    `).run(
      data.feelingsInput,
      JSON.stringify(data.events),
      data.aiSummary,
      data.date
    )
  }

  // 删除回顾
  async deleteReview(date: string): Promise<void> {
    const db = this.getDb()
    db.prepare('DELETE FROM daily_reviews WHERE date = ?').run(date)
  }

  // 获取某月所有已完成回顾的日期
  async getCompletedDatesInMonth(year: number, month: number): Promise<string[]> {
    const db = this.getDb()

    // month 是 1-12，转换为两位数字符串
    const monthStr = month.toString().padStart(2, '0')
    const startDate = `${year}-${monthStr}-01`
    const endDate = `${year}-${monthStr}-31`

    const rows = db.prepare(`
      SELECT date FROM daily_reviews
      WHERE date >= ? AND date <= ? AND status = 'completed'
      ORDER BY date
    `).all(startDate, endDate) as any[]

    return rows.map(row => row.date)
  }

  // 辅助方法：将数据库行转换为 DailyReview 对象
  private rowToReview(row: any): DailyReview {
    const review: DailyReview = {
      id: row.id,
      date: row.date,
      initialInput: row.initial_input,
      feelingsInput: row.feelings_input,
      status: row.status,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }

    if (row.primary_mood_type) {
      review.primaryMood = {
        type: row.primary_mood_type,
        score: row.primary_mood_score
      }
    }

    if (row.secondary_mood_type) {
      review.secondaryMood = {
        type: row.secondary_mood_type,
        score: row.secondary_mood_score
      }
    }

    if (row.events) {
      try {
        review.events = JSON.parse(row.events)
      } catch (e) {
        review.events = []
      }
    }

    if (row.ai_summary) {
      review.aiSummary = row.ai_summary
    }

    return review
  }

  close() {
    if (this.db) {
      this.db.close()
      this.db = null
    }
  }
}

const dailyReviewsManager = new DailyReviewsManager()

export default dailyReviewsManager