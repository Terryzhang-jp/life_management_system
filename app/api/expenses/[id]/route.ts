import { NextRequest, NextResponse } from 'next/server'

import expensesDbManager from '@/lib/expenses-db'
import { deleteReceiptPaths, saveReceiptBlobs } from '@/lib/receipts'

const parseNumberField = (value: unknown): number | undefined | null => {
  if (value === null || value === undefined) return undefined
  const parsed = Number(value)
  if (Number.isNaN(parsed)) {
    return null
  }
  return parsed
}

const parseJsonArray = (value: FormDataEntryValue | null) => {
  if (!value) return []
  try {
    const parsed = JSON.parse(String(value))
    return Array.isArray(parsed) ? parsed.filter((item) => typeof item === 'string') : []
  } catch (error) {
    return []
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id, 10)
    if (Number.isNaN(id)) {
      return NextResponse.json({ error: 'Invalid expense id' }, { status: 400 })
    }

    const existingExpense = expensesDbManager.getExpenses().find((expense) => expense.id === id)
    if (!existingExpense) {
      return NextResponse.json({ error: 'Expense not found' }, { status: 404 })
    }

    const contentType = request.headers.get('content-type') || ''
    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData()
      const title = formData.get('title') ? String(formData.get('title')) : undefined
      const occurredAt = formData.get('occurredAt') ? String(formData.get('occurredAt')) : undefined
      const amountValue = formData.get('amount')
      const currency = formData.get('currency') ? String(formData.get('currency')) : undefined
      const note = formData.get('note') ? String(formData.get('note')) : undefined
      const categoryIdValue = formData.get('categoryId')
      const existingReceiptsProvided = formData.has('existingReceipts')
      const keptReceipts = existingReceiptsProvided
        ? parseJsonArray(formData.get('existingReceipts'))
        : existingExpense.receiptPaths
      const newReceiptBlobs = formData
        .getAll('receipts')
        .filter((entry): entry is Blob => entry instanceof Blob)
        .map((blob) => ({
          blob,
          name: typeof (blob as any).name === 'string' ? (blob as any).name : undefined
        }))

      const updates: Record<string, unknown> = {}

      if (title !== undefined) updates.title = title
      if (occurredAt !== undefined) updates.occurredAt = occurredAt

      if (amountValue !== null && amountValue !== undefined) {
        const parsedAmount = parseNumberField(amountValue)
        if (parsedAmount === null) {
          return NextResponse.json({ error: 'Amount must be a number' }, { status: 400 })
        }
        if (parsedAmount !== undefined) {
          updates.amount = parsedAmount
        }
      }

      if (currency !== undefined) updates.currency = currency
      if (note !== undefined) updates.note = note
      if (categoryIdValue !== null && categoryIdValue !== undefined) {
        const parsedCategory = parseNumberField(categoryIdValue)
        updates.categoryId = parsedCategory === null || parsedCategory === undefined ? null : parsedCategory
      }

      const newReceiptPaths = await saveReceiptBlobs(newReceiptBlobs)
      const receiptsToKeep = keptReceipts
      const finalReceiptPaths = [...receiptsToKeep, ...newReceiptPaths]

      const removedPaths = existingExpense.receiptPaths.filter(
        (path) => !receiptsToKeep.includes(path)
      )
      if (removedPaths.length) {
        await deleteReceiptPaths(removedPaths)
      }

      updates.receiptPaths = finalReceiptPaths

      const success = expensesDbManager.updateExpense(id, updates)
      if (!success) {
        return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
      }

      return NextResponse.json({ success: true })
    }

    const body = await request.json()
    const updates: Record<string, unknown> = {}

    if (body.title !== undefined) updates.title = body.title
    if (body.occurredAt !== undefined) updates.occurredAt = body.occurredAt

    if (body.amount !== undefined) {
      const parsed = parseNumberField(body.amount)
      if (parsed === null) {
        return NextResponse.json({ error: 'Amount must be a number' }, { status: 400 })
      }
      if (parsed !== undefined) {
        updates.amount = parsed
      }
    }

    if (body.note !== undefined) updates.note = body.note
    if (body.categoryId !== undefined) updates.categoryId = body.categoryId
    if (body.currency !== undefined) updates.currency = body.currency
    if (Array.isArray(body.receiptPaths)) {
      const keptPaths = body.receiptPaths.filter((path: unknown) => typeof path === 'string')
      const removed = existingExpense.receiptPaths.filter((path) => !keptPaths.includes(path))
      if (removed.length) {
        await deleteReceiptPaths(removed)
      }
      updates.receiptPaths = keptPaths
    }

    const success = expensesDbManager.updateExpense(id, updates)
    if (!success) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to update expense:', error)
    return NextResponse.json(
      { error: 'Failed to update expense' },
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
      return NextResponse.json({ error: 'Invalid expense id' }, { status: 400 })
    }

    const existing = expensesDbManager.getExpenses().find((expense) => expense.id === id)

    const success = expensesDbManager.deleteExpense(id)
    if (!success) {
      return NextResponse.json({ error: 'Expense not found' }, { status: 404 })
    }

    if (existing?.receiptPaths?.length) {
      await deleteReceiptPaths(existing.receiptPaths)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to delete expense:', error)
    return NextResponse.json(
      { error: 'Failed to delete expense' },
      { status: 500 }
    )
  }
}
