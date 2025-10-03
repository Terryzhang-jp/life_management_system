# AI Agent 实现计划 - Plan-Then-Execute 架构

## 📋 目标

实现一个智能任务助手，能够处理复杂的多步骤指令，例如：
- "先标记任务 ID:62 完成，创建发邮件任务，标记完成，创建等待反馈任务"
- "创建任务 A，删除任务 X，创建任务 B，修改任务 B 的标题"

**核心理念**：Plan-Then-Execute（先计划、再执行）
1. AI 理解用户意图，生成结构化计划
2. 展示完整计划给用户确认
3. 用户确认后，按顺序执行所有步骤

## 🏗️ 架构设计

### 三层架构

```
┌─────────────────────────────────────┐
│   Layer 3: 编排层 (Orchestration)    │
│   - Planner: 生成执行计划            │
│   - Executor: 顺序执行工具           │
│   - Variable Resolver: 处理步骤依赖  │
└─────────────────────────────────────┘
              ↓ 依赖
┌─────────────────────────────────────┐
│   Layer 2: 工具注册层 (Tools)        │
│   - 统一的工具注册表                 │
│   - 工具路由和调度                   │
│   - 统一的返回格式                   │
└─────────────────────────────────────┘
              ↓ 依赖
┌─────────────────────────────────────┐
│   Layer 1: 基础工具层 (CRUD)         │
│   - complete_task                   │
│   - create_task                     │
│   - update_task                     │
│   - delete_task (可选)              │
└─────────────────────────────────────┘
```

### 数据流

```
用户输入
  ↓
Planner (generateObject)
  ↓
结构化计划 (Plan JSON)
  ↓
前端展示计划卡片
  ↓
用户确认
  ↓
Executor 逐步执行
  ↓
前端实时显示进度
  ↓
返回执行结果
```

## 📝 核心数据结构

### 1. 执行计划 (Plan)

```typescript
interface ExecutionPlan {
  steps: ExecutionStep[]
  summary: string  // 人类可读的总结
}

interface ExecutionStep {
  id: string                    // 步骤ID，如 "step1", "step2"
  action: ToolName              // 工具名称
  params: Record<string, any>   // 工具参数（可能包含占位符）
  description: string           // 人类可读的描述
  dependsOn?: string[]          // 依赖的步骤ID（可选）
}

type ToolName = 'complete_task' | 'create_task' | 'update_task' | 'delete_task'
```

### 2. 工具返回格式（统一）

```typescript
interface ToolResult {
  success: boolean
  data?: any        // 成功时的数据（如新任务的ID）
  error?: string    // 失败时的错误信息
  message?: string  // 人类可读的消息
}
```

### 3. 执行上下文

```typescript
interface ExecutionContext {
  vars: Record<string, any>     // 变量表：{ step1: {...}, step2: {...} }
  logs: ExecutionLog[]          // 执行日志
  currentStep: number           // 当前执行到第几步
}

interface ExecutionLog {
  stepId: string
  tool: ToolName
  input: any
  output: ToolResult
  timestamp: string
  duration: number  // 毫秒
}
```

## 🔨 实现步骤

### Phase 1: 工具层重构 (30-45分钟)

**目标**：建立统一的工具注册表，添加 complete_task 工具

#### 步骤 1.1: 创建工具注册文件

**文件**: `lib/workspace/tools.ts`

```typescript
import { tool } from 'ai'
import { z } from 'zod'
import tasksDbManager from '@/lib/tasks-db'
import { CreateTaskSchema, UpdateTaskSchema } from './task-tools'

// 完成任务工具
export const complete_task = tool({
  description: '标记任务为已完成状态',
  inputSchema: z.object({
    id: z.number().describe('要完成的任务ID')
  }),
  async execute({ id }) {
    try {
      // 调用数据库完成任务的逻辑
      const task = tasksDbManager.getTask(id)
      if (!task) {
        return { success: false, error: `任务 ID:${id} 不存在` }
      }

      // 这里需要实现完成任务的数据库操作
      // 暂时返回成功
      return {
        success: true,
        data: { id, title: task.title },
        message: `任务 "${task.title}" 已标记为完成`
      }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  }
})

// 创建任务工具（重构）
export const create_task = tool({
  description: '创建新的任务',
  inputSchema: CreateTaskSchema,
  async execute(params) {
    try {
      const result = tasksDbManager.createTask(params)
      return {
        success: true,
        data: { id: result.id, title: params.title },
        message: `任务 "${params.title}" 创建成功`
      }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  }
})

// 更新任务工具（重构）
export const update_task = tool({
  description: '更新已存在的任务',
  inputSchema: UpdateTaskSchema,
  async execute(params) {
    try {
      const task = tasksDbManager.getTask(params.id)
      if (!task) {
        return { success: false, error: `任务 ID:${params.id} 不存在` }
      }

      tasksDbManager.updateTask(params.id, params)
      return {
        success: true,
        data: { id: params.id },
        message: `任务已更新`
      }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  }
})

// 统一导出
export const taskTools = {
  complete_task,
  create_task,
  update_task
}
```

#### 步骤 1.2: 更新 task-tools.ts

**文件**: `lib/workspace/task-tools.ts`

添加 CompleteTaskSchema：

```typescript
/**
 * 完成任务工具参数
 */
export const CompleteTaskSchema = z.object({
  id: z.number().describe('要完成的任务ID')
})

export type TaskOperation = 'complete_task' | 'create_task' | 'update_task' | 'delete_task'
```

#### 步骤 1.3: 修改 chat route 使用新工具

**文件**: `app/api/workspace-assistant/chat/route.ts`

```typescript
import { taskTools } from '@/lib/workspace/tools'

// 替换原有的 tools 定义
const tools = enableEdit ? taskTools : undefined
```

**验证**：
- [ ] 测试单步创建任务是否正常
- [ ] 测试单步更新任务是否正常
- [ ] 测试工具返回格式统一

---

### Phase 2: Planner 实现 (1-1.5小时)

**目标**：实现意图理解和计划生成

#### 步骤 2.1: 创建 Planner

**文件**: `lib/workspace/planner.ts`

```typescript
import { generateObject } from 'ai'
import { google } from '@ai-sdk/google'
import { z } from 'zod'

// 执行步骤 Schema
const ExecutionStepSchema = z.object({
  id: z.string().describe('步骤ID，如 step1, step2'),
  action: z.enum(['complete_task', 'create_task', 'update_task']).describe('要执行的操作'),
  params: z.record(z.any()).describe('操作参数，可能包含占位符如 {{step1.id}}'),
  description: z.string().describe('人类可读的操作描述'),
  dependsOn: z.array(z.string()).optional().describe('依赖的步骤ID列表')
})

// 执行计划 Schema
const ExecutionPlanSchema = z.object({
  steps: z.array(ExecutionStepSchema).min(1).describe('按顺序执行的步骤列表'),
  summary: z.string().describe('整个计划的简短总结')
})

export type ExecutionPlan = z.infer<typeof ExecutionPlanSchema>
export type ExecutionStep = z.infer<typeof ExecutionStepSchema>

/**
 * 生成执行计划
 */
export async function generatePlan(
  userMessage: string,
  context: {
    tasks: any[]           // 当前任务上下文
    conversationHistory: any[]  // 对话历史
  }
): Promise<ExecutionPlan> {
  const systemPrompt = `你是一个任务管理助手的计划生成器。

你的职责是：
1. 理解用户的复杂指令
2. 将指令拆解成有序的执行步骤
3. 生成结构化的执行计划（JSON格式）

可用的操作：
- complete_task: 标记任务为已完成，参数 { id: number }
- create_task: 创建新任务，参数 { type, level, title, description?, priority?, parentId?, deadline? }
- update_task: 更新任务，参数 { id: number, title?, description?, priority?, deadline?, isUnclear?, unclearReason? }

重要规则：
1. 如果后续步骤需要用到前面步骤创建的任务ID，使用占位符：{{stepN.id}}，其中 N 是步骤ID
2. 每个步骤必须有清晰的 description，方便用户理解
3. 如果步骤之间有依赖关系，必须在 dependsOn 中声明
4. 步骤ID使用 step1, step2, step3 这样的格式

示例：
用户："先创建任务A，然后标记它完成"
输出：
{
  "summary": "创建任务A并标记完成",
  "steps": [
    {
      "id": "step1",
      "action": "create_task",
      "params": { "type": "short-term", "level": "main", "title": "A" },
      "description": "创建任务：A"
    },
    {
      "id": "step2",
      "action": "complete_task",
      "params": { "id": "{{step1.id}}" },
      "description": "标记刚创建的任务为完成",
      "dependsOn": ["step1"]
    }
  ]
}
`

  const { object } = await generateObject({
    model: google('gemini-2.0-flash-exp'),
    schema: ExecutionPlanSchema,
    system: systemPrompt,
    prompt: `用户指令：${userMessage}\n\n请生成执行计划。`,
    temperature: 0.1  // 降低温度确保格式稳定
  })

  return object
}
```

#### 步骤 2.2: 测试 Planner

创建测试用例：

```typescript
// 测试用例
const testCases = [
  {
    input: "先标记任务 ID:62 完成，创建发邮件任务，标记完成，创建等待反馈任务",
    expected: 4  // 期望4个步骤
  },
  {
    input: "创建任务A，删除任务X，创建任务B",
    expected: 3
  }
]
```

**验证**：
- [ ] Planner 能正确理解意图
- [ ] 生成的 JSON 格式正确
- [ ] 步骤顺序符合逻辑
- [ ] 占位符使用正确

---

### Phase 3: Executor 实现 (1-1.5小时)

**目标**：实现计划的顺序执行

#### 步骤 3.1: 创建 Executor

**文件**: `lib/workspace/executor.ts`

```typescript
import { ExecutionPlan, ExecutionStep } from './planner'
import { taskTools } from './tools'

interface ExecutionContext {
  vars: Record<string, any>
  logs: Array<{
    stepId: string
    tool: string
    input: any
    output: any
    timestamp: string
    duration: number
  }>
  currentStep: number
}

interface ExecutionResult {
  success: boolean
  context: ExecutionContext
  summary: string
  error?: string
}

/**
 * 解析变量占位符
 * 例如：{ id: "{{step1.id}}" } => { id: 123 }
 */
function resolveVariables(
  params: Record<string, any>,
  context: ExecutionContext
): Record<string, any> {
  const resolved: Record<string, any> = {}

  for (const [key, value] of Object.entries(params)) {
    if (typeof value === 'string' && value.startsWith('{{') && value.endsWith('}}')) {
      // 提取占位符：{{step1.id}} => step1.id
      const path = value.slice(2, -2)
      const [stepId, ...props] = path.split('.')

      // 从上下文中获取值
      let resolvedValue = context.vars[stepId]
      for (const prop of props) {
        resolvedValue = resolvedValue?.[prop]
      }

      if (resolvedValue === undefined) {
        throw new Error(`无法解析变量：${value}`)
      }

      resolved[key] = resolvedValue
    } else if (typeof value === 'object' && value !== null) {
      // 递归处理嵌套对象
      resolved[key] = resolveVariables(value, context)
    } else {
      resolved[key] = value
    }
  }

  return resolved
}

/**
 * 执行单个步骤
 */
async function executeStep(
  step: ExecutionStep,
  context: ExecutionContext
): Promise<any> {
  const startTime = Date.now()

  try {
    // 解析变量
    const resolvedParams = resolveVariables(step.params, context)

    // 获取工具
    const tool = taskTools[step.action as keyof typeof taskTools]
    if (!tool) {
      throw new Error(`未知的工具：${step.action}`)
    }

    // 执行工具
    const result = await tool.execute(resolvedParams)

    // 记录日志
    const duration = Date.now() - startTime
    context.logs.push({
      stepId: step.id,
      tool: step.action,
      input: resolvedParams,
      output: result,
      timestamp: new Date().toISOString(),
      duration
    })

    return result
  } catch (error: any) {
    const duration = Date.now() - startTime
    context.logs.push({
      stepId: step.id,
      tool: step.action,
      input: step.params,
      output: { success: false, error: error.message },
      timestamp: new Date().toISOString(),
      duration
    })
    throw error
  }
}

/**
 * 执行完整计划
 */
export async function executePlan(plan: ExecutionPlan): Promise<ExecutionResult> {
  const context: ExecutionContext = {
    vars: {},
    logs: [],
    currentStep: 0
  }

  try {
    // 按顺序执行每个步骤
    for (let i = 0; i < plan.steps.length; i++) {
      const step = plan.steps[i]
      context.currentStep = i + 1

      console.log(`执行步骤 ${i + 1}/${plan.steps.length}: ${step.description}`)

      // 执行步骤
      const result = await executeStep(step, context)

      // 检查结果
      if (!result.success) {
        throw new Error(`步骤 ${step.id} 失败: ${result.error}`)
      }

      // 保存结果到变量表
      context.vars[step.id] = result.data || result

      console.log(`步骤 ${i + 1} 完成:`, result)
    }

    // 生成总结
    const summary = `成功执行 ${plan.steps.length} 个步骤：\n${
      plan.steps.map((s, i) => `${i + 1}. ${s.description}`).join('\n')
    }`

    return {
      success: true,
      context,
      summary
    }
  } catch (error: any) {
    return {
      success: false,
      context,
      summary: `执行失败于步骤 ${context.currentStep}`,
      error: error.message
    }
  }
}
```

**验证**：
- [ ] 能正确执行简单计划（无依赖）
- [ ] 能正确处理变量占位符
- [ ] 错误处理正常
- [ ] 日志记录完整

---

### Phase 4: API 集成 (1小时)

**目标**：将 Planner 和 Executor 集成到 chat API

#### 步骤 4.1: 修改 chat route

**文件**: `app/api/workspace-assistant/chat/route.ts`

```typescript
import { generatePlan } from '@/lib/workspace/planner'

// 在 POST 函数中，检测是否为多步骤指令
export async function POST(request: NextRequest) {
  // ... 现有代码 ...

  // 检测是否为复杂多步骤指令
  const isComplexInstruction = detectComplexInstruction(message)

  if (isComplexInstruction && enableEdit) {
    // 生成计划
    const plan = await generatePlan(message, {
      tasks: context.tasks,
      conversationHistory: messages
    })

    // 发送计划到前端
    send({
      type: 'execution_plan',
      plan
    })

    // 等待用户确认后再执行
    // 这部分需要前端配合
    return
  }

  // 原有的单步执行逻辑...
}

// 检测是否为复杂指令的辅助函数
function detectComplexInstruction(message: string): boolean {
  const indicators = [
    /先.*然后/,
    /再.*再/,
    /先.*再.*再/,
    /，.*，.*，/,  // 多个逗号分隔的操作
    /完成.*创建/,
    /创建.*完成/,
    /删除.*创建/
  ]

  return indicators.some(pattern => pattern.test(message))
}
```

#### 步骤 4.2: 创建执行 API

**文件**: `app/api/workspace-assistant/execute-plan/route.ts`

```typescript
import { NextRequest } from 'next/server'
import { executePlan } from '@/lib/workspace/executor'

export async function POST(request: NextRequest) {
  try {
    const { plan } = await request.json()

    if (!plan || !plan.steps) {
      return new Response(
        JSON.stringify({ error: 'Invalid plan' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // 执行计划
    const result = await executePlan(plan)

    if (!result.success) {
      return new Response(
        JSON.stringify({ error: result.error, context: result.context }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({
        success: true,
        summary: result.summary,
        logs: result.context.logs
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )
  } catch (error: any) {
    console.error('Execute plan error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}
```

---

### Phase 5: 前端集成 (1-2小时)

**目标**：实现执行计划的展示和确认

#### 步骤 5.1: 创建执行计划卡片组件

**文件**: `components/workspace/execution-plan-card.tsx`

```typescript
"use client"

import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { CheckCircle, PlayCircle, AlertCircle } from "lucide-react"

interface ExecutionPlanCardProps {
  plan: {
    summary: string
    steps: Array<{
      id: string
      action: string
      description: string
    }>
  }
  onConfirm: () => void
  onCancel: () => void
  loading?: boolean
}

export default function ExecutionPlanCard({
  plan,
  onConfirm,
  onCancel,
  loading = false
}: ExecutionPlanCardProps) {
  return (
    <Card className="p-4 bg-blue-50 border-blue-200">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-1">
          <AlertCircle className="w-5 h-5 text-blue-600" />
        </div>

        <div className="flex-1 min-w-0">
          {/* 标题 */}
          <div className="flex items-center gap-2 mb-2">
            <Badge variant="outline" className="text-xs">
              执行计划
            </Badge>
            <span className="text-xs text-blue-700">
              共 {plan.steps.length} 个步骤
            </span>
          </div>

          {/* 计划总结 */}
          <p className="text-sm font-medium text-gray-900 mb-3">
            {plan.summary}
          </p>

          {/* 步骤列表 */}
          <div className="space-y-2 mb-4">
            {plan.steps.map((step, index) => (
              <div
                key={step.id}
                className="flex items-start gap-2 text-sm text-gray-700"
              >
                <span className="flex-shrink-0 text-blue-600 font-medium">
                  {index + 1}.
                </span>
                <span className="flex-1">{step.description}</span>
              </div>
            ))}
          </div>

          {/* 操作按钮 */}
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              onClick={onConfirm}
              disabled={loading}
              className="gap-1"
            >
              <PlayCircle className="w-4 h-4" />
              确认执行
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={onCancel}
              disabled={loading}
            >
              取消
            </Button>
          </div>
        </div>
      </div>
    </Card>
  )
}
```

#### 步骤 5.2: 修改 chat-interface.tsx

```typescript
// 添加状态
const [executionPlan, setExecutionPlan] = useState<any>(null)

// 在流式响应处理中添加
if (data.type === 'execution_plan' && data.plan) {
  console.log('Execution plan received:', data.plan)
  setExecutionPlan(data.plan)
}

// 确认执行计划
const handleConfirmPlan = async () => {
  if (!executionPlan) return

  try {
    setLoading(true)

    const response = await fetch('/api/workspace-assistant/execute-plan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plan: executionPlan })
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || '执行失败')
    }

    const result = await response.json()

    toast({
      title: '执行成功',
      description: result.summary
    })

    // 清除计划
    setExecutionPlan(null)

  } catch (error: any) {
    console.error('Execute plan error:', error)
    toast({
      title: '执行失败',
      description: error.message || '请稍后重试',
      variant: 'destructive'
    })
  } finally {
    setLoading(false)
  }
}

// 在 UI 中添加执行计划卡片
{executionPlan && (
  <div className="flex-shrink-0 p-4 border-t bg-gray-100">
    <ExecutionPlanCard
      plan={executionPlan}
      onConfirm={handleConfirmPlan}
      onCancel={() => setExecutionPlan(null)}
      loading={loading}
    />
  </div>
)}
```

---

## 🧪 测试计划

### 单元测试

#### 工具层测试
- [ ] complete_task 正常完成任务
- [ ] complete_task 处理不存在的任务
- [ ] create_task 创建任务
- [ ] update_task 更新任务
- [ ] 所有工具返回格式统一

#### Planner 测试
- [ ] 简单单步指令
- [ ] 复杂多步指令
- [ ] 包含变量依赖的指令
- [ ] 边界情况（空指令、模糊指令）

#### Executor 测试
- [ ] 顺序执行无依赖步骤
- [ ] 正确解析变量占位符
- [ ] 步骤失败时的错误处理
- [ ] 日志记录完整性

### 集成测试

#### 端到端测试场景

**场景 1：简单多步骤**
```
输入："创建任务A，创建任务B"
期望：
1. 生成2步计划
2. 用户确认后
3. 成功创建两个任务
```

**场景 2：带依赖的多步骤**
```
输入："创建任务A，然后标记它完成"
期望：
1. 生成2步计划
2. step2 依赖 step1
3. 第二步使用第一步返回的任务ID
4. 成功执行
```

**场景 3：复杂多步骤**
```
输入："先标记任务 ID:62 完成，创建发邮件任务，标记完成，创建等待反馈任务"
期望：
1. 生成4步计划
2. 步骤3依赖步骤2
3. 全部成功执行
```

**场景 4：错误处理**
```
输入："完成不存在的任务ID:999，创建任务A"
期望：
1. 第一步失败
2. 停止执行
3. 显示错误信息
```

---

## 📊 成功标准

### 功能指标
- ✅ 能处理至少3步的复杂指令
- ✅ 变量依赖解析准确率 > 95%
- ✅ 计划生成时间 < 3秒
- ✅ 执行成功率 > 90%（排除用户输入错误）

### 用户体验指标
- ✅ 计划描述清晰易懂
- ✅ 确认流程不超过2次点击
- ✅ 执行进度实时可见
- ✅ 错误提示明确可操作

### 技术指标
- ✅ 代码结构清晰，分层明确
- ✅ 工具可复用于单步和多步场景
- ✅ 易于添加新工具
- ✅ 完整的错误日志

---

## 🚀 后续优化方向

### Phase 6: 执行进度实时显示（可选）
- 使用 SSE 实时推送执行进度
- 前端显示"步骤1执行中...✓完成"

### Phase 7: 更智能的变量处理（可选）
- 支持更复杂的变量表达式
- 自动推断依赖关系

### Phase 8: 执行历史和审计（可选）
- 保存执行计划和结果
- 支持查看历史执行记录

---

## 📚 参考资料

- Vercel AI SDK v5 文档：https://sdk.vercel.ai/docs
- generateObject API：https://sdk.vercel.ai/docs/ai-sdk-core/generating-structured-data
- Tool Calling：https://sdk.vercel.ai/docs/ai-sdk-core/tools-and-tool-calling
- Plan-Then-Execute 模式：业界最佳实践

---

## ✅ 检查清单

### Phase 1 完成标准
- [ ] `lib/workspace/tools.ts` 创建完成
- [ ] complete_task 工具实现并测试通过
- [ ] 所有工具移至统一注册表
- [ ] chat route 使用新工具注册表
- [ ] 单步执行功能未受影响

### Phase 2 完成标准
- [ ] `lib/workspace/planner.ts` 创建完成
- [ ] generatePlan 函数实现
- [ ] 能正确解析简单指令
- [ ] 能正确解析复杂指令
- [ ] 生成的 JSON 格式符合 Schema

### Phase 3 完成标准
- [ ] `lib/workspace/executor.ts` 创建完成
- [ ] executePlan 函数实现
- [ ] 变量解析功能正常
- [ ] 错误处理完整
- [ ] 日志记录完整

### Phase 4 完成标准
- [ ] chat route 集成 Planner
- [ ] execute-plan API 创建完成
- [ ] 复杂指令检测逻辑实现
- [ ] API 测试通过

### Phase 5 完成标准
- [ ] ExecutionPlanCard 组件创建
- [ ] chat-interface 集成计划展示
- [ ] 确认流程实现
- [ ] 端到端测试通过

---

**预计总时间**：6-8 小时
**风险等级**：中等
**优先级**：高
