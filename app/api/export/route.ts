import { NextResponse } from 'next/server'
import dbManager from '@/lib/db'

export async function GET() {
  try {
    const data = await dbManager.exportData()

    // 生成文件名
    const filename = `life-philosophy-${new Date().toISOString().split('T')[0]}.json`

    // 返回 JSON 文件
    return new NextResponse(JSON.stringify(data, null, 2), {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (error) {
    console.error('Error exporting data:', error)
    return NextResponse.json(
      { error: 'Failed to export data' },
      { status: 500 }
    )
  }
}