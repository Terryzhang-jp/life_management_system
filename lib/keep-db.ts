/**
 * Keep 收集箱数据库操作
 *
 * 功能：
 * 1. 笔记CRUD操作
 * 2. 标签管理
 * 3. 置顶功能
 */

import Database from 'better-sqlite3'
import path from 'path'

const dbPath = path.join(process.cwd(), 'data', 'keep.db')
const db = new Database(dbPath)

// 初始化数据库表
export function initKeepDB() {
  // 笔记表
  db.exec(`
    CREATE TABLE IF NOT EXISTS keep_notes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT,
      content TEXT NOT NULL,
      note_type TEXT DEFAULT 'text',
      checklist_items TEXT,
      color TEXT DEFAULT '#ffffff',
      is_pinned INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `)

  // 标签表
  db.exec(`
    CREATE TABLE IF NOT EXISTS keep_labels (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      color TEXT DEFAULT '#e8eaed',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `)

  // 笔记-标签关联表
  db.exec(`
    CREATE TABLE IF NOT EXISTS keep_note_labels (
      note_id INTEGER NOT NULL,
      label_id INTEGER NOT NULL,
      PRIMARY KEY (note_id, label_id),
      FOREIGN KEY (note_id) REFERENCES keep_notes(id) ON DELETE CASCADE,
      FOREIGN KEY (label_id) REFERENCES keep_labels(id) ON DELETE CASCADE
    )
  `)

  console.log('✅ Keep数据库初始化完成')
}

// 初始化数据库
initKeepDB()

export interface ChecklistItem {
  id: string
  text: string
  checked: boolean
}

export interface KeepNote {
  id?: number
  title?: string
  content: string
  noteType: 'text' | 'checklist'
  checklistItems?: ChecklistItem[]
  color: string
  isPinned: boolean
  labels?: KeepLabel[]
  createdAt?: string
  updatedAt?: string
}

export interface KeepLabel {
  id?: number
  name: string
  color: string
  createdAt?: string
}

// ========== 笔记操作 ==========

/**
 * 获取所有笔记
 * @param options - 可选的过滤选项
 */
export function getAllNotes(options?: {
  startDate?: string  // YYYY-MM-DD 格式
  endDate?: string    // YYYY-MM-DD 格式
}): KeepNote[] {
  let query = `
    SELECT
      id,
      title,
      content,
      note_type as noteType,
      checklist_items as checklistItems,
      color,
      is_pinned as isPinned,
      created_at as createdAt,
      updated_at as updatedAt
    FROM keep_notes
    WHERE 1=1
  `

  const params: any[] = []

  // 添加日期过滤条件
  if (options?.startDate) {
    query += ` AND date(created_at) >= date(?)`
    params.push(options.startDate)
  }

  if (options?.endDate) {
    query += ` AND date(created_at) <= date(?)`
    params.push(options.endDate)
  }

  query += ` ORDER BY is_pinned DESC, updated_at DESC`

  const notes = db.prepare(query).all(...params) as any[]

  // 为每个笔记加载标签并解析checklist
  return notes.map(note => ({
    ...note,
    isPinned: Boolean(note.isPinned),  // 确保转换为布尔值
    checklistItems: note.checklistItems ? JSON.parse(note.checklistItems) : undefined,
    labels: getNoteLabels(note.id!)
  }))
}

/**
 * 根据标签筛选笔记
 */
export function getNotesByLabel(labelId: number): KeepNote[] {
  const notes = db.prepare(`
    SELECT DISTINCT
      n.id,
      n.title,
      n.content,
      n.note_type as noteType,
      n.checklist_items as checklistItems,
      n.color,
      n.is_pinned as isPinned,
      n.created_at as createdAt,
      n.updated_at as updatedAt
    FROM keep_notes n
    INNER JOIN keep_note_labels nl ON n.id = nl.note_id
    WHERE nl.label_id = ?
    ORDER BY n.is_pinned DESC, n.updated_at DESC
  `).all(labelId) as any[]

  return notes.map(note => ({
    ...note,
    isPinned: Boolean(note.isPinned),  // 确保转换为布尔值
    checklistItems: note.checklistItems ? JSON.parse(note.checklistItems) : undefined,
    labels: getNoteLabels(note.id!)
  }))
}

/**
 * 创建笔记
 */
export function createNote(note: Omit<KeepNote, 'id' | 'createdAt' | 'updatedAt'>): number {
  const checklistJson = note.checklistItems ? JSON.stringify(note.checklistItems) : null

  const result = db.prepare(`
    INSERT INTO keep_notes (title, content, note_type, checklist_items, color, is_pinned)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(
    note.title || null,
    note.content,
    note.noteType || 'text',
    checklistJson,
    note.color,
    note.isPinned ? 1 : 0
  )

  const noteId = result.lastInsertRowid as number

  // 添加标签关联
  if (note.labels && note.labels.length > 0) {
    const stmt = db.prepare(`
      INSERT INTO keep_note_labels (note_id, label_id)
      VALUES (?, ?)
    `)
    for (const label of note.labels) {
      if (label.id) {
        stmt.run(noteId, label.id)
      }
    }
  }

  return noteId
}

/**
 * 更新笔记
 */
export function updateNote(id: number, updates: Partial<KeepNote>): void {
  const fields: string[] = []
  const values: any[] = []

  if (updates.title !== undefined) {
    fields.push('title = ?')
    values.push(updates.title || null)
  }

  if (updates.content !== undefined) {
    fields.push('content = ?')
    values.push(updates.content)
  }

  if (updates.noteType !== undefined) {
    fields.push('note_type = ?')
    values.push(updates.noteType)
  }

  if (updates.checklistItems !== undefined) {
    fields.push('checklist_items = ?')
    values.push(updates.checklistItems ? JSON.stringify(updates.checklistItems) : null)
  }

  if (updates.color !== undefined) {
    fields.push('color = ?')
    values.push(updates.color)
  }

  if (updates.isPinned !== undefined) {
    fields.push('is_pinned = ?')
    values.push(updates.isPinned ? 1 : 0)
  }

  fields.push('updated_at = CURRENT_TIMESTAMP')

  if (fields.length > 0) {
    values.push(id)
    db.prepare(`
      UPDATE keep_notes
      SET ${fields.join(', ')}
      WHERE id = ?
    `).run(...values)
  }

  // 更新标签关联
  if (updates.labels !== undefined) {
    // 先删除所有关联
    db.prepare('DELETE FROM keep_note_labels WHERE note_id = ?').run(id)

    // 重新添加
    if (updates.labels.length > 0) {
      const stmt = db.prepare(`
        INSERT INTO keep_note_labels (note_id, label_id)
        VALUES (?, ?)
      `)
      for (const label of updates.labels) {
        if (label.id) {
          stmt.run(id, label.id)
        }
      }
    }
  }
}

/**
 * 删除笔记
 */
export function deleteNote(id: number): void {
  db.prepare('DELETE FROM keep_notes WHERE id = ?').run(id)
}

/**
 * 切换置顶状态
 */
export function togglePin(id: number): void {
  db.prepare(`
    UPDATE keep_notes
    SET is_pinned = CASE WHEN is_pinned = 1 THEN 0 ELSE 1 END,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(id)
}

// ========== 标签操作 ==========

/**
 * 获取所有标签
 */
export function getAllLabels(): KeepLabel[] {
  return db.prepare(`
    SELECT
      id,
      name,
      color,
      created_at as createdAt
    FROM keep_labels
    ORDER BY name ASC
  `).all() as KeepLabel[]
}

/**
 * 获取笔记的标签
 */
export function getNoteLabels(noteId: number): KeepLabel[] {
  return db.prepare(`
    SELECT
      l.id,
      l.name,
      l.color,
      l.created_at as createdAt
    FROM keep_labels l
    INNER JOIN keep_note_labels nl ON l.id = nl.label_id
    WHERE nl.note_id = ?
    ORDER BY l.name ASC
  `).all(noteId) as KeepLabel[]
}

/**
 * 创建标签
 */
export function createLabel(label: Omit<KeepLabel, 'id' | 'createdAt'>): number {
  const result = db.prepare(`
    INSERT INTO keep_labels (name, color)
    VALUES (?, ?)
  `).run(label.name, label.color)

  return result.lastInsertRowid as number
}

/**
 * 更新标签
 */
export function updateLabel(id: number, updates: Partial<KeepLabel>): void {
  const fields: string[] = []
  const values: any[] = []

  if (updates.name !== undefined) {
    fields.push('name = ?')
    values.push(updates.name)
  }

  if (updates.color !== undefined) {
    fields.push('color = ?')
    values.push(updates.color)
  }

  if (fields.length > 0) {
    values.push(id)
    db.prepare(`
      UPDATE keep_labels
      SET ${fields.join(', ')}
      WHERE id = ?
    `).run(...values)
  }
}

/**
 * 删除标签
 */
export function deleteLabel(id: number): void {
  db.prepare('DELETE FROM keep_labels WHERE id = ?').run(id)
}

export default {
  getAllNotes,
  getNotesByLabel,
  createNote,
  updateNote,
  deleteNote,
  togglePin,
  getAllLabels,
  getNoteLabels,
  createLabel,
  updateLabel,
  deleteLabel
}
