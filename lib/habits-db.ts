import Database from 'better-sqlite3'
import path from 'path'

export interface HabitRecord {
  id?: number
  routineId: number      // 关联的日常习惯ID
  recordDate: string     // 打卡日期 (YYYY-MM-DD)
  description?: string   // 打卡细节描述(可选)
  photoPath?: string     // 照片存储路径(可选)
  createdAt?: string     // 创建时间
}

export interface HeatmapData {
  routineId: number
  routineName: string
  records: { [date: string]: boolean }  // date -> hasRecord mapping
}

class HabitsDatabaseManager {
  private db: Database.Database | null = null
  private dbPath: string

  constructor() {
    this.dbPath = path.join(process.cwd(), 'data', 'habits.db')
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

    // 创建习惯记录表
    db.exec(`
      CREATE TABLE IF NOT EXISTS habit_records (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        routine_id INTEGER NOT NULL,
        record_date DATE NOT NULL,
        description TEXT,
        photo_path TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(routine_id, record_date)
      )
    `)

    // 创建索引优化查询性能
    try {
      db.exec('CREATE INDEX IF NOT EXISTS idx_habit_records_date ON habit_records(record_date)')
      db.exec('CREATE INDEX IF NOT EXISTS idx_habit_records_routine ON habit_records(routine_id)')
    } catch (error) {
      console.log('Index creation error:', error)
    }
  }

  // 添加打卡记录
  async addRecord(record: Omit<HabitRecord, 'id' | 'createdAt'>): Promise<number> {
    const db = this.getDb()
    const result = db.prepare(`
      INSERT OR REPLACE INTO habit_records (routine_id, record_date, description, photo_path)
      VALUES (?, ?, ?, ?)
    `).run(
      record.routineId,
      record.recordDate,
      record.description || null,
      record.photoPath || null
    )

    return result.lastInsertRowid as number
  }

  // 获取指定日期范围的记录
  async getRecords(startDate: string, endDate: string, routineId?: number): Promise<HabitRecord[]> {
    const db = this.getDb()

    let query = `
      SELECT * FROM habit_records
      WHERE record_date BETWEEN ? AND ?
    `
    const params: any[] = [startDate, endDate]

    if (routineId) {
      query += ' AND routine_id = ?'
      params.push(routineId)
    }

    query += ' ORDER BY record_date DESC, routine_id'

    const rows = db.prepare(query).all(...params) as any[]

    return rows.map(row => ({
      id: row.id,
      routineId: row.routine_id,
      recordDate: row.record_date,
      description: row.description || undefined,
      photoPath: row.photo_path || undefined,
      createdAt: row.created_at
    }))
  }

  // 删除打卡记录
  async deleteRecord(id: number): Promise<void> {
    const db = this.getDb()
    db.prepare('DELETE FROM habit_records WHERE id = ?').run(id)
  }

  // 获取热力图数据
  async getHeatmapData(startDate: string, endDate: string): Promise<HeatmapData[]> {
    // 由于habits数据库和tasks数据库是分开的，我们需要通过API获取routine任务
    // 这里暂时返回空数组，需要在组件中通过API调用获取
    const db = this.getDb()

    // 获取这个时间范围内的所有记录
    const records = db.prepare(`
      SELECT routine_id, record_date FROM habit_records
      WHERE record_date BETWEEN ? AND ?
    `).all(startDate, endDate) as any[]

    // 如果没有记录，返回空数组
    if (records.length === 0) {
      return []
    }

    // 获取所有出现过的routine ID
    const routineIds = Array.from(new Set(records.map(r => r.routine_id)))

    // 构建热力图数据（这里我们需要从外部获取routine名称）
    const heatmapData: HeatmapData[] = routineIds.map(routineId => {
      const recordMap: { [date: string]: boolean } = {}

      // 为这个routine填充记录
      records
        .filter(record => record.routine_id === routineId)
        .forEach(record => {
          recordMap[record.record_date] = true
        })

      return {
        routineId,
        routineName: `Routine ${routineId}`, // 临时名称，后续从tasks API获取
        records: recordMap
      }
    })

    return heatmapData
  }

  // 获取今日记录
  async getTodayRecords(): Promise<HabitRecord[]> {
    const today = new Date().toISOString().split('T')[0] // YYYY-MM-DD
    return this.getRecords(today, today)
  }

  // 检查某个习惯在某天是否有记录
  async hasRecord(routineId: number, date: string): Promise<boolean> {
    const db = this.getDb()
    const result = db.prepare(`
      SELECT COUNT(*) as count FROM habit_records
      WHERE routine_id = ? AND record_date = ?
    `).get(routineId, date) as any

    return result.count > 0
  }

  close() {
    if (this.db) {
      this.db.close()
      this.db = null
    }
  }
}

const habitsDbManager = new HabitsDatabaseManager()

export default habitsDbManager