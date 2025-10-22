/**
 * Quest Commits Database Operations
 *
 * Daily Commit 系统的数据库操作
 */

import Database from 'better-sqlite3'
import path from 'path'

const DB_PATH = path.join(process.cwd(), 'data', 'quests.db')

export interface QuestCommit {
  id?: number
  questId: number
  milestoneId?: number | null
  commitDate: string  // YYYY-MM-DD
  content: string
  attachments?: string | null  // JSON array of file paths
  createdAt?: string
}

export interface CheckpointProgressHistory {
  id?: number
  checkpointId: number
  commitId?: number | null
  previousProgress: number
  newProgress: number
  changeReason?: string | null
  createdAt?: string
}

export interface AIAssessment {
  id?: number
  commitId: number
  checkpointId: number
  assessedProgress: number  // 0-100
  reasoning: string
  confidenceScore?: number | null  // 0-1
  modelVersion?: string | null
  createdAt?: string
}

/**
 * Quest Commits 操作
 */
export const questCommitsDb = {
  /**
   * 创建新的 commit
   */
  create(commit: Omit<QuestCommit, 'id' | 'createdAt'>): QuestCommit {
    const db = new Database(DB_PATH)
    try {
      const stmt = db.prepare(`
        INSERT INTO quest_commits (quest_id, milestone_id, commit_date, content, attachments)
        VALUES (?, ?, ?, ?, ?)
      `)

      const info = stmt.run(
        commit.questId,
        commit.milestoneId ?? null,
        commit.commitDate,
        commit.content,
        commit.attachments ?? null
      )

      return this.getById(Number(info.lastInsertRowid))!
    } finally {
      db.close()
    }
  },

  /**
   * 获取指定 Quest 的所有 commits
   */
  getByQuestId(questId: number, options?: { limit?: number, offset?: number }): QuestCommit[] {
    const db = new Database(DB_PATH)
    try {
      let sql = `
        SELECT * FROM quest_commits
        WHERE quest_id = ?
        ORDER BY commit_date DESC, created_at DESC
      `

      if (options?.limit) {
        sql += ` LIMIT ${options.limit}`
      }
      if (options?.offset) {
        sql += ` OFFSET ${options.offset}`
      }

      const stmt = db.prepare(sql)
      return stmt.all(questId) as QuestCommit[]
    } finally {
      db.close()
    }
  },

  /**
   * 获取指定日期范围的 commits
   */
  getByDateRange(questId: number, startDate: string, endDate: string): QuestCommit[] {
    const db = new Database(DB_PATH)
    try {
      const stmt = db.prepare(`
        SELECT * FROM quest_commits
        WHERE quest_id = ?
          AND commit_date >= ?
          AND commit_date <= ?
        ORDER BY commit_date DESC, created_at DESC
      `)

      return stmt.all(questId, startDate, endDate) as QuestCommit[]
    } finally {
      db.close()
    }
  },

  /**
   * 根据 ID 获取 commit
   */
  getById(id: number): QuestCommit | null {
    const db = new Database(DB_PATH)
    try {
      const stmt = db.prepare(`SELECT * FROM quest_commits WHERE id = ?`)
      return stmt.get(id) as QuestCommit | null
    } finally {
      db.close()
    }
  },

  /**
   * 更新 commit
   */
  update(id: number, updates: Partial<Omit<QuestCommit, 'id' | 'createdAt'>>): boolean {
    const db = new Database(DB_PATH)
    try {
      const fields: string[] = []
      const values: any[] = []

      if (updates.content !== undefined) {
        fields.push('content = ?')
        values.push(updates.content)
      }
      if (updates.attachments !== undefined) {
        fields.push('attachments = ?')
        values.push(updates.attachments)
      }

      if (fields.length === 0) return false

      values.push(id)

      const stmt = db.prepare(`
        UPDATE quest_commits
        SET ${fields.join(', ')}
        WHERE id = ?
      `)

      const info = stmt.run(...values)
      return info.changes > 0
    } finally {
      db.close()
    }
  },

  /**
   * 删除 commit
   */
  delete(id: number): boolean {
    const db = new Database(DB_PATH)
    try {
      const stmt = db.prepare(`DELETE FROM quest_commits WHERE id = ?`)
      const info = stmt.run(id)
      return info.changes > 0
    } finally {
      db.close()
    }
  }
}

/**
 * Checkpoint Progress History 操作
 */
export const progressHistoryDb = {
  /**
   * 记录进度变更
   */
  create(history: Omit<CheckpointProgressHistory, 'id' | 'createdAt'>): CheckpointProgressHistory {
    const db = new Database(DB_PATH)
    try {
      const stmt = db.prepare(`
        INSERT INTO checkpoint_progress_history
        (checkpoint_id, commit_id, previous_progress, new_progress, change_reason)
        VALUES (?, ?, ?, ?, ?)
      `)

      const info = stmt.run(
        history.checkpointId,
        history.commitId ?? null,
        history.previousProgress,
        history.newProgress,
        history.changeReason ?? null
      )

      return this.getById(Number(info.lastInsertRowid))!
    } finally {
      db.close()
    }
  },

  /**
   * 获取指定 Checkpoint 的进度历史
   */
  getByCheckpointId(checkpointId: number): CheckpointProgressHistory[] {
    const db = new Database(DB_PATH)
    try {
      const stmt = db.prepare(`
        SELECT * FROM checkpoint_progress_history
        WHERE checkpoint_id = ?
        ORDER BY created_at ASC
      `)

      return stmt.all(checkpointId) as CheckpointProgressHistory[]
    } finally {
      db.close()
    }
  },

  /**
   * 获取指定 Commit 关联的所有进度变更
   */
  getByCommitId(commitId: number): CheckpointProgressHistory[] {
    const db = new Database(DB_PATH)
    try {
      const stmt = db.prepare(`
        SELECT * FROM checkpoint_progress_history
        WHERE commit_id = ?
        ORDER BY created_at ASC
      `)

      return stmt.all(commitId) as CheckpointProgressHistory[]
    } finally {
      db.close()
    }
  },

  /**
   * 根据 ID 获取历史记录
   */
  getById(id: number): CheckpointProgressHistory | null {
    const db = new Database(DB_PATH)
    try {
      const stmt = db.prepare(`SELECT * FROM checkpoint_progress_history WHERE id = ?`)
      return stmt.get(id) as CheckpointProgressHistory | null
    } finally {
      db.close()
    }
  }
}

/**
 * AI Assessments 操作
 */
export const aiAssessmentsDb = {
  /**
   * 创建新的 AI 评估
   */
  create(assessment: Omit<AIAssessment, 'id' | 'createdAt'>): AIAssessment {
    const db = new Database(DB_PATH)
    try {
      const stmt = db.prepare(`
        INSERT INTO ai_assessments
        (commit_id, checkpoint_id, assessed_progress, reasoning, confidence_score, model_version)
        VALUES (?, ?, ?, ?, ?, ?)
      `)

      const info = stmt.run(
        assessment.commitId,
        assessment.checkpointId,
        assessment.assessedProgress,
        assessment.reasoning,
        assessment.confidenceScore ?? null,
        assessment.modelVersion ?? null
      )

      return this.getById(Number(info.lastInsertRowid))!
    } finally {
      db.close()
    }
  },

  /**
   * 获取指定 Commit 的所有 AI 评估
   */
  getByCommitId(commitId: number): AIAssessment[] {
    const db = new Database(DB_PATH)
    try {
      const stmt = db.prepare(`
        SELECT * FROM ai_assessments
        WHERE commit_id = ?
        ORDER BY created_at ASC
      `)

      return stmt.all(commitId) as AIAssessment[]
    } finally {
      db.close()
    }
  },

  /**
   * 获取指定 Checkpoint 的所有 AI 评估
   */
  getByCheckpointId(checkpointId: number): AIAssessment[] {
    const db = new Database(DB_PATH)
    try {
      const stmt = db.prepare(`
        SELECT * FROM ai_assessments
        WHERE checkpoint_id = ?
        ORDER BY created_at DESC
      `)

      return stmt.all(checkpointId) as AIAssessment[]
    } finally {
      db.close()
    }
  },

  /**
   * 根据 ID 获取评估
   */
  getById(id: number): AIAssessment | null {
    const db = new Database(DB_PATH)
    try {
      const stmt = db.prepare(`SELECT * FROM ai_assessments WHERE id = ?`)
      return stmt.get(id) as AIAssessment | null
    } finally {
      db.close()
    }
  }
}

/**
 * Checkpoint 进度操作（扩展）
 */
export const checkpointProgressDb = {
  /**
   * 更新 Checkpoint 进度
   * 同时记录进度历史
   */
  updateProgress(
    checkpointId: number,
    newProgress: number,
    options?: {
      commitId?: number
      changeReason?: string
    }
  ): boolean {
    const db = new Database(DB_PATH)
    try {
      db.exec('BEGIN TRANSACTION')

      // 1. 获取当前进度
      const current = db.prepare(`SELECT progress FROM checkpoints WHERE id = ?`).get(checkpointId) as { progress: number } | undefined

      if (!current) {
        db.exec('ROLLBACK')
        return false
      }

      const previousProgress = current.progress

      // 2. 更新进度
      const updateStmt = db.prepare(`
        UPDATE checkpoints
        SET progress = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `)
      updateStmt.run(newProgress, checkpointId)

      // 3. 记录历史
      const historyStmt = db.prepare(`
        INSERT INTO checkpoint_progress_history
        (checkpoint_id, commit_id, previous_progress, new_progress, change_reason)
        VALUES (?, ?, ?, ?, ?)
      `)
      historyStmt.run(
        checkpointId,
        options?.commitId ?? null,
        previousProgress,
        newProgress,
        options?.changeReason ?? null
      )

      // 4. 如果进度达到 100，自动标记为完成
      if (newProgress === 100) {
        const completeStmt = db.prepare(`
          UPDATE checkpoints
          SET is_completed = 1, completed_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `)
        completeStmt.run(checkpointId)
      }

      db.exec('COMMIT')
      return true
    } catch (error) {
      db.exec('ROLLBACK')
      throw error
    } finally {
      db.close()
    }
  },

  /**
   * 获取 Checkpoint 当前进度
   */
  getProgress(checkpointId: number): number | null {
    const db = new Database(DB_PATH)
    try {
      const stmt = db.prepare(`SELECT progress FROM checkpoints WHERE id = ?`)
      const result = stmt.get(checkpointId) as { progress: number } | undefined
      return result?.progress ?? null
    } finally {
      db.close()
    }
  }
}
