import { NextRequest, NextResponse } from 'next/server'

/**
 * 获取 Soniox 临时 API Key
 *
 * 安全性：
 * - 永久 API Key 保存在服务器端（SONIOX_API_KEY 环境变量）
 * - 前端只接收临时 Key（有效期 5 分钟）
 * - 临时 Key 只能用于 WebSocket 转写
 */
export async function POST(request: NextRequest) {
  try {
    // 1. 读取服务器的永久 API Key
    const apiKey = process.env.SONIOX_API_KEY

    if (!apiKey) {
      console.error('❌ SONIOX_API_KEY 未配置')
      return NextResponse.json(
        { error: 'SONIOX_API_KEY is not configured' },
        { status: 500 }
      )
    }

    console.log('🔑 正在请求 Soniox 临时 API Key...')

    // 2. 请求 Soniox 生成临时 Key
    const response = await fetch('https://api.soniox.com/v1/auth/temporary-api-key', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        usage_type: 'transcribe_websocket',  // 指定用途：WebSocket 转写
        expires_in_seconds: 300,             // 有效期：5 分钟
        client_reference_id: 'life-management-daily-review'  // 客户端标识
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('❌ Soniox API 错误:', response.status, errorText)
      return NextResponse.json(
        { error: `Soniox API error: ${response.status} - ${errorText}` },
        { status: response.status }
      )
    }

    const data = await response.json()

    console.log('✅ 成功获取临时 API Key，有效期至:', data.expires_at)

    // 3. 返回临时 Key 给前端
    return NextResponse.json({
      apiKey: data.api_key,
      expiresAt: data.expires_at
    }, { status: 200 })

  } catch (error: any) {
    console.error('❌ 获取临时 API Key 失败:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to get temporary API key' },
      { status: 500 }
    )
  }
}
