import { NextRequest, NextResponse } from 'next/server'
import dailyReviewsManager, { ReviewEvent } from '@/lib/daily-reviews-db'

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

// POST: 第二次AI分析（解析事件评价）
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { date, events, feelingsInput } = body

    if (!date || !events || !feelingsInput) {
      return NextResponse.json({ error: 'Date, events, and feelingsInput are required' }, { status: 400 })
    }

    // 构建 Prompt
    const eventsText = events.map((e: ReviewEvent, idx: number) =>
      `${idx + 1}. ${e.keyword} - ${e.description} (${e.category})`
    ).join('\n')

    const prompt = `用户对今天的事件进行了评价，请分析每个事件的情感倾向。

事件列表：
${eventsText}

用户的评价：
"""
${feelingsInput}
"""

特别注意：
- 如果用户的评价是"没什么"、"无"、"没啥"、"没啥好说的"等表示无评价的内容，则不要为事件分配rating，将rating字段设为null，reason也设为null。
- 只有当用户明确表达了对事件的情感或评价时，才为事件设置 rating 和 reason。

请为每个事件判断：
- rating: positive（正面）/ neutral（中性）/ negative（负面）/ null（无评价）
- reason: 一句话说明原因（从用户的评价中提取），如果无评价则为 null

请严格以 JSON 格式返回（不要包含任何其他文字，只返回JSON）：
{
  "events": [
    {
      "keyword": "完成任务",
      "description": "完成了三个工作任务",
      "category": "工作",
      "rating": "positive",
      "reason": "有成就感"
    }
  ],
  "summary": "今天整体心情不错，完成了重要任务，但会议带来一些压力"
}

注意：
- events 数组要包含所有事件，保持原有的 keyword、description、category
- summary 是对今天的简短总结（1-2句话），客观、简洁
- 如果用户表示无评价，summary 应该反映这一点（如"今天没有特别的感受"）
- 如果用户的评价中没有明确提到某个事件，根据上下文和常识合理推断`

    // 调用 Gemini API
    const aiResponse = await callGeminiAPI(prompt)

    // 解析 JSON
    let parsedResponse
    try {
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
    if (!parsedResponse.events || !parsedResponse.summary) {
      throw new Error('AI 返回的数据不完整')
    }

    const updatedEvents: ReviewEvent[] = parsedResponse.events
    const aiSummary: string = parsedResponse.summary

    // 更新数据库
    await dailyReviewsManager.updateFinalize({
      date,
      feelingsInput,
      events: updatedEvents,
      aiSummary
    })

    return NextResponse.json({
      success: true,
      events: updatedEvents,
      aiSummary
    }, { status: 200 })

  } catch (error: any) {
    console.error('Error in finalize API:', error)
    return NextResponse.json({
      error: error.message || 'AI 分析失败'
    }, { status: 500 })
  }
}