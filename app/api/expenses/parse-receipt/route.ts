import { NextRequest, NextResponse } from 'next/server'
import { ChatGoogleGenerativeAI } from '@langchain/google-genai'
import { HumanMessage } from '@langchain/core/messages'

interface ParsedReceiptData {
  date: string
  title: string
  amount: number
  currency: string
  suggestedCategory: string
}

/**
 * POST /api/expenses/parse-receipt
 * 使用Gemini Vision直接识别票据图片，提取结构化信息
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const imageFile = formData.get('image') as File
    const categoriesJson = formData.get('categories') as string
    const existingCategories = categoriesJson ? JSON.parse(categoriesJson) : []

    if (!imageFile) {
      return NextResponse.json(
        { success: false, error: '图片文件不能为空' },
        { status: 400 }
      )
    }

    // 读取图片数据
    const imageBuffer = await imageFile.arrayBuffer()
    const imageBase64 = Buffer.from(imageBuffer).toString('base64')

    console.log('=== 处理票据图片 ===')
    console.log('文件名:', imageFile.name)
    console.log('文件大小:', imageFile.size, 'bytes')
    console.log('文件类型:', imageFile.type)
    console.log('==================')

    // 构建Prompt
    const currentYear = new Date().getFullYear()
    const prompt = `你是一个专业的财务票据分析助手。请仔细查看这张票据图片，识别并提取关键信息，以JSON格式返回。

可选分类：${existingCategories.join('、')}

分析要求：

1. **日期识别**：
   - 识别票据上的日期（可能的格式：2025年06月08日、2025/06/08等）
   - 转换为YYYY-MM-DD格式
   - 如果只有月日，使用${currentYear}年
   - 如果找不到日期，使用当前日期

2. **标题生成**：
   - 根据商家名称、商品类型生成描述性标题（10-15字）
   - 例如：加油站消费用"EneJet加油站"或"购买汽油"
   - 例如：超市消费用"XX超市购物"
   - 例如：餐厅消费用"XX餐厅就餐"

3. **金额提取**（重要）：
   - 优先使用"合计"、"総計"、"Total"、"小計"等后的金额
   - 如果有折扣，使用实际支付金额
   - 只返回纯数字，不要货币符号或逗号
   - 不要误把商品编号、单价等当作总金额

4. **货币识别**：
   - 日元：如果看到"円"或日文上下文，判断为JPY
   - 人民币：如果看到"元"或中文上下文，判断为CNY
   - 美元：USD，欧元：EUR，英镑：GBP
   - 如果无法确定，默认CNY

5. **分类建议**：
   - 加油站、汽油 → "交通"
   - 超市、便利店 → "购物"或"饮食"
   - 餐厅、咖啡厅 → "饮食"
   - 出租车、公交 → "交通"
   - 如果无法判断，建议"未分类"

**返回纯JSON格式（不要markdown代码块包裹，必须包含所有字段）**：
{
  "date": "YYYY-MM-DD",
  "title": "具体的消费描述",
  "amount": 纯数字,
  "currency": "货币代码",
  "suggestedCategory": "分类名称"
}`

    // 使用Gemini Vision API识别图片
    const parsedData = await callGeminiVisionAPI(imageBuffer, imageFile.type, prompt)

    if (!parsedData) {
      return NextResponse.json(
        { success: false, error: 'Gemini Vision API识别失败，请重试' },
        { status: 500 }
      )
    }

    // 打印解析结果
    console.log('=== Gemini Vision 识别结果 ===')
    console.log(JSON.stringify(parsedData, null, 2))
    console.log('================================')

    // 验证数据完整性
    if (!parsedData.date || !parsedData.title || !parsedData.amount || !parsedData.currency) {
      return NextResponse.json(
        { success: false, error: '票据信息不完整，请手动输入' },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      data: parsedData
    })
  } catch (error) {
    console.error('Parse receipt error:', error)
    return NextResponse.json(
      { success: false, error: '服务器内部错误' },
      { status: 500 }
    )
  }
}

/**
 * 调用Gemini Vision API识别票据图片
 */
async function callGeminiVisionAPI(
  imageBuffer: ArrayBuffer,
  mimeType: string,
  prompt: string
): Promise<ParsedReceiptData | null> {
  try {
    const model = new ChatGoogleGenerativeAI({
      modelName: 'gemini-2.0-flash-exp',
      temperature: 0.1,
      apiKey: process.env.GOOGLE_GENAI_API_KEY || process.env.GEMINI_API_KEY
    })

    const imageBase64 = Buffer.from(imageBuffer).toString('base64')

    const message = new HumanMessage({
      content: [
        { type: 'text', text: prompt },
        {
          type: 'image_url',
          image_url: `data:${mimeType};base64,${imageBase64}`
        }
      ]
    })

    const response = await model.invoke([message])
    const responseText = response.content as string

    if (!responseText) {
      console.error('Gemini Vision 返回空响应')
      return null
    }

    console.log('=== Gemini Vision 原始响应 ===')
    console.log(responseText)
    console.log('==============================')

    // 解析JSON
    const jsonText = extractJSON(responseText)
    if (!jsonText) {
      console.error('无法从响应中提取JSON:', responseText)
      return null
    }

    const parsed = JSON.parse(jsonText) as ParsedReceiptData

    // 数据验证和清理
    return {
      date: String(parsed.date || ''),
      title: String(parsed.title || '').slice(0, 50),
      amount: Number(parsed.amount) || 0,
      currency: String(parsed.currency || 'CNY'),
      suggestedCategory: String(parsed.suggestedCategory || '未分类')
    }
  } catch (error) {
    console.error('Gemini Vision API调用错误:', error)
    return null
  }
}

/**
 * 从文本中提取JSON
 */
function extractJSON(text: string): string | null {
  // 尝试直接解析
  try {
    JSON.parse(text)
    return text
  } catch {
    // 继续尝试其他方法
  }

  // 移除markdown代码块标记
  const codeBlockRegex = /```(?:json)?\s*\n?([\s\S]*?)\n?```/
  const match = text.match(codeBlockRegex)
  if (match && match[1]) {
    return match[1].trim()
  }

  // 尝试查找JSON对象
  const jsonObjectRegex = /\{[\s\S]*\}/
  const jsonMatch = text.match(jsonObjectRegex)
  if (jsonMatch) {
    return jsonMatch[0]
  }

  return null
}
