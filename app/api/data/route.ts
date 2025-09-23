import { NextRequest, NextResponse } from 'next/server'
import dbManager from '@/lib/db'

export async function GET() {
  try {
    const data = await dbManager.getData()
    return NextResponse.json(data)
  } catch (error) {
    console.error('Error fetching data:', error)
    return NextResponse.json(
      { error: 'Failed to fetch data' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json()

    // 验证数据结构
    if (!data || typeof data !== 'object') {
      return NextResponse.json(
        { error: 'Invalid data format' },
        { status: 400 }
      )
    }

    // 确保所有字段都存在且为正确类型
    const lifeData = {
      topLogic: data.topLogic || '',
      roles: Array.isArray(data.roles) ? data.roles : [],
      behaviors: Array.isArray(data.behaviors) ? data.behaviors : [],
      wants: Array.isArray(data.wants) ? data.wants : [],
      dontWants: Array.isArray(data.dontWants) ? data.dontWants : [],
      qualities: Array.isArray(data.qualities) ? data.qualities : []
    }

    await dbManager.saveData(lifeData)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error saving data:', error)
    return NextResponse.json(
      { error: 'Failed to save data' },
      { status: 500 }
    )
  }
}