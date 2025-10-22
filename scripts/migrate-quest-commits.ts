/**
 * 数据库迁移：Daily Commit 系统
 *
 * 新增功能：
 * 1. quest_commits - 每日进度提交记录
 * 2. checkpoint_progress_history - Checkpoint 进度变更历史
 * 3. ai_assessments - AI 评估记录
 * 4. checkpoints.progress 字段 - 0-100 的进度百分比
 *
 * 运行: npx tsx scripts/migrate-quest-commits.ts
 */

import Database from 'better-sqlite3'
import path from 'path'

const DB_PATH = path.join(process.cwd(), 'data', 'quests.db')

function migrate() {
  console.log('🔄 开始数据库迁移: Daily Commit 系统\n')

  const db = new Database(DB_PATH)

  try {
    db.exec('BEGIN TRANSACTION')

    // 1. 检查并添加 checkpoints.progress 字段
    console.log('📋 Step 1: 添加 checkpoints.progress 字段...')
    try {
      db.exec(`
        ALTER TABLE checkpoints
        ADD COLUMN progress INTEGER DEFAULT 0 CHECK(progress >= 0 AND progress <= 100)
      `)
      console.log('✅ checkpoints.progress 字段已添加\n')
    } catch (error: any) {
      if (error.message.includes('duplicate column')) {
        console.log('ℹ️  checkpoints.progress 字段已存在，跳过\n')
      } else {
        throw error
      }
    }

    // 2. 创建 quest_commits 表
    console.log('📋 Step 2: 创建 quest_commits 表...')
    db.exec(`
      CREATE TABLE IF NOT EXISTS quest_commits (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        quest_id INTEGER NOT NULL,
        milestone_id INTEGER,
        commit_date DATE NOT NULL,
        content TEXT NOT NULL,
        attachments TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

        FOREIGN KEY (quest_id) REFERENCES quests(id) ON DELETE CASCADE,
        FOREIGN KEY (milestone_id) REFERENCES milestones(id) ON DELETE SET NULL
      )
    `)
    db.exec(`CREATE INDEX IF NOT EXISTS idx_commits_quest ON quest_commits(quest_id)`)
    db.exec(`CREATE INDEX IF NOT EXISTS idx_commits_date ON quest_commits(commit_date)`)
    console.log('✅ quest_commits 表已创建\n')

    // 3. 创建 checkpoint_progress_history 表
    console.log('📋 Step 3: 创建 checkpoint_progress_history 表...')
    db.exec(`
      CREATE TABLE IF NOT EXISTS checkpoint_progress_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        checkpoint_id INTEGER NOT NULL,
        commit_id INTEGER,
        previous_progress INTEGER NOT NULL,
        new_progress INTEGER NOT NULL CHECK(new_progress >= 0 AND new_progress <= 100),
        change_reason TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

        FOREIGN KEY (checkpoint_id) REFERENCES checkpoints(id) ON DELETE CASCADE,
        FOREIGN KEY (commit_id) REFERENCES quest_commits(id) ON DELETE SET NULL
      )
    `)
    db.exec(`CREATE INDEX IF NOT EXISTS idx_progress_checkpoint ON checkpoint_progress_history(checkpoint_id)`)
    db.exec(`CREATE INDEX IF NOT EXISTS idx_progress_commit ON checkpoint_progress_history(commit_id)`)
    console.log('✅ checkpoint_progress_history 表已创建\n')

    // 4. 创建 ai_assessments 表
    console.log('📋 Step 4: 创建 ai_assessments 表...')
    db.exec(`
      CREATE TABLE IF NOT EXISTS ai_assessments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        commit_id INTEGER NOT NULL,
        checkpoint_id INTEGER NOT NULL,
        assessed_progress INTEGER NOT NULL CHECK(assessed_progress >= 0 AND assessed_progress <= 100),
        reasoning TEXT NOT NULL,
        confidence_score REAL,
        model_version TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

        FOREIGN KEY (commit_id) REFERENCES quest_commits(id) ON DELETE CASCADE,
        FOREIGN KEY (checkpoint_id) REFERENCES checkpoints(id) ON DELETE CASCADE
      )
    `)
    db.exec(`CREATE INDEX IF NOT EXISTS idx_assessments_commit ON ai_assessments(commit_id)`)
    db.exec(`CREATE INDEX IF NOT EXISTS idx_assessments_checkpoint ON ai_assessments(checkpoint_id)`)
    console.log('✅ ai_assessments 表已创建\n')

    db.exec('COMMIT')

    console.log('🎉 数据库迁移完成！\n')
    console.log('📊 数据库统计:')

    // 显示表统计信息
    const tables = ['quest_commits', 'checkpoint_progress_history', 'ai_assessments']
    tables.forEach(table => {
      const count = db.prepare(`SELECT COUNT(*) as count FROM ${table}`).get() as { count: number }
      console.log(`  - ${table}: ${count.count} 条记录`)
    })

    // 显示 checkpoints 的 progress 字段统计
    const checkpointStats = db.prepare(`
      SELECT
        COUNT(*) as total,
        COUNT(CASE WHEN progress > 0 THEN 1 END) as in_progress,
        COUNT(CASE WHEN progress = 100 THEN 1 END) as completed
      FROM checkpoints
    `).get() as { total: number, in_progress: number, completed: number }

    console.log(`  - checkpoints: ${checkpointStats.total} 总数, ${checkpointStats.in_progress} 进行中, ${checkpointStats.completed} 已完成`)

  } catch (error) {
    db.exec('ROLLBACK')
    console.error('❌ 迁移失败:', error)
    throw error
  } finally {
    db.close()
  }
}

// 运行迁移
migrate()
