import { NextRequest, NextResponse } from 'next/server'
import { DailyLifeLog } from '@/lib/daily-life-log-db'

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
          temperature: 0.3,
          maxOutputTokens: 2000
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

/**
 * POST /api/daily-life-log/merge
 * 智能合并旧数据和新补充信息
 * 使用 LLM 理解上下文，智能更新字段
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { oldData, newExtractedData } = body as {
      oldData: Partial<DailyLifeLog>
      newExtractedData: Partial<DailyLifeLog>
    }

    // 构建合并 prompt
    const prompt = `你是一个智能数据合并助手。用户在补充信息时可能会提供额外的细节或修正之前的信息。你需要智能地合并新旧信息。

旧数据：
${JSON.stringify(oldData, null, 2)}

新补充的数据：
${JSON.stringify(newExtractedData, null, 2)}

合并规则：
1. 如果新数据提供了之前没有的字段，直接添加
2. 如果新数据提供了之前有的字段的补充信息（如地点、细节），智能合并
   - 例如：旧="面包" + 新="在上野吃的" → 合并="在上野吃的面包"
   - 例如：旧="麻辣烫" + 新="上野的" → 合并="上野的麻辣烫"
3. 如果新数据明确替换了之前的信息，使用新数据
   - 例如：旧="面包" + 新="参鸡汤" → 使用新="参鸡汤"
4. 如果新数据是 null，保留旧数据
5. 时间字段（wakeTime, plannedSleepTime）总是使用新数据覆盖

请返回合并后的完整数据，格式为 JSON（不要包含任何其他文字）：

{
  "wakeTime": "...",
  "plannedSleepTime": "...",
  "breakfastDescription": "...",
  "lunchDescription": "...",
  "dinnerDescription": "...",
  "morningActivity": "...",
  "morningMood": "...",
  "afternoonActivity": "...",
  "afternoonMood": "...",
  "eveningActivity": "...",
  "eveningMood": "...",
  "nightActivity": "...",
  "nightMood": "...",
  "confusions": "...",
  "thoughts": "...",
  "insights": "..."
}

注意：
- 字段值为 null 表示没有信息
- 智能判断是"补充"还是"替换"
- 保持描述的自然性和连贯性`

    // 调用 Gemini API
    const aiResponse = await callGeminiAPI(prompt)

    // 解析 JSON
    let mergedData
    try {
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        mergedData = JSON.parse(jsonMatch[0])
      } else {
        mergedData = JSON.parse(aiResponse)
      }
    } catch (e) {
      console.error('Failed to parse AI response:', aiResponse)
      // Fallback：简单合并
      mergedData = {
        ...oldData,
        ...Object.fromEntries(
          Object.entries(newExtractedData).filter(([_, v]) => v !== null && v !== undefined && v !== '')
        )
      }
    }

    return NextResponse.json({
      success: true,
      mergedData
    }, { status: 200 })

  } catch (error: any) {
    console.error('Error in merge API:', error)
    return NextResponse.json({
      error: error.message || '合并失败'
    }, { status: 500 })
  }
}
