import Database from 'better-sqlite3'
import path from 'path'

export interface Thought {
  id?: number
  content: string
  createdAt?: string
  page?: string  // 记录时所在的页面
}

class ThoughtsDatabaseManager {
  private db: Database.Database | null = null
  private dbPath: string

  constructor() {
    this.dbPath = path.join(process.cwd(), 'data', 'thoughts.db')
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

    // 创建思考记录表
    db.exec(`
      CREATE TABLE IF NOT EXISTS thoughts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        content TEXT NOT NULL,
        page TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `)
  }

  // 添加思考记录
  async addThought(content: string, page?: string): Promise<number> {
    const db = this.getDb()
    const result = db.prepare(`
      INSERT INTO thoughts (content, page)
      VALUES (?, ?)
    `).run(content.trim(), page || '')

    return result.lastInsertRowid as number
  }

  // 获取所有思考记录
  async getAllThoughts(): Promise<Thought[]> {
    const db = this.getDb()
    const rows = db.prepare('SELECT * FROM thoughts ORDER BY created_at DESC').all() as any[]

    return rows.map(row => ({
      id: row.id,
      content: row.content,
      page: row.page || '',
      createdAt: row.created_at
    }))
  }

  // 删除思考记录
  async deleteThought(id: number): Promise<void> {
    const db = this.getDb()
    db.prepare('DELETE FROM thoughts WHERE id = ?').run(id)
  }

  // 更新思考记录
  async updateThought(id: number, content: string): Promise<void> {
    const db = this.getDb()
    db.prepare('UPDATE thoughts SET content = ? WHERE id = ?').run(content.trim(), id)
  }

  close() {
    if (this.db) {
      this.db.close()
      this.db = null
    }
  }
}

const thoughtsDbManager = new ThoughtsDatabaseManager()

export default thoughtsDbManager