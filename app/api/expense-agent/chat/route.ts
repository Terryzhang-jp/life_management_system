/**
 * Expense Agent Chat API
 *
 * POST /api/expense-agent/chat
 * 接收用户消息（文本或图片），调用 Expense Agent，返回响应
 */

import { NextRequest, NextResponse } from 'next/server'
import { invokeExpenseAgent } from '@/lib/agent/expense-agent-engine'

export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get('content-type')

    let message = ''
    let imageData: { base64: string; mimeType: string } | null = null

    // 处理 multipart/form-data（图片上传）
    if (contentType?.includes('multipart/form-data')) {
      const formData = await request.formData()
      message = (formData.get('message') as string) || '请识别这张图片'
      const imageFile = formData.get('image') as File | null

      if (imageFile) {
        const buffer = await imageFile.arrayBuffer()
        const base64 = Buffer.from(buffer).toString('base64')
        imageData = {
          base64,
          mimeType: imageFile.type
        }
      }
    } else {
      // 处理 JSON（纯文本或预处理的图片数据）
      const body = await request.json()
      message = body.message
      imageData = body.imageData || null
    }

    // 验证消息
    if (!message || message.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: '消息不能为空' },
        { status: 400 }
      )
    }

    // 调用 Expense Agent（图片数据通过 imageData 参数传递，不要在消息中描述）
    const result = await invokeExpenseAgent(message.trim(), 'expense-user-default', imageData)

    // 返回响应
    return NextResponse.json({
      success: result.success,
      reply: result.reply,
      hasImage: !!imageData
    })
  } catch (error: any) {
    console.error('[Expense Agent API] Error:', error)

    return NextResponse.json(
      {
        success: false,
        error: error.message || '处理请求时发生错误',
      },
      { status: 500 }
    )
  }
}
