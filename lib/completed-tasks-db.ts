import Database from 'better-sqlite3'
import path from 'path'

export interface CompletedTask {
  id?: number
  taskId: number                    // 原任务ID
  taskType: string                  // 任务类型 (routine/long-term/short-term)
  taskTitle: string                 // 任务标题快照
  taskLevel: number                 // 任务层级 (0=主任务, 1=子任务, 2=子子任务)
  parentTaskId?: number             // 父任务ID（如果是子任务）
  grandparentTaskId?: number        // 祖父任务ID（如果是子子任务）
  mainTaskTitle?: string            // 主任务标题（用于统计分组）
  completionComment?: string        // 完成感悟
  completedAt?: string              // 完成时间
  createdAt?: string                // 创建时间
}

export interface TaskCompletionInfo {
  taskId: number
  isCompleted: boolean
  completedAt?: string
  completionComment?: string
}

class CompletedTasksManager {
  private db: Database.Database | null = null
  private dbPath: string

  constructor() {
    this.dbPath = path.join(process.cwd(), 'data', 'completed_tasks.db')
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

    // 创建完成任务表
    db.exec(`
      CREATE TABLE IF NOT EXISTS completed_tasks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        task_id INTEGER NOT NULL,
        task_type TEXT NOT NULL,
        task_title TEXT NOT NULL,
        task_level INTEGER DEFAULT 0,
        parent_task_id INTEGER,
        grandparent_task_id INTEGER,
        completion_comment TEXT,
        completed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(task_id)  -- 确保每个任务只能被完成一次
      )
    `)

    // 创建索引优化查询
    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_completed_tasks_task_id ON completed_tasks(task_id);
      CREATE INDEX IF NOT EXISTS idx_completed_tasks_parent ON completed_tasks(parent_task_id);
      CREATE INDEX IF NOT EXISTS idx_completed_tasks_completed_at ON completed_tasks(completed_at);
    `)

    // 添加 main_task_title 字段（向后兼容）
    try {
      const columns = db.prepare("PRAGMA table_info(completed_tasks)").all() as any[]
      const hasMainTaskTitle = columns.some(col => col.name === 'main_task_title')

      if (!hasMainTaskTitle) {
        db.exec('ALTER TABLE completed_tasks ADD COLUMN main_task_title TEXT')
      }
    } catch (error) {
      console.log('Column migration error for completed_tasks:', error)
    }
  }

  // 完成任务
  completeTask(completedTask: Omit<CompletedTask, 'id' | 'createdAt' | 'completedAt'>): number {
    const db = this.getDb()

    const stmt = db.prepare(`
      INSERT INTO completed_tasks (
        task_id, task_type, task_title, task_level,
        parent_task_id, grandparent_task_id, main_task_title, completion_comment
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `)

    const result = stmt.run(
      completedTask.taskId,
      completedTask.taskType,
      completedTask.taskTitle,
      completedTask.taskLevel,
      completedTask.parentTaskId || null,
      completedTask.grandparentTaskId || null,
      completedTask.mainTaskTitle || null,
      completedTask.completionComment || null
    )

    return result.lastInsertRowid as number
  }

  // 取消完成任务
  uncompleteTask(taskId: number): boolean {
    const db = this.getDb()
    const stmt = db.prepare('DELETE FROM completed_tasks WHERE task_id = ?')
    const result = stmt.run(taskId)
    return result.changes > 0
  }

  // 更新完成备注
  updateCompletionComment(taskId: number, comment: string): boolean {
    const db = this.getDb()
    const stmt = db.prepare('UPDATE completed_tasks SET completion_comment = ? WHERE task_id = ?')
    const result = stmt.run(comment, taskId)
    return result.changes > 0
  }

  // 检查任务是否已完成
  isTaskCompleted(taskId: number): TaskCompletionInfo {
    const db = this.getDb()
    const stmt = db.prepare(`
      SELECT task_id, completed_at, completion_comment
      FROM completed_tasks
      WHERE task_id = ?
    `)
    const row = stmt.get(taskId) as any

    if (row) {
      return {
        taskId,
        isCompleted: true,
        completedAt: row.completed_at,
        completionComment: row.completion_comment
      }
    }

    return {
      taskId,
      isCompleted: false
    }
  }

  // 批量检查多个任务的完成状态
  getTasksCompletionStatus(taskIds: number[]): Map<number, TaskCompletionInfo> {
    if (taskIds.length === 0) return new Map()

    const db = this.getDb()
    const placeholders = taskIds.map(() => '?').join(',')
    const stmt = db.prepare(`
      SELECT task_id, completed_at, completion_comment
      FROM completed_tasks
      WHERE task_id IN (${placeholders})
    `)
    const rows = stmt.all(...taskIds) as any[]

    const statusMap = new Map<number, TaskCompletionInfo>()

    // 初始化所有任务为未完成
    taskIds.forEach(taskId => {
      statusMap.set(taskId, { taskId, isCompleted: false })
    })

    // 更新已完成的任务状态
    rows.forEach(row => {
      statusMap.set(row.task_id, {
        taskId: row.task_id,
        isCompleted: true,
        completedAt: row.completed_at,
        completionComment: row.completion_comment
      })
    })

    return statusMap
  }

  // 获取已完成任务列表
  getCompletedTasks(params?: {
    limit?: number
    offset?: number
    taskType?: string
    startDate?: string
    endDate?: string
  }): CompletedTask[] {
    const db = this.getDb()

    let query = 'SELECT * FROM completed_tasks WHERE 1=1'
    const queryParams: any[] = []

    if (params?.taskType) {
      query += ' AND task_type = ?'
      queryParams.push(params.taskType)
    }

    if (params?.startDate) {
      query += ' AND DATE(completed_at) >= ?'
      queryParams.push(params.startDate)
    }

    if (params?.endDate) {
      query += ' AND DATE(completed_at) <= ?'
      queryParams.push(params.endDate)
    }

    query += ' ORDER BY completed_at DESC'

    if (params?.limit) {
      query += ' LIMIT ?'
      queryParams.push(params.limit)

      if (params?.offset) {
        query += ' OFFSET ?'
        queryParams.push(params.offset)
      }
    }

    const stmt = db.prepare(query)
    const rows = stmt.all(...queryParams) as any[]

    return rows.map(row => ({
      id: row.id,
      taskId: row.task_id,
      taskType: row.task_type,
      taskTitle: row.task_title,
      taskLevel: row.task_level,
      parentTaskId: row.parent_task_id,
      grandparentTaskId: row.grandparent_task_id,
      mainTaskTitle: row.main_task_title,
      completionComment: row.completion_comment,
      completedAt: row.completed_at,
      createdAt: row.created_at
    }))
  }

  // 获取完成统计
  getCompletionStats(params?: {
    taskType?: string
    startDate?: string
    endDate?: string
  }): {
    totalCompleted: number
    completedToday: number
    completedThisWeek: number
    completedThisMonth: number
  } {
    const db = this.getDb()

    const today = new Date().toISOString().split('T')[0]
    const thisWeek = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    const thisMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]

    let baseCondition = '1=1'
    const queryParams: any[] = []

    if (params?.taskType) {
      baseCondition += ' AND task_type = ?'
      queryParams.push(params.taskType)
    }

    const totalStmt = db.prepare(`SELECT COUNT(*) as count FROM completed_tasks WHERE ${baseCondition}`)
    const todayStmt = db.prepare(`SELECT COUNT(*) as count FROM completed_tasks WHERE ${baseCondition} AND DATE(completed_at) = ?`)
    const weekStmt = db.prepare(`SELECT COUNT(*) as count FROM completed_tasks WHERE ${baseCondition} AND DATE(completed_at) >= ?`)
    const monthStmt = db.prepare(`SELECT COUNT(*) as count FROM completed_tasks WHERE ${baseCondition} AND DATE(completed_at) >= ?`)

    return {
      totalCompleted: (totalStmt.get(...queryParams) as any).count,
      completedToday: (todayStmt.get(...queryParams, today) as any).count,
      completedThisWeek: (weekStmt.get(...queryParams, thisWeek) as any).count,
      completedThisMonth: (monthStmt.get(...queryParams, thisMonth) as any).count
    }
  }

  // 按主任务分组统计（用于过去页面展示）
  getCompletionByMainTask(params: {
    days: number  // 过去多少天（1/3/7）
  }): Array<{
    mainTaskTitle: string
    count: number
    tasks: CompletedTask[]
  }> {
    const db = this.getDb()

    // 计算起始日期
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - params.days)
    const startDateStr = startDate.toISOString().split('T')[0]

    // 查询符合条件的任务
    const stmt = db.prepare(`
      SELECT * FROM completed_tasks
      WHERE DATE(completed_at) >= ?
      ORDER BY completed_at DESC
    `)

    const rows = stmt.all(startDateStr) as any[]

    // 转换为 CompletedTask 数组
    const tasks: CompletedTask[] = rows.map(row => ({
      id: row.id,
      taskId: row.task_id,
      taskType: row.task_type,
      taskTitle: row.task_title,
      taskLevel: row.task_level,
      parentTaskId: row.parent_task_id,
      grandparentTaskId: row.grandparent_task_id,
      mainTaskTitle: row.main_task_title,
      completionComment: row.completion_comment,
      completedAt: row.completed_at,
      createdAt: row.created_at
    }))

    // 按 mainTaskTitle 分组
    const groupMap = new Map<string, CompletedTask[]>()

    tasks.forEach(task => {
      const mainTitle = task.mainTaskTitle || '未分类'
      if (!groupMap.has(mainTitle)) {
        groupMap.set(mainTitle, [])
      }
      groupMap.get(mainTitle)!.push(task)
    })

    // 转换为数组并排序（按完成数量降序）
    const result = Array.from(groupMap.entries()).map(([mainTaskTitle, tasks]) => ({
      mainTaskTitle,
      count: tasks.length,
      tasks
    }))

    result.sort((a, b) => b.count - a.count)

    return result
  }

  // 关闭数据库连接
  close() {
    if (this.db) {
      this.db.close()
      this.db = null
    }
  }
}

// 导出单例实例
const completedTasksDbManager = new CompletedTasksManager()
export default completedTasksDbManager