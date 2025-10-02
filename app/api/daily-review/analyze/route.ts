import { NextRequest, NextResponse } from 'next/server'
import dailyReviewsManager, { MoodInfo, ReviewEvent } from '@/lib/daily-reviews-db'

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
          temperature: 0.7,
          maxOutputTokens: 2048
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

// POST: 第一次AI分析（提取心情和事件）
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { date, initialInput } = body

    if (!date || !initialInput) {
      return NextResponse.json({ error: 'Date and initialInput are required' }, { status: 400 })
    }

    // 构建 Prompt
    const prompt = `你是一个专业的情绪分析助手。用户会输入今天的回顾，你需要：

1. 分析主要情绪（开心/平静/焦虑/沮丧/愤怒）和强度（1-10分）
2. 如果存在明显的次要情绪，也分析出来
3. 提取今天发生的关键事件（3-5个）

评分标准：
- 1-3分：轻微
- 4-6分：中等
- 7-10分：强烈

用户输入：
"""
${initialInput}
"""

请严格以 JSON 格式返回（不要包含任何其他文字，只返回JSON）：
{
  "primaryMood": { "type": "平静", "score": 7 },
  "secondaryMood": { "type": "焦虑", "score": 3 },
  "events": [
    {
      "keyword": "完成任务",
      "description": "完成了三个工作任务",
      "category": "工作"
    }
  ]
}

注意：
- category 只能是：工作、生活、健康、社交、情绪
- 如果没有明显的次要情绪，secondaryMood 可以省略
- events 数组至少包含1个事件，最多5个`

    // 调用 Gemini API
    const aiResponse = await callGeminiAPI(prompt)

    // 解析 JSON
    let parsedResponse
    try {
      // 尝试提取 JSON（处理可能包含 markdown 代码块的情况）
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        parsedResponse = JSON.parse(jsonMatch[0])
      } else {
        parsedResponse = JSON.parse(aiResponse)
      }
    } catch (e) {
      console.error('Failed to parse AI response:', aiResponse)
      throw new Error('AI 返回的格式不正确')
    }

    // 验证数据格式
    if (!parsedResponse.primaryMood || !parsedResponse.events) {
      throw new Error('AI 返回的数据不完整')
    }

    const primaryMood: MoodInfo = parsedResponse.primaryMood
    const secondaryMood: MoodInfo | undefined = parsedResponse.secondaryMood
    const events: ReviewEvent[] = parsedResponse.events

    // 更新数据库
    await dailyReviewsManager.updateAnalysis({
      date,
      primaryMood,
      secondaryMood,
      events
    })

    return NextResponse.json({
      success: true,
      primaryMood,
      secondaryMood,
      events
    }, { status: 200 })

  } catch (error: any) {
    console.error('Error in analyze API:', error)
    return NextResponse.json({
      error: error.message || 'AI 分析失败'
    }, { status: 500 })
  }
}