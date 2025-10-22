import Database from 'better-sqlite3'
import path from 'path'

export interface Vision {
  id?: number
  title: string           // 愿景标题
  description?: string    // 愿景描述（为什么重要？）
  createdAt?: string
  updatedAt?: string
}

class VisionsDatabaseManager {
  private db: Database.Database | null = null
  private dbPath: string

  constructor() {
    this.dbPath = path.join(process.cwd(), 'data', 'quests.db')
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

    // 创建Visions表
    db.exec(`
      CREATE TABLE IF NOT EXISTS visions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        description TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `)
  }

  // 获取所有Visions
  async getAllVisions(): Promise<Vision[]> {
    const db = this.getDb()
    const rows = db.prepare('SELECT * FROM visions ORDER BY created_at DESC').all() as any[]

    return rows.map(row => ({
      id: row.id,
      title: row.title,
      description: row.description || '',
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }))
  }

  // 添加Vision
  async addVision(vision: Omit<Vision, 'id' | 'createdAt' | 'updatedAt'>): Promise<number> {
    const db = this.getDb()
    const result = db.prepare(`
      INSERT INTO visions (title, description)
      VALUES (?, ?)
    `).run(
      vision.title.trim(),
      vision.description?.trim() || ''
    )

    return result.lastInsertRowid as number
  }

  // 更新Vision
  async updateVision(id: number, vision: Partial<Omit<Vision, 'id' | 'createdAt' | 'updatedAt'>>): Promise<void> {
    const db = this.getDb()

    const updates: string[] = []
    const values: any[] = []

    if (vision.title !== undefined) {
      updates.push('title = ?')
      values.push(vision.title.trim())
    }
    if (vision.description !== undefined) {
      updates.push('description = ?')
      values.push(vision.description.trim())
    }

    if (updates.length > 0) {
      updates.push('updated_at = CURRENT_TIMESTAMP')
      values.push(id)

      db.prepare(`
        UPDATE visions
        SET ${updates.join(', ')}
        WHERE id = ?
      `).run(...values)
    }
  }

  // 删除Vision
  async deleteVision(id: number): Promise<void> {
    const db = this.getDb()
    // 级联删除会由数据库外键约束处理（在quests表中设置）
    db.prepare('DELETE FROM visions WHERE id = ?').run(id)
  }

  close() {
    if (this.db) {
      this.db.close()
      this.db = null
    }
  }
}

const visionsDbManager = new VisionsDatabaseManager()

export default visionsDbManager
