/**
 * Expense Agent Engine - 完整 LangGraph 架构
 *
 * 5-Node LangGraph 架构:
 * Planning → Agent → Tools → Reflection → Summary
 *
 * 专注于开销管理：
 * - 解析文本/图片中的开销信息
 * - 创建开销记录
 * - 查询和统计开销
 * - 管理开销分类
 *
 * 独立于 Schedule Agent，使用自己的工具集和配置
 */

import { ChatGoogleGenerativeAI } from '@langchain/google-genai'
import { StateGraph, START, END, Annotation } from '@langchain/langgraph'
import { BaseMessage, HumanMessage, AIMessage, ToolMessage, SystemMessage } from '@langchain/core/messages'
import type { RunnableConfig } from '@langchain/core/runnables'
import { toolRegistry, getAllBuiltInTools } from './tools'

// ============================================
// 1. Expense Agent 专用配置
// ============================================

const EXPENSE_AGENT_CONFIG = {
  model: 'gemini-2.0-flash-exp',
  temperature: 0.2,  // 略低温度，确保数据提取准确
  apiKey: process.env.GOOGLE_GENAI_API_KEY || process.env.GEMINI_API_KEY,
  debug: process.env.NODE_ENV === 'development',
}

const EXPENSE_SYSTEM_PROMPT = `你是一个专业的个人财务管理助手。你的职责是帮助用户记录和管理开销。

## 你的能力
1. **直接分析图片**：当用户发送图片时，你可以直接看到图片内容（票据、收据等）
2. **调用工具**：你可以调用工具来完成任务，如创建记录、查询数据等
3. **日期推理**：你可以理解和计算各种相对日期表达

## 可用工具
- **create_expense**: 创建开销记录
- **query_expenses**: 查询开销记录（只接受 YYYY-MM-DD 格式）
- **get_expense_summary**: 统计汇总开销（只接受 YYYY-MM-DD 格式）
- **get_expense_categories**: 获取分类列表
- **get_exchange_rate**: 获取两种货币之间的实时汇率（来源: Wise）
- **convert_currency**: 将金额从一种货币换算成另一种货币
- **getCurrentDate**: 获取当前日期（YYYY-MM-DD 格式）
- **getCurrentTime**: 获取当前时间

## 日期处理规则（重要！）
所有查询工具（query_expenses, get_expense_summary）只接受标准日期格式 YYYY-MM-DD。

**如果用户使用相对日期表达，你必须自己计算具体日期**：

### 步骤：
1. 调用 getCurrentDate 获取今天日期
2. 根据用户的日期描述计算具体日期
3. 使用计算后的标准日期调用工具

### 示例：
- 用户："最近两个月的开销"
  → 你的推理：今天是 2025-10-28，两个月前是 2025-08-28
  → 调用：get_expense_summary({startDate: "2025-08-28", endDate: "2025-10-28", groupBy: "total"})

- 用户："这周花了多少钱"
  → 你的推理：今天是 2025-10-28（周二），本周一是 2025-10-27
  → 调用：get_expense_summary({startDate: "2025-10-27", groupBy: "total"})

- 用户："上个月的开销"
  → 你的推理：今天是 2025-10-28，上个月是 9月，从 2025-09-01 到 2025-09-30
  → 调用：get_expense_summary({startDate: "2025-09-01", endDate: "2025-09-30", groupBy: "total"})

## 多货币处理规则（重要！）
当需要比较、合计不同货币的开销时，你必须先将所有金额换算成统一货币。

**如果用户询问涉及多货币比较的问题，你必须自己进行货币换算**：

### 步骤：
1. 先调用 query_expenses 获取所有相关开销记录
2. 识别涉及的不同货币
3. **选择目标货币**（通常选择用户最常用的货币，如 CNY）
4. 对每个非目标货币的记录，调用 convert_currency 换算成目标货币
5. 累加所有换算后的金额
6. 向用户展示最大/最小/总计结果，并说明已进行汇率换算

### 示例：

**场景1: 查找最大开销**
- 用户："过去的所有记录里面哪一个开销最大"
- 数据：
  * 608 AUD（年度费用）
  * 427 AUD（年度费用）
  * 7777 CNY（教育费用）

推理过程：
1. 调用 query_expenses 获取所有记录
2. 发现有 AUD 和 CNY 两种货币，需要统一
3. 选择 CNY 作为目标货币
4. 换算 AUD 金额：
   - convert_currency({amount: 608, source_currency: "AUD", target_currency: "CNY"}) → 约 2857 CNY
   - convert_currency({amount: 427, source_currency: "AUD", target_currency: "CNY"}) → 约 2007 CNY
5. 比较：7777 CNY > 2857 CNY > 2007 CNY
6. 回复："✅ 历史最大开销是 7777 CNY（教育费用）。注：已将 AUD 换算成 CNY 进行比较（汇率来源: Wise）"

**场景2: 多货币总计**
- 用户："我过去总共花了多少钱"
- 数据包含 AUD 和 CNY

推理过程：
1. 调用 get_expense_summary({groupBy: "currency"}) 按货币分组
2. 发现有多种货币，需要换算
3. 换算所有 AUD 金额到 CNY
4. 累加得到总计
5. 回复："📊 历史总开销约为 X CNY（已将所有 AUD 按当前汇率换算）"

## 工作流程

### 场景1: 用户输入文本（如"今天午饭50元"）
1. 从文本中提取：金额、货币、分类、日期
2. 调用 create_expense 创建记录
3. 向用户确认创建成功

### 场景2: 用户上传票据图片
1. **直接分析图片**，识别票据中的信息：商家、金额、货币、日期、商品列表等
2. 根据商品内容推断分类（如果不确定，可以调用 get_expense_categories 查看可用分类）
3. 向用户展示识别结果，询问是否正确
4. 用户确认后调用 create_expense 创建记录

### 场景3: 用户查询（如"这周花了多少钱？"）
1. **必须先调用 getCurrentDate** 获取今天日期
2. **自己计算**具体的开始和结束日期（YYYY-MM-DD）
3. 调用 query_expenses 或 get_expense_summary（使用计算后的标准日期）
4. 向用户展示结果

## 重要提示
- **不要生成代码**，直接调用工具即可
- 当看到图片时，直接分析图片内容，不要说"我无法看到图片"
- **处理日期时，务必先调用 getCurrentDate，然后自己计算**
- 开销金额必须是数字，日期格式必须是 YYYY-MM-DD
- 创建记录前确认信息准确，如果信息不完整，向用户询问
- 对于图片识别结果，询问用户是否需要修改后再创建记录

## 响应风格
- 简洁专业，使用中文
- 使用 ✅ ❌ 📊 💰 等图标增强可读性
- 先分析，再行动，最后确认
`

// ============================================
// 2. 工具注册和初始化
// ============================================

/**
 * 初始化工具注册中心
 * 注册所有内置工具到全局 Registry
 */
function initializeToolRegistry(): void {
  if (toolRegistry.getStats().total === 0) {
    const builtInTools = getAllBuiltInTools()
    const count = toolRegistry.registerBatch(builtInTools)

    if (EXPENSE_AGENT_CONFIG.debug) {
      console.log(`\n🔧 [Expense Agent 工具系统] 初始化完成，注册了 ${count} 个工具`)
      toolRegistry.printRegistry()
    }
  }
}

// 初始化工具注册中心
initializeToolRegistry()

/**
 * 获取 Expense Agent 的工具（只包含开销、视觉和系统相关的）
 */
function getExpenseAgentTools() {
  // 使用 toolRegistry 的专用 API 获取多个分类的工具
  const filteredTools = toolRegistry.getToolsByCategories(['expense', 'vision', 'system'])

  if (EXPENSE_AGENT_CONFIG.debug) {
    console.log(`\n🔧 [Expense Agent] 过滤后的工具数量: ${filteredTools.length}`)
    if (filteredTools.length > 0) {
      console.log('工具列表:')
      filteredTools.forEach(t => console.log(`  - ${t.name}: ${t.description}`))
    } else {
      console.warn('⚠️  [Expense Agent] 未找到任何工具')
    }
  }

  return filteredTools
}

const expenseTools = getExpenseAgentTools()

// ============================================
// 3. State 定义
// ============================================

const ExpenseAgentState = Annotation.Root({
  messages: Annotation<BaseMessage[]>({
    reducer: (x, y) => x.concat(y),
    default: () => [],
  }),

  plan: Annotation<{
    goal: string
    steps: Array<{
      description: string
      status: 'pending' | 'in_progress' | 'completed' | 'failed'
      result?: string
    }>
  } | null>({
    default: () => null,
  }),

  thoughts: Annotation<string[]>({
    reducer: (x, y) => x.concat(y),
    default: () => [],
  }),

  reflectionResult: Annotation<{
    quality: 'good' | 'needs_improvement'
    issues: string[]
    suggestions: string[]
  } | null>({
    default: () => null,
  }),

  learnings: Annotation<string[]>({
    reducer: (x, y) => x.concat(y),
    default: () => [],
  }),

  threadId: Annotation<string>({
    default: () => 'expense-default',
  }),

  // 工具调用信息
  toolCalls: Annotation<Array<{
    name: string
    args: any
    result?: string
    timestamp?: string
  }>>({
    reducer: (x, y) => x.concat(y),
    default: () => [],
  }),

  // Reflection 重试计数器
  reflectionRetryCount: Annotation<number>({
    default: () => 0,
  }),
})

type ExpenseAgentStateType = typeof ExpenseAgentState.State

// ============================================
// 4. LLM 初始化
// ============================================

if (!EXPENSE_AGENT_CONFIG.apiKey) {
  throw new Error('GOOGLE_GENAI_API_KEY environment variable is not set')
}

const expenseLLM = new ChatGoogleGenerativeAI({
  model: EXPENSE_AGENT_CONFIG.model,
  apiKey: EXPENSE_AGENT_CONFIG.apiKey,
  temperature: EXPENSE_AGENT_CONFIG.temperature,
})

const expenseLLMWithTools = expenseLLM.bindTools(expenseTools)

// ============================================
// 5. Planning 节点 - 制定计划
// ============================================

async function planningNode(
  state: ExpenseAgentStateType,
  config?: RunnableConfig
): Promise<Partial<ExpenseAgentStateType>> {
  if (EXPENSE_AGENT_CONFIG.debug) {
    console.log('\n📋 [Expense Planning 节点] 制定执行计划...')
  }

  const lastUserMessage = state.messages
    .filter(m => m._getType() === 'human')
    .pop()

  if (!lastUserMessage) {
    return {}
  }

  // 检查是否包含图片
  const hasImage = Array.isArray(lastUserMessage.content) &&
    lastUserMessage.content.some((item: any) => item.type === 'image_url')

  const planningPrompt = `你是一个开销管理规划助手。用户说: "${typeof lastUserMessage.content === 'string' ? lastUserMessage.content : '上传了图片'}"

${hasImage ? '用户上传了图片（票据/收据），你可以直接看到图片内容。' : ''}

【重要原则】请制定一个可执行的工具调用计划。

## 规划原则
1. 分析用户意图：是文本解析、图片识别还是查询任务
2. 每个步骤应该是具体的工具调用
3. 对于图片，直接分析图片内容并提取信息，不需要调用工具解析图片
4. 确保必填字段完整：amount（金额）、currency（货币）、date（日期）

## 示例对比

❌ 错误计划（信息收集型）:
用户: "今天午饭50元"
{
  "goal": "记录午饭开销",
  "steps": [
    {"description": "询问用户具体日期", "status": "pending"},
    {"description": "询问用户货币类型", "status": "pending"},
    {"description": "调用创建工具", "status": "pending"}
  ]
}

✅ 正确计划（可执行型）:
{
  "goal": "记录今天的午饭开销50元",
  "steps": [
    {"description": "调用 create_expense 工具，amount=50, currency=CNY, categoryId=餐饮, date=today", "status": "pending"}
  ]
}

## 场景特定规划

### 文本输入（如"今天午饭50元"）
{
  "goal": "从文本中提取并创建开销记录",
  "steps": [
    {"description": "调用 create_expense，从文本提取 amount/currency/category/date", "status": "pending"}
  ]
}

### 图片上传（票据/收据）
{
  "goal": "识别票据并创建开销记录",
  "steps": [
    {"description": "直接分析图片，提取商家、金额、货币、日期、商品列表", "status": "pending"},
    {"description": "根据商品内容推断分类，向用户确认识别结果", "status": "pending"},
    {"description": "用户确认后调用 create_expense 创建记录", "status": "pending"}
  ]
}

### 查询请求（如"这周花了多少钱？"）
{
  "goal": "查询本周的开销统计",
  "steps": [
    {"description": "调用 get_expense_summary，dateRange=本周", "status": "pending"}
  ]
}

## 你的任务
分析用户请求，输出 JSON 格式的可执行计划:
{
  "goal": "用户的目标",
  "steps": [
    {"description": "调用 [工具名] 工具，参数=[具体参数]", "status": "pending"}
  ]
}`

  const response = await expenseLLM.invoke([new HumanMessage(planningPrompt)])

  try {
    const planText = typeof response.content === 'string' ? response.content : ''
    const jsonMatch = planText.match(/\{[\s\S]*\}/)
    const plan = jsonMatch ? JSON.parse(jsonMatch[0]) : null

    if (plan && EXPENSE_AGENT_CONFIG.debug) {
      console.log(`🎯 [Expense Plan] 目标: ${plan.goal}`)
      plan.steps.forEach((step: any, i: number) => {
        console.log(`   ${i + 1}. ${step.description}`)
      })
    }

    return { plan }
  } catch (error) {
    if (EXPENSE_AGENT_CONFIG.debug) {
      console.error('❌ Expense Planning 解析失败:', error)
    }
    return {}
  }
}

// ============================================
// 6. Agent 节点 - 执行和推理
// ============================================

async function agentNode(
  state: ExpenseAgentStateType,
  config?: RunnableConfig
): Promise<Partial<ExpenseAgentStateType>> {
  if (EXPENSE_AGENT_CONFIG.debug) {
    console.log('\n🧠 [Expense Agent 节点] 开始推理和执行...')
    console.log(`📊 [消息历史] 当前有 ${state.messages.length} 条消息`)
  }

  // 检查是否有 Reflection 反馈
  const hasReflectionFeedback = state.reflectionResult?.quality === 'needs_improvement'
  const currentRetryCount = state.reflectionRetryCount || 0
  let newRetryCount = hasReflectionFeedback ? currentRetryCount + 1 : currentRetryCount

  // 更新计划执行进度
  let updatedPlan = state.plan
  if (state.plan && !hasReflectionFeedback) {
    const executedToolsCount = state.toolCalls?.length || 0

    if (executedToolsCount > 0) {
      updatedPlan = { ...state.plan }
      updatedPlan.steps = updatedPlan.steps.map((step, idx) => {
        if (idx < executedToolsCount && step.status === 'pending') {
          return { ...step, status: 'completed' as const }
        }
        return step
      })

      if (EXPENSE_AGENT_CONFIG.debug) {
        console.log(`🔄 [步骤更新] 前 ${executedToolsCount} 个步骤标记为 completed`)
      }
    }
  }

  // 检查是否应该继续执行
  const hasPendingSteps = updatedPlan ? updatedPlan.steps.some(s => s.status === 'pending') : false
  const nextPendingStep = updatedPlan ? updatedPlan.steps.find(s => s.status === 'pending') : null

  // 获取当前日期信息
  const today = new Date()
  const currentDate = today.toISOString().split('T')[0]
  const currentTime = today.toTimeString().split(' ')[0].slice(0, 5)

  // 生成可用工具列表
  const toolsList = expenseTools.map(t => `  - ${t.name}: ${t.description}`).join('\n')

  let systemPromptWithContext = `${EXPENSE_SYSTEM_PROMPT}

## 🔧 可用工具列表
以下是你可以调用的所有工具，工具名称必须完全匹配（区分大小写）：

${toolsList}

**重要提醒**：
- 只能调用以上列出的工具，不要尝试调用其他工具
- 工具名称必须完全匹配
- 当看到图片时，直接分析图片内容，不需要调用工具解析图片

## 📅 当前日期时间
今天是: ${currentDate}
当前时间: ${currentTime}

**重要**: 当用户说"今天"、"本周"、"本月"等相对日期时，请使用这些自然语言词汇传递给工具。工具会自动处理日期转换。

## 当前计划
${updatedPlan ? `目标: ${updatedPlan.goal}\n步骤:\n${updatedPlan.steps.map((s, i) => `${i + 1}. ${s.description} [${s.status}]`).join('\n')}` : '无'}

${hasPendingSteps ? `
⭐⭐⭐ 【重要 - ReAct 循环执行】⭐⭐⭐
你的计划还有未完成的步骤！请：
1. 找到下一个 pending 步骤：${nextPendingStep?.description}
2. 立即执行对应操作（如果是分析图片，直接分析；如果是调用工具，立即调用）
3. 不要生成最终回复，只需执行任务
4. 工具执行后，系统会自动回到你这里继续下一步

❌ 错误做法：生成文字回复说"已完成第一步"
✅ 正确做法：直接执行下一步任务（分析图片或调用工具）
` : `
✅ 所有计划步骤已完成，现在可以生成最终回复给用户。
`}`

  // 如果有 Reflection 反馈，添加改进指导
  if (hasReflectionFeedback && state.reflectionResult) {
    systemPromptWithContext += `

## ⚠️ 需要改进
你之前的回复存在以下问题，请重新生成更好的回复：

**问题:**
${state.reflectionResult.issues.map((issue, i) => `${i + 1}. ${issue}`).join('\n')}

**改进建议:**
${state.reflectionResult.suggestions.map((sugg, i) => `${i + 1}. ${sugg}`).join('\n')}

请根据这些反馈重新思考和回答。`

    if (EXPENSE_AGENT_CONFIG.debug) {
      console.log('🔄 [Reflection 重试] 收到改进反馈，重新生成回复')
    }
  }

  systemPromptWithContext += '\n\n请根据上下文和用户需求,决定是否需要调用工具。'

  try {
    // 简化消息历史
    let messagesToUse: BaseMessage[]

    if (hasReflectionFeedback) {
      const firstUserMessage = state.messages.find(m => m._getType() === 'human')
      const toolMessages = state.messages.filter(m => m._getType() === 'tool')

      if (toolMessages.length > 0 && firstUserMessage) {
        messagesToUse = [firstUserMessage, ...toolMessages]
      } else if (firstUserMessage) {
        messagesToUse = [firstUserMessage]
      } else {
        const lastAIIndex = state.messages.map(m => m._getType()).lastIndexOf('ai')
        messagesToUse = state.messages.slice(0, lastAIIndex)
      }
    } else {
      messagesToUse = state.messages.slice(-10)
    }

    const response = await expenseLLMWithTools.invoke([
      new SystemMessage(systemPromptWithContext),
      ...messagesToUse,
    ])

    if (response.tool_calls && response.tool_calls.length > 0) {
      if (EXPENSE_AGENT_CONFIG.debug) {
        console.log(`🤔 [Expense Agent 决策] 需要调用 ${response.tool_calls.length} 个工具`)
        response.tool_calls.forEach((tc, i) => {
          console.log(`   ${i + 1}. ${tc.name}(${JSON.stringify(tc.args).slice(0, 100)}...)`)
        })
      }
    } else {
      if (EXPENSE_AGENT_CONFIG.debug) {
        console.log('✅ [Expense Agent 决策] 无需工具,直接回答')
        console.log(`💬 [Expense Agent 回复] ${response.content}`)
      }
    }

    if (hasReflectionFeedback) {
      return {
        messages: [response],
        reflectionResult: null,
        plan: updatedPlan,
        reflectionRetryCount: newRetryCount,
      }
    }

    return {
      messages: [response],
      plan: updatedPlan,
      reflectionRetryCount: newRetryCount,
    }
  } catch (error: any) {
    console.error('❌ [Expense Agent 错误] 详细信息:', {
      name: error.name,
      message: error.message,
    })

    if (hasReflectionFeedback) {
      return {
        messages: [new AIMessage('抱歉，我在处理您的开销记录请求时遇到了技术问题。请稍后重试。')]
      }
    }

    throw error
  }
}

// ============================================
// 7. Tools 节点
// ============================================

async function toolsNode(
  state: ExpenseAgentStateType,
  config?: RunnableConfig
): Promise<Partial<ExpenseAgentStateType>> {
  if (EXPENSE_AGENT_CONFIG.debug) {
    console.log('\n⚙️  [Expense Tools 节点] 执行工具调用...')
  }

  const lastMessage = state.messages[state.messages.length - 1] as AIMessage

  if (!lastMessage.tool_calls || lastMessage.tool_calls.length === 0) {
    return { messages: [] }
  }

  const toolMessages: ToolMessage[] = []
  const toolCallsInfo: Array<{
    name: string
    args: any
    result?: string
    timestamp?: string
  }> = []

  for (const toolCall of lastMessage.tool_calls) {
    const tool = expenseTools.find(t => t.name === toolCall.name)

    if (!tool) {
      console.error(`❌ 未找到工具: ${toolCall.name}`)

      const availableTools = expenseTools.map(t => `- ${t.name}: ${t.description}`).join('\n')
      const errorMsg = `❌ 工具 "${toolCall.name}" 不存在。

可用的工具列表：
${availableTools}

请从以上列表中选择正确的工具名称。`

      toolMessages.push(
        new ToolMessage({
          content: errorMsg,
          tool_call_id: toolCall.id || '',
          name: toolCall.name,
        })
      )

      toolCallsInfo.push({
        name: toolCall.name,
        args: toolCall.args,
        result: errorMsg,
        timestamp: new Date().toISOString(),
      })

      continue
    }

    try {
      const result = await tool.invoke(toolCall.args)

      toolMessages.push(
        new ToolMessage({
          content: result,
          tool_call_id: toolCall.id || '',
          name: toolCall.name,
        })
      )

      toolCallsInfo.push({
        name: toolCall.name,
        args: toolCall.args,
        result: result,
        timestamp: new Date().toISOString(),
      })

      if (EXPENSE_AGENT_CONFIG.debug) {
        console.log(`✅ [Tool] ${toolCall.name}(${JSON.stringify(toolCall.args)}) -> ${result.slice(0, 100)}`)
      }
    } catch (error) {
      console.error(`❌ 工具执行失败:`, error)
      const errorMsg = `错误: ${error instanceof Error ? error.message : String(error)}`

      toolMessages.push(
        new ToolMessage({
          content: errorMsg,
          tool_call_id: toolCall.id || '',
          name: toolCall.name,
        })
      )

      toolCallsInfo.push({
        name: toolCall.name,
        args: toolCall.args,
        result: errorMsg,
        timestamp: new Date().toISOString(),
      })
    }
  }

  if (EXPENSE_AGENT_CONFIG.debug) {
    console.log(`✅ [Expense Tools] 完成 ${toolMessages.length} 个工具调用`)
  }

  return {
    messages: toolMessages,
    toolCalls: toolCallsInfo
  }
}

// ============================================
// 8. Reflection 节点 - 自我检查
// ============================================

async function reflectionNode(
  state: ExpenseAgentStateType,
  config?: RunnableConfig
): Promise<Partial<ExpenseAgentStateType>> {
  if (EXPENSE_AGENT_CONFIG.debug) {
    console.log('\n🔍 [Expense Reflection 节点] 自我检查输出质量...')
  }

  const lastAIMessage = state.messages
    .filter(m => m._getType() === 'ai')
    .pop()

  if (!lastAIMessage) {
    return {}
  }

  const toolMessages = state.messages.filter(m => m._getType() === 'tool')
  const toolResultsContext = toolMessages.length > 0
    ? `\n\n工具执行结果:\n${toolMessages.map(m => m.content).join('\n')}`
    : ''

  const reflectionPrompt = `你是一个开销记录质量检查员。请评估以下 AI 回复的质量:

用户请求: ${state.messages.filter(m => m._getType() === 'human').pop()?.content}
AI 回复: ${lastAIMessage.content}${toolResultsContext}

评估标准（只标记**严重问题**）:
1. 是否准确理解用户需求？
2. 对于开销记录，是否验证了必填字段（amount、currency、date）？
3. 如果识别图片，识别结果是否明显错误（如金额、日期格式错误）？
4. 如果使用了工具，回复是否与**最终成功的工具结果**明显矛盾？
5. 回复是否存在**严重的逻辑错误或误导**？

**关键原则 - 开销记录特定检查**：
- 金额必须是数字，不能包含货币符号
- 日期格式必须是 YYYY-MM-DD 或相对日期（如"今天"）
- 货币必须是有效的货币代码（CNY、USD、JPY 等）
- 如果最终有成功的工具调用，应该以成功结果为准
- 中间的工具调用失败不影响质量评估

**图片识别检查**：
- 如果用户上传图片，AI 必须表现出看到了图片内容
- 识别结果应该包含：商家/金额/日期等关键信息
- 不应该说"我无法看到图片"或"请提供图片"

**重要**:
- 只有存在**严重问题**时才标记为 needs_improvement
- 如果工具返回业务错误（如分类不存在），AI 告知用户即可，这不是质量问题
- 友好度、详细度等**非关键问题**不应要求改进

输出 JSON 格式:
{
  "quality": "good" | "needs_improvement",
  "issues": ["问题的具体描述"],
  "suggestions": ["具体的改进建议"]
}`

  const response = await expenseLLM.invoke([new HumanMessage(reflectionPrompt)])

  try {
    const reflectionText = typeof response.content === 'string' ? response.content : ''
    const jsonMatch = reflectionText.match(/\{[\s\S]*\}/)
    const reflectionResult = jsonMatch ? JSON.parse(jsonMatch[0]) : null

    if (reflectionResult && EXPENSE_AGENT_CONFIG.debug) {
      console.log(`📊 [Expense Reflection] 质量: ${reflectionResult.quality}`)
      if (reflectionResult.issues.length > 0) {
        console.log(`⚠️  问题: ${reflectionResult.issues.join(', ')}`)
      }
      if (reflectionResult.suggestions.length > 0) {
        console.log(`💡 建议: ${reflectionResult.suggestions.join(', ')}`)
      }
    }

    return { reflectionResult }
  } catch (error) {
    if (EXPENSE_AGENT_CONFIG.debug) {
      console.error('❌ Expense Reflection 解析失败:', error)
    }
    return {}
  }
}

// ============================================
// 9. Summary 节点 - 总结学习
// ============================================

async function summaryNode(
  state: ExpenseAgentStateType,
  config?: RunnableConfig
): Promise<Partial<ExpenseAgentStateType>> {
  if (EXPENSE_AGENT_CONFIG.debug) {
    console.log('\n📝 [Expense Summary 节点] 总结学习...')
  }

  const summaryPrompt = `从这次开销记录对话中,我学到了什么关于用户的消费习惯和偏好?

对话历史:
${state.messages.map(m => `${m._getType()}: ${m.content}`).join('\n')}

请列出 1-3 个关键学习点,每个包含:
1. 学习内容（如：用户习惯记录餐饮开销、用户倾向使用图片记录等）
2. 置信度 (0-1)
3. 应用场景

输出 JSON 数组格式。`

  const response = await expenseLLM.invoke([new HumanMessage(summaryPrompt)])

  try {
    const summaryText = typeof response.content === 'string' ? response.content : ''
    const jsonMatch = summaryText.match(/\[[\s\S]*\]/)
    const learnings = jsonMatch ? JSON.parse(jsonMatch[0]) : []

    const learningContents: string[] = []

    learnings.forEach((learning: any) => {
      const content = learning.content || learning.summary || '未能提取学习内容'
      const confidence = learning.confidence || 0.5

      if (EXPENSE_AGENT_CONFIG.debug) {
        console.log(`🧠 [Expense Learning] ${content} (confidence: ${confidence})`)
      }

      if (content && content !== '未能提取学习内容') {
        learningContents.push(content)
      }
    })

    return {
      learnings: learningContents,
    }
  } catch (error) {
    if (EXPENSE_AGENT_CONFIG.debug) {
      console.error('❌ Expense Summary 解析失败:', error)
    }
    return {}
  }
}

// ============================================
// 10. 路由函数
// ============================================

function shouldContinue(state: ExpenseAgentStateType): 'tools' | 'reflection' | typeof END {
  const lastMessage = state.messages[state.messages.length - 1]

  // 如果 Agent 决定调用工具，进入 tools 节点
  if ('tool_calls' in lastMessage && lastMessage.tool_calls && lastMessage.tool_calls.length > 0) {
    if (EXPENSE_AGENT_CONFIG.debug) {
      console.log('🔄 [Expense 路由] Agent 调用工具 → Tools 节点')
    }
    return 'tools'
  }

  const aiMessages = state.messages.filter(m => m._getType() === 'ai')
  if (aiMessages.length > 0 && !state.reflectionResult) {
    if (EXPENSE_AGENT_CONFIG.debug) {
      console.log('🔄 [Expense 路由] Agent 回复完成 → Reflection 节点')
    }
    return 'reflection'
  }

  return END
}

function afterReflection(state: ExpenseAgentStateType): 'agent' | 'summary' {
  const MAX_REFLECTION_RETRIES = 3

  if (state.reflectionResult?.quality === 'needs_improvement') {
    if (state.reflectionRetryCount >= MAX_REFLECTION_RETRIES) {
      if (EXPENSE_AGENT_CONFIG.debug) {
        console.log(`⚠️  [Expense 路由] 达到最大重试次数 (${MAX_REFLECTION_RETRIES})，强制通过`)
      }
      return 'summary'
    }

    if (EXPENSE_AGENT_CONFIG.debug) {
      console.log(`🔄 [Expense 路由] 质量不佳,返回 Agent 重新生成 (重试 ${state.reflectionRetryCount + 1}/${MAX_REFLECTION_RETRIES})`)
    }
    return 'agent'
  }

  if (EXPENSE_AGENT_CONFIG.debug) {
    console.log('✅ [Expense 路由] 质量良好,进入 Summary')
  }
  return 'summary'
}

// ============================================
// 11. 构建图
// ============================================

const expenseWorkflow = new StateGraph(ExpenseAgentState)
  .addNode('planning', planningNode)
  .addNode('agent', agentNode)
  .addNode('tools', toolsNode)
  .addNode('reflection', reflectionNode)
  .addNode('summary', summaryNode)

  .addEdge(START, 'planning')
  .addEdge('planning', 'agent')
  .addConditionalEdges('agent', shouldContinue, {
    tools: 'tools',
    reflection: 'reflection',
    [END]: END,
  })
  .addEdge('tools', 'agent')
  .addConditionalEdges('reflection', afterReflection, {
    agent: 'agent',
    summary: 'summary',
  })
  .addEdge('summary', END)

const expenseApp = expenseWorkflow.compile()

// ============================================
// 12. 导出接口
// ============================================

export interface ExpenseAgentResponse {
  success: boolean
  reply: string
  error?: string
  plan?: {
    goal: string
    steps: Array<{
      description: string
      status: string
      result?: string
    }>
  }
  reflection?: {
    quality: string
    issues: string[]
    suggestions: string[]
  }
  learnings?: string[]
  toolCalls?: Array<{
    name: string
    args: any
    result?: string
    timestamp?: string
  }>
}

/**
 * 调用 Expense Agent（支持多模态图片输入）
 *
 * @param userMessage 用户消息
 * @param threadId 会话 ID（默认为 'expense-default'）
 * @param imageData 图片数据（可选）
 */
export async function invokeExpenseAgent(
  userMessage: string,
  threadId: string = 'expense-default',
  imageData?: { base64: string; mimeType: string }
): Promise<ExpenseAgentResponse> {
  try {
    if (EXPENSE_AGENT_CONFIG.debug) {
      console.log('\n' + '='.repeat(80))
      console.log(`👤 [Expense 用户输入] ${userMessage}`)
      console.log(`🧵 [Thread ID] ${threadId}`)
      if (imageData) {
        console.log(`📷 [图片] MIME: ${imageData.mimeType}, Size: ${imageData.base64.length} bytes`)
      }
      console.log('='.repeat(80))
    }

    // 创建用户消息（支持多模态）
    let userMsg: HumanMessage
    if (imageData) {
      userMsg = new HumanMessage({
        content: [
          { type: 'text', text: userMessage },
          {
            type: 'image_url',
            image_url: `data:${imageData.mimeType};base64,${imageData.base64}`
          }
        ]
      })
    } else {
      userMsg = new HumanMessage(userMessage)
    }

    const result = await expenseApp.invoke({
      messages: [userMsg],
      threadId,
    })

    const lastAIMessage = result.messages
      .filter((m: BaseMessage) => m._getType() === 'ai')
      .pop()

    const response: ExpenseAgentResponse = {
      success: true,
      reply: lastAIMessage?.content || '无法生成回复',
      plan: result.plan || undefined,
      reflection: result.reflectionResult || undefined,
      learnings: result.learnings || undefined,
      toolCalls: result.toolCalls || undefined,
    }

    if (EXPENSE_AGENT_CONFIG.debug) {
      console.log('\n' + '='.repeat(80))
      console.log('📊 [Expense 最终结果]')
      console.log('='.repeat(80))
      console.log(`💬 ${response.reply}`)
      if (response.learnings && response.learnings.length > 0) {
        console.log('\n🧠 [本次学习]')
        response.learnings.forEach((learning: string) => {
          console.log(`   - ${learning}`)
        })
      }
    }

    return response
  } catch (error: any) {
    console.error('\n❌ [Expense Agent 错误]', error)
    return {
      success: false,
      reply: `❌ 处理失败: ${error.message}`,
      error: error.message,
    }
  }
}

/**
 * 清除会话历史（当前实现使用 LangGraph State，不需要手动管理历史）
 */
export function clearExpenseAgentHistory(threadId: string = 'expense-default') {
  if (EXPENSE_AGENT_CONFIG.debug) {
    console.log(`🗑️  [Expense Agent] 清除历史 (Thread: ${threadId})`)
  }
  // LangGraph 的 State 管理不需要手动清理
}

/**
 * 获取会话历史（当前实现使用 LangGraph State，历史在 State 中管理）
 */
export function getExpenseAgentHistory(threadId: string = 'expense-default'): BaseMessage[] {
  if (EXPENSE_AGENT_CONFIG.debug) {
    console.log(`📜 [Expense Agent] 获取历史 (Thread: ${threadId})`)
  }
  // LangGraph 的 State 管理不提供直接访问历史的接口
  return []
}
