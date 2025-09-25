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
  categoryId?: number  // 任务分类ID
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
        category_id INTEGER,
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
      if (!hasColumn('category_id')) {
        db.exec('ALTER TABLE tasks ADD COLUMN category_id INTEGER')
      }
    } catch (error) {
      console.log('Column migration error:', error)
    }
  }

  getTask(id: number): Task | null {
    const db = this.getDb()
    const row = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id) as any

    if (!row) {
      return null
    }

    const hasUnclearChildrenRow = db.prepare(
      'SELECT 1 FROM tasks WHERE parent_id = ? AND is_unclear = 1 LIMIT 1'
    ).get(row.id) as any

    return {
      id: row.id,
      type: row.type as TaskType,
      title: row.title,
      description: row.description || '',
      priority: row.priority ?? 999,
      parentId: row.parent_id || undefined,
      level: row.level ?? 0,
      deadline: row.deadline || undefined,
      isUnclear: Boolean(row.is_unclear),
      unclearReason: row.unclear_reason || '',
      hasUnclearChildren: Boolean(hasUnclearChildrenRow),
      categoryId: row.category_id || undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at
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
        categoryId: row.category_id || undefined,
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
      INSERT INTO tasks (type, title, description, priority, parent_id, level, deadline, is_unclear, unclear_reason, category_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      task.type,
      task.title,
      task.description || '',
      task.priority || 999,
      task.parentId || null,
      task.level || 0,
      task.deadline || null,
      task.isUnclear ? 1 : 0,
      task.unclearReason || '',
      task.categoryId || null
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
    if (task.categoryId !== undefined) {
      updates.push('category_id = ?')
      values.push(task.categoryId || null)
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
      categoryId: row.category_id || undefined,
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
      categoryId: row.category_id || undefined,
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

// Export function for getting schedulable tasks (level 2 tasks and level 1 tasks without children)
export function getAllSchedulableTasks() {
  const db = tasksDbManager.getDb()

  // Get all level 2 tasks (sub-sub-tasks), excluding routines
  const level2Tasks = db.prepare(`
    SELECT
      t.id,
      t.title,
      t.type,
      t.level,
      t.priority,
      t.deadline,
      t.parent_id as parentId,
      p.title as parentTitle,
      p.parent_id as grandparentId,
      gp.title as grandparentTitle
    FROM tasks t
    LEFT JOIN tasks p ON t.parent_id = p.id
    LEFT JOIN tasks gp ON p.parent_id = gp.id
    WHERE t.level = 2 AND t.type != 'routine'
    ORDER BY
      CASE WHEN t.deadline IS NULL THEN 1 ELSE 0 END,
      t.deadline ASC,
      t.priority,
      t.created_at
  `).all()

  // Get level 1 tasks that don't have children, excluding routines
  const level1TasksWithoutChildren = db.prepare(`
    SELECT
      t.id,
      t.title,
      t.type,
      t.level,
      t.priority,
      t.deadline,
      t.parent_id as parentId,
      p.title as parentTitle,
      NULL as grandparentId,
      NULL as grandparentTitle
    FROM tasks t
    LEFT JOIN tasks p ON t.parent_id = p.id
    WHERE t.level = 1
      AND t.type != 'routine'
      AND NOT EXISTS (
        SELECT 1 FROM tasks child WHERE child.parent_id = t.id
      )
    ORDER BY
      CASE WHEN t.deadline IS NULL THEN 1 ELSE 0 END,
      t.deadline ASC,
      t.priority,
      t.created_at
  `).all()

  const allTasks = [...level2Tasks, ...level1TasksWithoutChildren]

  if (allTasks.length === 0) {
    return []
  }

  // Filter out completed tasks using completed-tasks-db
  const completedTasksDb = require('./completed-tasks-db').default

  // Get completion status for all tasks
  const taskIds = allTasks.map(task => task.id)
  const completionStatusMap = completedTasksDb.getTasksCompletionStatus(taskIds)

  // Filter out completed tasks
  const schedulableTasks = allTasks.filter(task => {
    const status = completionStatusMap.get(task.id)
    return !status?.isCompleted
  })

  // Sort by deadline first, then priority
  schedulableTasks.sort((a, b) => {
    // Deadline priority: tasks with deadline come first
    if (a.deadline && !b.deadline) return -1
    if (!a.deadline && b.deadline) return 1

    // Both have deadlines: sort by deadline
    if (a.deadline && b.deadline) {
      const deadlineComparison = a.deadline.localeCompare(b.deadline)
      if (deadlineComparison !== 0) return deadlineComparison
    }

    // Same deadline status: sort by priority
    const priorityA = a.priority === 999 ? Infinity : (a.priority || Infinity)
    const priorityB = b.priority === 999 ? Infinity : (b.priority || Infinity)

    return priorityA - priorityB
  })

  return schedulableTasks
}

// Get schedulable routine tasks
export function getSchedulableRoutines() {
  const db = tasksDbManager.getDb()

  // Get all routine tasks (level 2 and level 1 without children, but NOT level 0)
  const routineLevel2Tasks = db.prepare(`
    SELECT
      t.id,
      t.title,
      t.type,
      t.level,
      t.priority,
      t.deadline,
      t.parent_id as parentId,
      p.title as parentTitle,
      p.parent_id as grandparentId,
      gp.title as grandparentTitle
    FROM tasks t
    INNER JOIN tasks p ON t.parent_id = p.id
    INNER JOIN tasks gp ON p.parent_id = gp.id AND gp.type = 'routine'
    WHERE t.level = 2 AND t.type = 'routine'
    ORDER BY t.priority, t.created_at
  `).all()

  // Get orphaned level 2 routine tasks (parent or grandparent not routine/missing)
  const orphanedRoutineLevel2Tasks = db.prepare(`
    SELECT
      t.id,
      t.title,
      t.type,
      t.level,
      t.priority,
      t.deadline,
      NULL as parentId,
      NULL as parentTitle,
      NULL as grandparentId,
      NULL as grandparentTitle
    FROM tasks t
    WHERE t.level = 2
      AND t.type = 'routine'
      AND (
        t.parent_id IS NULL
        OR NOT EXISTS (SELECT 1 FROM tasks p WHERE p.id = t.parent_id)
        OR NOT EXISTS (
          SELECT 1 FROM tasks p
          INNER JOIN tasks gp ON p.parent_id = gp.id AND gp.type = 'routine'
          WHERE p.id = t.parent_id
        )
      )
    ORDER BY t.priority, t.created_at
  `).all()

  const routineLevel1TasksWithoutChildren = db.prepare(`
    SELECT
      t.id,
      t.title,
      t.type,
      t.level,
      t.priority,
      t.deadline,
      t.parent_id as parentId,
      p.title as parentTitle,
      NULL as grandparentId,
      NULL as grandparentTitle
    FROM tasks t
    INNER JOIN tasks p ON t.parent_id = p.id AND p.type = 'routine'
    WHERE t.level = 1
      AND t.type = 'routine'
      AND NOT EXISTS (
        SELECT 1 FROM tasks child WHERE child.parent_id = t.id
      )
    ORDER BY t.priority, t.created_at
  `).all()

  // Get level 1 routine tasks that have no valid routine parent (orphaned tasks)
  const orphanedRoutineLevel1Tasks = db.prepare(`
    SELECT
      t.id,
      t.title,
      t.type,
      t.level,
      t.priority,
      t.deadline,
      NULL as parentId,
      NULL as parentTitle,
      NULL as grandparentId,
      NULL as grandparentTitle
    FROM tasks t
    WHERE t.level = 1
      AND t.type = 'routine'
      AND NOT EXISTS (
        SELECT 1 FROM tasks child WHERE child.parent_id = t.id
      )
      AND (t.parent_id IS NULL OR NOT EXISTS (
        SELECT 1 FROM tasks p WHERE p.id = t.parent_id AND p.type = 'routine'
      ))
    ORDER BY t.priority, t.created_at
  `).all()

  // Also get level 0 routine tasks that don't have children (main routine tasks)
  const routineLevel0TasksWithoutChildren = db.prepare(`
    SELECT
      t.id,
      t.title,
      t.type,
      t.level,
      t.priority,
      t.deadline,
      NULL as parentId,
      NULL as parentTitle,
      NULL as grandparentId,
      NULL as grandparentTitle
    FROM tasks t
    WHERE t.level = 0
      AND t.type = 'routine'
      AND NOT EXISTS (
        SELECT 1 FROM tasks child WHERE child.parent_id = t.id
      )
    ORDER BY t.priority, t.created_at
  `).all()

  const allRoutines = [...routineLevel2Tasks, ...orphanedRoutineLevel2Tasks, ...routineLevel1TasksWithoutChildren, ...orphanedRoutineLevel1Tasks, ...routineLevel0TasksWithoutChildren]

  if (allRoutines.length === 0) {
    return []
  }

  // Filter out completed tasks using completed-tasks-db
  const completedTasksDb = require('./completed-tasks-db').default

  // Get completion status for all tasks
  const taskIds = allRoutines.map((task: any) => task.id)
  const completionStatusMap = completedTasksDb.getTasksCompletionStatus(taskIds)

  // Filter out completed tasks
  const schedulableRoutines = allRoutines.filter((task: any) => {
    const status = completionStatusMap.get(task.id)
    return !status?.isCompleted
  })

  // Sort by priority
  schedulableRoutines.sort((a: any, b: any) => {
    const priorityA = a.priority === 999 ? Infinity : (a.priority || Infinity)
    const priorityB = b.priority === 999 ? Infinity : (b.priority || Infinity)
    return priorityA - priorityB
  })

  return schedulableRoutines
}

// Get tasks due within next N days
export function getTasksDueSoon(days: number = 2) {
  const db = tasksDbManager.getDb()

  // Calculate the target date (today + N days)
  const today = new Date()
  const targetDate = new Date(today)
  targetDate.setDate(today.getDate() + days)

  const todayStr = today.toISOString().split('T')[0]
  const targetDateStr = targetDate.toISOString().split('T')[0]

  // Get all level 2 tasks due soon
  const level2TasksDue = db.prepare(`
    SELECT
      t.id,
      t.title,
      t.type,
      t.level,
      t.priority,
      t.deadline,
      t.parent_id as parentId,
      p.title as parentTitle,
      p.parent_id as grandparentId,
      gp.title as grandparentTitle
    FROM tasks t
    LEFT JOIN tasks p ON t.parent_id = p.id
    LEFT JOIN tasks gp ON p.parent_id = gp.id
    WHERE t.level = 2
      AND t.deadline IS NOT NULL
      AND t.deadline >= ?
      AND t.deadline <= ?
    ORDER BY t.deadline ASC, t.priority
  `).all(todayStr, targetDateStr)

  // Get level 1 tasks without children that are due soon
  const level1TasksDue = db.prepare(`
    SELECT
      t.id,
      t.title,
      t.type,
      t.level,
      t.priority,
      t.deadline,
      t.parent_id as parentId,
      p.title as parentTitle,
      NULL as grandparentId,
      NULL as grandparentTitle
    FROM tasks t
    LEFT JOIN tasks p ON t.parent_id = p.id
    WHERE t.level = 1
      AND t.deadline IS NOT NULL
      AND t.deadline >= ?
      AND t.deadline <= ?
      AND NOT EXISTS (
        SELECT 1 FROM tasks child WHERE child.parent_id = t.id
      )
    ORDER BY t.deadline ASC, t.priority
  `).all(todayStr, targetDateStr)

  const allDueTasks = [...level2TasksDue, ...level1TasksDue]

  if (allDueTasks.length === 0) {
    return []
  }

  // Filter out completed tasks
  const completedTasksDb = require('./completed-tasks-db').default
  const taskIds = allDueTasks.map(task => task.id)
  const completionStatusMap = completedTasksDb.getTasksCompletionStatus(taskIds)

  const dueTasks = allDueTasks.filter(task => {
    const status = completionStatusMap.get(task.id)
    return !status?.isCompleted
  })

  // Sort by deadline
  dueTasks.sort((a, b) => a.deadline.localeCompare(b.deadline))

  return dueTasks
}

export default tasksDbManager
