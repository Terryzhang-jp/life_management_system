import Database from 'better-sqlite3'
import path from 'path'

export interface TaskCategory {
  id?: number
  name: string
  color: string
  icon?: string
  order?: number
  createdAt?: string
  updatedAt?: string
}

class TaskCategoriesDatabaseManager {
  private db: Database.Database | null = null
  private dbPath: string

  constructor() {
    this.dbPath = path.join(process.cwd(), 'data', 'task_categories.db')
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
    const db = this.db!

    // 创建任务分类表
    db.exec(`
      CREATE TABLE IF NOT EXISTS task_categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        color TEXT NOT NULL,
        icon TEXT,
        display_order INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `)

    // 插入默认分类（如果表是空的）
    const count = db.prepare('SELECT COUNT(*) as count FROM task_categories').get() as { count: number }
    if (count.count === 0) {
      const defaultCategories = [
        { name: '工作', color: '#3B82F6', order: 1 },
        { name: '学习', color: '#10B981', order: 2 },
        { name: '自我提升', color: '#8B5CF6', order: 3 },
        { name: '健康', color: '#EF4444', order: 4 },
        { name: '生活', color: '#F59E0B', order: 5 },
        { name: '娱乐', color: '#EC4899', order: 6 },
        { name: '通勤', color: '#6B7280', order: 7 },
      ]

      const stmt = db.prepare(`
        INSERT INTO task_categories (name, color, display_order)
        VALUES (@name, @color, @order)
      `)

      for (const category of defaultCategories) {
        stmt.run(category)
      }
    }
  }

  // 获取所有分类
  getAllCategories(): TaskCategory[] {
    const db = this.getDb()
    const stmt = db.prepare(`
      SELECT
        id, name, color, icon, display_order as "order",
        created_at as createdAt, updated_at as updatedAt
      FROM task_categories
      ORDER BY display_order ASC, id ASC
    `)
    return stmt.all() as TaskCategory[]
  }

  // 创建分类
  createCategory(category: Omit<TaskCategory, 'id' | 'createdAt' | 'updatedAt'>): TaskCategory {
    const db = this.getDb()

    // 检查名称是否已存在
    const existing = db.prepare('SELECT id FROM task_categories WHERE name = ?').get(category.name)
    if (existing) {
      throw new Error('分类名称已存在')
    }

    const stmt = db.prepare(`
      INSERT INTO task_categories (name, color, icon, display_order)
      VALUES (@name, @color, @icon, @order)
    `)

    const result = stmt.run({
      name: category.name,
      color: category.color,
      icon: category.icon || null,
      order: category.order || 0
    })

    return this.getCategoryById(result.lastInsertRowid as number)!
  }

  // 更新分类
  updateCategory(id: number, updates: Partial<Omit<TaskCategory, 'id' | 'createdAt' | 'updatedAt'>>): TaskCategory | null {
    const db = this.getDb()

    // 如果更新名称，检查是否重复
    if (updates.name) {
      const existing = db.prepare('SELECT id FROM task_categories WHERE name = ? AND id != ?').get(updates.name, id)
      if (existing) {
        throw new Error('分类名称已存在')
      }
    }

    const setClauses = []
    const params: any = { id }

    if (updates.name !== undefined) {
      setClauses.push('name = @name')
      params.name = updates.name
    }
    if (updates.color !== undefined) {
      setClauses.push('color = @color')
      params.color = updates.color
    }
    if (updates.icon !== undefined) {
      setClauses.push('icon = @icon')
      params.icon = updates.icon || null
    }
    if (updates.order !== undefined) {
      setClauses.push('display_order = @order')
      params.order = updates.order
    }

    if (setClauses.length === 0) return this.getCategoryById(id)

    setClauses.push('updated_at = CURRENT_TIMESTAMP')

    const stmt = db.prepare(`
      UPDATE task_categories
      SET ${setClauses.join(', ')}
      WHERE id = @id
    `)

    stmt.run(params)
    return this.getCategoryById(id)
  }

  // 删除分类
  deleteCategory(id: number): boolean {
    const db = this.getDb()

    // 检查是否有任务在使用这个分类
    const tasksDb = new Database(path.join(process.cwd(), 'data', 'tasks.db'))
    const tasksCount = tasksDb.prepare('SELECT COUNT(*) as count FROM tasks WHERE category_id = ?').get(id) as { count: number }
    tasksDb.close()

    if (tasksCount.count > 0) {
      throw new Error(`该分类下还有 ${tasksCount.count} 个任务，请先修改这些任务的分类`)
    }

    const stmt = db.prepare('DELETE FROM task_categories WHERE id = ?')
    const result = stmt.run(id)
    return result.changes > 0
  }

  // 根据ID获取分类
  getCategoryById(id: number): TaskCategory | null {
    const db = this.getDb()
    const stmt = db.prepare(`
      SELECT
        id, name, color, icon, display_order as "order",
        created_at as createdAt, updated_at as updatedAt
      FROM task_categories
      WHERE id = ?
    `)
    return stmt.get(id) as TaskCategory | null
  }

  close() {
    if (this.db) {
      this.db.close()
      this.db = null
    }
  }
}

const taskCategoriesDb = new TaskCategoriesDatabaseManager()
export default taskCategoriesDb