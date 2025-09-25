import Database from 'better-sqlite3'
import path from 'path'
import { getLocalDateString } from './date-utils'

export interface DailyDecision {
  id?: number
  decision: string
  date: string          // YYYY-MM-DD
  status: 'pending' | 'completed' | 'delayed'  // 决策状态
  createdAt?: string
  updatedAt?: string
}

export interface DecisionRefreshLog {
  date: string          // YYYY-MM-DD
  refreshedAt?: string  // 刷新时间
}

class DecisionsDatabaseManager {
  private db: Database.Database | null = null
  private dbPath: string

  constructor() {
    this.dbPath = path.join(process.cwd(), 'data', 'decisions.db')
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

    // 创建每日决策表
    db.exec(`
      CREATE TABLE IF NOT EXISTS daily_decisions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        decision TEXT NOT NULL,
        date DATE NOT NULL,
        status TEXT DEFAULT 'pending',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `)

    // 创建决策刷新日志表
    db.exec(`
      CREATE TABLE IF NOT EXISTS decision_refresh_log (
        date DATE PRIMARY KEY,
        refreshed_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `)

    // 为现有记录添加status字段（如果不存在）
    try {
      db.exec('ALTER TABLE daily_decisions ADD COLUMN status TEXT DEFAULT \'pending\'')
    } catch (error) {
      // 字段可能已存在，忽略错误
    }

    // 创建索引
    try {
      db.exec('CREATE INDEX IF NOT EXISTS idx_daily_decisions_date ON daily_decisions(date)')
      db.exec('CREATE INDEX IF NOT EXISTS idx_daily_decisions_status ON daily_decisions(status)')
    } catch (error) {
      console.log('Index creation error:', error)
    }
  }

  // 添加决策
  async addDecision(decision: Omit<DailyDecision, 'id' | 'createdAt' | 'updatedAt'>): Promise<number> {
    const db = this.getDb()
    const result = db.prepare(`
      INSERT INTO daily_decisions (decision, date, status)
      VALUES (?, ?, ?)
    `).run(decision.decision, decision.date, decision.status || 'pending')

    return result.lastInsertRowid as number
  }

  // 获取某日的决策
  async getDecisionsByDate(date: string): Promise<DailyDecision[]> {
    const db = this.getDb()
    const rows = db.prepare(`
      SELECT * FROM daily_decisions
      WHERE date = ?
      ORDER BY created_at ASC
    `).all(date) as any[]

    return rows.map(row => ({
      id: row.id,
      decision: row.decision,
      date: row.date,
      status: row.status || 'pending',
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }))
  }

  // 获取延期决策
  async getDelayedDecisions(): Promise<DailyDecision[]> {
    const db = this.getDb()
    const rows = db.prepare(`
      SELECT * FROM daily_decisions
      WHERE status = 'delayed'
      ORDER BY date DESC, created_at ASC
    `).all() as any[]

    return rows.map(row => ({
      id: row.id,
      decision: row.decision,
      date: row.date,
      status: row.status,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }))
  }

  // 获取今日决策
  async getTodayDecisions(): Promise<DailyDecision[]> {
    const today = getLocalDateString()
    return this.getDecisionsByDate(today)
  }

  // 更新决策
  async updateDecision(id: number, decision: string): Promise<void> {
    const db = this.getDb()
    db.prepare(`
      UPDATE daily_decisions
      SET decision = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(decision, id)
  }

  // 更新决策状态
  async updateDecisionStatus(id: number, status: 'pending' | 'completed' | 'delayed'): Promise<void> {
    const db = this.getDb()
    db.prepare(`
      UPDATE daily_decisions
      SET status = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(status, id)
  }

  // 删除决策
  async deleteDecision(id: number): Promise<void> {
    const db = this.getDb()
    db.prepare('DELETE FROM daily_decisions WHERE id = ?').run(id)
  }

  // 刷新日志相关方法

  // 记录刷新日志
  async logRefresh(date: string): Promise<void> {
    const db = this.getDb()
    db.prepare(`
      INSERT OR REPLACE INTO decision_refresh_log (date)
      VALUES (?)
    `).run(date)
  }

  // 检查是否已刷新
  async isAlreadyRefreshed(date: string): Promise<boolean> {
    const db = this.getDb()
    const result = db.prepare(`
      SELECT COUNT(*) as count FROM decision_refresh_log
      WHERE date = ?
    `).get(date) as any

    return result.count > 0
  }

  // 自动刷新：将过期pending决策转为delayed
  async refreshExpiredDecisions(date: string): Promise<{ processedCount: number }> {
    const db = this.getDb()

    // 将昨日及之前的pending决策转为delayed
    const result = db.prepare(`
      UPDATE daily_decisions
      SET status = 'delayed', updated_at = CURRENT_TIMESTAMP
      WHERE date < ? AND status = 'pending'
    `).run(date)

    // 记录刷新日志
    await this.logRefresh(date)

    return { processedCount: result.changes }
  }

  close() {
    if (this.db) {
      this.db.close()
      this.db = null
    }
  }
}

const decisionsDbManager = new DecisionsDatabaseManager()

export default decisionsDbManager
