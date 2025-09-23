import { NextRequest, NextResponse } from 'next/server'

import expensesDbManager from '@/lib/expenses-db'

export async function GET() {
  try {
    const categories = expensesDbManager.getCategories()
    return NextResponse.json(categories)
  } catch (error) {
    console.error('Failed to fetch expense categories:', error)
    return NextResponse.json(
      { error: 'Failed to fetch expense categories' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, colorHex } = body

    if (!name) {
      return NextResponse.json({ error: 'Category name is required' }, { status: 400 })
    }

    const id = expensesDbManager.addCategory({
      name,
      colorHex: colorHex || '#2563eb'
    })

    return NextResponse.json({ id })
  } catch (error) {
    console.error('Failed to create expense category:', error)
    return NextResponse.json(
      { error: 'Failed to create expense category' },
      { status: 500 }
    )
  }
}
