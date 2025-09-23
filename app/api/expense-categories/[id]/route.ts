import { NextRequest, NextResponse } from 'next/server'

import expensesDbManager from '@/lib/expenses-db'

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id, 10)
    if (Number.isNaN(id)) {
      return NextResponse.json({ error: 'Invalid category id' }, { status: 400 })
    }

    const body = await request.json()
    const updates: Record<string, unknown> = {}

    if (body.name !== undefined) {
      updates.name = body.name
    }
    if (body.colorHex !== undefined) {
      updates.colorHex = body.colorHex
    }

    const success = expensesDbManager.updateCategory(id, updates)
    if (!success) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to update expense category:', error)
    return NextResponse.json(
      { error: 'Failed to update expense category' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id, 10)
    if (Number.isNaN(id)) {
      return NextResponse.json({ error: 'Invalid category id' }, { status: 400 })
    }

    const success = expensesDbManager.deleteCategory(id)
    if (!success) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to delete expense category:', error)
    return NextResponse.json(
      { error: 'Failed to delete expense category' },
      { status: 500 }
    )
  }
}
