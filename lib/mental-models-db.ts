import Database from 'better-sqlite3'
import path from 'path'

export interface MentalModel {
  id?: number
  title: string
  description: string
  canvasData: {              // Excalidraw 画布数据
    elements: any[]          // Excalidraw 元素数组
    appState?: any           // 应用状态（视图、主题等）
  }
  thumbnail?: string          // 缩略图预览(base64)
  tags?: string[]            // 标签
  category?: string          // 分类(如：健身、商业、学习等)
  createdAt?: string         // 创建时间
  updatedAt?: string         // 更新时间
}

class MentalModelsDatabaseManager {
  private db: Database.Database | null = null
  private dbPath: string

  constructor() {
    this.dbPath = path.join(process.cwd(), 'data', 'mental-models.db')
  }

  private getDB(): Database.Database {
    if (!this.db) {
      this.db = new Database(this.dbPath)
      this.initDB()
    }
    return this.db
  }

  private initDB() {
    const db = this.getDB()

    // 创建心智模型表
    db.exec(`
      CREATE TABLE IF NOT EXISTS mental_models (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        description TEXT NOT NULL DEFAULT '',
        canvas_data TEXT NOT NULL DEFAULT '{"elements":[],"appState":{}}',  -- JSON格式存储Excalidraw数据
        thumbnail TEXT,                          -- base64缩略图
        tags TEXT DEFAULT '[]',                  -- JSON数组存储标签
        category TEXT DEFAULT '',                -- 分类
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `)

    // 创建更新触发器
    db.exec(`
      CREATE TRIGGER IF NOT EXISTS update_mental_models_timestamp
      AFTER UPDATE ON mental_models
      BEGIN
        UPDATE mental_models
        SET updated_at = CURRENT_TIMESTAMP
        WHERE id = NEW.id;
      END
    `)
  }

  // 获取所有心智模型
  public getAllMentalModels(): MentalModel[] {
    const db = this.getDB()
    const stmt = db.prepare(`
      SELECT * FROM mental_models
      ORDER BY updated_at DESC
    `)

    const rows = stmt.all() as any[]
    return rows.map(row => this.mapRowToMentalModel(row))
  }

  // 根据ID获取心智模型
  public getMentalModelById(id: number): MentalModel | null {
    const db = this.getDB()
    const stmt = db.prepare(`
      SELECT * FROM mental_models WHERE id = ?
    `)

    const row = stmt.get(id) as any
    return row ? this.mapRowToMentalModel(row) : null
  }

  // 创建心智模型
  public createMentalModel(model: Omit<MentalModel, 'id' | 'createdAt' | 'updatedAt'>): MentalModel {
    const db = this.getDB()
    const stmt = db.prepare(`
      INSERT INTO mental_models (title, description, canvas_data, thumbnail, tags, category)
      VALUES (?, ?, ?, ?, ?, ?)
    `)

    const result = stmt.run(
      model.title,
      model.description,
      JSON.stringify(model.canvasData || { elements: [], appState: {} }),
      model.thumbnail || null,
      JSON.stringify(model.tags || []),
      model.category || ''
    )

    const newModel = this.getMentalModelById(result.lastInsertRowid as number)
    if (!newModel) {
      throw new Error('Failed to create mental model')
    }

    return newModel
  }

  // 更新心智模型
  public updateMentalModel(id: number, updates: Partial<Omit<MentalModel, 'id' | 'createdAt' | 'updatedAt'>>): MentalModel | null {
    const db = this.getDB()

    const fields: string[] = []
    const values: any[] = []

    if (updates.title !== undefined) {
      fields.push('title = ?')
      values.push(updates.title)
    }
    if (updates.description !== undefined) {
      fields.push('description = ?')
      values.push(updates.description)
    }
    if (updates.canvasData !== undefined) {
      fields.push('canvas_data = ?')
      values.push(JSON.stringify(updates.canvasData))
    }
    if (updates.thumbnail !== undefined) {
      fields.push('thumbnail = ?')
      values.push(updates.thumbnail)
    }
    if (updates.tags !== undefined) {
      fields.push('tags = ?')
      values.push(JSON.stringify(updates.tags))
    }
    if (updates.category !== undefined) {
      fields.push('category = ?')
      values.push(updates.category)
    }

    if (fields.length === 0) {
      return this.getMentalModelById(id)
    }

    values.push(id)

    const stmt = db.prepare(`
      UPDATE mental_models
      SET ${fields.join(', ')}
      WHERE id = ?
    `)

    stmt.run(...values)
    return this.getMentalModelById(id)
  }

  // 删除心智模型
  public deleteMentalModel(id: number): boolean {
    const db = this.getDB()
    const stmt = db.prepare('DELETE FROM mental_models WHERE id = ?')
    const result = stmt.run(id)
    return result.changes > 0
  }

  // 根据分类获取心智模型
  public getMentalModelsByCategory(category: string): MentalModel[] {
    const db = this.getDB()
    const stmt = db.prepare(`
      SELECT * FROM mental_models
      WHERE category = ?
      ORDER BY updated_at DESC
    `)

    const rows = stmt.all(category) as any[]
    return rows.map(row => this.mapRowToMentalModel(row))
  }

  // 搜索心智模型
  public searchMentalModels(query: string): MentalModel[] {
    const db = this.getDB()
    const stmt = db.prepare(`
      SELECT * FROM mental_models
      WHERE title LIKE ? OR description LIKE ? OR category LIKE ?
      ORDER BY updated_at DESC
    `)

    const searchTerm = `%${query}%`
    const rows = stmt.all(searchTerm, searchTerm, searchTerm) as any[]
    return rows.map(row => this.mapRowToMentalModel(row))
  }

  // 获取所有分类
  public getCategories(): string[] {
    const db = this.getDB()
    const stmt = db.prepare(`
      SELECT DISTINCT category
      FROM mental_models
      WHERE category != ''
      ORDER BY category
    `)

    const rows = stmt.all() as { category: string }[]
    return rows.map(row => row.category)
  }

  // 辅助方法：将数据库行转换为MentalModel对象
  private mapRowToMentalModel(row: any): MentalModel {
    let canvasData = { elements: [], appState: {} }
    try {
      const parsed = JSON.parse(row.canvas_data || '{"elements":[],"appState":{}}')
      // 兼容旧的数据格式（如果是数组则转换为新格式）
      if (Array.isArray(parsed)) {
        canvasData = { elements: parsed, appState: {} }
      } else {
        canvasData = parsed
      }
    } catch (error) {
      console.warn('Failed to parse canvas data:', error)
      canvasData = { elements: [], appState: {} }
    }

    return {
      id: row.id,
      title: row.title,
      description: row.description,
      canvasData,
      thumbnail: row.thumbnail,
      tags: JSON.parse(row.tags || '[]'),
      category: row.category || undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }
  }

  // 关闭数据库连接
  public close() {
    if (this.db) {
      this.db.close()
      this.db = null
    }
  }
}

// 单例模式
const mentalModelsDB = new MentalModelsDatabaseManager()

export { mentalModelsDB }
export default MentalModelsDatabaseManager