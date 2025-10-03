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
    if (!tool || !tool.execute) {
      throw new Error(`未知的工具：${step.action}`)
    }

    // 执行工具
    const result = await (tool.execute as any)(resolvedParams)
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
