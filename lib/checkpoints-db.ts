import Database from 'better-sqlite3'
import path from 'path'

export interface Checkpoint {
  id?: number
  milestoneId: number
  title: string                    // Checkpoint标题
  description?: string             // Checkpoint描述
  isCompleted: boolean
  completedAt?: string
  progress?: number                // 进度百分比 (0-100)
  orderIndex?: number
  createdAt?: string
  updatedAt?: string
}

class CheckpointsDatabaseManager {
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

    // 创建Checkpoints表
    db.exec(`
      CREATE TABLE IF NOT EXISTS checkpoints (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        milestone_id INTEGER NOT NULL,
        title TEXT NOT NULL,
        description TEXT,
        is_completed BOOLEAN DEFAULT 0,
        completed_at DATETIME,
        order_index INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (milestone_id) REFERENCES milestones(id) ON DELETE CASCADE
      )
    `)

    // 创建索引
    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_checkpoints_milestone ON checkpoints(milestone_id)
    `)
  }

  // 获取指定Milestone的所有Checkpoints
  async getCheckpointsByMilestone(milestoneId: number): Promise<Checkpoint[]> {
    const db = this.getDb()
    const rows = db.prepare(`
      SELECT * FROM checkpoints
      WHERE milestone_id = ?
      ORDER BY order_index ASC, created_at ASC
    `).all(milestoneId) as any[]

    return rows.map(row => ({
      id: row.id,
      milestoneId: row.milestone_id,
      title: row.title,
      description: row.description || undefined,
      isCompleted: Boolean(row.is_completed),
      completedAt: row.completed_at || undefined,
      progress: row.progress !== undefined ? row.progress : 0,
      orderIndex: row.order_index || undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }))
  }

  // 添加Checkpoint
  async addCheckpoint(checkpoint: Omit<Checkpoint, 'id' | 'createdAt' | 'updatedAt'>): Promise<number> {
    const db = this.getDb()
    const result = db.prepare(`
      INSERT INTO checkpoints (
        milestone_id, title, description, is_completed, order_index
      ) VALUES (?, ?, ?, ?, ?)
    `).run(
      checkpoint.milestoneId,
      checkpoint.title.trim(),
      checkpoint.description?.trim() || null,
      checkpoint.isCompleted ? 1 : 0,
      checkpoint.orderIndex || null
    )

    return result.lastInsertRowid as number
  }

  // 更新Checkpoint
  async updateCheckpoint(id: number, checkpoint: Partial<Omit<Checkpoint, 'id' | 'milestoneId' | 'createdAt' | 'updatedAt'>>): Promise<void> {
    const db = this.getDb()

    const updates: string[] = []
    const values: any[] = []

    if (checkpoint.title !== undefined) {
      updates.push('title = ?')
      values.push(checkpoint.title.trim())
    }
    if (checkpoint.description !== undefined) {
      updates.push('description = ?')
      values.push(checkpoint.description?.trim() || null)
    }
    if (checkpoint.isCompleted !== undefined) {
      updates.push('is_completed = ?')
      values.push(checkpoint.isCompleted ? 1 : 0)

      // 如果设置为完成，同时设置completed_at
      if (checkpoint.isCompleted) {
        updates.push('completed_at = CURRENT_TIMESTAMP')
      } else {
        updates.push('completed_at = NULL')
      }
    }
    if (checkpoint.orderIndex !== undefined) {
      updates.push('order_index = ?')
      values.push(checkpoint.orderIndex)
    }

    if (updates.length > 0) {
      updates.push('updated_at = CURRENT_TIMESTAMP')
      values.push(id)

      db.prepare(`
        UPDATE checkpoints
        SET ${updates.join(', ')}
        WHERE id = ?
      `).run(...values)
    }
  }

  // 删除Checkpoint
  async deleteCheckpoint(id: number): Promise<void> {
    const db = this.getDb()
    db.prepare('DELETE FROM checkpoints WHERE id = ?').run(id)
  }

  close() {
    if (this.db) {
      this.db.close()
      this.db = null
    }
  }
}

const checkpointsDbManager = new CheckpointsDatabaseManager()

export default checkpointsDbManager
