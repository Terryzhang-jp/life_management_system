import { tool } from 'ai'
import { z } from 'zod'
import tasksDbManager from '@/lib/tasks-db'
import { CreateTaskSchema, UpdateTaskSchema, taskLevelToNumber } from './task-tools'

/**
 * 统一的工具返回格式
 */
interface ToolResult {
  success: boolean
  data?: any
  message?: string
  error?: string
}

/**
 * 完成任务工具
 */
export const complete_task = tool({
  description: '标记任务为已完成状态',
  inputSchema: z.object({
    id: z.number().describe('要完成的任务ID')
  }),
  async execute({ id }): Promise<ToolResult> {
    try {
      const task = tasksDbManager.getTask(id)
      if (!task) {
        return {
          success: false,
          error: `任务 ID:${id} 不存在`
        }
      }

      if (task.isCompleted) {
        return {
          success: false,
          error: `任务 "${task.title}" 已经是完成状态`
        }
      }

      // 调用完成任务的方法
      const completedTask = await tasksDbManager.completeTask(id)

      if (!completedTask) {
        return {
          success: false,
          error: '标记完成失败'
        }
      }

      return {
        success: true,
        data: { id: completedTask.id, title: completedTask.title },
        message: `任务 "${task.title}" 已标记为完成`
      }
    } catch (error: any) {
      console.error('[complete_task] Error:', error)
      return {
        success: false,
        error: error.message || '标记完成时发生错误'
      }
    }
  }
})

/**
 * 创建任务工具
 */
export const create_task = tool({
  description: '创建新的任务',
  inputSchema: CreateTaskSchema,
  async execute(params): Promise<ToolResult> {
    try {
      // 转换 level 从字符串到数字
      const taskData = {
        ...params,
        level: taskLevelToNumber(params.level)
      }

      const id = await tasksDbManager.addTask(taskData)
      const createdTask = tasksDbManager.getTask(id)

      if (!createdTask) {
        return {
          success: false,
          error: '任务创建后获取失败'
        }
      }

      return {
        success: true,
        data: { id: createdTask.id, title: createdTask.title },
        message: `任务 "${params.title}" 创建成功`
      }
    } catch (error: any) {
      console.error('[create_task] Error:', error)
      return {
        success: false,
        error: error.message || '创建任务时发生错误'
      }
    }
  }
})

/**
 * 更新任务工具
 */
export const update_task = tool({
  description: '更新已存在的任务',
  inputSchema: UpdateTaskSchema,
  async execute(params): Promise<ToolResult> {
    try {
      const task = tasksDbManager.getTask(params.id)
      if (!task) {
        return {
          success: false,
          error: `任务 ID:${params.id} 不存在`
        }
      }

      await tasksDbManager.updateTask(params.id, params)

      const updatedTask = tasksDbManager.getTask(params.id)

      return {
        success: true,
        data: { id: params.id, title: updatedTask?.title },
        message: `任务 "${task.title}" 已更新`
      }
    } catch (error: any) {
      console.error('[update_task] Error:', error)
      return {
        success: false,
        error: error.message || '更新任务时发生错误'
      }
    }
  }
})

/**
 * 统一导出所有任务工具
 */
export const taskTools = {
  complete_task,
  create_task,
  update_task
}

export default taskTools
