import Database from 'better-sqlite3'
import path from 'path'

export interface LifeData {
  id?: number
  topLogic: string
  roles: string[]
  behaviors: string[]
  wants: string[]
  dontWants: string[]
  qualities: string[]
  createdAt?: string
  updatedAt?: string
}

class DatabaseManager {
  private db: Database.Database | null = null
  private dbPath: string

  constructor() {
    this.dbPath = path.join(process.cwd(), 'data', 'life.db')
  }

  private getDb() {
    if (!this.db) {
      // 确保 data 目录存在
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

    // 创建主表
    db.exec(`
      CREATE TABLE IF NOT EXISTS life_data (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        top_logic TEXT DEFAULT '',
        roles TEXT DEFAULT '[]',
        behaviors TEXT DEFAULT '[]',
        wants TEXT DEFAULT '[]',
        dont_wants TEXT DEFAULT '[]',
        qualities TEXT DEFAULT '[]',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `)

    // 检查是否有数据，如果没有则插入默认记录
    const count = db.prepare('SELECT COUNT(*) as count FROM life_data').get() as { count: number }
    if (count.count === 0) {
      db.prepare(`
        INSERT INTO life_data (top_logic, roles, behaviors, wants, dont_wants, qualities)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run('', '[]', '[]', '[]', '[]', '[]')
    }
  }

  async getData(): Promise<LifeData> {
    const db = this.getDb()
    const row = db.prepare('SELECT * FROM life_data ORDER BY id DESC LIMIT 1').get() as any

    if (!row) {
      return {
        topLogic: '',
        roles: [],
        behaviors: [],
        wants: [],
        dontWants: [],
        qualities: []
      }
    }

    return {
      id: row.id,
      topLogic: row.top_logic || '',
      roles: JSON.parse(row.roles || '[]'),
      behaviors: JSON.parse(row.behaviors || '[]'),
      wants: JSON.parse(row.wants || '[]'),
      dontWants: JSON.parse(row.dont_wants || '[]'),
      qualities: JSON.parse(row.qualities || '[]'),
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }
  }

  async saveData(data: Omit<LifeData, 'id' | 'createdAt' | 'updatedAt'>): Promise<void> {
    const db = this.getDb()

    // 更新最新的记录
    const updateStmt = db.prepare(`
      UPDATE life_data
      SET top_logic = ?,
          roles = ?,
          behaviors = ?,
          wants = ?,
          dont_wants = ?,
          qualities = ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = (SELECT MAX(id) FROM life_data)
    `)

    updateStmt.run(
      data.topLogic,
      JSON.stringify(data.roles),
      JSON.stringify(data.behaviors),
      JSON.stringify(data.wants),
      JSON.stringify(data.dontWants),
      JSON.stringify(data.qualities)
    )
  }

  async exportData(): Promise<LifeData> {
    return this.getData()
  }

  async importData(data: Omit<LifeData, 'id' | 'createdAt' | 'updatedAt'>): Promise<void> {
    return this.saveData(data)
  }

  close() {
    if (this.db) {
      this.db.close()
      this.db = null
    }
  }
}

// 单例实例
const dbManager = new DatabaseManager()

export default dbManager