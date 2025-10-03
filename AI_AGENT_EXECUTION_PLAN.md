# AI Agent 实施执行计划

**目标**：实现 Plan-Then-Execute 模式的 AI Agent，支持复杂多步骤任务指令

**策略**：使用现有的 tasks-db，快速实现功能，不做架构重构

**预计时间**：6-8小时

---

## ✅ Phase 1: 工具层实现 (1小时)

### 目标
- 创建统一的工具注册文件
- 实现 complete_task 工具
- 重构现有工具到新文件

### 步骤 1.1: 创建工具注册文件

**文件**: `lib/workspace/tools.ts`

**内容要点**：
- 导入 tasks-db 和现有的 schemas
- 实现 complete_task 工具
- 重构 create_task 和 update_task 工具
- 统一返回格式

**具体代码**：
```typescript
import { tool } from 'ai'
import { z } from 'zod'
import tasksDbManager from '@/lib/tasks-db'
import { CreateTaskSchema, UpdateTaskSchema } from './task-tools'
import { taskLevelToNumber } from './task-tools'

// 完成任务工具
export const complete_task = tool({
  description: '标记任务为已完成状态',
  inputSchema: z.object({
    id: z.number().describe('要完成的任务ID')
  }),
  async execute({ id }) {
    try {
      const task = tasksDbManager.getTask(id)
      if (!task) {
        return {
          success: false,
          error: `任务 ID:${id} 不存在`
        }
      }

      // 调用完成任务的API（需要先实现数据库方法）
      const result = tasksDbManager.completeTask(id)

      return {
        success: true,
        data: { id, title: task.title },
        message: `任务 "${task.title}" 已标记为完成`
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.message
      }
    }
  }
})

// 创建任务工具（重构）
export const create_task = tool({
  description: '创建新的任务',
  inputSchema: CreateTaskSchema,
  async execute(params) {
    try {
      const taskData = {
        ...params,
        level: taskLevelToNumber(params.level)
      }

      const result = tasksDbManager.createTask(taskData)

      return {
        success: true,
        data: { id: result.id, title: params.title },
        message: `任务 "${params.title}" 创建成功`
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.message
      }
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
        return {
          success: false,
          error: `任务 ID:${params.id} 不存在`
        }
      }

      tasksDbManager.updateTask(params.id, params)

      return {
        success: true,
        data: { id: params.id },
        message: `任务已更新`
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.message
      }
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

**验证**：
- [ ] 文件创建成功
- [ ] 导入无错误
- [ ] TypeScript 编译通过

### 步骤 1.2: 实现数据库的 completeTask 方法

**文件**: `lib/tasks-db.ts`

**添加方法**：
```typescript
completeTask(id: number) {
  const stmt = this.db.prepare(`
    UPDATE tasks
    SET is_completed = 1,
        completed_at = ?,
        updated_at = ?
    WHERE id = ?
  `)

  const now = new Date().toISOString()
  stmt.run(now, now, id)

  return this.getTask(id)
}
```

**验证**：
- [ ] 方法添加成功
- [ ] 编译无错误

### 步骤 1.3: 检查数据库表结构

**检查 tasks 表是否有 is_completed 和 completed_at 字段**

如果没有，需要添加：
```sql
ALTER TABLE tasks ADD COLUMN is_completed INTEGER DEFAULT 0;
ALTER TABLE tasks ADD COLUMN completed_at TEXT;
```

**验证**：
- [ ] 数据库字段存在
- [ ] 默认值正确

### 步骤 1.4: 修改 chat route 使用新工具

**文件**: `app/api/workspace-assistant/chat/route.ts`

**修改点**：
```typescript
// 顶部导入
import { taskTools } from '@/lib/workspace/tools'

// 替换原有的 tools 定义（约在 353 行）
const tools = enableEdit ? taskTools : undefined
```

**验证**：
- [ ] 导入成功
- [ ] 编译无错误
- [ ] 开发服务器重启无错误

### 步骤 1.5: 测试工具层

**测试方法**：在思维整理工作台测试单步操作

1. **测试创建任务**
   - 输入："创建一个短期任务，标题是测试任务"
   - 期望：显示待确认卡片，确认后成功创建

2. **测试更新任务**
   - 输入："更新任务 ID:X 的标题为新标题"
   - 期望：成功更新

3. **测试完成任务**
   - 输入："标记任务 ID:X 为已完成"
   - 期望：成功标记完成

**验证检查清单**：
- [ ] 创建任务功能正常
- [ ] 更新任务功能正常
- [ ] 完成任务功能正常
- [ ] 所有工具返回格式统一（success, data, message/error）
- [ ] 现有的任务管理功能未受影响

---

## ✅ Phase 2: Planner 实现 (1.5小时)

### 目标
- 实现意图理解和计划生成
- 使用 generateObject 生成结构化计划

### 步骤 2.1: 创建 Planner 文件

**文件**: `lib/workspace/planner.ts`

**完整代码**：
```typescript
import { generateObject } from 'ai'
import { google } from '@ai-sdk/google'
import { z } from 'zod'

// 执行步骤 Schema
export const ExecutionStepSchema = z.object({
  id: z.string().describe('步骤ID，如 step1, step2'),
  action: z.enum(['complete_task', 'create_task', 'update_task']).describe('要执行的操作'),
  params: z.record(z.any()).describe('操作参数，可能包含占位符如 {{step1.data.id}}'),
  description: z.string().describe('人类可读的操作描述'),
  dependsOn: z.array(z.string()).optional().describe('依赖的步骤ID列表')
})

// 执行计划 Schema
export const ExecutionPlanSchema = z.object({
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
    taskContext?: string
    conversationHistory?: any[]
  }
): Promise<ExecutionPlan> {
  const systemPrompt = `你是一个任务管理助手的计划生成器。

你的职责是：
1. 理解用户的复杂指令
2. 将指令拆解成有序的执行步骤
3. 生成结构化的执行计划（JSON格式）

可用的操作：
- complete_task: 标记任务为已完成
  参数: { id: number }

- create_task: 创建新任务
  参数: {
    type: "routine" | "long-term" | "short-term",
    level: "main" | "sub" | "subsub",
    title: string,
    description?: string,
    priority?: number (1-5),
    parentId?: number,
    deadline?: string (YYYY-MM-DD)
  }

- update_task: 更新任务
  参数: {
    id: number,
    title?: string,
    description?: string,
    priority?: number,
    deadline?: string,
    isUnclear?: boolean,
    unclearReason?: string
  }

重要规则：
1. 如果后续步骤需要用到前面步骤创建的任务ID，使用占位符：{{stepN.data.id}}
   - 例如：step1 创建任务，step2 要完成这个任务，则 step2 的 params 应该是 { "id": "{{step1.data.id}}" }

2. 每个步骤必须有清晰的 description，方便用户理解

3. 如果步骤之间有依赖关系，必须在 dependsOn 中声明
   - 例如：step2 依赖 step1，则 step2 的 dependsOn: ["step1"]

4. 步骤ID使用 step1, step2, step3 这样的格式

5. 对于创建任务：
   - 如果用户没有明确说明类型，默认使用 "short-term"
   - 如果用户没有明确说明层级，默认使用 "main"
   - 如果是子任务或子子任务，必须有 parentId

6. 任务ID的引用：
   - 如果用户说"标记任务 ID:62 完成"，直接使用数字：{ "id": 62 }
   - 如果用户说"标记刚创建的任务完成"，使用占位符：{ "id": "{{step1.data.id}}" }

示例1 - 简单多步骤：
用户："创建任务A，创建任务B"
输出：
{
  "summary": "创建两个任务：A 和 B",
  "steps": [
    {
      "id": "step1",
      "action": "create_task",
      "params": { "type": "short-term", "level": "main", "title": "A" },
      "description": "创建任务：A"
    },
    {
      "id": "step2",
      "action": "create_task",
      "params": { "type": "short-term", "level": "main", "title": "B" },
      "description": "创建任务：B"
    }
  ]
}

示例2 - 带依赖：
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
      "params": { "id": "{{step1.data.id}}" },
      "description": "标记刚创建的任务为完成",
      "dependsOn": ["step1"]
    }
  ]
}

示例3 - 混合指令：
用户："先标记任务 ID:62 完成，创建发邮件任务，标记完成，创建等待反馈任务"
输出：
{
  "summary": "完成任务62，创建并完成发邮件任务，创建等待反馈任务",
  "steps": [
    {
      "id": "step1",
      "action": "complete_task",
      "params": { "id": 62 },
      "description": "标记任务 ID:62 为完成"
    },
    {
      "id": "step2",
      "action": "create_task",
      "params": { "type": "short-term", "level": "sub", "title": "发邮件", "parentId": 21 },
      "description": "创建任务：发邮件"
    },
    {
      "id": "step3",
      "action": "complete_task",
      "params": { "id": "{{step2.data.id}}" },
      "description": "标记刚创建的发邮件任务为完成",
      "dependsOn": ["step2"]
    },
    {
      "id": "step4",
      "action": "create_task",
      "params": { "type": "short-term", "level": "sub", "title": "等待user feedback", "parentId": 21 },
      "description": "创建任务：等待user feedback"
    }
  ]
}
`

  try {
    const { object } = await generateObject({
      model: google('gemini-2.0-flash-exp'),
      schema: ExecutionPlanSchema,
      system: systemPrompt,
      prompt: `用户指令：${userMessage}\n\n${context.taskContext || ''}\n\n请生成执行计划。`,
      temperature: 0.1
    })

    console.log('[Planner] Generated plan:', JSON.stringify(object, null, 2))
    return object
  } catch (error: any) {
    console.error('[Planner] Error:', error)
    throw new Error(`计划生成失败: ${error.message}`)
  }
}

/**
 * 检测是否为复杂多步骤指令
 */
export function isComplexInstruction(message: string): boolean {
  const indicators = [
    /先.*然后/,
    /先.*再/,
    /再.*再/,
    /，.*，.*，/,
    /完成.*创建/,
    /创建.*完成/,
    /创建.*标记/,
    /标记.*创建/,
    /删除.*创建/,
    /修改.*创建/
  ]

  return indicators.some(pattern => pattern.test(message))
}
```

**验证**：
- [ ] 文件创建成功
- [ ] TypeScript 编译通过
- [ ] 导入无错误

### 步骤 2.2: 测试 Planner（控制台测试）

**创建临时测试文件**: `test-planner.ts`（测试后删除）

```typescript
import { generatePlan } from './lib/workspace/planner'

async function testPlanner() {
  const testCases = [
    "创建任务A，创建任务B",
    "先创建任务A，然后标记它完成",
    "先标记任务 ID:62 完成，创建发邮件任务，标记完成，创建等待反馈任务"
  ]

  for (const testCase of testCases) {
    console.log('\n========================================')
    console.log('测试用例:', testCase)
    console.log('========================================')

    try {
      const plan = await generatePlan(testCase, {})
      console.log('✓ 生成成功')
      console.log('步骤数:', plan.steps.length)
      console.log('总结:', plan.summary)
      console.log('步骤:')
      plan.steps.forEach((step, i) => {
        console.log(`  ${i + 1}. ${step.description}`)
        console.log(`     动作: ${step.action}`)
        console.log(`     参数:`, step.params)
        if (step.dependsOn) {
          console.log(`     依赖:`, step.dependsOn)
        }
      })
    } catch (error: any) {
      console.error('✗ 失败:', error.message)
    }
  }
}

testPlanner()
```

**运行测试**：
```bash
npx tsx test-planner.ts
```

**验证检查清单**：
- [ ] 简单指令能正确拆解
- [ ] 复杂指令能正确拆解
- [ ] 占位符格式正确（{{step1.data.id}}）
- [ ] dependsOn 正确标注
- [ ] JSON 格式符合 Schema

---

## ✅ Phase 3: Executor 实现 (1.5小时)

### 目标
- 实现计划的顺序执行
- 处理变量占位符替换
- 完整的错误处理和日志

### 步骤 3.1: 创建 Executor 文件

**文件**: `lib/workspace/executor.ts`

**完整代码**：
```typescript
import { ExecutionPlan, ExecutionStep } from './planner'
import { taskTools } from './tools'

export interface ExecutionContext {
  vars: Record<string, any>
  logs: ExecutionLog[]
  currentStep: number
}

export interface ExecutionLog {
  stepId: string
  tool: string
  input: any
  output: any
  timestamp: string
  duration: number
  success: boolean
}

export interface ExecutionResult {
  success: boolean
  context: ExecutionContext
  summary: string
  error?: string
  failedStep?: string
}

/**
 * 解析变量占位符
 * 例如：{ id: "{{step1.data.id}}" } => { id: 123 }
 */
function resolveVariables(
  params: Record<string, any>,
  context: ExecutionContext
): Record<string, any> {
  const resolved: Record<string, any> = {}

  for (const [key, value] of Object.entries(params)) {
    if (typeof value === 'string' && value.startsWith('{{') && value.endsWith('}}')) {
      // 提取占位符：{{step1.data.id}} => step1.data.id
      const path = value.slice(2, -2).trim()
      const parts = path.split('.')

      // 从上下文中获取值
      let resolvedValue: any = context.vars
      for (const part of parts) {
        resolvedValue = resolvedValue?.[part]
      }

      if (resolvedValue === undefined) {
        throw new Error(`无法解析变量：${value}，路径：${path}`)
      }

      resolved[key] = resolvedValue
    } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
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
    console.log(`[Executor] 执行步骤: ${step.id} - ${step.description}`)

    // 解析变量
    const resolvedParams = resolveVariables(step.params, context)
    console.log(`[Executor] 解析后参数:`, resolvedParams)

    // 获取工具
    const tool = taskTools[step.action as keyof typeof taskTools]
    if (!tool) {
      throw new Error(`未知的工具：${step.action}`)
    }

    // 执行工具
    const result = await tool.execute(resolvedParams)
    console.log(`[Executor] 执行结果:`, result)

    // 记录日志
    const duration = Date.now() - startTime
    context.logs.push({
      stepId: step.id,
      tool: step.action,
      input: resolvedParams,
      output: result,
      timestamp: new Date().toISOString(),
      duration,
      success: result.success
    })

    return result
  } catch (error: any) {
    const duration = Date.now() - startTime
    const errorResult = {
      success: false,
      error: error.message
    }

    context.logs.push({
      stepId: step.id,
      tool: step.action,
      input: step.params,
      output: errorResult,
      timestamp: new Date().toISOString(),
      duration,
      success: false
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

  console.log('[Executor] 开始执行计划:', plan.summary)
  console.log('[Executor] 总步骤数:', plan.steps.length)

  try {
    // 按顺序执行每个步骤
    for (let i = 0; i < plan.steps.length; i++) {
      const step = plan.steps[i]
      context.currentStep = i + 1

      console.log(`\n[Executor] ========== 步骤 ${i + 1}/${plan.steps.length} ==========`)

      // 执行步骤
      const result = await executeStep(step, context)

      // 检查结果
      if (!result.success) {
        throw new Error(`步骤 ${step.id} 失败: ${result.error}`)
      }

      // 保存结果到变量表
      context.vars[step.id] = result

      console.log(`[Executor] 步骤 ${step.id} 完成`)
    }

    // 生成总结
    const successSteps = plan.steps.map((s, i) => `${i + 1}. ${s.description} ✓`).join('\n')
    const summary = `成功执行 ${plan.steps.length} 个步骤：\n${successSteps}`

    console.log(`\n[Executor] ========== 执行完成 ==========`)
    console.log(summary)

    return {
      success: true,
      context,
      summary
    }
  } catch (error: any) {
    const failedStep = plan.steps[context.currentStep - 1]
    const summary = `执行失败于步骤 ${context.currentStep}/${plan.steps.length}: ${failedStep?.description}`

    console.error(`\n[Executor] ========== 执行失败 ==========`)
    console.error(summary)
    console.error('错误:', error.message)

    return {
      success: false,
      context,
      summary,
      error: error.message,
      failedStep: failedStep?.id
    }
  }
}
```

**验证**：
- [ ] 文件创建成功
- [ ] TypeScript 编译通过
- [ ] 导入无错误

### 步骤 3.2: 测试 Executor（控制台测试）

**创建临时测试文件**: `test-executor.ts`（测试后删除）

```typescript
import { generatePlan } from './lib/workspace/planner'
import { executePlan } from './lib/workspace/executor'

async function testExecutor() {
  // 测试用例：简单多步骤（无依赖）
  console.log('\n========================================')
  console.log('测试1: 简单多步骤（无依赖）')
  console.log('========================================')

  const plan1 = await generatePlan("创建任务测试A，创建任务测试B", {})
  const result1 = await executePlan(plan1)

  console.log('\n结果:')
  console.log('成功:', result1.success)
  console.log('总结:', result1.summary)
  console.log('日志数:', result1.context.logs.length)

  // 测试用例：带依赖
  console.log('\n========================================')
  console.log('测试2: 带依赖的多步骤')
  console.log('========================================')

  const plan2 = await generatePlan("创建任务测试C，然后标记它完成", {})
  const result2 = await executePlan(plan2)

  console.log('\n结果:')
  console.log('成功:', result2.success)
  console.log('总结:', result2.summary)
  console.log('变量表:', result2.context.vars)
}

testExecutor().catch(console.error)
```

**运行测试**：
```bash
npx tsx test-executor.ts
```

**验证检查清单**：
- [ ] 能顺序执行多个步骤
- [ ] 变量占位符正确解析
- [ ] step1 的结果能传递给 step2
- [ ] 错误时正确停止执行
- [ ] 日志记录完整

---

## ✅ Phase 4: API 集成 (1小时)

### 目标
- 在 chat API 中集成 Planner
- 创建 execute-plan API
- 实现复杂指令检测

### 步骤 4.1: 修改 chat route 集成 Planner

**文件**: `app/api/workspace-assistant/chat/route.ts`

**修改点 1**：顶部添加导入
```typescript
import { generatePlan, isComplexInstruction } from '@/lib/workspace/planner'
```

**修改点 2**：在流式响应开始前检测复杂指令（约在 366 行 `try` 块开始处）

**找到这段代码**：
```typescript
let result
try {
  result = streamText({
    model: google('gemini-2.0-flash-exp'),
    messages,
    temperature: 0.1,
    maxOutputTokens: 2048,
    tools,
    toolChoice: enableEdit ? 'auto' : 'none'
  })
```

**在这段代码之前添加**：
```typescript
// 检测是否为复杂多步骤指令
if (enableEdit && isComplexInstruction(message)) {
  console.log('[Chat API] 检测到复杂多步骤指令，生成执行计划...')

  try {
    const plan = await generatePlan(message, {
      taskContext: contextMarkdown,
      conversationHistory: messages
    })

    console.log('[Chat API] 执行计划生成成功')

    // 发送计划到前端
    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ type: 'execution_plan', plan })}\n\n`)
        )
        controller.close()
      }
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
      }
    })
  } catch (error: any) {
    console.error('[Chat API] 计划生成失败:', error)
    // 降级到普通流式响应
  }
}
```

**验证**：
- [ ] 代码添加成功
- [ ] TypeScript 编译通过
- [ ] 开发服务器无错误

### 步骤 4.2: 创建 execute-plan API

**文件**: `app/api/workspace-assistant/execute-plan/route.ts`

**完整代码**：
```typescript
import { NextRequest } from 'next/server'
import { executePlan } from '@/lib/workspace/executor'
import { ExecutionPlanSchema } from '@/lib/workspace/planner'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { plan } = body

    console.log('[Execute Plan API] 收到执行请求')

    if (!plan || !plan.steps) {
      return new Response(
        JSON.stringify({ error: 'Invalid plan: missing steps' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // 验证计划格式
    try {
      ExecutionPlanSchema.parse(plan)
    } catch (error: any) {
      return new Response(
        JSON.stringify({ error: `Invalid plan format: ${error.message}` }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    console.log('[Execute Plan API] 计划验证通过，开始执行...')

    // 执行计划
    const result = await executePlan(plan)

    if (!result.success) {
      console.error('[Execute Plan API] 执行失败:', result.error)
      return new Response(
        JSON.stringify({
          error: result.error,
          summary: result.summary,
          failedStep: result.failedStep,
          logs: result.context.logs
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      )
    }

    console.log('[Execute Plan API] 执行成功')

    return new Response(
      JSON.stringify({
        success: true,
        summary: result.summary,
        logs: result.context.logs,
        context: result.context
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )
  } catch (error: any) {
    console.error('[Execute Plan API] Error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}
```

**验证**：
- [ ] 文件创建成功
- [ ] TypeScript 编译通过
- [ ] API 路由注册成功

---

## ✅ Phase 5: 前端集成 (2小时)

### 目标
- 创建执行计划展示卡片
- 集成到 chat-interface
- 实现确认执行流程

### 步骤 5.1: 创建执行计划卡片组件

**文件**: `components/workspace/execution-plan-card.tsx`

**完整代码**：
```typescript
"use client"

import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { PlayCircle, XCircle, AlertCircle, ChevronRight } from "lucide-react"

interface ExecutionPlanCardProps {
  plan: {
    summary: string
    steps: Array<{
      id: string
      action: string
      description: string
      dependsOn?: string[]
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
  const actionNames: Record<string, string> = {
    complete_task: '完成任务',
    create_task: '创建任务',
    update_task: '更新任务',
    delete_task: '删除任务'
  }

  return (
    <Card className="p-4 bg-blue-50 border-blue-200">
      <div className="flex items-start gap-3">
        {/* 图标 */}
        <div className="flex-shrink-0 mt-1">
          <AlertCircle className="w-5 h-5 text-blue-600" />
        </div>

        {/* 内容 */}
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
                className="flex items-start gap-2 text-sm"
              >
                {/* 步骤编号 */}
                <span className="flex-shrink-0 w-5 text-blue-600 font-medium">
                  {index + 1}.
                </span>

                {/* 步骤内容 */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-gray-700">{step.description}</span>
                  </div>

                  {/* 操作类型标签 */}
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-xs">
                      {actionNames[step.action] || step.action}
                    </Badge>

                    {/* 依赖标识 */}
                    {step.dependsOn && step.dependsOn.length > 0 && (
                      <span className="text-xs text-gray-500 flex items-center gap-1">
                        <ChevronRight className="w-3 h-3" />
                        依赖步骤 {step.dependsOn.join(', ')}
                      </span>
                    )}
                  </div>
                </div>
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
              className="gap-1"
            >
              <XCircle className="w-4 h-4" />
              取消
            </Button>
          </div>
        </div>
      </div>
    </Card>
  )
}
```

**验证**：
- [ ] 文件创建成功
- [ ] TypeScript 编译通过
- [ ] 组件导入无错误

### 步骤 5.2: 修改 chat-interface.tsx

**文件**: `components/workspace/chat-interface.tsx`

**修改点 1**：导入组件
```typescript
import ExecutionPlanCard from "./execution-plan-card"
```

**修改点 2**：添加状态（约在第 35 行附近）
```typescript
const [executionPlan, setExecutionPlan] = useState<any>(null)
```

**修改点 3**：在流式响应处理中添加 execution_plan 处理（约在第 209 行，state_update 之后）
```typescript
// 处理执行计划
if (data.type === 'execution_plan' && data.plan) {
  console.log('[FRONTEND] Execution plan received:', data.plan)
  setExecutionPlan(data.plan)
  // 计划已生成，停止 loading
  setLoading(false)
  done = true
  break
}
```

**修改点 4**：添加确认执行计划的处理函数（约在第 338 行，handleCancelAction 之后）
```typescript
// 确认执行计划
const handleConfirmPlan = async () => {
  if (!executionPlan) return

  try {
    setLoading(true)
    console.log('[FRONTEND] 开始执行计划...')

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
    console.log('[FRONTEND] 执行成功:', result)

    toast({
      title: '执行成功',
      description: result.summary || '所有步骤已完成'
    })

    // 清除计划
    setExecutionPlan(null)

    // 刷新消息（可选：添加执行结果到消息列表）
    const executionSummary: Message = {
      role: 'assistant',
      content: result.summary,
      displayContent: result.summary
    }
    setMessages(prev => [...prev, executionSummary])

  } catch (error: any) {
    console.error('[FRONTEND] Execute plan error:', error)
    toast({
      title: '执行失败',
      description: error.message || '请稍后重试',
      variant: 'destructive'
    })
  } finally {
    setLoading(false)
  }
}

// 取消执行计划
const handleCancelPlan = () => {
  setExecutionPlan(null)
  toast({
    title: '已取消',
    description: '执行计划已取消'
  })
}
```

**修改点 5**：在 UI 中添加执行计划卡片（约在第 439 行，pendingActions 区域之后）
```typescript
{/* 执行计划区域 */}
{executionPlan && (
  <div className="flex-shrink-0 p-4 border-t bg-gray-50">
    <ExecutionPlanCard
      plan={executionPlan}
      onConfirm={handleConfirmPlan}
      onCancel={handleCancelPlan}
      loading={loading}
    />
  </div>
)}
```

**验证**：
- [ ] 所有修改完成
- [ ] TypeScript 编译通过
- [ ] 开发服务器重启无错误

---

## ✅ Phase 6: 完整测试 (1-2小时)

### 测试场景

#### 测试 1: 简单多步骤（无依赖）

**输入**：
```
创建任务测试A，创建任务测试B，创建任务测试C
```

**期望**：
1. 检测为复杂指令
2. 生成3步计划
3. 显示执行计划卡片
4. 用户点击"确认执行"
5. 成功创建3个任务
6. 显示成功提示

**验证**：
- [ ] 计划生成正确
- [ ] 卡片显示正确
- [ ] 3个任务都创建成功
- [ ] Toast 提示正确

#### 测试 2: 带依赖的多步骤

**输入**：
```
先创建一个短期任务叫做测试依赖，然后标记它完成
```

**期望**：
1. 生成2步计划
2. step2 依赖 step1
3. step2 的参数使用占位符
4. 执行时正确解析占位符
5. 任务创建并标记完成

**验证**：
- [ ] 计划包含 dependsOn
- [ ] 占位符格式正确
- [ ] 变量解析成功
- [ ] 任务成功完成

#### 测试 3: 复杂实际场景

**准备**：先创建一个任务 ID:62（如果不存在）

**输入**：
```
先标记任务 ID:62 完成，然后创建一个子任务叫发邮件，标记它完成，再创建一个子任务叫等待反馈
```

**期望**：
1. 生成4步计划
2. 第1步完成已存在的任务
3. 第2步创建子任务
4. 第3步完成刚创建的任务（使用占位符）
5. 第4步创建另一个子任务

**验证**：
- [ ] 4个步骤全部执行成功
- [ ] ID:62 被标记完成
- [ ] 2个子任务被创建
- [ ] 第一个子任务被标记完成
- [ ] 第二个子任务处于未完成状态

#### 测试 4: 错误处理

**输入**：
```
先完成任务 ID:99999，然后创建任务测试错误
```

**期望**：
1. 生成2步计划
2. 第1步执行失败（任务不存在）
3. 停止执行，不执行第2步
4. 显示错误提示

**验证**：
- [ ] 第1步失败
- [ ] 第2步未执行
- [ ] 错误信息清晰
- [ ] Toast 显示失败原因

#### 测试 5: 单步指令（不触发计划）

**输入**：
```
创建一个任务测试单步
```

**期望**：
1. 不触发计划生成
2. 使用原有的单步执行流程
3. 显示待确认卡片（旧流程）
4. 确认后成功创建

**验证**：
- [ ] 不生成执行计划
- [ ] 显示 PendingActionCard
- [ ] 功能正常

---

## 📋 完整检查清单

### Phase 1 检查清单
- [ ] lib/workspace/tools.ts 创建完成
- [ ] complete_task 工具实现
- [ ] create_task 工具重构
- [ ] update_task 工具重构
- [ ] tasks-db.ts 添加 completeTask 方法
- [ ] 数据库表包含 is_completed 和 completed_at 字段
- [ ] chat route 使用新的 taskTools
- [ ] 单步创建任务测试通过
- [ ] 单步更新任务测试通过
- [ ] 单步完成任务测试通过
- [ ] 所有工具返回格式统一

### Phase 2 检查清单
- [ ] lib/workspace/planner.ts 创建完成
- [ ] generatePlan 函数实现
- [ ] isComplexInstruction 函数实现
- [ ] ExecutionPlanSchema 定义正确
- [ ] 简单指令测试通过
- [ ] 复杂指令测试通过
- [ ] 占位符生成正确
- [ ] dependsOn 标注正确

### Phase 3 检查清单
- [ ] lib/workspace/executor.ts 创建完成
- [ ] executePlan 函数实现
- [ ] resolveVariables 函数实现
- [ ] executeStep 函数实现
- [ ] 顺序执行测试通过
- [ ] 变量解析测试通过
- [ ] 错误处理测试通过
- [ ] 日志记录完整

### Phase 4 检查清单
- [ ] chat route 集成 Planner
- [ ] isComplexInstruction 检测正确
- [ ] 执行计划通过 SSE 发送
- [ ] app/api/workspace-assistant/execute-plan/route.ts 创建完成
- [ ] execute-plan API 测试通过
- [ ] 计划验证正确

### Phase 5 检查清单
- [ ] components/workspace/execution-plan-card.tsx 创建完成
- [ ] ExecutionPlanCard 组件实现完整
- [ ] chat-interface.tsx 导入组件
- [ ] executionPlan 状态添加
- [ ] execution_plan 事件处理添加
- [ ] handleConfirmPlan 函数实现
- [ ] handleCancelPlan 函数实现
- [ ] UI 中添加 ExecutionPlanCard

### Phase 6 检查清单
- [ ] 测试1：简单多步骤通过
- [ ] 测试2：带依赖多步骤通过
- [ ] 测试3：复杂实际场景通过
- [ ] 测试4：错误处理正确
- [ ] 测试5：单步指令不受影响
- [ ] 所有现有功能正常
- [ ] 无控制台错误
- [ ] 无TypeScript错误

---

## 🎯 成功标准

### 功能标准
- ✅ 能识别复杂多步骤指令
- ✅ 正确生成执行计划
- ✅ 计划展示清晰易懂
- ✅ 用户确认流程流畅
- ✅ 步骤按顺序执行
- ✅ 变量依赖正确处理
- ✅ 错误处理完善
- ✅ 单步操作不受影响

### 质量标准
- ✅ 无 TypeScript 错误
- ✅ 无控制台错误
- ✅ 代码有完整注释
- ✅ 日志输出清晰
- ✅ 错误信息友好

### 用户体验标准
- ✅ 操作不超过2次点击
- ✅ 反馈及时（Toast）
- ✅ 进度可见
- ✅ 错误可理解

---

## 📝 执行记录

### Phase 1 执行记录
- 开始时间：
- 完成时间：
- 遇到的问题：
- 解决方案：

### Phase 2 执行记录
- 开始时间：
- 完成时间：
- 遇到的问题：
- 解决方案：

### Phase 3 执行记录
- 开始时间：
- 完成时间：
- 遇到的问题：
- 解决方案：

### Phase 4 执行记录
- 开始时间：
- 完成时间：
- 遇到的问题：
- 解决方案：

### Phase 5 执行记录
- 开始时间：
- 完成时间：
- 遇到的问题：
- 解决方案：

### Phase 6 执行记录
- 开始时间：
- 完成时间：
- 遇到的问题：
- 解决方案：

---

**总预计时间**: 6-8小时
**实际耗时**:
**完成日期**:
