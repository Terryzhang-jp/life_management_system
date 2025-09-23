import Database from 'better-sqlite3'
import path from 'path'

// 纠结纠结记录接口
export interface ConcernRecord {
  id?: number
  concern: string
  status: 'pending' | 'resolved'  // pending-未解决, resolved-已解决
  createdAt: string
  resolvedAt?: string
  updatedAt: string
}

class ConcernsDbManager {
  private db: Database.Database | null = null
  private dbPath: string

  constructor() {
    this.dbPath = path.join(process.cwd(), 'data', 'concerns.db')
  }

  private getDb() {
    if (!this.db) {
      const fs = require('fs')
      const dataDir = path.dirname(this.dbPath)
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true })
      }

      this.db = new Database(this.dbPath)
      this.initDatabase()
    }
    return this.db
  }

  // 初始化数据库表
  private initDatabase() {
    const db = this.getDb()

    // 备份旧表数据（如果存在）
    const tableExists = db.prepare(`
      SELECT name FROM sqlite_master
      WHERE type='table' AND name='concerns'
    `).get()

    if (tableExists) {
      // 检查是否有旧表结构
      const columns = db.prepare(`PRAGMA table_info(concerns)`).all() as any[]
      const hasStatusColumn = columns.some((col: any) => col.name === 'status')

      if (!hasStatusColumn) {
        // 旧表结构，需要迁移
        db.exec(`ALTER TABLE concerns RENAME TO concerns_old`)

        // 创建新表
        db.exec(`
          CREATE TABLE concerns (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            concern TEXT NOT NULL,
            status TEXT DEFAULT 'pending',
            createdAt TEXT NOT NULL,
            resolvedAt TEXT,
            updatedAt TEXT NOT NULL
          )
        `)

        // 迁移数据
        const now = new Date().toISOString()
        db.exec(`
          INSERT INTO concerns (concern, status, createdAt, updatedAt)
          SELECT content, 'pending', created_at, '${now}'
          FROM concerns_old
        `)

        // 删除旧表
        db.exec(`DROP TABLE concerns_old`)
      }
    } else {
      // 创建新表
      db.exec(`
        CREATE TABLE IF NOT EXISTS concerns (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          concern TEXT NOT NULL,
          status TEXT DEFAULT 'pending',
          createdAt TEXT NOT NULL,
          resolvedAt TEXT,
          updatedAt TEXT NOT NULL
        )
      `)
    }
  }

  // 获取未解决的纠结（最多3条）
  getActiveConcerns(): ConcernRecord[] {
    const db = this.getDb()
    const stmt = db.prepare(`
      SELECT * FROM concerns
      WHERE status = 'pending'
      ORDER BY createdAt DESC
      LIMIT 3
    `)
    return stmt.all() as ConcernRecord[]
  }

  // 获取历史记录（已解决的纠结）
  getResolvedConcerns(limit: number = 50): ConcernRecord[] {
    const db = this.getDb()
    const stmt = db.prepare(`
      SELECT * FROM concerns
      WHERE status = 'resolved'
      ORDER BY resolvedAt DESC
      LIMIT ?
    `)
    return stmt.all(limit) as ConcernRecord[]
  }

  // 添加新的纠结
  addConcern(concern: string): number {
    const db = this.getDb()
    const now = new Date().toISOString()
    const stmt = db.prepare(`
      INSERT INTO concerns (concern, status, createdAt, updatedAt)
      VALUES (?, 'pending', ?, ?)
    `)

    const result = stmt.run(concern, now, now)
    return Number(result.lastInsertRowid)
  }

  // 更新纠结内容
  updateConcern(id: number, concern: string): void {
    const db = this.getDb()
    const stmt = db.prepare(`
      UPDATE concerns
      SET concern = ?, updatedAt = ?
      WHERE id = ?
    `)
    stmt.run(concern, new Date().toISOString(), id)
  }

  // 标记纠结为已解决
  resolveConcern(id: number): void {
    const db = this.getDb()
    const now = new Date().toISOString()
    const stmt = db.prepare(`
      UPDATE concerns
      SET status = 'resolved', resolvedAt = ?, updatedAt = ?
      WHERE id = ?
    `)
    stmt.run(now, now, id)
  }

  // 恢复已解决的纠结为未解决
  unresolveConcern(id: number): void {
    const db = this.getDb()
    const stmt = db.prepare(`
      UPDATE concerns
      SET status = 'pending', resolvedAt = NULL, updatedAt = ?
      WHERE id = ?
    `)
    stmt.run(new Date().toISOString(), id)
  }

  // 删除纠结（彻底删除）
  deleteConcern(id: number): void {
    const db = this.getDb()
    db.prepare('DELETE FROM concerns WHERE id = ?').run(id)
  }

  // 获取单个纠结
  getConcern(id: number): ConcernRecord | undefined {
    const db = this.getDb()
    const stmt = db.prepare('SELECT * FROM concerns WHERE id = ?')
    return stmt.get(id) as ConcernRecord | undefined
  }

  // 获取统计信息
  getStats(): { active: number; resolved: number; total: number } {
    const db = this.getDb()
    const activeStmt = db.prepare(`SELECT COUNT(*) as count FROM concerns WHERE status = 'pending'`)
    const resolvedStmt = db.prepare(`SELECT COUNT(*) as count FROM concerns WHERE status = 'resolved'`)
    const totalStmt = db.prepare(`SELECT COUNT(*) as count FROM concerns`)

    const active = (activeStmt.get() as { count: number }).count
    const resolved = (resolvedStmt.get() as { count: number }).count
    const total = (totalStmt.get() as { count: number }).count

    return { active, resolved, total }
  }

  // 检查是否已达到3条未解决纠结的限制
  hasReachedLimit(): boolean {
    const db = this.getDb()
    const stmt = db.prepare(`
      SELECT COUNT(*) as count FROM concerns WHERE status = 'pending'
    `)
    const result = stmt.get() as { count: number }
    return result.count >= 3
  }

  close() {
    if (this.db) {
      this.db.close()
      this.db = null
    }
  }
}

// 导出单例
const concernsDbManager = new ConcernsDbManager()
export default concernsDbManager