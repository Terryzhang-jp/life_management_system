import Database from 'better-sqlite3'
import path from 'path'

export interface ExpenseCategory {
  id?: number
  name: string
  colorHex: string
  createdAt?: string
  updatedAt?: string
}

export interface ExpenseRecord {
  id?: number
  title: string
  occurredAt: string
  amount: number
  currency: string
  note?: string
  categoryId?: number | null
  category?: ExpenseCategory | null
  receiptPaths: string[]
  createdAt?: string
  updatedAt?: string
}

interface ExpenseQueryParams {
  categoryId?: number
  startDate?: string
  endDate?: string
}

class ExpensesDbManager {
  private db: Database.Database | null = null
  private dbPath: string

  constructor() {
    this.dbPath = path.join(process.cwd(), 'data', 'expenses.db')
  }

  private getDb() {
    if (!this.db) {
      const fs = require('fs')
      const dataDir = path.dirname(this.dbPath)
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true })
      }

      this.db = new Database(this.dbPath)
      this.db.pragma('foreign_keys = ON')
      this.initTables()
    }

    return this.db
  }

  private initTables() {
    const db = this.getDb()

    db.exec(`
      CREATE TABLE IF NOT EXISTS expense_categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        color_hex TEXT NOT NULL DEFAULT '#2563eb',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS expenses (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        occurred_at DATETIME NOT NULL,
        amount REAL NOT NULL,
        currency TEXT NOT NULL DEFAULT 'CNY',
        note TEXT,
        category_id INTEGER,
        receipt_paths TEXT DEFAULT '[]',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (category_id) REFERENCES expense_categories(id) ON DELETE SET NULL
      );

      CREATE INDEX IF NOT EXISTS idx_expenses_occurred_at ON expenses(occurred_at DESC);
      CREATE INDEX IF NOT EXISTS idx_expenses_category_id ON expenses(category_id);
    `)

    const hasDefaultCategory = db.prepare('SELECT COUNT(*) as count FROM expense_categories').get() as { count: number }
    if (hasDefaultCategory.count === 0) {
      db.prepare(`
        INSERT INTO expense_categories (name, color_hex)
        VALUES (?, ?)
      `).run('未分类', '#6b7280')
    }

    try {
      const columns = db.prepare("PRAGMA table_info(expenses)").all() as any[]
      const hasCurrencyColumn = columns.some((column) => column.name === 'currency')
      const hasReceiptPathsColumn = columns.some((column) => column.name === 'receipt_paths')
      if (!hasCurrencyColumn) {
        db.exec("ALTER TABLE expenses ADD COLUMN currency TEXT NOT NULL DEFAULT 'CNY'")
        db.exec("UPDATE expenses SET currency = 'CNY' WHERE currency IS NULL OR currency = ''")
      }
      if (!hasReceiptPathsColumn) {
        db.exec("ALTER TABLE expenses ADD COLUMN receipt_paths TEXT DEFAULT '[]'")
        db.exec("UPDATE expenses SET receipt_paths = '[]' WHERE receipt_paths IS NULL OR receipt_paths = ''")
      }
    } catch (error) {
      console.error('Expenses table migration error:', error)
    }
  }

  getCategories(): ExpenseCategory[] {
    const db = this.getDb()
    const rows = db.prepare(`
      SELECT id, name, color_hex, created_at, updated_at
      FROM expense_categories
      ORDER BY name COLLATE NOCASE ASC
    `).all() as any[]

    return rows.map(row => ({
      id: row.id,
      name: row.name,
      colorHex: row.color_hex,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }))
  }

  addCategory(category: Omit<ExpenseCategory, 'id' | 'createdAt' | 'updatedAt'>): number {
    const db = this.getDb()
    const stmt = db.prepare(`
      INSERT INTO expense_categories (name, color_hex)
      VALUES (?, ?)
    `)

    const result = stmt.run(category.name.trim(), category.colorHex || '#2563eb')
    return result.lastInsertRowid as number
  }

  updateCategory(
    id: number,
    updates: Partial<Omit<ExpenseCategory, 'id' | 'createdAt' | 'updatedAt'>>
  ): boolean {
    const db = this.getDb()
    const fields: string[] = []
    const values: any[] = []

    if (updates.name !== undefined) {
      fields.push('name = ?')
      values.push(updates.name.trim())
    }

    if (updates.colorHex !== undefined) {
      fields.push('color_hex = ?')
      values.push(updates.colorHex)
    }

    if (fields.length === 0) {
      return false
    }

    fields.push('updated_at = CURRENT_TIMESTAMP')
    values.push(id)

    const result = db.prepare(`
      UPDATE expense_categories
      SET ${fields.join(', ')}
      WHERE id = ?
    `).run(...values)

    return result.changes > 0
  }

  deleteCategory(id: number): boolean {
    const db = this.getDb()

    const defaultCategory = db.prepare(
      'SELECT id FROM expense_categories WHERE name = ?'
    ).get('未分类') as any

    const defaultCategoryId = defaultCategory?.id || null

    const transaction = db.transaction(() => {
      if (defaultCategoryId && defaultCategoryId !== id) {
        db.prepare('UPDATE expenses SET category_id = ? WHERE category_id = ?').run(defaultCategoryId, id)
      } else {
        db.prepare('UPDATE expenses SET category_id = NULL WHERE category_id = ?').run(id)
      }

      const result = db.prepare('DELETE FROM expense_categories WHERE id = ?').run(id)
      return result.changes > 0
    })

    return transaction()
  }

  getExpenses(params: ExpenseQueryParams = {}): ExpenseRecord[] {
    const db = this.getDb()
    const conditions: string[] = []
    const values: any[] = []

    if (params.categoryId !== undefined) {
      conditions.push('e.category_id = ?')
      values.push(params.categoryId)
    }

    if (params.startDate) {
      conditions.push('DATE(e.occurred_at) >= DATE(?)')
      values.push(params.startDate)
    }

    if (params.endDate) {
      conditions.push('DATE(e.occurred_at) <= DATE(?)')
      values.push(params.endDate)
    }

    const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''

    const rows = db.prepare(
      `SELECT
        e.id,
        e.title,
        e.occurred_at,
        e.amount,
        e.currency,
        e.note,
        e.category_id,
        e.receipt_paths,
        e.created_at,
        e.updated_at,
        c.name AS category_name,
        c.color_hex AS category_color,
        c.created_at AS category_created_at,
        c.updated_at AS category_updated_at
      FROM expenses e
      LEFT JOIN expense_categories c ON e.category_id = c.id
      ${whereClause}
      ORDER BY e.occurred_at DESC, e.id DESC`
    ).all(...values) as any[]

    return rows.map(row => ({
      id: row.id,
      title: row.title,
      occurredAt: row.occurred_at,
      amount: row.amount,
      currency: row.currency || 'CNY',
      note: row.note || '',
      categoryId: row.category_id || null,
      category: row.category_id
        ? {
            id: row.category_id,
            name: row.category_name,
            colorHex: row.category_color,
            createdAt: row.category_created_at,
            updatedAt: row.category_updated_at
          }
        : null,
      receiptPaths: row.receipt_paths ? JSON.parse(row.receipt_paths) : [],
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }))
  }

  addExpense(expense: Omit<ExpenseRecord, 'id' | 'category' | 'createdAt' | 'updatedAt'>): number {
    const db = this.getDb()
    const stmt = db.prepare(`
      INSERT INTO expenses (title, occurred_at, amount, currency, note, category_id, receipt_paths)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `)

    const result = stmt.run(
      expense.title.trim(),
      expense.occurredAt,
      expense.amount,
      expense.currency || 'CNY',
      expense.note?.trim() || null,
      expense.categoryId ?? null,
      JSON.stringify(expense.receiptPaths ?? [])
    )

    return result.lastInsertRowid as number
  }

  updateExpense(
    id: number,
    updates: Partial<Omit<ExpenseRecord, 'id' | 'category' | 'createdAt' | 'updatedAt'>>
  ): boolean {
    const db = this.getDb()
    const fields: string[] = []
    const values: any[] = []

    if (updates.title !== undefined) {
      fields.push('title = ?')
      values.push(updates.title.trim())
    }

    if (updates.occurredAt !== undefined) {
      fields.push('occurred_at = ?')
      values.push(updates.occurredAt)
    }

    if (updates.amount !== undefined) {
      fields.push('amount = ?')
      values.push(updates.amount)
    }

    if (updates.currency !== undefined) {
      fields.push('currency = ?')
      values.push(updates.currency)
    }

    if (updates.note !== undefined) {
      fields.push('note = ?')
      values.push(updates.note?.trim() || null)
    }

    if (updates.categoryId !== undefined) {
      fields.push('category_id = ?')
      values.push(updates.categoryId ?? null)
    }

    if (updates.receiptPaths !== undefined) {
      fields.push('receipt_paths = ?')
      values.push(JSON.stringify(updates.receiptPaths))
    }

    if (fields.length === 0) {
      return false
    }

    fields.push('updated_at = CURRENT_TIMESTAMP')
    values.push(id)

    const result = db.prepare(`
      UPDATE expenses
      SET ${fields.join(', ')}
      WHERE id = ?
    `).run(...values)

    return result.changes > 0
  }

  deleteExpense(id: number): boolean {
    const db = this.getDb()
    const result = db.prepare('DELETE FROM expenses WHERE id = ?').run(id)
    return result.changes > 0
  }
}

const expensesDbManager = new ExpensesDbManager()

export default expensesDbManager
