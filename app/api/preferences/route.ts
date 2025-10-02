import { NextRequest, NextResponse } from 'next/server'
import dbManager from '@/lib/db'

// GET: 获取用户偏好设置
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const key = searchParams.get('key')

    if (!key) {
      return NextResponse.json(
        { error: 'Key parameter is required' },
        { status: 400 }
      )
    }

    const value = await dbManager.getPreference(key)

    if (value === null) {
      return NextResponse.json(
        { error: 'Preference not found' },
        { status: 404 }
      )
    }

    // 尝试解析为 JSON，如果失败则返回原始字符串
    let parsedValue
    try {
      parsedValue = JSON.parse(value)
    } catch {
      parsedValue = value
    }

    return NextResponse.json({ key, value: parsedValue }, { status: 200 })

  } catch (error: any) {
    console.error('Error getting preference:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to get preference' },
      { status: 500 }
    )
  }
}

// PUT: 保存用户偏好设置
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { key, value } = body

    if (!key) {
      return NextResponse.json(
        { error: 'Key is required' },
        { status: 400 }
      )
    }

    if (value === undefined) {
      return NextResponse.json(
        { error: 'Value is required' },
        { status: 400 }
      )
    }

    // 将值转换为字符串存储（如果是对象则 JSON.stringify）
    const stringValue = typeof value === 'string' ? value : JSON.stringify(value)

    await dbManager.setPreference(key, stringValue)

    return NextResponse.json({ success: true, key }, { status: 200 })

  } catch (error: any) {
    console.error('Error setting preference:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to set preference' },
      { status: 500 }
    )
  }
}

// DELETE: 删除用户偏好设置
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const key = searchParams.get('key')

    if (!key) {
      return NextResponse.json(
        { error: 'Key parameter is required' },
        { status: 400 }
      )
    }

    await dbManager.deletePreference(key)

    return NextResponse.json({ success: true, key }, { status: 200 })

  } catch (error: any) {
    console.error('Error deleting preference:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to delete preference' },
      { status: 500 }
    )
  }
}
