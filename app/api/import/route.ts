import { NextRequest, NextResponse } from 'next/server'
import dbManager from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const data = await request.json()

    // 验证导入的数据结构
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

    await dbManager.importData(lifeData)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error importing data:', error)
    return NextResponse.json(
      { error: 'Failed to import data' },
      { status: 500 }
    )
  }
}