/**
 * Expense Tools - 开销管理工具集
 *
 * 提供完整的开销管理功能：
 * - 文本解析：从自然语言提取开销信息
 * - 图片识别：OCR 票据识别
 * - CRUD 操作：创建、查询、更新、删除开销
 * - 统计汇总：按分类、货币、时间范围统计
 */

import { tool } from '@langchain/core/tools'
import { z } from 'zod'
import { ChatGoogleGenerativeAI } from '@langchain/google-genai'
import { HumanMessage } from '@langchain/core/messages'
import expensesDbManager from '@/lib/expenses-db'
import exchangeRateService from '@/lib/exchange-rate-service'

// ============================================
// 辅助函数
// ============================================

/**
 * 提取 JSON 从文本中
 */
function extractJSON(text: string): string | null {
  try {
    JSON.parse(text)
    return text
  } catch {
    const match = text.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/)
    if (match) return match[1].trim()

    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (jsonMatch) return jsonMatch[0]

    return null
  }
}

/**
 * 解析日期字符串
 * 现在只负责验证和返回标准格式，Agent 应该自己计算相对日期
 */
function parseDateString(dateStr: string): string {
  // 直接返回，假设 Agent 已经传入标准格式 YYYY-MM-DD
  // 如果 Agent 传入了相对日期（如"最近两个月"），这是 Agent 的错误，应该在 System Prompt 中纠正
  return dateStr
}

// ============================================
// 工具1: 解析文本中的开销信息
// ============================================

export const parseExpenseTextTool = tool(
  async ({ text, currentDate }) => {
    try {
      const model = new ChatGoogleGenerativeAI({
        modelName: 'gemini-2.0-flash-exp',
        temperature: 0.1,
      })

      const prompt = `请从以下文本中提取开销信息：
"${text}"

当前日期: ${currentDate}

请以 JSON 格式返回（不要用 markdown 代码块包裹）：
{
  "amount": 50.0,
  "currency": "CNY",
  "category": "饮食",
  "date": "2025-10-28",
  "description": "午饭"
}

规则：
- 如果文本中没有明确货币，默认为 CNY
- 如果没有明确日期，使用当前日期
- 如果没有明确分类，推断一个合理的分类（饮食、交通、生活、教育、医疗、娱乐、购物、未分类）
- description 应该简洁描述消费内容
`

      const response = await model.invoke([new HumanMessage(prompt)])
      const jsonText = extractJSON(response.content as string)

      if (!jsonText) {
        return JSON.stringify({ success: false, error: '无法解析文本' })
      }

      const parsed = JSON.parse(jsonText)
      return JSON.stringify({ success: true, data: parsed })
    } catch (error: any) {
      return JSON.stringify({ success: false, error: error.message })
    }
  },
  {
    name: 'parse_expense_text',
    description: '从用户输入的自然语言文本中解析开销信息，提取金额、货币、分类、日期、描述等字段。例如："今天午饭50元" → {amount: 50, currency: "CNY", category: "饮食", date: "2025-10-28", description: "午饭"}',
    schema: z.object({
      text: z.string().describe('用户输入的文本，如"今天午饭50元"、"昨天打车30"'),
      currentDate: z.string().describe('当前日期（YYYY-MM-DD）用于推断相对日期')
    })
  }
)

// ============================================
// 工具2: 识别票据图片
// ============================================

export const parseExpenseImageTool = tool(
  async ({ imageBase64, mimeType, categories }) => {
    try {
      const model = new ChatGoogleGenerativeAI({
        modelName: 'gemini-2.0-flash-exp',
        temperature: 0.1,
      })

      const currentYear = new Date().getFullYear()
      const prompt = `你是一个专业的财务票据分析助手。请仔细查看这张票据图片，识别并提取关键信息。

可选分类：${categories.join('、')}

分析要求：
1. 日期识别：转换为 YYYY-MM-DD 格式，如果只有月日，使用 ${currentYear} 年
2. 标题生成：根据商家名称生成描述性标题（10-15字）
3. 金额提取：优先使用"合计"、"総計"、"Total"后的金额
4. 货币识别：日元→JPY，人民币→CNY，美元→USD
5. 分类建议：从可选分类中选择最合适的

请以 JSON 格式返回（不要用 markdown 代码块包裹）：
{
  "date": "YYYY-MM-DD",
  "title": "具体的消费描述",
  "amount": 纯数字,
  "currency": "货币代码",
  "suggestedCategory": "分类名称"
}
`

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
      const jsonText = extractJSON(response.content as string)

      if (!jsonText) {
        return JSON.stringify({ success: false, error: '无法识别图片' })
      }

      const parsed = JSON.parse(jsonText)
      return JSON.stringify({ success: true, data: parsed })
    } catch (error: any) {
      return JSON.stringify({ success: false, error: error.message })
    }
  },
  {
    name: 'parse_expense_image',
    description: '使用 Vision API 识别票据图片，提取开销信息（日期、标题、金额、货币、分类）',
    schema: z.object({
      imageBase64: z.string().describe('图片的 Base64 编码'),
      mimeType: z.string().describe('图片 MIME 类型，如 image/jpeg'),
      categories: z.array(z.string()).describe('可选的分类列表')
    })
  }
)

// ============================================
// 工具3: 创建开销记录
// ============================================

export const createExpenseTool = tool(
  async ({ amount, currency, category, date, description, receiptPath }) => {
    try {
      // 如果 category 是名称，转换为 ID
      let categoryId: number | null = null
      if (category) {
        const categories = expensesDbManager.getCategories()
        const found = categories.find(c => c.name === category)
        categoryId = found?.id || null

        // 如果分类不存在，给出警告但继续创建（使用未分类）
        if (!found && category !== '未分类') {
          console.warn(`⚠️ 分类 "${category}" 不存在，将使用"未分类"`)
        }
      }

      // 创建开销记录
      const expenseId = expensesDbManager.addExpense({
        title: description || '未命名开销',
        occurredAt: date,
        amount,
        currency,
        categoryId,
        note: description,
        receiptPaths: receiptPath ? [receiptPath] : []
      })

      return JSON.stringify({
        success: true,
        expenseId,
        message: `✅ 开销记录创建成功：${amount} ${currency}，分类：${category || '未分类'}，日期：${date}`
      })
    } catch (error: any) {
      return JSON.stringify({
        success: false,
        error: error.message
      })
    }
  },
  {
    name: 'create_expense',
    description: '创建一条开销记录，保存到数据库。【重要】必须指定 category 参数，根据开销内容推理出最合适的分类（如：咖啡→饮食，打车→交通，买书→教育）。如果不确定，使用"未分类"',
    schema: z.object({
      amount: z.number().describe('金额（数字）'),
      currency: z.string().describe('货币代码，如 CNY, USD, JPY'),
      category: z.string().optional().describe('【强烈建议提供】分类名称，根据开销内容推理（如"饮食"、"交通"、"购物"、"教育"、"娱乐"、"医疗"、"生活"、"未分类"）。示例：咖啡→饮食，打车→交通，买书→教育，看电影→娱乐。如果完全无法判断，使用"未分类"'),
      date: z.string().describe('日期（YYYY-MM-DD）'),
      description: z.string().optional().describe('【强烈建议提供】描述或备注。必须提取用户提供的所有上下文信息，如地点（"学校到家"）、商家（"大鹰之森"）、活动（"和朋友聚餐"）、商品（"泰国菜"）等。示例："学校到家的通勤费"、"大鹰之森 和yuxi 泰国菜"、"Starbucks买咖啡"'),
      receiptPath: z.string().optional().describe('票据图片路径（如果有）')
    })
  }
)

// ============================================
// 工具4: 查询开销记录
// ============================================

export const queryExpensesTool = tool(
  async ({ startDate, endDate, category, currency }) => {
    try {
      // 如果没有指定日期，查询所有历史
      const normalizedStartDate = startDate ? parseDateString(startDate) : undefined
      const normalizedEndDate = endDate ? parseDateString(endDate) : (startDate ? parseDateString(startDate) : undefined)

      let expenses = expensesDbManager.getExpenses({
        startDate: normalizedStartDate,
        endDate: normalizedEndDate
      })

      // 过滤分类
      if (category) {
        const categories = expensesDbManager.getCategories()
        const found = categories.find(c => c.name === category)
        if (found) {
          expenses = expenses.filter(e => e.categoryId === found.id)
        }
      }

      // 过滤货币
      if (currency) {
        expenses = expenses.filter(e => e.currency === currency)
      }

      // 构建日期范围显示文本
      const dateRangeText = startDate
        ? `${startDate} 至 ${endDate || startDate}`
        : '所有时间'

      if (expenses.length === 0) {
        return `未找到开销记录（${dateRangeText}）`
      }

      const result = expenses.map(e => {
        const categoryName = e.category?.name || '未分类'
        return `- ${e.occurredAt.split('T')[0]}: ${e.amount} ${e.currency} (${categoryName}) ${e.note || e.title}`
      }).join('\n')

      return `找到 ${expenses.length} 条开销记录（${dateRangeText}）：\n${result}`
    } catch (error: any) {
      return `查询失败: ${error.message}`
    }
  },
  {
    name: 'query_expenses',
    description: '查询指定日期范围的开销记录。可按分类和货币过滤。如果不指定日期，将查询所有历史记录。',
    schema: z.object({
      startDate: z.string().optional().describe('开始日期（可选，不指定则查询所有历史）。必须是 YYYY-MM-DD 格式。如果用户使用相对日期如"最近两个月"，请先调用 getCurrentDate 获取今天日期，然后自己计算具体日期'),
      endDate: z.string().optional().describe('结束日期（可选，YYYY-MM-DD 格式）。如果不提供，默认与 startDate 相同'),
      category: z.string().optional().describe('分类名称过滤，如"饮食"'),
      currency: z.string().optional().describe('货币代码过滤，如 CNY')
    })
  }
)

// ============================================
// 工具5: 获取开销分类列表
// ============================================

export const getExpenseCategoriesTool = tool(
  async () => {
    try {
      const categories = expensesDbManager.getCategories()

      if (categories.length === 0) {
        return '当前没有开销分类'
      }

      const result = categories.map(c =>
        `- ${c.name} (颜色: ${c.colorHex})`
      ).join('\n')

      return `开销分类列表（共 ${categories.length} 个）：\n${result}`
    } catch (error: any) {
      return `获取分类失败: ${error.message}`
    }
  },
  {
    name: 'get_expense_categories',
    description: '获取所有开销分类的列表，包括分类名称和颜色',
    schema: z.object({})
  }
)

// ============================================
// 工具6: 统计开销汇总
// ============================================

export const getExpenseSummaryTool = tool(
  async ({ startDate, endDate, groupBy }) => {
    try {
      // 如果没有指定日期，查询所有历史
      const normalizedStartDate = startDate ? parseDateString(startDate) : undefined
      const normalizedEndDate = endDate ? parseDateString(endDate) : undefined

      const expenses = expensesDbManager.getExpenses({
        startDate: normalizedStartDate,
        endDate: normalizedEndDate
      })

      // 构建日期范围显示文本
      const dateRangeText = startDate
        ? `${startDate} 至 ${endDate || startDate}`
        : '所有时间'

      if (expenses.length === 0) {
        return `未找到开销记录（${dateRangeText}）`
      }

      if (groupBy === 'category') {
        // 按分类汇总
        const byCategory: { [key: string]: number } = {}
        expenses.forEach(e => {
          const category = e.category?.name || '未分类'
          byCategory[category] = (byCategory[category] || 0) + e.amount
        })

        const summary = Object.entries(byCategory)
          .sort(([, a], [, b]) => b - a)
          .map(([cat, total]) => `- ${cat}: ${total.toFixed(2)} CNY`)
          .join('\n')

        const total = Object.values(byCategory).reduce((sum, val) => sum + val, 0)
        return `开销汇总（${dateRangeText}）：\n${summary}\n总计: ${total.toFixed(2)} CNY`
      }

      if (groupBy === 'currency') {
        // 按货币汇总
        const byCurrency: { [key: string]: number } = {}
        expenses.forEach(e => {
          byCurrency[e.currency] = (byCurrency[e.currency] || 0) + e.amount
        })

        const summary = Object.entries(byCurrency)
          .map(([cur, total]) => `- ${cur}: ${total.toFixed(2)}`)
          .join('\n')

        return `开销汇总（${dateRangeText}，按货币）：\n${summary}`
      }

      // 总计
      const total = expenses.reduce((sum, e) => sum + e.amount, 0)
      return `开销总计（${dateRangeText}）: ${total.toFixed(2)} （${expenses.length} 条记录）`
    } catch (error: any) {
      return `统计失败: ${error.message}`
    }
  },
  {
    name: 'get_expense_summary',
    description: '统计指定日期范围的开销汇总。支持按分类、货币分组，或计算总计。如果不指定日期，将查询所有历史记录。',
    schema: z.object({
      startDate: z.string().optional().describe('开始日期（可选，不指定则查询所有历史）。必须是 YYYY-MM-DD 格式。如果用户使用相对日期如"最近两个月"、"本周"等，请先调用 getCurrentDate 获取今天日期，然后自己计算具体日期'),
      endDate: z.string().optional().describe('结束日期（可选，YYYY-MM-DD 格式）'),
      groupBy: z.enum(['category', 'currency', 'total']).describe('分组方式：category=按分类，currency=按货币，total=总计')
    })
  }
)

// ============================================
// 工具7: 获取汇率
// ============================================

export const getExchangeRateTool = tool(
  async ({ source_currency, target_currency }) => {
    try {
      // 相同货币汇率为1
      if (source_currency === target_currency) {
        return JSON.stringify({
          from: source_currency,
          to: target_currency,
          rate: 1,
          source: '相同货币'
        })
      }

      // 直接调用汇率服务
      const rate = await exchangeRateService.getRate(
        source_currency.toUpperCase(),
        target_currency.toUpperCase()
      )

      return JSON.stringify({
        from: source_currency.toUpperCase(),
        to: target_currency.toUpperCase(),
        rate,
        source: 'Wise',
        timestamp: Date.now()
      })
    } catch (error: any) {
      return JSON.stringify({
        success: false,
        error: error.message || '获取汇率失败'
      })
    }
  },
  {
    name: 'get_exchange_rate',
    description: '获取两种货币之间的实时汇率（来源: Wise）。例如: get_exchange_rate({source_currency: "AUD", target_currency: "CNY"}) 返回澳元兑人民币的汇率',
    schema: z.object({
      source_currency: z.string().describe('源货币代码（ISO 4217），如 AUD、USD、CNY'),
      target_currency: z.string().describe('目标货币代码（ISO 4217），如 CNY、USD、AUD')
    })
  }
)

// ============================================
// 工具8: 货币换算
// ============================================

export const convertCurrencyTool = tool(
  async ({ amount, source_currency, target_currency }) => {
    try {
      // 相同货币直接返回
      if (source_currency === target_currency) {
        return JSON.stringify({
          amount,
          from: source_currency,
          to: target_currency,
          result: amount,
          rate: 1
        })
      }

      // 直接调用汇率服务
      const rate = await exchangeRateService.getRate(
        source_currency.toUpperCase(),
        target_currency.toUpperCase()
      )

      const result = amount * rate

      return JSON.stringify({
        amount,
        from: source_currency.toUpperCase(),
        to: target_currency.toUpperCase(),
        rate,
        result: Math.round(result * 100) / 100, // 保留两位小数
        calculation: `${amount} ${source_currency.toUpperCase()} × ${rate} = ${result.toFixed(2)} ${target_currency.toUpperCase()}`
      })
    } catch (error: any) {
      return JSON.stringify({
        success: false,
        error: error.message || '货币换算失败'
      })
    }
  },
  {
    name: 'convert_currency',
    description: '将金额从一种货币换算成另一种货币。例如: convert_currency({amount: 608, source_currency: "AUD", target_currency: "CNY"}) 返回 608 澳元等于多少人民币',
    schema: z.object({
      amount: z.number().describe('需要换算的金额'),
      source_currency: z.string().describe('源货币代码（ISO 4217），如 AUD、USD、CNY'),
      target_currency: z.string().describe('目标货币代码（ISO 4217），如 CNY、USD、AUD')
    })
  }
)

// ============================================
// 导出所有开销工具
// ============================================

import type { DynamicStructuredTool } from '@langchain/core/tools'
import type { ToolMetadata } from '../types'

/**
 * 获取所有开销工具及其元数据
 */
export function getExpenseTools(): Array<{
  tool: DynamicStructuredTool
  metadata: Omit<ToolMetadata, 'category'>
}> {
  return [
    {
      tool: parseExpenseTextTool,
      metadata: {
        displayName: '解析文本开销',
        description: '从自然语言文本中提取开销信息（金额、货币、分类、日期、描述）',
        readonly: false,
        version: '1.0.0',
      },
    },
    {
      tool: parseExpenseImageTool,
      metadata: {
        displayName: '识别票据图片',
        description: '使用 Vision API 识别票据图片，提取开销信息',
        readonly: false,
        version: '1.0.0',
      },
    },
    {
      tool: createExpenseTool,
      metadata: {
        displayName: '创建开销记录',
        description: '创建一条开销记录并保存到数据库',
        readonly: false,
        version: '1.0.0',
      },
    },
    {
      tool: queryExpensesTool,
      metadata: {
        displayName: '查询开销记录',
        description: '查询指定日期范围的开销记录，支持按分类和货币过滤',
        readonly: true,
        version: '1.0.0',
      },
    },
    {
      tool: getExpenseCategoriesTool,
      metadata: {
        displayName: '获取开销分类',
        description: '获取所有开销分类的列表（包括名称和颜色）',
        readonly: true,
        version: '1.0.0',
      },
    },
    {
      tool: getExpenseSummaryTool,
      metadata: {
        displayName: '统计开销汇总',
        description: '统计指定日期范围的开销汇总（支持按分类、货币分组）',
        readonly: true,
        version: '1.0.0',
      },
    },
    {
      tool: getExchangeRateTool,
      metadata: {
        displayName: '获取汇率',
        description: '获取两种货币之间的实时汇率（来源: Wise）',
        readonly: true,
        version: '1.0.0',
      },
    },
    {
      tool: convertCurrencyTool,
      metadata: {
        displayName: '货币换算',
        description: '将金额从一种货币换算成另一种货币',
        readonly: true,
        version: '1.0.0',
      },
    },
  ]
}
