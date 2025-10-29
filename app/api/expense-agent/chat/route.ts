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
    let imagesData: Array<{ base64: string; mimeType: string }> = []

    // 处理 multipart/form-data（图片上传）
    if (contentType?.includes('multipart/form-data')) {
      const formData = await request.formData()
      message = (formData.get('message') as string) || '请识别这些图片'
      const imageCount = parseInt(formData.get('imageCount') as string || '0')

      // 处理多个图片文件
      for (let i = 0; i < imageCount; i++) {
        const imageFile = formData.get(`image${i}`) as File | null
        if (imageFile) {
          const buffer = await imageFile.arrayBuffer()
          const base64 = Buffer.from(buffer).toString('base64')
          imagesData.push({
            base64,
            mimeType: imageFile.type
          })
        }
      }

      // 向后兼容：检查是否有旧的单图片格式
      if (imagesData.length === 0) {
        const singleImage = formData.get('image') as File | null
        if (singleImage) {
          const buffer = await singleImage.arrayBuffer()
          const base64 = Buffer.from(buffer).toString('base64')
          imagesData.push({
            base64,
            mimeType: singleImage.type
          })
        }
      }
    } else {
      // 处理 JSON（纯文本或预处理的图片数据）
      const body = await request.json()
      message = body.message

      // 支持新的多图片格式和旧的单图片格式
      if (body.imagesData && Array.isArray(body.imagesData)) {
        imagesData = body.imagesData
      } else if (body.imageData) {
        imagesData = [body.imageData]
      }
    }

    // 验证消息
    if (!message || message.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: '消息不能为空' },
        { status: 400 }
      )
    }

    // 调用 Expense Agent（图片数据通过 imagesData 参数传递，不要在消息中描述）
    const result = await invokeExpenseAgent(message.trim(), 'expense-user-default', imagesData.length > 0 ? imagesData : undefined)

    // 返回响应
    return NextResponse.json({
      success: result.success,
      reply: result.reply,
      hasImages: imagesData.length > 0,
      imageCount: imagesData.length
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
