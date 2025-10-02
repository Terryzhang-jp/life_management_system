import Database from 'better-sqlite3'
import path from 'path'

export interface Aspiration {
  id?: number
  title: string           // 心愿标题
  description?: string    // 为什么想做这个
  tags?: string[]         // 标签（JSON存储）
  createdAt?: string
  updatedAt?: string
}

class AspirationsDatabaseManager {
  private db: Database.Database | null = null
  private dbPath: string

  constructor() {
    this.dbPath = path.join(process.cwd(), 'data', 'aspirations.db')
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

    // 创建心愿表
    db.exec(`
      CREATE TABLE IF NOT EXISTS aspirations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        description TEXT,
        tags TEXT DEFAULT '[]',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `)
  }

  // 获取所有心愿
  async getAllAspirations(): Promise<Aspiration[]> {
    const db = this.getDb()
    const rows = db.prepare('SELECT * FROM aspirations ORDER BY created_at DESC').all() as any[]

    return rows.map(row => ({
      id: row.id,
      title: row.title,
      description: row.description || '',
      tags: JSON.parse(row.tags || '[]'),
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }))
  }

  // 添加心愿
  async addAspiration(aspiration: Omit<Aspiration, 'id' | 'createdAt' | 'updatedAt'>): Promise<number> {
    const db = this.getDb()
    const result = db.prepare(`
      INSERT INTO aspirations (title, description, tags)
      VALUES (?, ?, ?)
    `).run(
      aspiration.title.trim(),
      aspiration.description?.trim() || '',
      JSON.stringify(aspiration.tags || [])
    )

    return result.lastInsertRowid as number
  }

  // 更新心愿
  async updateAspiration(id: number, aspiration: Partial<Omit<Aspiration, 'id' | 'createdAt' | 'updatedAt'>>): Promise<void> {
    const db = this.getDb()

    const updates: string[] = []
    const values: any[] = []

    if (aspiration.title !== undefined) {
      updates.push('title = ?')
      values.push(aspiration.title.trim())
    }
    if (aspiration.description !== undefined) {
      updates.push('description = ?')
      values.push(aspiration.description.trim())
    }
    if (aspiration.tags !== undefined) {
      updates.push('tags = ?')
      values.push(JSON.stringify(aspiration.tags))
    }

    if (updates.length > 0) {
      updates.push('updated_at = CURRENT_TIMESTAMP')
      values.push(id)

      db.prepare(`
        UPDATE aspirations
        SET ${updates.join(', ')}
        WHERE id = ?
      `).run(...values)
    }
  }

  // 删除心愿
  async deleteAspiration(id: number): Promise<void> {
    const db = this.getDb()
    db.prepare('DELETE FROM aspirations WHERE id = ?').run(id)
  }

  close() {
    if (this.db) {
      this.db.close()
      this.db = null
    }
  }
}

const aspirationsDbManager = new AspirationsDatabaseManager()

export default aspirationsDbManager
