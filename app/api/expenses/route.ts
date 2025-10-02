import { NextRequest, NextResponse } from 'next/server'

import expensesDbManager from '@/lib/expenses-db'
import { saveReceiptBlobs } from '@/lib/receipts'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const categoryIdParam = searchParams.get('categoryId')
    const startDate = searchParams.get('startDate') || undefined
    const endDate = searchParams.get('endDate') || undefined

    const categoryId = categoryIdParam ? parseInt(categoryIdParam, 10) : undefined

    const expenses = expensesDbManager.getExpenses({
      categoryId,
      startDate,
      endDate
    })

    return NextResponse.json(expenses)
  } catch (error) {
    console.error('Failed to fetch expenses:', error)
    return NextResponse.json(
      { error: 'Failed to fetch expenses' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get('content-type') || ''
    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData()
      const title = String(formData.get('title') || '')
      const occurredAt = String(formData.get('occurredAt') || '')
      const amountValue = formData.get('amount')
      const currency = String(formData.get('currency') || 'CNY')
      const note = formData.get('note') ? String(formData.get('note')) : undefined
      const categoryIdValue = formData.get('categoryId')
      const receiptFiles = formData
        .getAll('receipts')
        .filter((entry): entry is File => entry instanceof File)
        .map((blob) => ({
          blob,
          name: typeof (blob as any).name === 'string' ? (blob as any).name : undefined
        }))

      if (!title || !occurredAt || amountValue === null) {
        return NextResponse.json(
          { error: 'Title, occurredAt, and amount are required' },
          { status: 400 }
        )
      }

      const parsedAmount = Number(amountValue)
      if (Number.isNaN(parsedAmount)) {
        return NextResponse.json(
          { error: 'Amount must be a number' },
          { status: 400 }
        )
      }

      const receiptPaths = await saveReceiptBlobs(receiptFiles)

      const newId = expensesDbManager.addExpense({
        title,
        occurredAt,
        amount: parsedAmount,
        currency,
        note,
        categoryId: categoryIdValue ? Number(categoryIdValue) : null,
        receiptPaths
      })

      return NextResponse.json({ id: newId })
    }

    const body = await request.json()
    const { title, occurredAt, amount, note, categoryId, currency, receiptPaths } = body

    if (!title || !occurredAt || amount === undefined) {
      return NextResponse.json(
        { error: 'Title, occurredAt, and amount are required' },
        { status: 400 }
      )
    }

    const parsedAmount = Number(amount)
    if (Number.isNaN(parsedAmount)) {
      return NextResponse.json(
        { error: 'Amount must be a number' },
        { status: 400 }
      )
    }

    const newId = expensesDbManager.addExpense({
      title,
      occurredAt,
      amount: parsedAmount,
      currency: typeof currency === 'string' ? currency : 'CNY',
      note,
      categoryId: categoryId ?? null,
      receiptPaths: Array.isArray(receiptPaths) ? receiptPaths : []
    })

    return NextResponse.json({ id: newId })
  } catch (error) {
    console.error('Failed to add expense:', error)
    return NextResponse.json(
      { error: 'Failed to add expense' },
      { status: 500 }
    )
  }
}
