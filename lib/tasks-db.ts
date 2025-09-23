import Database from 'better-sqlite3'
import path from 'path'

export type TaskType = 'routine' | 'long-term' | 'short-term'

export interface Task {
  id?: number
  type: TaskType
  title: string
  description?: string
  priority?: number  // 重要度排名，数字越小越重要
  parentId?: number  // 父任务ID，用于建立层级关系
  level?: number     // 任务层级：0=主任务，1=子任务，2=子子任务
  deadline?: string  // 截止日期 (仅子任务和子子任务)
  isUnclear?: boolean  // 是否模糊
  unclearReason?: string  // 模糊原因注释
  hasUnclearChildren?: boolean  // 是否有模糊的子任务(用于传播显示)
  createdAt?: string
  updatedAt?: string
}

export interface TasksData {
  routines: Task[]
  longTermTasks: Task[]
  shortTermTasks: Task[]
}

class TasksDatabaseManager {
  private db: Database.Database | null = null
  private dbPath: string

  constructor() {
    this.dbPath = path.join(process.cwd(), 'data', 'tasks.db')
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

    // 创建表
    db.exec(`
      CREATE TABLE IF NOT EXISTS tasks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        type TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT,
        priority INTEGER DEFAULT 999,
        parent_id INTEGER,
        level INTEGER DEFAULT 0,
        deadline DATE,
        is_unclear BOOLEAN DEFAULT 0,
        unclear_reason TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (parent_id) REFERENCES tasks(id) ON DELETE CASCADE
      )
    `)

    // 检查是否需要添加新列（向后兼容）
    try {
      const columns = db.prepare("PRAGMA table_info(tasks)").all() as any[]
      const hasColumn = (name: string) => columns.some(col => col.name === name)

      if (!hasColumn('priority')) {
        db.exec('ALTER TABLE tasks ADD COLUMN priority INTEGER DEFAULT 999')
      }
      if (!hasColumn('parent_id')) {
        db.exec('ALTER TABLE tasks ADD COLUMN parent_id INTEGER')
      }
      if (!hasColumn('level')) {
        db.exec('ALTER TABLE tasks ADD COLUMN level INTEGER DEFAULT 0')
      }
      if (!hasColumn('is_unclear')) {
        db.exec('ALTER TABLE tasks ADD COLUMN is_unclear BOOLEAN DEFAULT 0')
      }
      if (!hasColumn('unclear_reason')) {
        db.exec('ALTER TABLE tasks ADD COLUMN unclear_reason TEXT')
      }
      if (!hasColumn('deadline')) {
        db.exec('ALTER TABLE tasks ADD COLUMN deadline DATE')
      }
    } catch (error) {
      console.log('Column migration error:', error)
    }
  }

  async getAllTasks(): Promise<TasksData> {
    const db = this.getDb()
    // 只获取主任务（level = 0 或 level 为空）
    const rows = db.prepare('SELECT * FROM tasks WHERE level = 0 OR level IS NULL ORDER BY priority ASC, created_at DESC').all() as any[]

    const tasksData: TasksData = {
      routines: [],
      longTermTasks: [],
      shortTermTasks: []
    }

    rows.forEach(row => {
      const task: Task = {
        id: row.id,
        type: row.type as TaskType,
        title: row.title,
        description: row.description || '',
        priority: row.priority || 999,
        parentId: row.parent_id,
        level: row.level || 0,
        deadline: row.deadline || undefined,
        isUnclear: Boolean(row.is_unclear),
        unclearReason: row.unclear_reason || '',
        createdAt: row.created_at,
        updatedAt: row.updated_at
      }

      switch (row.type) {
        case 'routine':
          tasksData.routines.push(task)
          break
        case 'long-term':
          tasksData.longTermTasks.push(task)
          break
        case 'short-term':
          tasksData.shortTermTasks.push(task)
          break
      }
    })

    // 对每个类型内部按优先级排序
    tasksData.routines.sort((a, b) => (a.priority || 999) - (b.priority || 999))
    tasksData.longTermTasks.sort((a, b) => (a.priority || 999) - (b.priority || 999))
    tasksData.shortTermTasks.sort((a, b) => (a.priority || 999) - (b.priority || 999))

    return tasksData
  }

  async addTask(task: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>): Promise<number> {
    const db = this.getDb()
    const result = db.prepare(`
      INSERT INTO tasks (type, title, description, priority, parent_id, level, deadline, is_unclear, unclear_reason)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      task.type,
      task.title,
      task.description || '',
      task.priority || 999,
      task.parentId || null,
      task.level || 0,
      task.deadline || null,
      task.isUnclear ? 1 : 0,
      task.unclearReason || ''
    )

    return result.lastInsertRowid as number
  }

  async updateTask(id: number, task: Partial<Omit<Task, 'id' | 'createdAt' | 'updatedAt'>>): Promise<void> {
    const db = this.getDb()

    const updates: string[] = []
    const values: any[] = []

    if (task.type !== undefined) {
      updates.push('type = ?')
      values.push(task.type)
    }
    if (task.title !== undefined) {
      updates.push('title = ?')
      values.push(task.title)
    }
    if (task.description !== undefined) {
      updates.push('description = ?')
      values.push(task.description)
    }
    if (task.priority !== undefined) {
      updates.push('priority = ?')
      values.push(task.priority)
    }
    if (task.parentId !== undefined) {
      updates.push('parent_id = ?')
      values.push(task.parentId)
    }
    if (task.level !== undefined) {
      updates.push('level = ?')
      values.push(task.level)
    }
    if (task.deadline !== undefined) {
      updates.push('deadline = ?')
      values.push(task.deadline)
    }
    if (task.isUnclear !== undefined) {
      updates.push('is_unclear = ?')
      values.push(task.isUnclear ? 1 : 0)
    }
    if (task.unclearReason !== undefined) {
      updates.push('unclear_reason = ?')
      values.push(task.unclearReason)
    }

    if (updates.length > 0) {
      updates.push('updated_at = CURRENT_TIMESTAMP')
      values.push(id)

      db.prepare(`
        UPDATE tasks
        SET ${updates.join(', ')}
        WHERE id = ?
      `).run(...values)
    }
  }

  async deleteTask(id: number): Promise<void> {
    const db = this.getDb()
    db.prepare('DELETE FROM tasks WHERE id = ?').run(id)
  }

  // 获取指定任务的子任务
  async getSubTasks(parentId: number, level: number = 1): Promise<Task[]> {
    const db = this.getDb()
    const rows = db.prepare(`
      SELECT * FROM tasks
      WHERE parent_id = ? AND level = ?
      ORDER BY priority ASC, created_at DESC
    `).all(parentId, level) as any[]

    return rows.map(row => ({
      id: row.id,
      type: row.type as TaskType,
      title: row.title,
      description: row.description || '',
      priority: row.priority || 999,
      parentId: row.parent_id,
      level: row.level || 0,
      deadline: row.deadline || undefined,
      isUnclear: Boolean(row.is_unclear),
      unclearReason: row.unclear_reason || '',
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }))
  }

  // 获取任务的所有层级结构
  async getTaskHierarchy(taskId: number): Promise<Task[]> {
    const db = this.getDb()
    const rows = db.prepare(`
      WITH RECURSIVE task_tree AS (
        SELECT * FROM tasks WHERE id = ?
        UNION ALL
        SELECT t.* FROM tasks t
        JOIN task_tree tt ON t.parent_id = tt.id
      )
      SELECT * FROM task_tree ORDER BY level ASC, priority ASC
    `).all(taskId) as any[]

    return rows.map(row => ({
      id: row.id,
      type: row.type as TaskType,
      title: row.title,
      description: row.description || '',
      priority: row.priority || 999,
      parentId: row.parent_id,
      level: row.level || 0,
      deadline: row.deadline || undefined,
      isUnclear: Boolean(row.is_unclear),
      unclearReason: row.unclear_reason || '',
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }))
  }

  // 更新任务的模糊状态并向上传播
  async updateTaskUnclearStatus(id: number, isUnclear: boolean, unclearReason?: string): Promise<void> {
    const db = this.getDb()

    // 更新当前任务的模糊状态
    await this.updateTask(id, { isUnclear, unclearReason })

    // 查找当前任务的父任务
    const currentTask = db.prepare('SELECT parent_id FROM tasks WHERE id = ?').get(id) as any

    if (currentTask?.parent_id) {
      // 检查父任务下是否还有其他模糊的子任务
      const unclearSiblings = db.prepare(`
        SELECT COUNT(*) as count FROM tasks
        WHERE parent_id = ? AND is_unclear = 1
      `).get(currentTask.parent_id) as any

      // 如果父任务需要显示问号状态（有模糊的子任务）
      const parentShouldHaveUnclearChildren = unclearSiblings.count > 0

      // 递归更新父任务的 hasUnclearChildren 状态
      await this.updateParentUnclearStatus(currentTask.parent_id, parentShouldHaveUnclearChildren)
    }
  }

  // 递归更新父任务的模糊子任务状态（只向上传播一级）
  private async updateParentUnclearStatus(parentId: number, hasUnclearChildren: boolean): Promise<void> {
    const db = this.getDb()

    // 获取父任务信息
    const parentTask = db.prepare('SELECT parent_id FROM tasks WHERE id = ?').get(parentId) as any

    // 继续向上传播到祖父任务
    if (parentTask?.parent_id) {
      // 只检查祖父任务下的直接子任务（不包括子子任务）
      const unclearDirectChildren = db.prepare(`
        SELECT COUNT(*) as count FROM tasks
        WHERE parent_id = ? AND is_unclear = 1
      `).get(parentTask.parent_id) as any

      const grandparentShouldHaveUnclearChildren = unclearDirectChildren.count > 0
      await this.updateParentUnclearStatus(parentTask.parent_id, grandparentShouldHaveUnclearChildren)
    }
  }

  // 检查任务是否有模糊的子任务（只检查直接子任务，不递归）
  async checkHasUnclearChildren(taskId: number): Promise<boolean> {
    const db = this.getDb()

    // 只检查直接的模糊子任务，实现"只向上传导一级"
    const unclearDirectChildren = db.prepare(`
      SELECT COUNT(*) as count FROM tasks
      WHERE parent_id = ? AND is_unclear = 1
    `).get(taskId) as any

    return unclearDirectChildren.count > 0
  }

  close() {
    if (this.db) {
      this.db.close()
      this.db = null
    }
  }
}

const tasksDbManager = new TasksDatabaseManager()

export default tasksDbManager