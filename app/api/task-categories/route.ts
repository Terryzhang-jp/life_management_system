import { NextRequest, NextResponse } from 'next/server'
import taskCategoriesDb from '@/lib/task-categories-db'

export async function GET() {
  try {
    const categories = taskCategoriesDb.getAllCategories()
    return NextResponse.json(categories)
  } catch (error) {
    console.error('Error fetching categories:', error)
    return NextResponse.json(
      { error: 'Failed to fetch categories' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, color, icon, order } = body

    if (!name || !color) {
      return NextResponse.json(
        { error: '分类名称和颜色是必填项' },
        { status: 400 }
      )
    }

    const category = taskCategoriesDb.createCategory({
      name,
      color,
      icon,
      order
    })

    return NextResponse.json(category, { status: 201 })
  } catch (error: any) {
    console.error('Error creating category:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create category' },
      { status: error.message?.includes('已存在') ? 409 : 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, name, color, icon, order } = body

    if (!id) {
      return NextResponse.json(
        { error: '分类ID是必填项' },
        { status: 400 }
      )
    }

    const category = taskCategoriesDb.updateCategory(id, {
      name,
      color,
      icon,
      order
    })

    if (!category) {
      return NextResponse.json(
        { error: '分类不存在' },
        { status: 404 }
      )
    }

    return NextResponse.json(category)
  } catch (error: any) {
    console.error('Error updating category:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to update category' },
      { status: error.message?.includes('已存在') ? 409 : 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { error: '分类ID是必填项' },
        { status: 400 }
      )
    }

    const success = taskCategoriesDb.deleteCategory(Number(id))

    if (!success) {
      return NextResponse.json(
        { error: '分类不存在' },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error deleting category:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to delete category' },
      { status: error.message?.includes('还有') ? 409 : 500 }
    )
  }
}