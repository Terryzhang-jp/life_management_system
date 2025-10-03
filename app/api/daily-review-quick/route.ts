import { NextResponse } from 'next/server'
import dailyReviewDb, { calculateScores } from '@/lib/daily-review-quick-db'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type')

    if (type === 'today') {
      const review = dailyReviewDb.getTodayReview()

      if (review) {
        const scores = calculateScores(review)
        return NextResponse.json({ ...review, ...scores })
      }

      return NextResponse.json(null)
    }

    if (type === 'recent') {
      const days = parseInt(searchParams.get('days') || '7')
      const reviews = dailyReviewDb.getRecentReviews(days)
      const reviewsWithScores = reviews.map(review => ({
        ...review,
        ...calculateScores(review)
      }))
      return NextResponse.json(reviewsWithScores)
    }

    return NextResponse.json({ error: 'Invalid type parameter' }, { status: 400 })
  } catch (error: any) {
    console.error('Error fetching daily review:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const review = dailyReviewDb.saveTodayReview(body)
    const scores = calculateScores(review)

    return NextResponse.json({ ...review, ...scores })
  } catch (error: any) {
    console.error('Error saving daily review:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
