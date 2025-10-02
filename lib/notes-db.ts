import Database from 'better-sqlite3'
import path from 'path'

export interface Note {
  id?: number
  title: string
  content: string
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

  async getAllNotes(): Promise<Note[]> {
    const db = this.getDb()
    const rows = db.prepare('SELECT * FROM notes ORDER BY created_at DESC').all() as any[]

    return rows.map(row => ({
      id: row.id,
      title: row.title,
      content: row.content,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }))
  }

  async getNote(id: number): Promise<Note | null> {
    const db = this.getDb()
    const row = db.prepare('SELECT * FROM notes WHERE id = ?').get(id) as any

    if (!row) {
      return null
    }

    return {
      id: row.id,
      title: row.title,
      content: row.content,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }
  }

  async createNote(title: string = '新笔记'): Promise<number> {
    const db = this.getDb()
    const result = db.prepare(`
      INSERT INTO notes (title, content)
      VALUES (?, ?)
    `).run(title, '')

    return result.lastInsertRowid as number
  }

  async updateNote(id: number, data: Partial<Pick<Note, 'title' | 'content'>>): Promise<void> {
    const db = this.getDb()

    const updates: string[] = []
    const values: any[] = []

    if (data.title !== undefined) {
      updates.push('title = ?')
      values.push(data.title)
    }

    if (data.content !== undefined) {
      updates.push('content = ?')
      values.push(data.content)
    }

    if (updates.length > 0) {
      updates.push('updated_at = CURRENT_TIMESTAMP')
      values.push(id)

      db.prepare(`
        UPDATE notes
        SET ${updates.join(', ')}
        WHERE id = ?
      `).run(...values)
    }
  }

  async deleteNote(id: number): Promise<void> {
    const db = this.getDb()
    db.prepare('DELETE FROM notes WHERE id = ?').run(id)
  }

  close() {
    if (this.db) {
      this.db.close()
      this.db = null
    }
  }
}

const notesManager = new NotesManager()

export default notesManager