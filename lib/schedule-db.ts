import Database from 'better-sqlite3'
import path from 'path'

const dbPath = path.join(process.cwd(), 'data', 'schedule.db')
const db = new Database(dbPath)

// Initialize database
db.exec(`
  CREATE TABLE IF NOT EXISTS schedule_blocks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    task_id INTEGER NOT NULL,
    date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    comment TEXT,
    status TEXT DEFAULT 'scheduled',

    -- Redundant fields for performance
    task_title TEXT NOT NULL,
    parent_title TEXT,
    grandparent_title TEXT,

    -- Category fields for performance
    category_id INTEGER,
    category_name TEXT,
    category_color TEXT,

    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`)

// Check and add category columns if they don't exist (for backward compatibility)
try {
  const columns = db.prepare("PRAGMA table_info(schedule_blocks)").all() as any[]
  const hasColumn = (name: string) => columns.some(col => col.name === name)

  if (!hasColumn('category_id')) {
    db.exec('ALTER TABLE schedule_blocks ADD COLUMN category_id INTEGER')
  }
  if (!hasColumn('category_name')) {
    db.exec('ALTER TABLE schedule_blocks ADD COLUMN category_name TEXT')
  }
  if (!hasColumn('category_color')) {
    db.exec('ALTER TABLE schedule_blocks ADD COLUMN category_color TEXT')
  }
} catch (error) {
  console.log('Column migration error for schedule_blocks:', error)
}

// Create indexes for performance
db.exec(`
  CREATE INDEX IF NOT EXISTS idx_schedule_date_range
  ON schedule_blocks(date, start_time, end_time)
`)

db.exec(`
  CREATE INDEX IF NOT EXISTS idx_schedule_task
  ON schedule_blocks(task_id)
`)

db.exec(`
  CREATE INDEX IF NOT EXISTS idx_schedule_status
  ON schedule_blocks(status)
`)

export interface ScheduleBlock {
  id?: number
  taskId: number
  date: string
  startTime: string
  endTime: string
  comment?: string
  status: 'scheduled' | 'in_progress' | 'partially_completed' | 'completed' | 'cancelled'
  taskTitle: string
  parentTitle?: string
  grandparentTitle?: string
  categoryId?: number
  categoryName?: string
  categoryColor?: string
  createdAt?: string
  updatedAt?: string
}

export interface WeekSchedule {
  [date: string]: ScheduleBlock[]
}

interface PastIncompleteOptions {
  sinceDate?: string
  limit?: number
}

// Get schedule blocks for a date range
export function getScheduleByDateRange(startDate: string, endDate: string): ScheduleBlock[] {
  const stmt = db.prepare(`
    SELECT
      id,
      task_id as taskId,
      date,
      start_time as startTime,
      end_time as endTime,
      comment,
      status,
      task_title as taskTitle,
      parent_title as parentTitle,
      grandparent_title as grandparentTitle,
      category_id as categoryId,
      category_name as categoryName,
      category_color as categoryColor,
      created_at as createdAt,
      updated_at as updatedAt
    FROM schedule_blocks
    WHERE date >= ? AND date <= ?
    ORDER BY date, start_time
  `)

  return stmt.all(startDate, endDate) as ScheduleBlock[]
}

// Get schedule blocks for a specific date
export function getScheduleByDate(date: string): ScheduleBlock[] {
  const stmt = db.prepare(`
    SELECT
      id,
      task_id as taskId,
      date,
      start_time as startTime,
      end_time as endTime,
      comment,
      status,
      task_title as taskTitle,
      parent_title as parentTitle,
      grandparent_title as grandparentTitle,
      category_id as categoryId,
      category_name as categoryName,
      category_color as categoryColor,
      created_at as createdAt,
      updated_at as updatedAt
    FROM schedule_blocks
    WHERE date = ?
    ORDER BY start_time
  `)

  return stmt.all(date) as ScheduleBlock[]
}

export function getScheduleBlockById(id: number): ScheduleBlock | null {
  const stmt = db.prepare(`
    SELECT
      id,
      task_id as taskId,
      date,
      start_time as startTime,
      end_time as endTime,
      comment,
      status,
      task_title as taskTitle,
      parent_title as parentTitle,
      grandparent_title as grandparentTitle,
      category_id as categoryId,
      category_name as categoryName,
      category_color as categoryColor,
      created_at as createdAt,
      updated_at as updatedAt
    FROM schedule_blocks
    WHERE id = ?
    LIMIT 1
  `)

  const row = stmt.get(id) as any
  if (!row) return null

  return {
    id: row.id,
    taskId: row.taskId,
    date: row.date,
    startTime: row.startTime,
    endTime: row.endTime,
    comment: row.comment || undefined,
    status: row.status,
    taskTitle: row.taskTitle,
    parentTitle: row.parentTitle || undefined,
    grandparentTitle: row.grandparentTitle || undefined,
    categoryId: row.categoryId || undefined,
    categoryName: row.categoryName || undefined,
    categoryColor: row.categoryColor || undefined,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt
  }
}

// Get past schedule blocks that are not marked completed or cancelled
export function getPastIncompleteBlocks(
  beforeDate: string,
  options: PastIncompleteOptions = {}
): ScheduleBlock[] {
  const { sinceDate, limit = 50 } = options

  const conditions = ['date < ?']
  const params: (string | number)[] = [beforeDate]

  if (sinceDate) {
    conditions.push('date >= ?')
    params.push(sinceDate)
  }

  const query = `
    SELECT
      id,
      task_id as taskId,
      date,
      start_time as startTime,
      end_time as endTime,
      comment,
      status,
      task_title as taskTitle,
      parent_title as parentTitle,
      grandparent_title as grandparentTitle,
      category_id as categoryId,
      category_name as categoryName,
      category_color as categoryColor,
      created_at as createdAt,
      updated_at as updatedAt
    FROM schedule_blocks
    WHERE ${conditions.join(' AND ')}
      AND status NOT IN ('completed', 'cancelled')
    ORDER BY date DESC, start_time ASC
    LIMIT ?
  `

  params.push(limit)

  const stmt = db.prepare(query)
  return stmt.all(...params) as ScheduleBlock[]
}

// Create a new schedule block
export function createScheduleBlock(block: ScheduleBlock): ScheduleBlock {
  const stmt = db.prepare(`
    INSERT INTO schedule_blocks (
      task_id, date, start_time, end_time, comment, status,
      task_title, parent_title, grandparent_title,
      category_id, category_name, category_color
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `)

  const result = stmt.run(
    block.taskId,
    block.date,
    block.startTime,
    block.endTime,
    block.comment || null,
    block.status || 'scheduled',
    block.taskTitle,
    block.parentTitle || null,
    block.grandparentTitle || null,
    block.categoryId || null,
    block.categoryName || null,
    block.categoryColor || null
  )

  return { ...block, id: result.lastInsertRowid as number }
}

// Update a schedule block
export function updateScheduleBlock(id: number, updates: Partial<ScheduleBlock>): void {
  const fields = []
  const values = []

  if (updates.date !== undefined) {
    fields.push('date = ?')
    values.push(updates.date)
  }
  if (updates.startTime !== undefined) {
    fields.push('start_time = ?')
    values.push(updates.startTime)
  }
  if (updates.endTime !== undefined) {
    fields.push('end_time = ?')
    values.push(updates.endTime)
  }
  if (updates.comment !== undefined) {
    fields.push('comment = ?')
    values.push(updates.comment)
  }
  if (updates.status !== undefined) {
    fields.push('status = ?')
    values.push(updates.status)
  }
  if (updates.categoryId !== undefined) {
    fields.push('category_id = ?')
    values.push(updates.categoryId)
  }
  if (updates.categoryName !== undefined) {
    fields.push('category_name = ?')
    values.push(updates.categoryName)
  }
  if (updates.categoryColor !== undefined) {
    fields.push('category_color = ?')
    values.push(updates.categoryColor)
  }

  if (fields.length === 0) return

  fields.push('updated_at = CURRENT_TIMESTAMP')
  values.push(id)

  const stmt = db.prepare(`
    UPDATE schedule_blocks
    SET ${fields.join(', ')}
    WHERE id = ?
  `)

  stmt.run(...values)
}

// Delete a schedule block
export function deleteScheduleBlock(id: number): void {
  const stmt = db.prepare('DELETE FROM schedule_blocks WHERE id = ?')
  stmt.run(id)
}

// Check for time conflicts
export function checkTimeConflict(
  date: string,
  startTime: string,
  endTime: string,
  excludeId?: number
): ScheduleBlock[] {
  let query = `
    SELECT
      id,
      task_id as taskId,
      date,
      start_time as startTime,
      end_time as endTime,
      task_title as taskTitle
    FROM schedule_blocks
    WHERE date = ?
    AND status != 'cancelled'
    AND (
      (start_time < ? AND end_time > ?) OR
      (start_time >= ? AND start_time < ?) OR
      (end_time > ? AND end_time <= ?)
    )
  `

  if (excludeId) {
    query += ' AND id != ?'
  }

  const stmt = db.prepare(query)
  const params = [date, endTime, startTime, startTime, endTime, startTime, endTime]
  if (excludeId) params.push(excludeId)

  return stmt.all(...params) as ScheduleBlock[]
}

// Get schedule blocks by task ID
export function getScheduleByTaskId(taskId: number): ScheduleBlock[] {
  const stmt = db.prepare(`
    SELECT
      id,
      task_id as taskId,
      date,
      start_time as startTime,
      end_time as endTime,
      comment,
      status,
      task_title as taskTitle,
      parent_title as parentTitle,
      grandparent_title as grandparentTitle,
      created_at as createdAt,
      updated_at as updatedAt
    FROM schedule_blocks
    WHERE task_id = ?
    ORDER BY date, start_time
  `)

  return stmt.all(taskId) as ScheduleBlock[]
}

// Get week schedule (Monday to Sunday)
export function getWeekSchedule(weekStart: string): WeekSchedule {
  // Calculate week end (6 days after start)
  const startDate = new Date(weekStart)
  const endDate = new Date(startDate)
  endDate.setDate(endDate.getDate() + 6)

  const blocks = getScheduleByDateRange(
    weekStart,
    endDate.toISOString().split('T')[0]
  )

  // Group by date
  const schedule: WeekSchedule = {}
  blocks.forEach(block => {
    if (!schedule[block.date]) {
      schedule[block.date] = []
    }
    schedule[block.date].push(block)
  })

  return schedule
}

// Update schedule block status
export function updateScheduleStatus(id: number, status: ScheduleBlock['status']): void {
  const stmt = db.prepare(`
    UPDATE schedule_blocks
    SET status = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `)
  stmt.run(status, id)
}

// Batch create schedule blocks (for recurring tasks)
export function batchCreateScheduleBlocks(blocks: ScheduleBlock[]): void {
  const stmt = db.prepare(`
    INSERT INTO schedule_blocks (
      task_id, date, start_time, end_time, comment, status,
      task_title, parent_title, grandparent_title
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `)

  const transaction = db.transaction(() => {
    for (const block of blocks) {
      stmt.run(
        block.taskId,
        block.date,
        block.startTime,
        block.endTime,
        block.comment || null,
        block.status || 'scheduled',
        block.taskTitle,
        block.parentTitle || null,
        block.grandparentTitle || null
      )
    }
  })

  transaction()
}

export default db
