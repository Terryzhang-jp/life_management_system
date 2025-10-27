/**
 * Intelligent Agentic Agent Engine
 *
 * 5-Node LangGraph 架构:
 * Planning → Agent → Tools → Reflection → Summary
 *
 * 基于 test-agent/intelligent-agent.ts
 */

import { ChatGoogleGenerativeAI } from '@langchain/google-genai'
import { StateGraph, START, END, Annotation } from '@langchain/langgraph'
import { BaseMessage, HumanMessage, AIMessage, ToolMessage, SystemMessage } from '@langchain/core/messages'
import type { RunnableConfig } from '@langchain/core/runnables'
import { AGENT_CONFIG, SYSTEM_PROMPT } from './agent-config'
import type { AgentResponse } from './agent-types'
import { toolRegistry, getAllBuiltInTools } from './tools'

// ============================================
// 1. 工具注册和初始化
// ============================================

/**
 * 初始化工具注册中心
 * 注册所有内置工具到全局 Registry
 */
function initializeToolRegistry(): void {
  if (toolRegistry.getStats().total === 0) {
    const builtInTools = getAllBuiltInTools()
    const count = toolRegistry.registerBatch(builtInTools)

    if (AGENT_CONFIG.debug) {
      console.log(`\n🔧 [工具系统] 初始化完成，注册了 ${count} 个工具`)
      toolRegistry.printRegistry()
    }
  }
}

// 初始化工具注册中心
initializeToolRegistry()

// 获取所有已启用的工具
const tools = toolRegistry.getAllTools()

// ============================================
// 2. State 定义
// ============================================

const AgentState = Annotation.Root({
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
    default: () => 'default',
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

type AgentStateType = typeof AgentState.State

// ============================================
// 3. LLM 初始化
// ============================================

// 验证 API Key
if (!AGENT_CONFIG.apiKey) {
  throw new Error('GOOGLE_GENERATIVE_AI_API_KEY environment variable is not set')
}

const llm = new ChatGoogleGenerativeAI({
  model: AGENT_CONFIG.model,
  apiKey: AGENT_CONFIG.apiKey,
  temperature: AGENT_CONFIG.temperature,
})

const llmWithTools = llm.bindTools(tools)

// ============================================
// 4. Planning 节点 - 制定计划
// ============================================

async function planningNode(
  state: AgentStateType,
  config?: RunnableConfig
): Promise<Partial<AgentStateType>> {
  if (AGENT_CONFIG.debug) {
    console.log('\n📋 [Planning 节点] 制定执行计划...')
  }

  const lastUserMessage = state.messages
    .filter(m => m._getType() === 'human')
    .pop()

  if (!lastUserMessage) {
    return {}
  }

  const planningPrompt = `你是一个智能规划助手。用户说: "${lastUserMessage.content}"

【重要原则】请制定一个可执行的工具调用计划，而不是信息收集计划。

## 规划原则
1. 优先使用描述查询而不是询问用户提供 ID
2. 每个步骤应该是具体的工具调用，不是"询问用户"或"收集信息"
3. 工具会自动处理模糊匹配，直接尝试调用
4. 只有在工具返回多个结果时，才需要"引导用户选择"

## 示例对比

❌ 错误计划（信息收集型）:
用户: "把今天的团队会议改到3点"
{
  "goal": "修改团队会议时间",
  "steps": [
    {"description": "询问用户具体是哪个团队会议", "status": "pending"},
    {"description": "确认新的时间", "status": "pending"},
    {"description": "调用更新工具", "status": "pending"}
  ]
}

✅ 正确计划（可执行型）:
{
  "goal": "将今天的团队会议改到下午3点",
  "steps": [
    {"description": "调用 updateScheduleBlock 工具，searchTitle=团队会议, searchDate=today, newStartTime=15:00", "status": "pending"}
  ]
}

## 你的任务
分析用户请求："${lastUserMessage.content}"，输出 JSON 格式的可执行计划:
{
  "goal": "用户的目标",
  "steps": [
    {"description": "调用 [工具名] 工具，参数=[具体参数]", "status": "pending"}
  ]
}`

  const response = await llm.invoke([new HumanMessage(planningPrompt)])

  try {
    const planText = typeof response.content === 'string' ? response.content : ''
    const jsonMatch = planText.match(/\{[\s\S]*\}/)
    const plan = jsonMatch ? JSON.parse(jsonMatch[0]) : null

    if (plan && AGENT_CONFIG.debug) {
      console.log(`🎯 [Plan] 目标: ${plan.goal}`)
      plan.steps.forEach((step: any, i: number) => {
        console.log(`   ${i + 1}. ${step.description}`)
      })
    }

    return { plan }
  } catch (error) {
    if (AGENT_CONFIG.debug) {
      console.error('❌ Planning 解析失败:', error)
    }
    return {}
  }
}

// ============================================
// 5. Agent 节点 - 执行和推理
// ============================================

async function agentNode(
  state: AgentStateType,
  config?: RunnableConfig
): Promise<Partial<AgentStateType>> {
  if (AGENT_CONFIG.debug) {
    console.log('\n🧠 [Agent 节点] 开始推理和执行...')
    console.log(`📊 [消息历史] 当前有 ${state.messages.length} 条消息`)
  }

  // ⭐ Evaluator-Optimizer 模式：检查是否有 Reflection 反馈
  const hasReflectionFeedback = state.reflectionResult?.quality === 'needs_improvement'

  // ⭐ 增加 Reflection 重试计数器（处理 undefined 初始值）
  const currentRetryCount = state.reflectionRetryCount || 0
  let newRetryCount = hasReflectionFeedback ? currentRetryCount + 1 : currentRetryCount

  // ⭐ ReAct 循环：检查计划执行进度并更新步骤状态
  let updatedPlan = state.plan
  if (state.plan && !hasReflectionFeedback) {
    // 统计已完成的步骤
    const completedSteps = state.plan.steps.filter(s => s.status === 'completed').length
    const totalSteps = state.plan.steps.length

    if (AGENT_CONFIG.debug) {
      console.log(`📋 [计划进度] ${completedSteps}/${totalSteps} 步骤已完成`)
    }

    // ⭐ 改进的步骤状态更新逻辑：
    // 统计已执行的工具调用次数（来自 toolCalls state）
    const executedToolsCount = state.toolCalls?.length || 0

    // 更新步骤状态：前 N 个步骤标记为 completed，其中 N = 已执行工具数
    if (executedToolsCount > 0) {
      updatedPlan = { ...state.plan }
      updatedPlan.steps = updatedPlan.steps.map((step, idx) => {
        if (idx < executedToolsCount && step.status === 'pending') {
          return { ...step, status: 'completed' as const }
        }
        return step
      })

      if (AGENT_CONFIG.debug) {
        console.log(`🔄 [步骤更新] 前 ${executedToolsCount} 个步骤标记为 completed`)
      }
    }
  }

  // ⭐ ReAct 循环：检查是否应该继续执行
  const hasPendingSteps = updatedPlan ? updatedPlan.steps.some(s => s.status === 'pending') : false
  const nextPendingStep = updatedPlan ? updatedPlan.steps.find(s => s.status === 'pending') : null

  // ⭐ 获取当前日期信息
  const today = new Date()
  const currentDate = today.toISOString().split('T')[0] // YYYY-MM-DD
  const currentTime = today.toTimeString().split(' ')[0].slice(0, 5) // HH:MM
  const weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  const currentWeekday = weekdays[today.getDay()]

  // ⭐ 生成可用工具列表
  const toolsList = tools.map(t => `  - ${t.name}: ${t.description}`).join('\n')

  let systemPromptWithContext = `${SYSTEM_PROMPT}

## 🔧 可用工具列表
以下是你可以调用的所有工具，工具名称必须完全匹配（区分大小写）：

${toolsList}

**重要提醒**：
- 只能调用以上列出的工具，不要尝试调用其他工具
- 工具名称必须完全匹配，例如查询日程使用 \`querySchedule\` 而不是 \`getSchedule\`
- 如果不确定工具的参数要求，可以先调用 \`getToolDocumentation\` 查询详细文档

## 📅 当前日期时间
今天是: ${currentDate} (${currentWeekday})
当前时间: ${currentTime}

**重要**: 当用户说"今天"、"明天"、"后天"等相对日期时，请使用这些自然语言词汇传递给工具，不要自己计算具体日期。工具会自动处理日期转换。

## 当前计划
${updatedPlan ? `目标: ${updatedPlan.goal}\n步骤:\n${updatedPlan.steps.map((s, i) => `${i + 1}. ${s.description} [${s.status}]`).join('\n')}` : '无'}

${hasPendingSteps ? `
⭐⭐⭐ 【重要 - ReAct 循环执行】⭐⭐⭐
你的计划还有未完成的步骤！请：
1. 找到下一个 pending 步骤：${nextPendingStep?.description}
2. 立即调用对应的工具（不要问用户，直接执行）
3. 不要生成最终回复，只需调用工具
4. 工具执行后，系统会自动回到你这里继续下一步

❌ 错误做法：生成文字回复说"已完成第一步"
✅ 正确做法：直接调用下一个工具
` : `
✅ 所有计划步骤已完成，现在可以生成最终回复给用户。
`}`

  // ⭐ 如果有 Reflection 反馈，添加改进指导
  if (hasReflectionFeedback && state.reflectionResult) {
    systemPromptWithContext += `

## ⚠️ 需要改进
你之前的回复存在以下问题，请重新生成更好的回复：

**问题:**
${state.reflectionResult.issues.map((issue, i) => `${i + 1}. ${issue}`).join('\n')}

**改进建议:**
${state.reflectionResult.suggestions.map((sugg, i) => `${i + 1}. ${sugg}`).join('\n')}

请根据这些反馈重新思考和回答。`

    if (AGENT_CONFIG.debug) {
      console.log('🔄 [Reflection 重试] 收到改进反馈，重新生成回复')
      console.log(`   问题: ${state.reflectionResult.issues.join(', ')}`)
    }
  }

  systemPromptWithContext += '\n\n请根据上下文和用户需求,决定是否需要调用工具。'

  try {
    // ⭐ 如果是 Reflection 重试，简化消息历史，只保留原始用户问题和最后的工具结果
    let messagesToUse: BaseMessage[]

    if (hasReflectionFeedback) {
      // 找到第一条 HumanMessage（用户问题）
      const firstUserMessage = state.messages.find(m => m._getType() === 'human')

      // 找到最近的 ToolMessage（工具执行结果）
      const toolMessages = state.messages.filter(m => m._getType() === 'tool')

      // 重试时只保留：用户问题 + 最后的工具结果（如果有）
      if (toolMessages.length > 0 && firstUserMessage) {
        messagesToUse = [firstUserMessage, ...toolMessages]

        if (AGENT_CONFIG.debug) {
          console.log(`🔄 [重试] 简化消息历史: 用户问题 + ${toolMessages.length} 个工具结果`)
        }
      } else if (firstUserMessage) {
        // 如果没有工具结果，只保留用户问题
        messagesToUse = [firstUserMessage]

        if (AGENT_CONFIG.debug) {
          console.log(`🔄 [重试] 简化消息历史: 仅保留用户问题`)
        }
      } else {
        // 安全回退：保留所有消息但移除最后的 AI 回复
        const lastAIIndex = state.messages.map(m => m._getType()).lastIndexOf('ai')
        messagesToUse = state.messages.slice(0, lastAIIndex)

        if (AGENT_CONFIG.debug) {
          console.log(`⚠️  [重试] 回退策略: 移除失败的 AI 回复`)
        }
      }
    } else {
      // 正常情况，保留最近 10 条消息
      messagesToUse = state.messages.slice(-10)

      if (AGENT_CONFIG.debug && state.messages.length > 10) {
        console.log(`⚠️  消息历史过长，截取最近 10 条（原有 ${state.messages.length} 条）`)
      }
    }

    const response = await llmWithTools.invoke([
      new SystemMessage(systemPromptWithContext),
      ...messagesToUse,
    ])

    if (response.tool_calls && response.tool_calls.length > 0) {
      if (AGENT_CONFIG.debug) {
        console.log(`🤔 [Agent 决策] 需要调用 ${response.tool_calls.length} 个工具`)
        response.tool_calls.forEach((tc, i) => {
          console.log(`   ${i + 1}. ${tc.name}(${JSON.stringify(tc.args).slice(0, 100)}...)`)
        })
      }
    } else {
      if (AGENT_CONFIG.debug) {
        console.log('✅ [Agent 决策] 无需工具,直接回答')
        console.log(`💬 [Agent 回复] ${response.content}`)
      }
    }

    // ⭐ 如果是 Reflection 重试后的重新生成，清除旧的 reflectionResult
    // 这样新生成的回复可以被重新评估
    if (hasReflectionFeedback) {
      return {
        messages: [response],
        reflectionResult: null, // 清除旧的反馈，允许重新评估
        plan: updatedPlan, // 保存更新后的计划
        reflectionRetryCount: newRetryCount, // 更新重试计数器
      }
    }

    return {
      messages: [response],
      plan: updatedPlan, // 保存更新后的计划
      reflectionRetryCount: newRetryCount, // 更新重试计数器
    }
  } catch (error: any) {
    console.error('❌ [Agent 错误] 详细信息:', {
      name: error.name,
      message: error.message,
      stack: error.stack?.split('\n').slice(0, 3).join('\n')
    })

    // 如果重试仍然失败，返回降级回复
    if (hasReflectionFeedback) {
      console.log('⚠️  Reflection 重试失败，返回降级回复')
      return {
        messages: [new AIMessage('抱歉，我在改进回复时遇到了技术问题。让我直接回答：我已经尽力处理您的请求，但可能需要您提供更多信息。')]
      }
    }

    throw error
  }
}

// ============================================
// 6. Tools 节点
// ============================================

async function toolsNode(
  state: AgentStateType,
  config?: RunnableConfig
): Promise<Partial<AgentStateType>> {
  if (AGENT_CONFIG.debug) {
    console.log('\n⚙️  [Tools 节点] 执行工具调用...')
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
    const tool = tools.find(t => t.name === toolCall.name)

    if (!tool) {
      console.error(`❌ 未找到工具: ${toolCall.name}`)

      // ⭐ 返回可用工具列表帮助 Agent 纠正
      const availableTools = tools.map(t => `- ${t.name}: ${t.description}`).join('\n')
      const errorMsg = `❌ 工具 "${toolCall.name}" 不存在。

可用的工具列表：
${availableTools}

请从以上列表中选择正确的工具名称，工具名称必须完全匹配。`

      toolMessages.push(
        new ToolMessage({
          content: errorMsg,
          tool_call_id: toolCall.id || '',
          name: toolCall.name,
        })
      )

      // 记录失败的工具调用
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

      // 保存到 messages
      toolMessages.push(
        new ToolMessage({
          content: result,
          tool_call_id: toolCall.id || '',
          name: toolCall.name,  // ⭐ Google Gemini 要求必须提供工具名称
        })
      )

      // ⭐ 记录工具调用信息到 State
      toolCallsInfo.push({
        name: toolCall.name,
        args: toolCall.args,
        result: result,
        timestamp: new Date().toISOString(),
      })

      if (AGENT_CONFIG.debug) {
        console.log(`✅ [Tool] ${toolCall.name}(${JSON.stringify(toolCall.args)}) -> ${result.slice(0, 100)}`)
      }
    } catch (error) {
      console.error(`❌ 工具执行失败:`, error)
      const errorMsg = `错误: ${error instanceof Error ? error.message : String(error)}`

      toolMessages.push(
        new ToolMessage({
          content: errorMsg,
          tool_call_id: toolCall.id || '',
          name: toolCall.name,  // ⭐ Google Gemini 要求必须提供工具名称
        })
      )

      // 记录失败的工具调用
      toolCallsInfo.push({
        name: toolCall.name,
        args: toolCall.args,
        result: errorMsg,
        timestamp: new Date().toISOString(),
      })
    }
  }

  if (AGENT_CONFIG.debug) {
    console.log(`✅ [Tools] 完成 ${toolMessages.length} 个工具调用`)
  }

  return {
    messages: toolMessages,
    toolCalls: toolCallsInfo
  }
}

// ============================================
// 7. Reflection 节点 - 自我检查
// ============================================

async function reflectionNode(
  state: AgentStateType,
  config?: RunnableConfig
): Promise<Partial<AgentStateType>> {
  if (AGENT_CONFIG.debug) {
    console.log('\n🔍 [Reflection 节点] 自我检查输出质量...')
  }

  const lastAIMessage = state.messages
    .filter(m => m._getType() === 'ai')
    .pop()

  if (!lastAIMessage) {
    return {}
  }

  // 获取工具调用的结果，帮助 Reflection 做出正确判断
  const toolMessages = state.messages.filter(m => m._getType() === 'tool')
  const toolResultsContext = toolMessages.length > 0
    ? `\n\n工具执行结果:\n${toolMessages.map(m => m.content).join('\n')}`
    : ''

  const reflectionPrompt = `你是一个质量检查员。请评估以下 AI 回复的质量:

用户请求: ${state.messages.filter(m => m._getType() === 'human').pop()?.content}
AI 回复: ${lastAIMessage.content}${toolResultsContext}

评估标准（只标记**严重问题**）:
1. 是否准确理解用户需求?
2. 如果使用了工具，回复是否与**最终成功的工具结果**明显矛盾?
3. 回复是否存在**严重的逻辑错误或误导**?
4. 是否**完全遗漏**了关键信息导致用户无法理解?

**关键原则 - 只看最终结果**：
- 如果工具执行过程中有失败，但**最终有成功的工具调用**，应该以成功结果为准
- 中间的工具调用失败（参数错误等）不影响最终质量评估，只要最后得到了正确答案
- 例如：第一次调用参数错误失败，第二次调用成功并获得结果，这是可以接受的

**工具调用问题判断**：
- 如果**所有工具调用都失败**且没有得到有效结果，这才是严重问题
- 如果只是中间有失败但最终成功了，这不是质量问题

**重要**:
- 只有存在**严重问题**时才标记为 needs_improvement
- 如果工具返回业务错误（如时间冲突、数据不存在），AI 告知用户即可，这不是质量问题
- 友好度、详细度等**非关键问题**不应要求改进
- 如果 AI 已经传达了工具的核心信息，即使不够详细也应该接受

输出 JSON 格式:
{
  "quality": "good" | "needs_improvement",
  "issues": ["问题的具体描述，例如：调用了不存在的工具 getSchedule"],
  "suggestions": ["具体的改进建议，例如：使用 querySchedule 工具查询日程，参数应该包括 date 或 dateRange"]
}`

  const response = await llm.invoke([new HumanMessage(reflectionPrompt)])

  try {
    const reflectionText = typeof response.content === 'string' ? response.content : ''
    const jsonMatch = reflectionText.match(/\{[\s\S]*\}/)
    const reflectionResult = jsonMatch ? JSON.parse(jsonMatch[0]) : null

    if (reflectionResult && AGENT_CONFIG.debug) {
      console.log(`📊 [Reflection] 质量: ${reflectionResult.quality}`)
      if (reflectionResult.issues.length > 0) {
        console.log(`⚠️  问题: ${reflectionResult.issues.join(', ')}`)
      }
      if (reflectionResult.suggestions.length > 0) {
        console.log(`💡 建议: ${reflectionResult.suggestions.join(', ')}`)
      }
    }

    return { reflectionResult }
  } catch (error) {
    if (AGENT_CONFIG.debug) {
      console.error('❌ Reflection 解析失败:', error)
    }
    return {}
  }
}

// ============================================
// 8. Summary 节点 - 总结学习
// ============================================

async function summaryNode(
  state: AgentStateType,
  config?: RunnableConfig
): Promise<Partial<AgentStateType>> {
  if (AGENT_CONFIG.debug) {
    console.log('\n📝 [Summary 节点] 总结学习...')
  }

  const summaryPrompt = `从这次对话中,我学到了什么关于用户的偏好和习惯?

对话历史:
${state.messages.map(m => `${m._getType()}: ${m.content}`).join('\n')}

请列出 1-3 个关键学习点,每个包含:
1. 学习内容
2. 置信度 (0-1)
3. 应用场景

输出 JSON 数组格式。`

  const response = await llm.invoke([new HumanMessage(summaryPrompt)])

  try {
    const summaryText = typeof response.content === 'string' ? response.content : ''
    const jsonMatch = summaryText.match(/\[[\s\S]*\]/)
    const learnings = jsonMatch ? JSON.parse(jsonMatch[0]) : []

    const learningContents: string[] = []

    learnings.forEach((learning: any) => {
      const content = learning.content || learning.summary || '未能提取学习内容'
      const confidence = learning.confidence || 0.5

      if (AGENT_CONFIG.debug) {
        console.log(`🧠 [Learning] ${content} (confidence: ${confidence})`)
      }

      if (content && content !== '未能提取学习内容') {
        learningContents.push(content)
      }
    })

    return {
      learnings: learningContents,
    }
  } catch (error) {
    if (AGENT_CONFIG.debug) {
      console.error('❌ Summary 解析失败:', error)
    }
    return {}
  }
}

// ============================================
// 9. 路由函数
// ============================================

function shouldContinue(state: AgentStateType): 'tools' | 'reflection' | typeof END {
  const lastMessage = state.messages[state.messages.length - 1]

  // 如果 Agent 决定调用工具，进入 tools 节点
  if ('tool_calls' in lastMessage && lastMessage.tool_calls && lastMessage.tool_calls.length > 0) {
    if (AGENT_CONFIG.debug) {
      console.log('🔄 [路由] Agent 调用工具 → Tools 节点')
    }
    return 'tools'
  }

  // ⭐ ReAct 循环：检查是否还有未完成的计划步骤
  if (state.plan) {
    const pendingSteps = state.plan.steps.filter(s => s.status === 'pending')
    if (pendingSteps.length > 0) {
      if (AGENT_CONFIG.debug) {
        console.log(`🔄 [路由] 还有 ${pendingSteps.length} 个未完成步骤 → 继续循环到 Agent`)
      }
      // 注意：这里返回 'tools' 实际上会让系统回到 agent，因为 tools → agent 的边是固定的
      // 我们需要让 agent 继续执行，所以这里不返回，让它进入下面的 reflection
    }
  }

  const aiMessages = state.messages.filter(m => m._getType() === 'ai')
  if (aiMessages.length > 0 && !state.reflectionResult) {
    if (AGENT_CONFIG.debug) {
      console.log('🔄 [路由] Agent 回复完成 → Reflection 节点')
    }
    return 'reflection'
  }

  return END
}

function afterReflection(state: AgentStateType): 'agent' | 'summary' {
  const MAX_REFLECTION_RETRIES = 3 // 最多重试3次

  if (state.reflectionResult?.quality === 'needs_improvement') {
    // 检查是否达到最大重试次数
    if (state.reflectionRetryCount >= MAX_REFLECTION_RETRIES) {
      if (AGENT_CONFIG.debug) {
        console.log(`⚠️  [路由] 达到最大重试次数 (${MAX_REFLECTION_RETRIES})，强制通过`)
      }
      return 'summary'
    }

    if (AGENT_CONFIG.debug) {
      console.log(`🔄 [路由] 质量不佳,返回 Agent 重新生成 (重试 ${state.reflectionRetryCount + 1}/${MAX_REFLECTION_RETRIES})`)
    }
    return 'agent'
  }

  if (AGENT_CONFIG.debug) {
    console.log('✅ [路由] 质量良好,进入 Summary')
  }
  return 'summary'
}

// ============================================
// 10. 构建图
// ============================================

const workflow = new StateGraph(AgentState)
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

const app = workflow.compile()

// ============================================
// 11. 导出 Invoke 函数
// ============================================

export async function invokeIntelligentAgent(
  userMessage: string,
  threadId: string = 'default'
): Promise<AgentResponse> {
  try {
    if (AGENT_CONFIG.debug) {
      console.log('\n' + '='.repeat(80))
      console.log(`👤 [用户输入] ${userMessage}`)
      console.log(`🧵 [Thread ID] ${threadId}`)
      console.log('='.repeat(80))
    }

    const result = await app.invoke({
      messages: [new HumanMessage(userMessage)],
      threadId,
    })

    const lastAIMessage = result.messages
      .filter((m: BaseMessage) => m._getType() === 'ai')
      .pop()

    const response: AgentResponse = {
      reply: lastAIMessage?.content || '无法生成回复',
      plan: result.plan || undefined,
      reflection: result.reflectionResult || undefined,
      learnings: result.learnings || undefined,
      thoughts: result.thoughts || undefined,
      toolCalls: result.toolCalls || undefined,
      allMessages: result.messages,
    }

    if (AGENT_CONFIG.debug) {
      console.log('\n' + '='.repeat(80))
      console.log('📊 [最终结果]')
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
  } catch (error) {
    console.error('\n❌ [Agent 错误]', error)
    throw error
  }
}
