import Database from 'better-sqlite3'
import path from 'path'

const dbPath = path.join(process.cwd(), 'data', 'schedule.db')
const db = new Database(dbPath)

// Initialize database
db.exec(`
  CREATE TABLE IF NOT EXISTS schedule_blocks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    task_id INTEGER,
    type TEXT NOT NULL DEFAULT 'task',
    title TEXT,
    date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    comment TEXT,
    status TEXT DEFAULT 'scheduled',

    -- Redundant fields for performance
    task_title TEXT,
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

// Schema migrations (backward compatibility)
try {
  const getColumns = () => db.prepare('PRAGMA table_info(schedule_blocks)').all() as Array<{ name: string; notnull: number }>
  const hasColumn = (columns: Array<{ name: string }>, name: string) => columns.some(col => col.name === name)

  let columns = getColumns()
  const needsType = !hasColumn(columns, 'type')
  const needsTitle = !hasColumn(columns, 'title')
  const needsCategoryId = !hasColumn(columns, 'category_id')
  const needsCategoryName = !hasColumn(columns, 'category_name')
  const needsCategoryColor = !hasColumn(columns, 'category_color')
  const taskIdNotNull = columns.find(col => col.name === 'task_id')?.notnull === 1
  const taskTitleNotNull = columns.find(col => col.name === 'task_title')?.notnull === 1

  const requiresRebuild = taskIdNotNull || taskTitleNotNull

  if (requiresRebuild) {
    const hasTypeInOldTable = !needsType
    const hasTitleInOldTable = !needsTitle
    const hasCategoryIdInOldTable = !needsCategoryId
    const hasCategoryNameInOldTable = !needsCategoryName
    const hasCategoryColorInOldTable = !needsCategoryColor

    db.exec('ALTER TABLE schedule_blocks RENAME TO schedule_blocks_old')

    db.exec(`
      CREATE TABLE schedule_blocks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        task_id INTEGER,
        type TEXT NOT NULL DEFAULT 'task',
        title TEXT,
        date DATE NOT NULL,
        start_time TIME NOT NULL,
        end_time TIME NOT NULL,
        comment TEXT,
        status TEXT DEFAULT 'scheduled',
        task_title TEXT,
        parent_title TEXT,
        grandparent_title TEXT,
        category_id INTEGER,
        category_name TEXT,
        category_color TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `)

    const selectType = hasTypeInOldTable ? "COALESCE(type, 'task')" : "'task'"
    const selectTitle = hasTitleInOldTable ? "COALESCE(title, task_title, '未命名日程')" : "COALESCE(task_title, '未命名日程')"
    const selectCategoryId = hasCategoryIdInOldTable ? 'category_id' : 'NULL'
    const selectCategoryName = hasCategoryNameInOldTable ? 'category_name' : 'NULL'
    const selectCategoryColor = hasCategoryColorInOldTable ? 'category_color' : 'NULL'

    db.exec(`
      INSERT INTO schedule_blocks (
        id, task_id, type, title, date, start_time, end_time, comment, status,
        task_title, parent_title, grandparent_title,
        category_id, category_name, category_color,
        created_at, updated_at
      )
      SELECT
        id,
        task_id,
        ${selectType},
        ${selectTitle},
        date,
        start_time,
        end_time,
        comment,
        status,
        task_title,
        parent_title,
        grandparent_title,
        ${selectCategoryId},
        ${selectCategoryName},
        ${selectCategoryColor},
        created_at,
        updated_at
      FROM schedule_blocks_old
    `)

    db.exec('DROP TABLE schedule_blocks_old')
    columns = getColumns()
  } else {
    if (needsType) {
      db.exec("ALTER TABLE schedule_blocks ADD COLUMN type TEXT DEFAULT 'task'")
    }
    if (needsTitle) {
      db.exec('ALTER TABLE schedule_blocks ADD COLUMN title TEXT')
    }
    if (needsCategoryId) {
      db.exec('ALTER TABLE schedule_blocks ADD COLUMN category_id INTEGER')
    }
    if (needsCategoryName) {
      db.exec('ALTER TABLE schedule_blocks ADD COLUMN category_name TEXT')
    }
    if (needsCategoryColor) {
      db.exec('ALTER TABLE schedule_blocks ADD COLUMN category_color TEXT')
    }
  }

  // Ensure default values are populated
  db.exec(`UPDATE schedule_blocks SET type = COALESCE(type, 'task')`)
  db.exec(`UPDATE schedule_blocks SET title = COALESCE(title, task_title, '未命名日程')`)
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

db.exec(`
  CREATE INDEX IF NOT EXISTS idx_schedule_type
  ON schedule_blocks(type)
`)

export type ScheduleBlockType = 'task' | 'event'
export type ScheduleBlockStatus = 'scheduled' | 'in_progress' | 'partially_completed' | 'completed' | 'cancelled'

export interface ScheduleBlock {
  id?: number
  type: ScheduleBlockType
  title: string
  date: string
  startTime: string
  endTime: string
  comment?: string
  status: ScheduleBlockStatus
  taskId?: number | null
  taskTitle?: string | null
  parentTitle?: string | null
  grandparentTitle?: string | null
  categoryId?: number | null
  categoryName?: string | null
  categoryColor?: string | null
  createdAt?: string
  updatedAt?: string
}

export interface CreateScheduleBlockInput {
  type: ScheduleBlockType
  title: string
  date: string
  startTime: string
  endTime: string
  status?: ScheduleBlockStatus
  comment?: string
  taskId?: number
  taskTitle?: string
  parentTitle?: string
  grandparentTitle?: string
  categoryId?: number
  categoryName?: string
  categoryColor?: string
}

export interface WeekSchedule {
  [date: string]: ScheduleBlock[]
}

export interface DailyCategorySummary {
  categoryId?: number
  categoryName: string
  categoryColor?: string
  plannedMinutes: number
  effectiveMinutes: number
}

export interface DailyScheduleSummary {
  date: string
  totalPlannedMinutes: number
  totalEffectiveMinutes: number
  categories: DailyCategorySummary[]
}

interface PastIncompleteOptions {
  sinceDate?: string
  limit?: number
}

function mapScheduleRow(row: any): ScheduleBlock {
  return {
    id: row.id,
    type: (row.type ?? 'task') as ScheduleBlockType,
    title: row.title ?? row.taskTitle ?? '未命名日程',
    date: row.date,
    startTime: row.startTime,
    endTime: row.endTime,
    comment: row.comment || undefined,
    status: row.status as ScheduleBlockStatus,
    taskId: row.taskId ?? null,
    taskTitle: row.taskTitle ?? null,
    parentTitle: row.parentTitle ?? null,
    grandparentTitle: row.grandparentTitle ?? null,
    categoryId: row.categoryId ?? null,
    categoryName: row.categoryName || null,
    categoryColor: row.categoryColor || null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt
  }
}

// Get schedule blocks for a date range
export function getScheduleByDateRange(startDate: string, endDate: string): ScheduleBlock[] {
  const stmt = db.prepare(`
    SELECT
      id,
      task_id as taskId,
      type,
      title,
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

  const rows = stmt.all(startDate, endDate) as any[]
  return rows.map(mapScheduleRow)
}

// Get schedule blocks for a specific date
export function getScheduleByDate(date: string): ScheduleBlock[] {
  const stmt = db.prepare(`
    SELECT
      id,
      task_id as taskId,
      type,
      title,
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

  const rows = stmt.all(date) as any[]
  return rows.map(mapScheduleRow)
}

export function getScheduleBlockById(id: number): ScheduleBlock | null {
  const stmt = db.prepare(`
    SELECT
      id,
      task_id as taskId,
      type,
      title,
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

  return mapScheduleRow(row)
}

const EFFECTIVE_STATUSES = new Set(['completed', 'in_progress', 'partially_completed'])
const PLANNED_STATUSES = new Set(['scheduled', 'in_progress', 'partially_completed', 'completed'])

function calculateDurationMinutes(startTime: string, endTime: string): number {
  const [startHour, startMinute] = startTime.split(':').map(Number)
  const [endHour, endMinute] = endTime.split(':').map(Number)
  const startTotal = startHour * 60 + startMinute
  const endTotal = endHour * 60 + endMinute
  const duration = endTotal - startTotal
  return duration > 0 ? duration : 0
}

export function getDailyScheduleSummary(date: string): DailyScheduleSummary {
  const blocks = getScheduleByDate(date)

  let totalPlannedMinutes = 0
  let totalEffectiveMinutes = 0
  const categoryMap = new Map<string, DailyCategorySummary>()

  blocks.forEach(block => {
    const duration = calculateDurationMinutes(block.startTime, block.endTime)
    const isPlanned = PLANNED_STATUSES.has(block.status)
    const isEffective = EFFECTIVE_STATUSES.has(block.status)

    if (!isPlanned && !isEffective) {
      return
    }

    const categoryKey = block.categoryId ? `id_${block.categoryId}` : `name_${block.categoryName || '未分类'}`
    const categoryName = block.categoryName || '未分类'

    if (!categoryMap.has(categoryKey)) {
      categoryMap.set(categoryKey, {
        categoryId: block.categoryId ?? undefined,
        categoryName,
        categoryColor: block.categoryColor ?? undefined,
        plannedMinutes: 0,
        effectiveMinutes: 0
      })
    }

    const summary = categoryMap.get(categoryKey)!

    if (isPlanned) {
      summary.plannedMinutes += duration
      totalPlannedMinutes += duration
    }

    if (isEffective) {
      summary.effectiveMinutes += duration
      totalEffectiveMinutes += duration
    }
  })

  const categories = Array.from(categoryMap.values()).sort((a, b) => b.plannedMinutes - a.plannedMinutes)

  return {
    date,
    totalPlannedMinutes,
    totalEffectiveMinutes,
    categories
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
      type,
      title,
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
  const rows = stmt.all(...params) as any[]
  return rows.map(mapScheduleRow)
}

// Create a new schedule block
export function createScheduleBlock(input: CreateScheduleBlockInput): ScheduleBlock {
  const stmt = db.prepare(`
    INSERT INTO schedule_blocks (
      task_id, type, title, date, start_time, end_time, comment, status,
      task_title, parent_title, grandparent_title,
      category_id, category_name, category_color
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `)

  const result = stmt.run(
    input.taskId ?? null,
    input.type,
    input.title,
    input.date,
    input.startTime,
    input.endTime,
    input.comment ?? null,
    input.status ?? 'scheduled',
    input.taskTitle ?? null,
    input.parentTitle ?? null,
    input.grandparentTitle ?? null,
    input.categoryId ?? null,
    input.categoryName ?? null,
    input.categoryColor ?? null
  )

  const created = getScheduleBlockById(result.lastInsertRowid as number)
  if (!created) {
    throw new Error('Failed to load created schedule block')
  }
  return created
}

// Update a schedule block
export function updateScheduleBlock(id: number, updates: Partial<ScheduleBlock>): void {
  const fields = []
  const values = []

  if (updates.type !== undefined) {
    fields.push('type = ?')
    values.push(updates.type)
  }
  if (updates.title !== undefined) {
    fields.push('title = ?')
    values.push(updates.title)
  }
  if (updates.taskId !== undefined) {
    fields.push('task_id = ?')
    values.push(updates.taskId ?? null)
  }
  if (updates.taskTitle !== undefined) {
    fields.push('task_title = ?')
    values.push(updates.taskTitle ?? null)
  }
  if (updates.parentTitle !== undefined) {
    fields.push('parent_title = ?')
    values.push(updates.parentTitle ?? null)
  }
  if (updates.grandparentTitle !== undefined) {
    fields.push('grandparent_title = ?')
    values.push(updates.grandparentTitle ?? null)
  }
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
    values.push(updates.categoryId ?? null)
  }
  if (updates.categoryName !== undefined) {
    fields.push('category_name = ?')
    values.push(updates.categoryName ?? null)
  }
  if (updates.categoryColor !== undefined) {
    fields.push('category_color = ?')
    values.push(updates.categoryColor ?? null)
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
      type,
      title,
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
  const params: (string | number)[] = [date, endTime, startTime, startTime, endTime, startTime, endTime]
  if (excludeId) params.push(excludeId)

  const rows = stmt.all(...params) as any[]
  return rows.map(mapScheduleRow)
}

// Get schedule blocks by task ID
export function getScheduleByTaskId(taskId: number): ScheduleBlock[] {
  const stmt = db.prepare(`
    SELECT
      id,
      task_id as taskId,
      type,
      title,
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
    WHERE task_id = ?
    ORDER BY date, start_time
  `)

  const rows = stmt.all(taskId) as any[]
  return rows.map(mapScheduleRow)
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
export function batchCreateScheduleBlocks(blocks: CreateScheduleBlockInput[]): void {
  const stmt = db.prepare(`
    INSERT INTO schedule_blocks (
      task_id, type, title, date, start_time, end_time, comment, status,
      task_title, parent_title, grandparent_title,
      category_id, category_name, category_color
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `)

  const transaction = db.transaction(() => {
    for (const block of blocks) {
      stmt.run(
        block.taskId ?? null,
        block.type,
        block.title,
        block.date,
        block.startTime,
        block.endTime,
        block.comment ?? null,
        block.status ?? 'scheduled',
        block.taskTitle ?? null,
        block.parentTitle ?? null,
        block.grandparentTitle ?? null,
        block.categoryId ?? null,
        block.categoryName ?? null,
        block.categoryColor ?? null
      )
    }
  })

  transaction()
}

// Get all unique dates with schedule blocks in a given month
export function getScheduledDatesInMonth(year: number, month: number): string[] {
  // month 是 1-12，转换为两位数字符串
  const monthStr = month.toString().padStart(2, '0')
  const startDate = `${year}-${monthStr}-01`
  const endDate = `${year}-${monthStr}-31`

  const stmt = db.prepare(`
    SELECT DISTINCT date
    FROM schedule_blocks
    WHERE date >= ? AND date <= ?
    ORDER BY date
  `)

  const rows = stmt.all(startDate, endDate) as any[]
  return rows.map(row => row.date)
}

export default db
