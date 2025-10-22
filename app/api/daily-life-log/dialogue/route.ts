import { NextRequest, NextResponse } from 'next/server'
import { DailyLifeLog, CompletenessCheck } from '@/lib/daily-life-log-db'

// Gemini API 调用
async function callGeminiAPI(prompt: string): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY

  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured in environment variables')
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: prompt
              }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.8,
          maxOutputTokens: 500
        }
      })
    }
  )

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Gemini API error: ${response.status} - ${errorText}`)
  }

  const data = await response.json()

  if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
    throw new Error('Invalid response from Gemini API')
  }

  return data.candidates[0].content.parts[0].text
}

// POST: 生成对话式补充提示
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { extractedData, completeness, date } = body as {
      extractedData: Partial<DailyLifeLog>
      completeness: CompletenessCheck
      date: string  // 添加日期参数
    }

    // 格式化日期显示
    const formatDate = (dateStr: string) => {
      const d = new Date(dateStr)
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const targetDate = new Date(d)
      targetDate.setHours(0, 0, 0, 0)

      const diffDays = Math.floor((today.getTime() - targetDate.getTime()) / (1000 * 60 * 60 * 24))

      if (diffDays === 0) return '今天'
      if (diffDays === 1) return '昨天'
      if (diffDays === 2) return '前天'

      const month = d.getMonth() + 1
      const day = d.getDate()
      return `${month}月${day}日`
    }

    const dateDisplay = formatDate(date)

    // 如果已经完整，返回祝贺信息
    if (completeness.isComplete) {
      return NextResponse.json({
        message: `太棒了！你${dateDisplay}的记录已经很完整了。记录了起床和睡眠时间、饮食、活动和心情。要保存这条记录吗？`,
        isComplete: true,
        needsInput: false
      })
    }

    // 分析缺失的字段
    const missingFields = completeness.missingFields || []
    const warnings = completeness.warnings || []

    // 构建已记录的信息摘要
    const recordedInfo: string[] = []
    if (extractedData.wakeTime) recordedInfo.push(`起床时间: ${extractedData.wakeTime}`)
    if (extractedData.plannedSleepTime) recordedInfo.push(`计划睡觉: ${extractedData.plannedSleepTime}`)
    if (extractedData.breakfastDescription) recordedInfo.push(`早餐: ${extractedData.breakfastDescription}`)
    if (extractedData.lunchDescription) recordedInfo.push(`午餐: ${extractedData.lunchDescription}`)
    if (extractedData.dinnerDescription) recordedInfo.push(`晚餐: ${extractedData.dinnerDescription}`)
    if (extractedData.morningActivity) recordedInfo.push(`上午活动: ${extractedData.morningActivity}`)
    if (extractedData.morningMood) recordedInfo.push(`上午心情: ${extractedData.morningMood}`)
    if (extractedData.afternoonActivity) recordedInfo.push(`下午活动: ${extractedData.afternoonActivity}`)
    if (extractedData.afternoonMood) recordedInfo.push(`下午心情: ${extractedData.afternoonMood}`)
    if (extractedData.eveningActivity) recordedInfo.push(`晚上活动: ${extractedData.eveningActivity}`)
    if (extractedData.eveningMood) recordedInfo.push(`晚上心情: ${extractedData.eveningMood}`)

    // 构建缺失字段的友好描述
    const fieldNames: Record<string, string> = {
      wakeTime: '起床时间',
      plannedSleepTime: '计划睡觉时间',
      breakfastDescription: '早餐内容',
      lunchDescription: '午餐内容',
      dinnerDescription: '晚餐内容',
      morningActivity: '上午活动',
      morningMood: '上午心情',
      afternoonActivity: '下午活动',
      afternoonMood: '下午心情',
      eveningActivity: '晚上活动',
      eveningMood: '晚上心情',
      nightActivity: '深夜活动',
      nightMood: '深夜心情'
    }

    const missingDescriptions = missingFields.map(field => fieldNames[field] || field)

    // 直接构建结构化的、清晰的消息，不使用 LLM 生成
    // 这样可以确保逻辑清晰、信息明确

    let message = ''

    // 第一部分：明确列出缺失内容
    if (missingFields.length > 0) {
      // 分类缺失项
      const missingCore: string[] = []  // 核心信息
      const missingOptional: string[] = []  // 可选信息

      missingFields.forEach(field => {
        const name = fieldNames[field]
        if (name) {  // 确保字段名存在
          if (['confusions', 'thoughts', 'insights', 'nightActivity', 'nightMood'].includes(field)) {
            missingOptional.push(name)
          } else {
            missingCore.push(name)
          }
        }
      })

      // 只在有缺失项时显示
      if (missingCore.length > 0 || missingOptional.length > 0) {
        message += `我看了一下${dateDisplay}的记录，还缺少以下内容：\n\n`

        if (missingCore.length > 0) {
          message += `📋 **重要信息**：${missingCore.join('、')}\n`
        }

        if (missingOptional.length > 0) {
          message += `💭 **可选补充**：${missingOptional.join('、')}\n`
        }

        message += '\n'

        // 第二部分：询问用户意见
        if (missingCore.length > 0) {
          message += `你想继续补充这些内容吗？可以用语音说一说${dateDisplay}${missingCore.slice(0, 2).join('和')}的情况。`
        } else if (missingOptional.length > 0) {
          message += `如果${dateDisplay}有什么想法或感悟，也可以补充一下。当然，也可以直接保存现有的记录。`
        }
      } else {
        message = `${dateDisplay}的基本信息都有了。如果还有其他想补充的，可以继续说说。`
      }
    } else {
      message = `${dateDisplay}的基本信息都有了。如果还有其他想补充的，可以继续说说。`
    }

    // 不再调用 Gemini API 生成对话
    // const aiMessage = await callGeminiAPI(prompt)

    return NextResponse.json({
      message: message.trim(),
      isComplete: false,
      needsInput: true,
      missingFields,
      recordedCount: recordedInfo.length,
      totalFields: Object.keys(fieldNames).length
    })

  } catch (error: any) {
    console.error('Error in dialogue API:', error)
    return NextResponse.json({
      error: error.message || '生成对话失败'
    }, { status: 500 })
  }
}
