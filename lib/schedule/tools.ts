import { tool } from 'ai'
import { z } from 'zod'
import {
  getScheduleByDateRange,
  createScheduleBlock,
  updateScheduleBlock,
  deleteScheduleBlock,
  checkTimeConflict,
  ScheduleBlock,
  CreateScheduleBlockInput,
  ScheduleBlockType
} from '@/lib/schedule-db'
import tasksDbManager, { getAllSchedulableTasks } from '@/lib/tasks-db'
import type { ToolResult } from './agent-types'

/**
 * 工具1: 查询日程安排（read-only）
 * 按日期范围查询日程块
 */
export const query_schedule = tool({
  description: '查询指定日期范围的日程安排。支持按状态、任务ID、分类ID过滤。',
  inputSchema: z.object({
    startDate: z.string().describe('开始日期 (YYYY-MM-DD)'),
    endDate: z.string().describe('结束日期 (YYYY-MM-DD)'),
    status: z.array(z.enum(['scheduled', 'in_progress', 'partially_completed', 'completed', 'cancelled']))
      .optional()
      .describe('过滤状态列表（可选）'),
    taskId: z.number().optional().describe('过滤特定任务ID（可选）'),
    categoryId: z.number().optional().describe('过滤特定分类ID（可选）')
  }),
  async execute({ startDate, endDate, status, taskId, categoryId }): Promise<ToolResult> {
    try {
      // 获取日期范围内的所有日程块
      let blocks = getScheduleByDateRange(startDate, endDate)

      // 应用过滤器
      if (status && status.length > 0) {
        blocks = blocks.filter(block => status.includes(block.status))
      }

      if (taskId !== undefined) {
        blocks = blocks.filter(block => block.taskId === taskId)
      }

      if (categoryId !== undefined) {
        blocks = blocks.filter(block => block.categoryId === categoryId)
      }

      return {
        success: true,
        data: blocks,
        message: `找到 ${blocks.length} 个日程块（${startDate} 至 ${endDate}）`
      }
    } catch (error: any) {
      console.error('[query_schedule] Error:', error)
      return {
        success: false,
        error: error.message || '查询日程时发生错误'
      }
    }
  }
})

/**
 * 工具2: 查询任务（read-only）
 * 查询任务列表，支持按类型、分类、父任务过滤
 */
export const query_tasks = tool({
  description: '查询任务列表。支持按类型(routine/long-term/short-term)、分类ID、父任务ID过滤。',
  inputSchema: z.object({
    type: z.enum(['routine', 'long-term', 'short-term']).optional().describe('任务类型（可选）'),
    categoryId: z.number().optional().describe('分类ID（可选）'),
    parentId: z.number().optional().describe('父任务ID（可选，获取子任务）')
  }),
  async execute({ type, categoryId, parentId }): Promise<ToolResult> {
    try {
      let tasks: any[] = []

      // 如果指定了parentId，获取子任务
      if (parentId !== undefined) {
        const directSubtasks = await tasksDbManager.getSubTasks(parentId, 1)
        const subsubTasks = await tasksDbManager.getSubTasks(parentId, 2)
        tasks = [...directSubtasks, ...subsubTasks]
      } else {
        // 获取所有主任务
        const allTasks = await tasksDbManager.getAllTasks()
        tasks = [
          ...allTasks.routines,
          ...allTasks.longTermTasks,
          ...allTasks.shortTermTasks
        ]
      }

      // 应用过滤器
      if (type) {
        tasks = tasks.filter(task => task.type === type)
      }

      if (categoryId !== undefined) {
        tasks = tasks.filter(task => task.categoryId === categoryId)
      }

      return {
        success: true,
        data: tasks,
        message: `找到 ${tasks.length} 个任务`
      }
    } catch (error: any) {
      console.error('[query_tasks] Error:', error)
      return {
        success: false,
        error: error.message || '查询任务时发生错误'
      }
    }
  }
})

/**
 * 工具3: 查询可调度任务（read-only）
 * 获取所有可以被安排到日程的任务（子子任务 + 无子任务的子任务）
 */
export const query_schedulable_tasks = tool({
  description: '获取所有可以被安排到日程中的任务。返回子子任务和无子任务的子任务。',
  inputSchema: z.object({
    // 无参数，获取所有可调度任务
  }),
  async execute(): Promise<ToolResult> {
    try {
      const tasks = getAllSchedulableTasks()

      return {
        success: true,
        data: tasks,
        message: `找到 ${tasks.length} 个可调度任务`
      }
    } catch (error: any) {
      console.error('[query_schedulable_tasks] Error:', error)
      return {
        success: false,
        error: error.message || '查询可调度任务时发生错误'
      }
    }
  }
})

/**
 * 工具4: 创建日程块（write）
 * 创建新的日程安排，自动检测时间冲突
 */
export const create_schedule_block = tool({
  description: '创建新的日程块。支持关联任务或创建临时事件，自动检测时间冲突。',
  inputSchema: z.object({
    type: z.enum(['task', 'event']).optional().describe('日程类型（task=关联任务，event=临时事件）'),
    taskId: z.number().optional().describe('任务ID（type=task 时必填）'),
    title: z.string().optional().describe('事件标题（type=event 时必填）'),
    date: z.string().describe('日期 (YYYY-MM-DD)'),
    startTime: z.string().describe('开始时间 (HH:MM)'),
    endTime: z.string().describe('结束时间 (HH:MM)'),
    comment: z.string().optional().describe('备注信息（可选）'),
    categoryId: z.number().optional().describe('分类ID（可选）')
  }),
  async execute({ type, taskId, title, date, startTime, endTime, comment, categoryId }): Promise<ToolResult> {
    try {
      const normalizedTaskId = typeof taskId === 'number' && taskId > 0 ? taskId : undefined
      const blockType: ScheduleBlockType = (type as ScheduleBlockType | undefined) ?? (normalizedTaskId ? 'task' : 'event')
      const trimmedTitle = title?.trim() ?? ''

      let taskTitle: string | undefined
      let parentTitle: string | undefined
      let grandparentTitle: string | undefined

      if (blockType === 'task') {
        if (!normalizedTaskId) {
          return {
            success: false,
            error: '缺少任务ID，无法创建任务型日程'
          }
        }

        const task = tasksDbManager.getTask(normalizedTaskId)
        if (!task) {
          return {
            success: false,
            error: `任务 ID:${normalizedTaskId} 不存在`
          }
        }

        taskTitle = task.title

        if (task.level === 1 && task.parentId) {
          const parent = tasksDbManager.getTask(task.parentId)
          if (parent) {
            parentTitle = parent.title
          }
        } else if (task.level === 2 && task.parentId) {
          const parent = tasksDbManager.getTask(task.parentId)
          if (parent) {
            parentTitle = parent.title
            if (parent.parentId) {
              const grandparent = tasksDbManager.getTask(parent.parentId)
              if (grandparent) {
                grandparentTitle = grandparent.title
              }
            }
          }
        }
      } else {
        if (!trimmedTitle) {
          return {
            success: false,
            error: '请提供事件标题'
          }
        }
      }

      // 检测时间冲突
      const conflicts = checkTimeConflict(date, startTime, endTime)
      if (conflicts.length > 0) {
        const conflictTitles = conflicts.map(c => c.title).join(', ')
        return {
          success: false,
          error: `时间冲突：与以下任务重叠 - ${conflictTitles}`
        }
      }

      const payload: CreateScheduleBlockInput = {
        type: blockType,
        title: blockType === 'task' ? (taskTitle ?? trimmedTitle) : trimmedTitle,
        date,
        startTime,
        endTime,
        comment: comment?.trim() || undefined,
        status: 'scheduled',
        taskId: blockType === 'task' ? normalizedTaskId : undefined,
        taskTitle: taskTitle,
        parentTitle,
        grandparentTitle,
        categoryId
      }

      // 创建日程块
      const newBlock = createScheduleBlock(payload)

      const displayTitle = newBlock.title

      return {
        success: true,
        data: {
          id: newBlock.id,
          title: displayTitle,
          date,
          startTime,
          endTime,
          type: newBlock.type,
          taskId: newBlock.taskId
        },
        message: `日程块 "${displayTitle}" 已创建（${date} ${startTime}-${endTime}）`
      }
    } catch (error: any) {
      console.error('[create_schedule_block] Error:', error)
      return {
        success: false,
        error: error.message || '创建日程块时发生错误'
      }
    }
  }
})

/**
 * 工具5: 更新日程块（write）
 * 更新已存在的日程块，支持修改时间、日期、备注、状态
 */
export const update_schedule_block = tool({
  description: '更新已存在的日程块。可以修改日期、时间、备注、状态、分类。',
  inputSchema: z.object({
    blockId: z.number().describe('日程块ID'),
    date: z.string().optional().describe('新日期 (YYYY-MM-DD，可选)'),
    startTime: z.string().optional().describe('新开始时间 (HH:MM，可选)'),
    endTime: z.string().optional().describe('新结束时间 (HH:MM，可选)'),
    status: z.enum(['scheduled', 'in_progress', 'partially_completed', 'completed', 'cancelled'])
      .optional()
      .describe('新状态（可选）'),
    comment: z.string().optional().describe('新备注（可选）'),
    categoryId: z.number().optional().describe('新分类ID（可选）'),
    title: z.string().optional().describe('新的标题（事件适用，可选）')
  }),
  async execute({ blockId, date, startTime, endTime, status, comment, categoryId, title }): Promise<ToolResult> {
    try {
      // 验证日程块是否存在（通过尝试查询）
      const blocks = getScheduleByDateRange('1970-01-01', '2100-12-31')
      const existingBlock = blocks.find(b => b.id === blockId)

      if (!existingBlock) {
        return {
          success: false,
          error: `日程块 ID:${blockId} 不存在`
        }
      }

      // 如果修改了时间，检测冲突（排除自身）
      const newDate = date || existingBlock.date
      const newStartTime = startTime || existingBlock.startTime
      const newEndTime = endTime || existingBlock.endTime

      if (date || startTime || endTime) {
        const conflicts = checkTimeConflict(newDate, newStartTime, newEndTime, blockId)
        if (conflicts.length > 0) {
          const conflictTitles = conflicts.map(c => c.title).join(', ')
          return {
            success: false,
            error: `时间冲突：与以下任务重叠 - ${conflictTitles}`
          }
        }
      }

      // 构建更新数据
      const updates: Partial<ScheduleBlock> = {}
      if (date !== undefined) updates.date = date
      if (startTime !== undefined) updates.startTime = startTime
      if (endTime !== undefined) updates.endTime = endTime
      if (status !== undefined) updates.status = status
      if (comment !== undefined) updates.comment = comment
      if (categoryId !== undefined) updates.categoryId = categoryId
      if (title !== undefined) updates.title = title.trim()

      // 执行更新
      updateScheduleBlock(blockId, updates)

      return {
        success: true,
        data: { id: blockId, ...updates },
        message: `日程块 "${existingBlock.title}" 已更新`
      }
    } catch (error: any) {
      console.error('[update_schedule_block] Error:', error)
      return {
        success: false,
        error: error.message || '更新日程块时发生错误'
      }
    }
  }
})

/**
 * 工具6: 删除日程块（write）
 * 删除指定的日程块
 */
export const delete_schedule_block = tool({
  description: '删除指定的日程块。',
  inputSchema: z.object({
    blockId: z.number().describe('要删除的日程块ID')
  }),
  async execute({ blockId }): Promise<ToolResult> {
    try {
      // 验证日程块是否存在
      const blocks = getScheduleByDateRange('1970-01-01', '2100-12-31')
      const existingBlock = blocks.find(b => b.id === blockId)

      if (!existingBlock) {
        return {
          success: false,
          error: `日程块 ID:${blockId} 不存在`
        }
      }

      const blockTitle = existingBlock.title
      const date = existingBlock.date
      const time = `${existingBlock.startTime}-${existingBlock.endTime}`

      // 删除日程块
      deleteScheduleBlock(blockId)

      return {
        success: true,
        data: { id: blockId },
        message: `日程块 "${blockTitle}" 已删除（${date} ${time}）`
      }
    } catch (error: any) {
      console.error('[delete_schedule_block] Error:', error)
      return {
        success: false,
        error: error.message || '删除日程块时发生错误'
      }
    }
  }
})

/**
 * 导出所有工具
 */
export const scheduleTools = {
  query_schedule,
  query_tasks,
  query_schedulable_tasks,
  create_schedule_block,
  update_schedule_block,
  delete_schedule_block
}

export default scheduleTools
