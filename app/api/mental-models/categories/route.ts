import { NextResponse } from 'next/server'
import { mentalModelsDB } from '@/lib/mental-models-db'

export async function GET() {
  try {
    const categories = mentalModelsDB.getCategories()

    return NextResponse.json({
      success: true,
      data: categories
    })
  } catch (error) {
    console.error('Error fetching categories:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch categories'
      },
      { status: 500 }
    )
  }
}