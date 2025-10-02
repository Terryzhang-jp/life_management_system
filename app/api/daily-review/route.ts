import { NextRequest, NextResponse } from 'next/server'
import dailyReviewsManager from '@/lib/daily-reviews-db'

// GET: 获取今日回顾
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const date = searchParams.get('date')

    if (!date) {
      return NextResponse.json({ error: 'Date parameter is required' }, { status: 400 })
    }

    const review = await dailyReviewsManager.getTodayReview(date)

    if (!review) {
      return NextResponse.json({ exists: false }, { status: 200 })
    }

    return NextResponse.json({ exists: true, review }, { status: 200 })
  } catch (error) {
    console.error('Error fetching daily review:', error)
    return NextResponse.json({ error: 'Failed to fetch daily review' }, { status: 500 })
  }
}

// POST: 创建回顾
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { date, initialInput } = body

    if (!date || !initialInput) {
      return NextResponse.json({ error: 'Date and initialInput are required' }, { status: 400 })
    }

    const id = await dailyReviewsManager.createReview({ date, initialInput })

    return NextResponse.json({ id, success: true }, { status: 201 })
  } catch (error) {
    console.error('Error creating daily review:', error)
    return NextResponse.json({ error: 'Failed to create daily review' }, { status: 500 })
  }
}

// DELETE: 删除回顾
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const date = searchParams.get('date')

    if (!date) {
      return NextResponse.json({ error: 'Date parameter is required' }, { status: 400 })
    }

    await dailyReviewsManager.deleteReview(date)

    return NextResponse.json({ success: true }, { status: 200 })
  } catch (error) {
    console.error('Error deleting daily review:', error)
    return NextResponse.json({ error: 'Failed to delete daily review' }, { status: 500 })
  }
}