import { NextRequest, NextResponse } from 'next/server'
import { mentalModelsDB } from '@/lib/mental-models-db'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = Number(params.id)

    if (isNaN(id)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid ID'
        },
        { status: 400 }
      )
    }

    const model = mentalModelsDB.getMentalModelById(id)

    if (!model) {
      return NextResponse.json(
        {
          success: false,
          error: 'Mental model not found'
        },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: model
    })
  } catch (error) {
    console.error('Error fetching mental model:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch mental model'
      },
      { status: 500 }
    )
  }
}