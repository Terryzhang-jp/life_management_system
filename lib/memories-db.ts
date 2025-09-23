import Database from 'better-sqlite3'
import path from 'path'

// 记忆记录接口
export interface MemoryRecord {
  id?: number
  title?: string
  description?: string
  location?: string
  datetime: string  // ISO格式时间
  photos: string[]  // 照片路径数组
  isPinned: boolean // 是否置顶
  createdAt?: string
  updatedAt?: string
}

class MemoriesDbManager {
  private db: Database.Database | null = null
  private dbPath: string

  constructor() {
    this.dbPath = path.join(process.cwd(), 'data', 'memories.db')
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

    // 创建记忆记录表
    db.exec(`
      CREATE TABLE IF NOT EXISTS memories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT,
        description TEXT,
        location TEXT,
        datetime TEXT NOT NULL,
        photos TEXT,  -- JSON字符串存储照片路径数组
        isPinned INTEGER DEFAULT 0,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL
      )
    `)
  }

  // 获取所有记忆（按置顶和时间排序）
  getAllMemories(): MemoryRecord[] {
    const db = this.getDb()
    const stmt = db.prepare(`
      SELECT * FROM memories
      ORDER BY isPinned DESC, datetime DESC
    `)
    const rows = stmt.all() as any[]

    return rows.map(row => ({
      id: row.id,
      title: row.title,
      description: row.description,
      location: row.location,
      datetime: row.datetime,
      photos: row.photos ? JSON.parse(row.photos) : [],
      isPinned: Boolean(row.isPinned),
      createdAt: row.createdAt,
      updatedAt: row.updatedAt
    }))
  }

  // 获取置顶记忆
  getPinnedMemories(): MemoryRecord[] {
    const db = this.getDb()
    const stmt = db.prepare(`
      SELECT * FROM memories
      WHERE isPinned = 1
      ORDER BY datetime DESC
    `)
    const rows = stmt.all() as any[]

    return rows.map(row => ({
      id: row.id,
      title: row.title,
      description: row.description,
      location: row.location,
      datetime: row.datetime,
      photos: row.photos ? JSON.parse(row.photos) : [],
      isPinned: Boolean(row.isPinned),
      createdAt: row.createdAt,
      updatedAt: row.updatedAt
    }))
  }

  // 添加新记忆
  addMemory(memory: Omit<MemoryRecord, 'id' | 'createdAt' | 'updatedAt'>): number {
    const db = this.getDb()
    const now = new Date().toISOString()

    const stmt = db.prepare(`
      INSERT INTO memories (title, description, location, datetime, photos, isPinned, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `)

    const result = stmt.run(
      memory.title || null,
      memory.description || null,
      memory.location || null,
      memory.datetime,
      JSON.stringify(memory.photos),
      memory.isPinned ? 1 : 0,
      now,
      now
    )

    return Number(result.lastInsertRowid)
  }

  // 更新记忆
  updateMemory(id: number, memory: Partial<Omit<MemoryRecord, 'id' | 'createdAt' | 'updatedAt'>>): void {
    const db = this.getDb()
    const now = new Date().toISOString()

    const fields = []
    const values = []

    if (memory.title !== undefined) {
      fields.push('title = ?')
      values.push(memory.title)
    }
    if (memory.description !== undefined) {
      fields.push('description = ?')
      values.push(memory.description)
    }
    if (memory.location !== undefined) {
      fields.push('location = ?')
      values.push(memory.location)
    }
    if (memory.datetime !== undefined) {
      fields.push('datetime = ?')
      values.push(memory.datetime)
    }
    if (memory.photos !== undefined) {
      fields.push('photos = ?')
      values.push(JSON.stringify(memory.photos))
    }
    if (memory.isPinned !== undefined) {
      fields.push('isPinned = ?')
      values.push(memory.isPinned ? 1 : 0)
    }

    fields.push('updatedAt = ?')
    values.push(now, id)

    const stmt = db.prepare(`
      UPDATE memories
      SET ${fields.join(', ')}
      WHERE id = ?
    `)

    stmt.run(...values)
  }

  // 切换置顶状态
  togglePin(id: number): void {
    const db = this.getDb()
    const now = new Date().toISOString()

    const stmt = db.prepare(`
      UPDATE memories
      SET isPinned = CASE WHEN isPinned = 1 THEN 0 ELSE 1 END,
          updatedAt = ?
      WHERE id = ?
    `)

    stmt.run(now, id)
  }

  // 删除记忆
  deleteMemory(id: number): void {
    const db = this.getDb()
    db.prepare('DELETE FROM memories WHERE id = ?').run(id)
  }

  // 获取单个记忆
  getMemory(id: number): MemoryRecord | undefined {
    const db = this.getDb()
    const stmt = db.prepare('SELECT * FROM memories WHERE id = ?')
    const row = stmt.get(id) as any

    if (!row) return undefined

    return {
      id: row.id,
      title: row.title,
      description: row.description,
      location: row.location,
      datetime: row.datetime,
      photos: row.photos ? JSON.parse(row.photos) : [],
      isPinned: Boolean(row.isPinned),
      createdAt: row.createdAt,
      updatedAt: row.updatedAt
    }
  }

  // 按日期范围查询
  getMemoriesByDateRange(startDate: string, endDate: string): MemoryRecord[] {
    const db = this.getDb()
    const stmt = db.prepare(`
      SELECT * FROM memories
      WHERE date(datetime) BETWEEN date(?) AND date(?)
      ORDER BY isPinned DESC, datetime DESC
    `)
    const rows = stmt.all(startDate, endDate) as any[]

    return rows.map(row => ({
      id: row.id,
      title: row.title,
      description: row.description,
      location: row.location,
      datetime: row.datetime,
      photos: row.photos ? JSON.parse(row.photos) : [],
      isPinned: Boolean(row.isPinned),
      createdAt: row.createdAt,
      updatedAt: row.updatedAt
    }))
  }

  close() {
    if (this.db) {
      this.db.close()
      this.db = null
    }
  }
}

// 导出单例
const memoriesDbManager = new MemoriesDbManager()
export default memoriesDbManager