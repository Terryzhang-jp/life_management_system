import { NextRequest, NextResponse } from 'next/server'
import { mentalModelsDB, type MentalModel } from '@/lib/mental-models-db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category')
    const search = searchParams.get('search')

    let models: MentalModel[]

    if (search) {
      // 搜索心智模型
      models = mentalModelsDB.searchMentalModels(search)
    } else if (category) {
      // 按分类获取
      models = mentalModelsDB.getMentalModelsByCategory(category)
    } else {
      // 获取所有心智模型
      models = mentalModelsDB.getAllMentalModels()
    }

    return NextResponse.json({
      success: true,
      data: models
    })
  } catch (error) {
    console.error('Error fetching mental models:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch mental models'
      },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // 验证必需字段
    if (!body.title || typeof body.title !== 'string') {
      return NextResponse.json(
        {
          success: false,
          error: 'Title is required and must be a string'
        },
        { status: 400 }
      )
    }

    // 创建新的心智模型
    const newModel: Omit<MentalModel, 'id' | 'createdAt' | 'updatedAt'> = {
      title: body.title,
      description: body.description || '',
      canvasData: body.canvasData || [],
      thumbnail: body.thumbnail || undefined,
      tags: body.tags || [],
      category: body.category || undefined
    }

    const createdModel = mentalModelsDB.createMentalModel(newModel)

    return NextResponse.json({
      success: true,
      data: createdModel
    })
  } catch (error) {
    console.error('Error creating mental model:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create mental model'
      },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()

    if (!body.id || typeof body.id !== 'number') {
      return NextResponse.json(
        {
          success: false,
          error: 'ID is required and must be a number'
        },
        { status: 400 }
      )
    }

    // 构建更新对象，只包含提供的字段
    const updates: Partial<Omit<MentalModel, 'id' | 'createdAt' | 'updatedAt'>> = {}

    if (body.title !== undefined) updates.title = body.title
    if (body.description !== undefined) updates.description = body.description
    if (body.canvasData !== undefined) updates.canvasData = body.canvasData
    if (body.thumbnail !== undefined) updates.thumbnail = body.thumbnail
    if (body.tags !== undefined) updates.tags = body.tags
    if (body.category !== undefined) updates.category = body.category

    const updatedModel = mentalModelsDB.updateMentalModel(body.id, updates)

    if (!updatedModel) {
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
      data: updatedModel
    })
  } catch (error) {
    console.error('Error updating mental model:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to update mental model'
      },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id || isNaN(Number(id))) {
      return NextResponse.json(
        {
          success: false,
          error: 'Valid ID is required'
        },
        { status: 400 }
      )
    }

    const success = mentalModelsDB.deleteMentalModel(Number(id))

    if (!success) {
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
      message: 'Mental model deleted successfully'
    })
  } catch (error) {
    console.error('Error deleting mental model:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to delete mental model'
      },
      { status: 500 }
    )
  }
}