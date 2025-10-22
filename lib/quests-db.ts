import Database from 'better-sqlite3'
import path from 'path'

export interface Quest {
  id?: number
  visionId: number
  type: 'main' | 'side'      // 主线 vs 支线
  title: string              // Quest标题
  why: string                // 为什么要做这个？
  status: 'active' | 'paused' | 'completed' | 'abandoned'
  lastActivityAt?: string    // 最后活动时间
  targetDate?: string        // 目标完成日期
  createdAt?: string
  updatedAt?: string
}

class QuestsDatabaseManager {
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

    // 创建Quests表
    db.exec(`
      CREATE TABLE IF NOT EXISTS quests (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        vision_id INTEGER NOT NULL,
        type TEXT NOT NULL DEFAULT 'main',
        title TEXT NOT NULL,
        why TEXT NOT NULL,
        status TEXT DEFAULT 'active',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (vision_id) REFERENCES visions(id) ON DELETE CASCADE
      )
    `)

    // 创建索引
    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_quests_vision ON quests(vision_id)
    `)

    // 扩展字段：添加进度追踪字段（如果不存在）
    const columns = db.prepare("PRAGMA table_info(quests)").all() as any[]
    const columnNames = columns.map(col => col.name)

    if (!columnNames.includes('last_activity_at')) {
      console.log('[QuestsDB] Adding last_activity_at column')
      db.exec('ALTER TABLE quests ADD COLUMN last_activity_at DATETIME')
    }

    if (!columnNames.includes('target_date')) {
      console.log('[QuestsDB] Adding target_date column')
      db.exec('ALTER TABLE quests ADD COLUMN target_date DATE')
    }

    // 创建quest_activities表（活动日志）
    db.exec(`
      CREATE TABLE IF NOT EXISTS quest_activities (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        quest_id INTEGER NOT NULL,
        milestone_id INTEGER,
        checkpoint_id INTEGER,
        activity_type TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (quest_id) REFERENCES quests(id) ON DELETE CASCADE,
        FOREIGN KEY (milestone_id) REFERENCES milestones(id) ON DELETE CASCADE,
        FOREIGN KEY (checkpoint_id) REFERENCES checkpoints(id) ON DELETE CASCADE
      )
    `)

    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_activities_quest ON quest_activities(quest_id);
      CREATE INDEX IF NOT EXISTS idx_activities_created ON quest_activities(created_at);
    `)
  }

  // 获取所有Quests
  async getAllQuests(): Promise<Quest[]> {
    const db = this.getDb()
    const rows = db.prepare('SELECT * FROM quests ORDER BY created_at DESC').all() as any[]

    return rows.map(row => this.mapRowToQuest(row))
  }

  // 辅助方法：将数据库行映射到Quest对象
  private mapRowToQuest(row: any): Quest {
    return {
      id: row.id,
      visionId: row.vision_id,
      type: row.type as 'main' | 'side',
      title: row.title,
      why: row.why,
      status: row.status as Quest['status'],
      lastActivityAt: row.last_activity_at || undefined,
      targetDate: row.target_date || undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }
  }

  // 获取指定Vision的Quests
  async getQuestsByVision(visionId: number): Promise<Quest[]> {
    const db = this.getDb()
    const rows = db.prepare('SELECT * FROM quests WHERE vision_id = ? ORDER BY created_at DESC').all(visionId) as any[]

    return rows.map(row => this.mapRowToQuest(row))
  }

  // 获取单个Quest
  async getQuest(id: number): Promise<Quest | null> {
    const db = this.getDb()
    const row = db.prepare('SELECT * FROM quests WHERE id = ?').get(id) as any

    if (!row) return null

    return this.mapRowToQuest(row)
  }

  // 添加Quest
  async addQuest(quest: Omit<Quest, 'id' | 'createdAt' | 'updatedAt'>): Promise<number> {
    const db = this.getDb()
    const result = db.prepare(`
      INSERT INTO quests (vision_id, type, title, why, status)
      VALUES (?, ?, ?, ?, ?)
    `).run(
      quest.visionId,
      quest.type,
      quest.title.trim(),
      quest.why.trim(),
      quest.status || 'active'
    )

    return result.lastInsertRowid as number
  }

  // 更新Quest
  async updateQuest(id: number, quest: Partial<Omit<Quest, 'id' | 'visionId' | 'createdAt' | 'updatedAt'>>): Promise<void> {
    const db = this.getDb()

    const updates: string[] = []
    const values: any[] = []

    if (quest.type !== undefined) {
      updates.push('type = ?')
      values.push(quest.type)
    }
    if (quest.title !== undefined) {
      updates.push('title = ?')
      values.push(quest.title.trim())
    }
    if (quest.why !== undefined) {
      updates.push('why = ?')
      values.push(quest.why.trim())
    }
    if (quest.status !== undefined) {
      updates.push('status = ?')
      values.push(quest.status)
    }

    if (updates.length > 0) {
      updates.push('updated_at = CURRENT_TIMESTAMP')
      values.push(id)

      db.prepare(`
        UPDATE quests
        SET ${updates.join(', ')}
        WHERE id = ?
      `).run(...values)
    }
  }

  // 删除Quest
  async deleteQuest(id: number): Promise<void> {
    const db = this.getDb()
    // 级联删除会由数据库外键约束处理（milestones会自动删除）
    db.prepare('DELETE FROM quests WHERE id = ?').run(id)
  }

  // 更新最后活动时间
  async updateLastActivity(id: number): Promise<void> {
    const db = this.getDb()
    db.prepare(`
      UPDATE quests
      SET last_activity_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(id)
  }

  close() {
    if (this.db) {
      this.db.close()
      this.db = null
    }
  }
}

const questsDbManager = new QuestsDatabaseManager()

export default questsDbManager
