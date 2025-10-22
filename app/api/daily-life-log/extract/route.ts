import { NextRequest, NextResponse } from 'next/server'
import dailyLifeLogManager, { DailyLifeLog } from '@/lib/daily-life-log-db'

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
          maxOutputTokens: 3000
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

// POST: AI提取结构化数据
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { rawInput, existingData, existingRawInput } = body

    if (!rawInput || !rawInput.trim()) {
      return NextResponse.json({ error: 'rawInput is required' }, { status: 400 })
    }

    const jsonFormatExample = `{
  "wakeTime": "07:30",
  "plannedSleepTime": "23:00",
  "breakfastDescription": "燕麦粥和鸡蛋",
  "lunchDescription": "外卖的麻辣烫",
  "dinnerDescription": "自己做的番茄炒蛋",
  "morningActivity": "写代码，做了项目的核心功能",
  "morningMood": "8分，很专注",
  "afternoonActivity": "开了两个会议，处理邮件",
  "afternoonMood": "6分，有点疲惫",
  "eveningActivity": "健身，跑步5公里",
  "eveningMood": "9分，很舒畅",
  "nightActivity": "看书，读了30页",
  "nightMood": "7分，平静",
  "confusions": "不知道明天的项目该如何推进",
  "thoughts": "感觉健身真的能改善情绪",
  "insights": "早起确实能提高一天的效率"
}`

    const extractionInstructions = `提取规则：
1. 时间格式：使用 HH:MM 24小时制（如 "07:30", "23:00"）
2. 如果用户没有明确提到某个字段，返回 null
3. 心情可以是分数（1-10分）+ 简短描述，或者只是情绪词（如"开心"、"焦虑"）
4. 三餐描述要具体，如果用户只说"吃了早餐"没说内容，返回 null
5. 活动描述要提取关键内容，保持简洁
6. 时段划分：
   - 上午(morning): 大约 6:00-12:00
   - 下午(afternoon): 大约 12:00-18:00
   - 晚上(evening): 大约 18:00-22:00
   - 深夜(night): 大约 22:00-6:00（如果用户提到熬夜或深夜活动）
7. 困惑、想法、启发都是可选的，只有明确提到才提取

注意：
- 所有字段如果不确定或用户未提及，请返回 null 而不是空字符串
- 心情描述尽量保留用户原话
- 不要编造信息，只提取用户明确说的内容`

    // 构建 AI Prompt
    let prompt = ''

    if (existingData && Object.keys(existingData).length > 0) {
      // 补充模式：已有数据，提取新的补充信息
      const previousInputSection = existingRawInput && existingRawInput.trim()
        ? `用户此前已经提供的原始描述：
"""
${existingRawInput}
"""

`
        : ''

      prompt = `你是一个专业的个人生活记录助手。用户已经提供了一些信息，现在正在补充更多细节。

已有数据：
${JSON.stringify(existingData, null, 2)}

${previousInputSection}用户现在补充的新信息：
"""
${rawInput}
"""

请仔细结合已有数据和原始描述，判断补充内容属于哪些字段。特别注意：
1. 若补充为已有字段添加地点、同伴、时间等细节，需要把这些信息并入对应字段的文本中，例如旧值为"参鸡汤"，补充"和koko在表参道吃的"，请输出"和koko在表参道吃的参鸡汤"
2. 若补充纠正了旧信息，请以补充内容为准
3. 若补充涉及新的字段，请新增这些字段

请仅提取补充带来的有效信息，避免重复返回与旧数据完全一致的值。

请严格按照以下 JSON 格式返回（不要包含任何其他文字，只返回JSON）：
${jsonFormatExample}

${extractionInstructions}`
    } else {
      // 初始模式：全新提取
      prompt = `你是一个专业的个人生活记录助手。用户会输入今天的生活回顾（可能是语音转文字），你需要从中提取以下结构化信息：

用户输入：
"""
${rawInput}
"""

请严格按照以下 JSON 格式返回（不要包含任何其他文字，只返回JSON）：
${jsonFormatExample}

${extractionInstructions}`
    }

    // 调用 Gemini API
    const aiResponse = await callGeminiAPI(prompt)

    // 解析 JSON
    let extractedData
    try {
      // 尝试提取 JSON（处理可能包含 markdown 代码块的情况）
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        extractedData = JSON.parse(jsonMatch[0])
      } else {
        extractedData = JSON.parse(aiResponse)
      }
    } catch (e) {
      console.error('Failed to parse AI response:', aiResponse)
      throw new Error('AI 返回的格式不正确')
    }

    // 构建日志对象
    const partialLog: Partial<DailyLifeLog> = {
      wakeTime: extractedData.wakeTime || null,
      plannedSleepTime: extractedData.plannedSleepTime || null,
      breakfastDescription: extractedData.breakfastDescription || null,
      lunchDescription: extractedData.lunchDescription || null,
      dinnerDescription: extractedData.dinnerDescription || null,
      morningActivity: extractedData.morningActivity || null,
      morningMood: extractedData.morningMood || null,
      afternoonActivity: extractedData.afternoonActivity || null,
      afternoonMood: extractedData.afternoonMood || null,
      eveningActivity: extractedData.eveningActivity || null,
      eveningMood: extractedData.eveningMood || null,
      nightActivity: extractedData.nightActivity || null,
      nightMood: extractedData.nightMood || null,
      confusions: extractedData.confusions || null,
      thoughts: extractedData.thoughts || null,
      insights: extractedData.insights || null
    }

    // 检查完整性
    const completeness = dailyLifeLogManager.checkCompleteness(partialLog)

    return NextResponse.json({
      success: true,
      extractedData: partialLog,
      completeness
    }, { status: 200 })

  } catch (error: any) {
    console.error('Error in extract API:', error)
    return NextResponse.json({
      error: error.message || 'AI 提取失败'
    }, { status: 500 })
  }
}
