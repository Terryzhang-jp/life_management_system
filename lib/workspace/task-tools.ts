import { z } from 'zod'

/**
 * 任务类型枚举
 */
export const TaskTypeSchema = z.enum(['routine', 'long-term', 'short-term'])

/**
 * 任务层级枚举
 */
export const TaskLevelSchema = z.enum(['main', 'sub', 'subsub']).describe(
  '任务层级：main=主任务(level=0), sub=子任务(level=1), subsub=子子任务(level=2)'
)

/**
 * 创建任务工具参数
 */
export const CreateTaskSchema = z.object({
  type: TaskTypeSchema.describe('任务类型：routine(日常习惯)、long-term(长期任务)、short-term(短期任务)'),
  level: TaskLevelSchema.describe('任务层级：main(主任务)、sub(子任务)、subsub(子子任务)'),
  title: z.string().describe('任务标题'),
  description: z.string().optional().describe('任务描述：为什么要做这个事情？对你的好处是什么？'),
  priority: z.number().min(1).max(5).optional().describe('优先级：1-5，1最重要'),
  parentId: z.number().optional().describe('父任务ID（仅当level为sub或subsub时需要）'),
  deadline: z.string().optional().describe('截止日期 YYYY-MM-DD（仅子任务和子子任务可设置）'),
})

/**
 * 更新任务工具参数
 */
export const UpdateTaskSchema = z.object({
  id: z.number().describe('要更新的任务ID'),
  title: z.string().optional().describe('新的任务标题'),
  description: z.string().optional().describe('新的任务描述'),
  priority: z.number().min(1).max(5).optional().describe('新的优先级：1-5'),
  deadline: z.string().optional().describe('新的截止日期 YYYY-MM-DD'),
  isUnclear: z.boolean().optional().describe('是否标记为模糊任务'),
  unclearReason: z.string().optional().describe('模糊原因'),
})

/**
 * 任务操作类型
 */
export type TaskOperation = 'create_task' | 'update_task'

/**
 * 待确认的任务操作
 */
export interface PendingTaskAction {
  operation: TaskOperation
  params: z.infer<typeof CreateTaskSchema> | z.infer<typeof UpdateTaskSchema>
  description: string  // 人类可读的操作描述
}

/**
 * 格式化任务层级为数字
 */
export function taskLevelToNumber(level: 'main' | 'sub' | 'subsub'): number {
  switch (level) {
    case 'main':
      return 0
    case 'sub':
      return 1
    case 'subsub':
      return 2
  }
}

/**
 * 验证任务参数
 */
export function validateTaskParams(
  operation: TaskOperation,
  params: any
): { valid: boolean; error?: string } {
  try {
    if (operation === 'create_task') {
      CreateTaskSchema.parse(params)

      // 额外验证
      if (params.level === 'sub' || params.level === 'subsub') {
        if (!params.parentId) {
          return { valid: false, error: '子任务和子子任务必须指定父任务ID' }
        }
      }

      if (params.level === 'main' && params.deadline) {
        return { valid: false, error: '主任务不能设置截止日期' }
      }

    } else if (operation === 'update_task') {
      UpdateTaskSchema.parse(params)

      if (!params.id) {
        return { valid: false, error: '更新任务必须提供任务ID' }
      }
    }

    return { valid: true }
  } catch (error: any) {
    return { valid: false, error: error.message }
  }
}
