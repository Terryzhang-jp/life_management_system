import Database from 'better-sqlite3'
import path from 'path'

export interface Note {
  id?: number
  title: string
  content: string
  createdAt?: string
  updatedAt?: string
}

export interface TextBlock {
  id: string
  x: number
  y: number
  width: number
  height: number
  content: string
  color: 'yellow' | 'blue' | 'green' | 'pink' | 'white'
  fontSize: number
  createdAt?: string
  updatedAt?: string
}

export interface Whiteboard {
  id?: number
  title: string
  textBlocks: TextBlock[]
  canvasState: {
    zoom: number
    panX: number
    panY: number
  }
  createdAt?: string
  updatedAt?: string
}

class NotesManager {
  private db: Database.Database | null = null
  private dbPath: string

  constructor() {
    this.dbPath = path.join(process.cwd(), 'data', 'notes.db')
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

    // 创建笔记表
    db.exec(`
      CREATE TABLE IF NOT EXISTS notes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL DEFAULT '新笔记',
        content TEXT NOT NULL DEFAULT '',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `)
  }

  async getAllWhiteboards(): Promise<Omit<Whiteboard, 'textBlocks' | 'canvasState'>[]> {
    const db = this.getDb()
    const rows = db.prepare('SELECT id, title, created_at, updated_at FROM whiteboards ORDER BY updated_at DESC').all() as any[]

    return rows.map(row => ({
      id: row.id,
      title: row.title,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }))
  }

  async getWhiteboard(id: number): Promise<Whiteboard | null> {
    const db = this.getDb()
    const row = db.prepare('SELECT * FROM whiteboards WHERE id = ?').get(id) as any

    if (!row) {
      return null
    }

    try {
      const textBlocks = JSON.parse(row.canvas_data) as TextBlock[]
      const canvasState = JSON.parse(row.canvas_state)

      return {
        id: row.id,
        title: row.title,
        textBlocks,
        canvasState,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      }
    } catch (error) {
      console.error('Error parsing whiteboard data:', error)
      return null
    }
  }

  async createWhiteboard(title: string = '新白板'): Promise<number> {
    const db = this.getDb()
    const result = db.prepare(`
      INSERT INTO whiteboards (title, canvas_data, canvas_state)
      VALUES (?, ?, ?)
    `).run(title, '[]', '{"zoom":1,"panX":0,"panY":0}')

    return result.lastInsertRowid as number
  }

  async updateWhiteboard(id: number, whiteboard: Partial<Omit<Whiteboard, 'id' | 'createdAt' | 'updatedAt'>>): Promise<void> {
    const db = this.getDb()

    const updates: string[] = []
    const values: any[] = []

    if (whiteboard.title !== undefined) {
      updates.push('title = ?')
      values.push(whiteboard.title)
    }

    if (whiteboard.textBlocks !== undefined) {
      updates.push('canvas_data = ?')
      values.push(JSON.stringify(whiteboard.textBlocks))
    }

    if (whiteboard.canvasState !== undefined) {
      updates.push('canvas_state = ?')
      values.push(JSON.stringify(whiteboard.canvasState))
    }

    if (updates.length > 0) {
      updates.push('updated_at = CURRENT_TIMESTAMP')
      values.push(id)

      db.prepare(`
        UPDATE whiteboards
        SET ${updates.join(', ')}
        WHERE id = ?
      `).run(...values)
    }
  }

  async deleteWhiteboard(id: number): Promise<void> {
    const db = this.getDb()
    db.prepare('DELETE FROM whiteboards WHERE id = ?').run(id)
  }

  close() {
    if (this.db) {
      this.db.close()
      this.db = null
    }
  }
}

const whiteboardDbManager = new NotesManager()

export default whiteboardDbManager