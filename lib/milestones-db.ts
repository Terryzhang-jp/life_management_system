import Database from 'better-sqlite3'
import path from 'path'

export interface Milestone {
  id?: number
  questId: number
  title: string                    // Milestone标题
  completionCriteria: string       // 完成标准（What）
  why?: string                     // 为什么这个milestone重要？
  status: 'current' | 'next' | 'future' | 'completed'

  // 完成信息（暂时不实现文件上传，留空接口）
  completedAt?: string
  evidenceFiles?: string[]         // 证据文件路径数组（JSON）
  reflection?: string              // 反思说明

  // 进度追踪字段
  startedAt?: string               // 开始时间
  estimatedDuration?: number       // 预估天数

  // 元数据
  orderIndex?: number              // 排序顺序
  createdAt?: string
  updatedAt?: string
}

class MilestonesDatabaseManager {
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

    // 创建Milestones表
    db.exec(`
      CREATE TABLE IF NOT EXISTS milestones (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        quest_id INTEGER NOT NULL,
        title TEXT NOT NULL,
        completion_criteria TEXT NOT NULL,
        why TEXT,
        status TEXT DEFAULT 'future',
        completed_at DATETIME,
        evidence_files TEXT,
        reflection TEXT,
        order_index INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (quest_id) REFERENCES quests(id) ON DELETE CASCADE
      )
    `)

    // 创建索引
    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_milestones_quest ON milestones(quest_id);
      CREATE INDEX IF NOT EXISTS idx_milestones_status ON milestones(status);
    `)

    // 扩展字段：添加进度追踪字段（如果不存在）
    const columns = db.prepare("PRAGMA table_info(milestones)").all() as any[]
    const columnNames = columns.map(col => col.name)

    if (!columnNames.includes('started_at')) {
      console.log('[MilestonesDB] Adding started_at column')
      db.exec('ALTER TABLE milestones ADD COLUMN started_at DATETIME')
    }

    if (!columnNames.includes('estimated_duration')) {
      console.log('[MilestonesDB] Adding estimated_duration column')
      db.exec('ALTER TABLE milestones ADD COLUMN estimated_duration INTEGER')
    }
  }

  // 获取指定Quest的所有Milestones
  async getMilestonesByQuest(questId: number): Promise<Milestone[]> {
    const db = this.getDb()
    const rows = db.prepare(`
      SELECT * FROM milestones
      WHERE quest_id = ?
      ORDER BY
        CASE status
          WHEN 'current' THEN 1
          WHEN 'next' THEN 2
          WHEN 'future' THEN 3
          WHEN 'completed' THEN 4
        END,
        order_index ASC,
        created_at ASC
    `).all(questId) as any[]

    return rows.map(row => this.mapRowToMilestone(row))
  }

  // 获取Current Milestone
  async getCurrentMilestone(questId: number): Promise<Milestone | null> {
    const db = this.getDb()
    const row = db.prepare(`
      SELECT * FROM milestones
      WHERE quest_id = ? AND status = 'current'
      ORDER BY created_at ASC
      LIMIT 1
    `).get(questId) as any

    if (!row) return null
    return this.mapRowToMilestone(row)
  }

  // 添加Milestone
  async addMilestone(milestone: Omit<Milestone, 'id' | 'createdAt' | 'updatedAt'>): Promise<number> {
    const db = this.getDb()
    const result = db.prepare(`
      INSERT INTO milestones (
        quest_id, title, completion_criteria, why, status, order_index
      ) VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      milestone.questId,
      milestone.title.trim(),
      milestone.completionCriteria.trim(),
      milestone.why?.trim() || null,
      milestone.status || 'future',
      milestone.orderIndex || null
    )

    return result.lastInsertRowid as number
  }

  // 更新Milestone
  async updateMilestone(id: number, milestone: Partial<Omit<Milestone, 'id' | 'questId' | 'createdAt' | 'updatedAt'>>): Promise<void> {
    const db = this.getDb()

    const updates: string[] = []
    const values: any[] = []

    if (milestone.title !== undefined) {
      updates.push('title = ?')
      values.push(milestone.title.trim())
    }
    if (milestone.completionCriteria !== undefined) {
      updates.push('completion_criteria = ?')
      values.push(milestone.completionCriteria.trim())
    }
    if (milestone.why !== undefined) {
      updates.push('why = ?')
      values.push(milestone.why?.trim() || null)
    }
    if (milestone.status !== undefined) {
      updates.push('status = ?')
      values.push(milestone.status)
    }
    if (milestone.completedAt !== undefined) {
      updates.push('completed_at = ?')
      values.push(milestone.completedAt || null)
    }
    if (milestone.evidenceFiles !== undefined) {
      updates.push('evidence_files = ?')
      values.push(JSON.stringify(milestone.evidenceFiles || []))
    }
    if (milestone.reflection !== undefined) {
      updates.push('reflection = ?')
      values.push(milestone.reflection?.trim() || null)
    }
    if (milestone.orderIndex !== undefined) {
      updates.push('order_index = ?')
      values.push(milestone.orderIndex)
    }

    if (updates.length > 0) {
      updates.push('updated_at = CURRENT_TIMESTAMP')
      values.push(id)

      db.prepare(`
        UPDATE milestones
        SET ${updates.join(', ')}
        WHERE id = ?
      `).run(...values)
    }
  }

  // 删除Milestone
  async deleteMilestone(id: number): Promise<void> {
    const db = this.getDb()
    // 级联删除checkpoints会由外键约束处理
    db.prepare('DELETE FROM milestones WHERE id = ?').run(id)
  }

  // 辅助方法：将数据库行映射到Milestone对象
  private mapRowToMilestone(row: any): Milestone {
    return {
      id: row.id,
      questId: row.quest_id,
      title: row.title,
      completionCriteria: row.completion_criteria,
      why: row.why || undefined,
      status: row.status as Milestone['status'],
      completedAt: row.completed_at || undefined,
      evidenceFiles: row.evidence_files ? JSON.parse(row.evidence_files) : undefined,
      reflection: row.reflection || undefined,
      startedAt: row.started_at || undefined,
      estimatedDuration: row.estimated_duration || undefined,
      orderIndex: row.order_index || undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }
  }

  close() {
    if (this.db) {
      this.db.close()
      this.db = null
    }
  }
}

const milestonesDbManager = new MilestonesDatabaseManager()

export default milestonesDbManager
