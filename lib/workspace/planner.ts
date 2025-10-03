import { generateObject } from 'ai'
import { google } from '@ai-sdk/google'
import { z } from 'zod'

// 执行步骤 Schema
export const ExecutionStepSchema = z.object({
  id: z.string().describe('步骤ID，如 step1, step2'),
  action: z.enum(['complete_task', 'create_task', 'update_task']).describe('要执行的操作'),
  params: z.any().describe('操作参数对象，可能包含占位符如 {{step1.data.id}}'),
  description: z.string().describe('人类可读的操作描述'),
  dependsOn: z.array(z.string()).optional().describe('依赖的步骤ID列表')
})

// 执行计划 Schema
export const ExecutionPlanSchema = z.object({
  isMultiStep: z.boolean().describe('是否为多步骤指令（true=需要plan，false=单步骤操作）'),
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
1. 理解用户的指令，判断是单步骤还是多步骤操作
2. 如果是多步骤指令 → 设置 isMultiStep=true，将指令拆解成有序的执行步骤
3. 如果是单步骤指令 → 设置 isMultiStep=false，返回单个步骤即可
4. 生成结构化的执行计划（JSON格式）

**判断标准**：
- 多步骤（isMultiStep=true）：包含2个或更多需要顺序执行的操作
  - 例如："创建任务A，然后创建任务B"
  - 例如："创建主任务，然后在里面加入子任务"
  - 例如："先完成任务X，再创建任务Y"

- 单步骤（isMultiStep=false）：只有1个操作
  - 例如："创建任务A"
  - 例如："标记任务123完成"
  - 例如："更新任务456的标题"

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

示例1 - 单步骤：
用户："创建任务A"
输出：
{
  "isMultiStep": false,
  "summary": "创建任务A",
  "steps": [
    {
      "id": "step1",
      "action": "create_task",
      "params": { "type": "short-term", "level": "main", "title": "A" },
      "description": "创建任务：A"
    }
  ]
}

示例2 - 多步骤：
用户："创建任务A，创建任务B"
输出：
{
  "isMultiStep": true,
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

示例3 - 带依赖：
用户："先创建任务A，然后标记它完成"
输出：
{
  "isMultiStep": true,
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

示例4 - 混合指令：
用户："先标记任务 ID:62 完成，创建发邮件任务，标记完成，创建等待反馈任务"
输出：
{
  "isMultiStep": true,
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
}`

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

// 删除了旧的正则检测函数 isComplexInstruction()
// 现在由 generatePlan() 内部的 Gemini 判断是否为多步骤指令
