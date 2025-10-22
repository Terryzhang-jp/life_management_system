import Database from 'better-sqlite3'
import path from 'path'
import questsDbManager from './quests-db'

export type ActivityType =
  | 'milestone_created'
  | 'milestone_started'
  | 'milestone_completed'
  | 'milestone_status_changed'
  | 'checkpoint_created'
  | 'checkpoint_completed'
  | 'checkpoint_uncompleted'

export interface QuestActivity {
  id?: number
  questId: number
  milestoneId?: number
  checkpointId?: number
  activityType: ActivityType
  createdAt?: string
}

class QuestActivitiesDatabaseManager {
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
      // quest_activities表已在quests-db.ts的initTables中创建
    }
    return this.db
  }

  /**
   * 记录活动并更新Quest的lastActivityAt
   */
  async logActivity(activity: Omit<QuestActivity, 'id' | 'createdAt'>): Promise<number> {
    const db = this.getDb()

    // 插入活动记录
    const result = db.prepare(`
      INSERT INTO quest_activities (quest_id, milestone_id, checkpoint_id, activity_type)
      VALUES (?, ?, ?, ?)
    `).run(
      activity.questId,
      activity.milestoneId || null,
      activity.checkpointId || null,
      activity.activityType
    )

    // 更新Quest的lastActivityAt
    await questsDbManager.updateLastActivity(activity.questId)

    return result.lastInsertRowid as number
  }

  /**
   * 获取Quest的活动历史
   */
  async getActivitiesByQuest(questId: number, limit: number = 50): Promise<QuestActivity[]> {
    const db = this.getDb()
    const rows = db.prepare(`
      SELECT * FROM quest_activities
      WHERE quest_id = ?
      ORDER BY created_at DESC
      LIMIT ?
    `).all(questId, limit) as any[]

    return rows.map(row => ({
      id: row.id,
      questId: row.quest_id,
      milestoneId: row.milestone_id || undefined,
      checkpointId: row.checkpoint_id || undefined,
      activityType: row.activity_type as ActivityType,
      createdAt: row.created_at
    }))
  }

  /**
   * 获取最近的活动（跨多个Quest）
   */
  async getRecentActivities(limit: number = 20): Promise<QuestActivity[]> {
    const db = this.getDb()
    const rows = db.prepare(`
      SELECT * FROM quest_activities
      ORDER BY created_at DESC
      LIMIT ?
    `).all(limit) as any[]

    return rows.map(row => ({
      id: row.id,
      questId: row.quest_id,
      milestoneId: row.milestone_id || undefined,
      checkpointId: row.checkpoint_id || undefined,
      activityType: row.activity_type as ActivityType,
      createdAt: row.created_at
    }))
  }

  /**
   * 删除Quest的所有活动记录（级联删除会自动处理）
   */
  async deleteActivitiesByQuest(questId: number): Promise<void> {
    const db = this.getDb()
    db.prepare('DELETE FROM quest_activities WHERE quest_id = ?').run(questId)
  }

  close() {
    if (this.db) {
      this.db.close()
      this.db = null
    }
  }
}

const questActivitiesDbManager = new QuestActivitiesDatabaseManager()

export default questActivitiesDbManager
