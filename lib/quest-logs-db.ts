import Database from 'better-sqlite3'
import path from 'path'

export interface QuestLog {
  id?: number
  milestoneId: number          // 关联的Milestone ID
  date: string                 // 日期 (YYYY-MM-DD)
  timeSpent: number            // 投入时间(分钟)
  inputDescription: string     // 投入描述(做了什么)
  outputDescription?: string   // 产出描述(产出了什么)
  evidenceFiles?: string[]     // 证据文件路径数组（JSON，暂不实现上传）
  createdAt?: string
  updatedAt?: string
}

class QuestLogsDatabaseManager {
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

    // 创建Quest Logs表
    db.exec(`
      CREATE TABLE IF NOT EXISTS quest_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        milestone_id INTEGER NOT NULL,
        date DATE NOT NULL,
        time_spent INTEGER NOT NULL,
        input_description TEXT NOT NULL,
        output_description TEXT,
        evidence_files TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (milestone_id) REFERENCES milestones(id) ON DELETE CASCADE
      )
    `)

    // 创建索引
    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_quest_logs_milestone ON quest_logs(milestone_id);
      CREATE INDEX IF NOT EXISTS idx_quest_logs_date ON quest_logs(date);
    `)
  }

  // 获取指定Milestone的所有Logs
  async getLogsByMilestone(milestoneId: number): Promise<QuestLog[]> {
    const db = this.getDb()
    const rows = db.prepare(`
      SELECT * FROM quest_logs
      WHERE milestone_id = ?
      ORDER BY date DESC, created_at DESC
    `).all(milestoneId) as any[]

    return rows.map(row => this.mapRowToQuestLog(row))
  }

  // 获取指定日期范围的Logs
  async getLogsByDateRange(milestoneId: number, startDate: string, endDate: string): Promise<QuestLog[]> {
    const db = this.getDb()
    const rows = db.prepare(`
      SELECT * FROM quest_logs
      WHERE milestone_id = ? AND date BETWEEN ? AND ?
      ORDER BY date ASC, created_at ASC
    `).all(milestoneId, startDate, endDate) as any[]

    return rows.map(row => this.mapRowToQuestLog(row))
  }

  // 添加Quest Log
  async addLog(log: Omit<QuestLog, 'id' | 'createdAt' | 'updatedAt'>): Promise<number> {
    const db = this.getDb()
    const result = db.prepare(`
      INSERT INTO quest_logs (
        milestone_id, date, time_spent, input_description, output_description, evidence_files
      ) VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      log.milestoneId,
      log.date,
      log.timeSpent,
      log.inputDescription.trim(),
      log.outputDescription?.trim() || null,
      log.evidenceFiles ? JSON.stringify(log.evidenceFiles) : null
    )

    return result.lastInsertRowid as number
  }

  // 更新Quest Log
  async updateLog(id: number, log: Partial<Omit<QuestLog, 'id' | 'milestoneId' | 'createdAt' | 'updatedAt'>>): Promise<void> {
    const db = this.getDb()

    const updates: string[] = []
    const values: any[] = []

    if (log.date !== undefined) {
      updates.push('date = ?')
      values.push(log.date)
    }
    if (log.timeSpent !== undefined) {
      updates.push('time_spent = ?')
      values.push(log.timeSpent)
    }
    if (log.inputDescription !== undefined) {
      updates.push('input_description = ?')
      values.push(log.inputDescription.trim())
    }
    if (log.outputDescription !== undefined) {
      updates.push('output_description = ?')
      values.push(log.outputDescription?.trim() || null)
    }
    if (log.evidenceFiles !== undefined) {
      updates.push('evidence_files = ?')
      values.push(log.evidenceFiles ? JSON.stringify(log.evidenceFiles) : null)
    }

    if (updates.length > 0) {
      updates.push('updated_at = CURRENT_TIMESTAMP')
      values.push(id)

      db.prepare(`
        UPDATE quest_logs
        SET ${updates.join(', ')}
        WHERE id = ?
      `).run(...values)
    }
  }

  // 删除Quest Log
  async deleteLog(id: number): Promise<void> {
    const db = this.getDb()
    db.prepare('DELETE FROM quest_logs WHERE id = ?').run(id)
  }

  // 辅助方法：将数据库行映射到QuestLog对象
  private mapRowToQuestLog(row: any): QuestLog {
    return {
      id: row.id,
      milestoneId: row.milestone_id,
      date: row.date,
      timeSpent: row.time_spent,
      inputDescription: row.input_description,
      outputDescription: row.output_description || undefined,
      evidenceFiles: row.evidence_files ? JSON.parse(row.evidence_files) : undefined,
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

const questLogsDbManager = new QuestLogsDatabaseManager()

export default questLogsDbManager
