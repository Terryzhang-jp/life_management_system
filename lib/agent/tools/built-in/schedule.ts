/**
 * Agent 工具系统 - 日程管理工具
 *
 * 提供日程安排的增删改查功能
 * 直接使用 LangChain 原生实现，无需适配层
 */

import { tool } from '@langchain/core/tools'
import { z } from 'zod'
import type { ToolMetadata } from '../types'
import type { DynamicStructuredTool } from '@langchain/core/tools'
import {
  getScheduleByDateRange,
  createScheduleBlock,
  updateScheduleBlock,
  deleteScheduleBlock,
  checkTimeConflict,
  type ScheduleBlock,
  type CreateScheduleBlockInput,
  type ScheduleBlockType,
} from '@/lib/schedule-db'
import tasksDbManager, { getAllSchedulableTasks } from '@/lib/tasks-db'
import { parseDateString, getTodayDate } from './schedule-utils'

/**
 * 工具1: 查询日程安排
 * 只读操作，按日期范围查询日程块
 */
export const queryScheduleTool = tool(
  async ({
    startDate,
    endDate,
    status,
    taskId,
    categoryId,
  }: {
    startDate: string
    endDate: string
    status?: Array<'scheduled' | 'in_progress' | 'partially_completed' | 'completed' | 'cancelled'>
    taskId?: number
    categoryId?: number
  }) => {
    try {
      // ⭐ 解析相对日期（如"今天"、"明天"、"后天"）为 YYYY-MM-DD 格式
      const normalizedStartDate = parseDateString(startDate)
      const normalizedEndDate = parseDateString(endDate)

      // 获取日期范围内的所有日程块
      let blocks = getScheduleByDateRange(normalizedStartDate, normalizedEndDate)

      // 应用过滤器
      if (status && status.length > 0) {
        blocks = blocks.filter((block) => status.includes(block.status))
      }

      if (taskId !== undefined) {
        blocks = blocks.filter((block) => block.taskId === taskId)
      }

      if (categoryId !== undefined) {
        blocks = blocks.filter((block) => block.categoryId === categoryId)
      }

      // 格式化返回结果
      if (blocks.length === 0) {
        const dateInfo = startDate === endDate
          ? `${startDate}（${normalizedStartDate}）`
          : `${startDate} 至 ${endDate}（${normalizedStartDate} 至 ${normalizedEndDate}）`
        return `未找到日程安排（${dateInfo}）`
      }

      const result = blocks
        .map(
          (block) =>
            `- ${block.title} (${block.date} ${block.startTime}-${block.endTime}) [${block.status}]`
        )
        .join('\n')

      const dateInfo = startDate === endDate
        ? `${startDate}（${normalizedStartDate}）`
        : `${startDate} 至 ${endDate}（${normalizedStartDate} 至 ${normalizedEndDate}）`
      return `找到 ${blocks.length} 个日程块（${dateInfo}）：\n${result}`
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      return `查询日程时发生错误: ${errorMessage}`
    }
  },
  {
    name: 'querySchedule',
    description: '查询指定日期范围的日程安排。支持按状态、任务ID、分类ID过滤。注意：startDate 和 endDate 都是必填参数，查询单天也需要提供两个相同的日期。',
    schema: z.object({
      startDate: z.string().describe('开始日期（必填）。支持相对日期如"今天"、"明天"、"后天"，或绝对日期 YYYY-MM-DD 格式。查询单天时 startDate 和 endDate 应该相同。'),
      endDate: z.string().describe('结束日期（必填）。支持相对日期如"今天"、"明天"、"后天"，或绝对日期 YYYY-MM-DD 格式。查询单天时 startDate 和 endDate 应该相同。'),
      status: z
        .array(
          z.enum([
            'scheduled',
            'in_progress',
            'partially_completed',
            'completed',
            'cancelled',
          ])
        )
        .optional()
        .describe('过滤状态列表（可选）'),
      taskId: z.number().optional().describe('过滤特定任务ID（可选）'),
      categoryId: z.number().optional().describe('过滤特定分类ID（可选）'),
    }),
  }
)

/**
 * 工具2: 查询任务
 * 只读操作，查询任务列表
 */
export const queryTasksTool = tool(
  async ({
    type,
    categoryId,
    parentId,
  }: {
    type?: 'routine' | 'long-term' | 'short-term'
    categoryId?: number
    parentId?: number
  }) => {
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
          ...allTasks.shortTermTasks,
        ]
      }

      // 应用过滤器
      if (type) {
        tasks = tasks.filter((task) => task.type === type)
      }

      if (categoryId !== undefined) {
        tasks = tasks.filter((task) => task.categoryId === categoryId)
      }

      // 格式化返回结果
      if (tasks.length === 0) {
        return '未找到任务'
      }

      const result = tasks
        .map((task) => `- [${task.type}] ${task.title} (ID: ${task.id})`)
        .join('\n')

      return `找到 ${tasks.length} 个任务：\n${result}`
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      return `查询任务时发生错误: ${errorMessage}`
    }
  },
  {
    name: 'queryTasks',
    description:
      '查询任务列表。支持按类型(routine/long-term/short-term)、分类ID、父任务ID过滤。',
    schema: z.object({
      type: z
        .enum(['routine', 'long-term', 'short-term'])
        .optional()
        .describe('任务类型（可选）'),
      categoryId: z.number().optional().describe('分类ID（可选）'),
      parentId: z.number().optional().describe('父任务ID（可选，获取子任务）'),
    }),
  }
)

/**
 * 工具3: 查询可调度任务
 * 只读操作，获取所有可以被安排到日程的任务
 */
export const querySchedulableTasksTool = tool(
  async () => {
    try {
      const tasks = getAllSchedulableTasks()

      // 格式化返回结果
      if (tasks.length === 0) {
        return '未找到可调度任务'
      }

      const result = tasks
        .map((task) => {
          const hierarchy = []
          if (task.grandparentTitle) hierarchy.push(task.grandparentTitle)
          if (task.parentTitle) hierarchy.push(task.parentTitle)
          hierarchy.push(task.title)

          return `- ${hierarchy.join(' > ')} (ID: ${task.id})`
        })
        .join('\n')

      return `找到 ${tasks.length} 个可调度任务：\n${result}`
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      return `查询可调度任务时发生错误: ${errorMessage}`
    }
  },
  {
    name: 'querySchedulableTasks',
    description: '获取所有可以被安排到日程中的任务。返回子子任务和无子任务的子任务。',
    schema: z.object({}),
  }
)

/**
 * 工具4: 创建日程块
 * 写操作，创建新的日程安排
 */
export const createScheduleBlockTool = tool(
  async ({
    type,
    taskId,
    title,
    date,
    startTime,
    endTime,
    comment,
    categoryId,
  }: {
    type?: 'task' | 'event'
    taskId?: number
    title?: string
    date: string
    startTime: string
    endTime?: string
    comment?: string
    categoryId?: number
  }) => {
    try {
      const normalizedTaskId =
        typeof taskId === 'number' && taskId > 0 ? taskId : undefined
      const blockType: ScheduleBlockType =
        type ?? (normalizedTaskId ? 'task' : 'event')
      const trimmedTitle = title?.trim() ?? ''

      // 如果没有提供结束时间，默认为开始时间 + 1小时
      let actualEndTime = endTime
      if (!actualEndTime) {
        const [hours, minutes] = startTime.split(':').map(Number)
        const endHour = (hours + 1) % 24
        actualEndTime = `${String(endHour).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
      }

      let taskTitle: string | undefined
      let parentTitle: string | undefined
      let grandparentTitle: string | undefined

      // 处理任务型日程
      if (blockType === 'task') {
        if (!normalizedTaskId) {
          return '错误: 缺少任务ID，无法创建任务型日程'
        }

        const task = tasksDbManager.getTask(normalizedTaskId)
        if (!task) {
          return `错误: 任务 ID:${normalizedTaskId} 不存在`
        }

        taskTitle = task.title

        // 获取父任务和祖父任务标题
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
        // 事件型日程必须有标题
        if (!trimmedTitle) {
          return '错误: 请提供事件标题'
        }
      }

      // 标准化日期格式
      const normalizedDate = parseDateString(date)

      // 检测时间冲突（警告但不阻止）
      const conflicts = checkTimeConflict(normalizedDate, startTime, actualEndTime)
      let warningMessage = ''
      if (conflicts.length > 0) {
        const conflictTitles = conflicts.map((c) => c.title).join(', ')
        warningMessage = ` ⚠️ 注意：该时间段与以下日程重叠 - ${conflictTitles}`
      }

      // 构建创建参数
      const payload: CreateScheduleBlockInput = {
        type: blockType,
        title: blockType === 'task' ? (taskTitle ?? trimmedTitle) : trimmedTitle,
        date: normalizedDate,
        startTime,
        endTime: actualEndTime,
        comment: comment?.trim() || undefined,
        status: 'scheduled',
        taskId: blockType === 'task' ? normalizedTaskId : undefined,
        taskTitle,
        parentTitle,
        grandparentTitle,
        categoryId,
      }

      // 创建日程块
      const newBlock = createScheduleBlock(payload)

      return `✅ 日程块已创建: "${newBlock.title}" (${normalizedDate} ${startTime}-${actualEndTime})${warningMessage}`
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      return `创建日程块时发生错误: ${errorMessage}`
    }
  },
  {
    name: 'createScheduleBlock',
    description: '创建新的日程块。支持关联任务或创建临时事件，自动检测时间冲突。',
    schema: z.object({
      type: z
        .enum(['task', 'event'])
        .optional()
        .describe('日程类型（task=关联任务，event=临时事件）'),
      taskId: z.number().optional().describe('任务ID（type=task 时必填）'),
      title: z.string().optional().describe('事件标题（type=event 时必填）'),
      date: z.string().describe('日期 (YYYY-MM-DD 或 today/tomorrow)'),
      startTime: z.string().describe('开始时间 (HH:MM)'),
      endTime: z.string().optional().describe('结束时间 (HH:MM)，如果未提供，默认为开始时间+1小时'),
      comment: z.string().optional().describe('备注信息（可选）'),
      categoryId: z.number().optional().describe('分类ID（可选）'),
    }),
  }
)

/**
 * 工具5: 更新日程块（智能版本 - 方案3）
 * 支持两种查询方式：
 * 1. 通过 blockId 精确查询
 * 2. 通过 searchDate + searchTitle 描述查询
 */
export const updateScheduleBlockTool = tool(
  async (params: {
    // 查询方式1: 精确 ID
    blockId?: number

    // 查询方式2: 描述查询
    searchDate?: string
    searchTitle?: string

    // 更新内容
    newDate?: string
    newStartTime?: string
    newEndTime?: string
    newStatus?: 'scheduled' | 'in_progress' | 'partially_completed' | 'completed' | 'cancelled'
    newComment?: string
    newCategoryId?: number
    newTitle?: string
  }) => {
    try {
      const {
        blockId,
        searchDate,
        searchTitle,
        newDate,
        newStartTime,
        newEndTime,
        newStatus,
        newComment,
        newCategoryId,
        newTitle,
      } = params

      // ===== 步骤1: 参数验证 =====
      const hasIdQuery = blockId !== undefined
      const hasDescQuery = searchDate !== undefined || searchTitle !== undefined

      if (!hasIdQuery && !hasDescQuery) {
        return '错误: 请提供查询条件（blockId 或 searchDate/searchTitle）'
      }

      if (hasIdQuery && hasDescQuery) {
        return '错误: 请只使用一种查询方式（blockId 或描述查询）'
      }

      const hasUpdates = newDate || newStartTime || newEndTime || newStatus ||
                         newComment !== undefined || newCategoryId || newTitle
      if (!hasUpdates) {
        return '错误: 请提供至少一个要更新的字段'
      }

      // ===== 步骤2: 查找目标日程块 =====
      let targetBlocks: ScheduleBlock[] = []

      if (hasIdQuery) {
        // 精确 ID 查询
        const allBlocks = getScheduleByDateRange('1970-01-01', '2100-12-31')
        const found = allBlocks.find((b) => b.id === blockId)
        if (found) targetBlocks = [found]
      } else {
        // 描述查询
        const queryDate = searchDate ? parseDateString(searchDate) : getTodayDate()
        let candidates = getScheduleByDateRange(queryDate, queryDate)

        // 按标题过滤
        if (searchTitle) {
          const searchLower = searchTitle.toLowerCase()
          candidates = candidates.filter((b) =>
            b.title.toLowerCase().includes(searchLower) ||
            searchLower.includes(b.title.toLowerCase())
          )
        }

        targetBlocks = candidates
      }

      // ===== 步骤3: 处理查询结果 =====
      if (targetBlocks.length === 0) {
        if (hasIdQuery) {
          return `错误: 日程块 ID:${blockId} 不存在`
        } else {
          return `未找到匹配的日程${searchTitle ? ` "${searchTitle}"` : ''}${searchDate ? ` (${searchDate})` : ' (今天)'}`
        }
      }

      if (targetBlocks.length > 1) {
        // 找到多个，返回列表让用户明确
        const list = targetBlocks
          .map((b) => `- ${b.title} (${b.date} ${b.startTime}-${b.endTime}) [ID: ${b.id}]`)
          .join('\n')

        return `找到 ${targetBlocks.length} 个匹配的日程，请使用 blockId 明确指定：\n${list}`
      }

      // ===== 步骤4: 执行更新 =====
      const target = targetBlocks[0]

      // 检查时间冲突
      if (newDate || newStartTime || newEndTime) {
        const checkDate = newDate ? parseDateString(newDate) : target.date
        const checkStart = newStartTime || target.startTime
        const checkEnd = newEndTime || target.endTime

        const conflicts = checkTimeConflict(checkDate, checkStart, checkEnd, target.id)
        if (conflicts.length > 0) {
          const conflictNames = conflicts.map((c) => c.title).join(', ')
          return `错误: 时间冲突，与以下日程重叠 - ${conflictNames}`
        }
      }

      // 构建更新数据
      const updates: Partial<ScheduleBlock> = {}
      if (newDate !== undefined) updates.date = parseDateString(newDate)
      if (newStartTime !== undefined) updates.startTime = newStartTime
      if (newEndTime !== undefined) updates.endTime = newEndTime
      if (newStatus !== undefined) updates.status = newStatus
      if (newComment !== undefined) updates.comment = newComment
      if (newCategoryId !== undefined) updates.categoryId = newCategoryId
      if (newTitle !== undefined) updates.title = newTitle.trim()

      updateScheduleBlock(target.id!, updates)

      // ===== 步骤5: 返回结果 =====
      const updatedFields = Object.keys(updates).join(', ')
      return `✅ 已更新: "${target.title}" (${target.date})\n更新字段: ${updatedFields}`

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      return `更新日程块时发生错误: ${errorMessage}`
    }
  },
  {
    name: 'updateScheduleBlock',
    description: `【重要】更新日程安排。这个工具会自动处理查找和匹配，你无需向用户询问额外信息。

工作方式：
1. 描述查询（推荐）: 提供 searchTitle（如"团队会议"）和可选的 searchDate（默认今天）
   - 工具会自动匹配标题中包含关键词的日程
   - 找到1个 → 直接更新
   - 找到多个 → 返回列表，你再引导用户用 blockId 明确选择
   - 找不到 → 返回"未找到"

2. 精确查询: 如果已知 blockId，直接使用

示例对话：
用户："把今天的团队会议改到下午3点"
✅ 正确做法: updateScheduleBlock({ searchTitle: "团队会议", searchDate: "today", newStartTime: "15:00" })
❌ 错误做法: 问用户"您是说哪个团队会议？请提供具体信息"

直接调用工具，工具会处理所有查找逻辑！`,

    schema: z.object({
      // 查询参数（二选一）
      blockId: z.number().optional().describe('日程块ID（精确查询，如果已知）'),
      searchDate: z.string().optional().describe('查询日期：today/tomorrow/YYYY-MM-DD（描述查询，默认今天）'),
      searchTitle: z.string().optional().describe('标题关键词（描述查询，推荐使用）'),

      // 更新参数（至少提供一个）
      newDate: z.string().optional().describe('新日期：today/tomorrow/YYYY-MM-DD'),
      newStartTime: z.string().optional().describe('新开始时间 HH:MM，如"15:00"表示下午3点'),
      newEndTime: z.string().optional().describe('新结束时间 HH:MM'),
      newStatus: z
        .enum(['scheduled', 'in_progress', 'partially_completed', 'completed', 'cancelled'])
        .optional()
        .describe('新状态'),
      newComment: z.string().optional().describe('新备注'),
      newCategoryId: z.number().optional().describe('新分类ID'),
      newTitle: z.string().optional().describe('新标题'),
    }),
  }
)

/**
 * 工具6: 删除日程块（智能版本 - 方案3）
 * 支持两种查询方式：
 * 1. 通过 blockId 精确查询
 * 2. 通过 searchDate + searchTitle 描述查询
 */
export const deleteScheduleBlockTool = tool(
  async (params: {
    // 查询方式1: 精确 ID
    blockId?: number

    // 查询方式2: 描述查询
    searchDate?: string
    searchTitle?: string
  }) => {
    try {
      const { blockId, searchDate, searchTitle } = params

      // ===== 步骤1: 参数验证 =====
      const hasIdQuery = blockId !== undefined
      const hasDescQuery = searchDate !== undefined || searchTitle !== undefined

      if (!hasIdQuery && !hasDescQuery) {
        return '错误: 请提供查询条件（blockId 或 searchDate/searchTitle）'
      }

      if (hasIdQuery && hasDescQuery) {
        return '错误: 请只使用一种查询方式（blockId 或描述查询）'
      }

      // ===== 步骤2: 查找目标日程块 =====
      let targetBlocks: ScheduleBlock[] = []

      if (hasIdQuery) {
        // 精确 ID 查询
        const allBlocks = getScheduleByDateRange('1970-01-01', '2100-12-31')
        const found = allBlocks.find((b) => b.id === blockId)
        if (found) targetBlocks = [found]
      } else {
        // 描述查询
        const queryDate = searchDate ? parseDateString(searchDate) : getTodayDate()
        let candidates = getScheduleByDateRange(queryDate, queryDate)

        // 按标题过滤
        if (searchTitle) {
          const searchLower = searchTitle.toLowerCase()
          candidates = candidates.filter((b) =>
            b.title.toLowerCase().includes(searchLower) ||
            searchLower.includes(b.title.toLowerCase())
          )
        }

        targetBlocks = candidates
      }

      // ===== 步骤3: 处理查询结果 =====
      if (targetBlocks.length === 0) {
        if (hasIdQuery) {
          return `错误: 日程块 ID:${blockId} 不存在`
        } else {
          return `未找到匹配的日程${searchTitle ? ` "${searchTitle}"` : ''}${searchDate ? ` (${searchDate})` : ' (今天)'}`
        }
      }

      if (targetBlocks.length > 1) {
        // 找到多个，返回列表让用户明确
        const list = targetBlocks
          .map((b) => `- ${b.title} (${b.date} ${b.startTime}-${b.endTime}) [ID: ${b.id}]`)
          .join('\n')

        return `找到 ${targetBlocks.length} 个匹配的日程，请使用 blockId 明确指定：\n${list}`
      }

      // ===== 步骤4: 执行删除 =====
      const target = targetBlocks[0]
      const blockTitle = target.title
      const date = target.date
      const time = `${target.startTime}-${target.endTime}`

      deleteScheduleBlock(target.id!)

      return `✅ 已删除: "${blockTitle}" (${date} ${time})`

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      return `删除日程块时发生错误: ${errorMessage}`
    }
  },
  {
    name: 'deleteScheduleBlock',
    description: `【重要】删除日程安排。这个工具会自动处理查找和匹配，你无需向用户询问额外信息。

工作方式：
1. 描述查询（推荐）: 提供 searchTitle（如"团队会议"）和可选的 searchDate（默认今天）
   - 工具会自动匹配标题中包含关键词的日程
   - 找到1个 → 直接删除
   - 找到多个 → 返回列表，你再引导用户用 blockId 明确选择
   - 找不到 → 返回"未找到"

2. 精确查询: 如果已知 blockId，直接使用

示例对话：
用户："删除今天的团队会议"
✅ 正确做法: deleteScheduleBlock({ searchTitle: "团队会议", searchDate: "today" })
❌ 错误做法: 问用户"您确定要删除吗？请提供更多信息"

直接调用工具，工具会处理所有查找逻辑！`,

    schema: z.object({
      // 查询参数（二选一）
      blockId: z.number().optional().describe('日程块ID（精确查询，如果已知）'),
      searchDate: z.string().optional().describe('查询日期：today/tomorrow/YYYY-MM-DD（描述查询，默认今天）'),
      searchTitle: z.string().optional().describe('标题关键词（描述查询，推荐使用）'),
    }),
  }
)

/**
 * 获取所有日程工具及其元数据
 */
export function getScheduleTools(): Array<{
  tool: DynamicStructuredTool
  metadata: Omit<ToolMetadata, 'category'>
}> {
  return [
    {
      tool: queryScheduleTool,
      metadata: {
        displayName: '查询日程',
        description: '查询指定日期范围的日程安排',
        readonly: true,
        version: '1.0.0',
      },
    },
    {
      tool: queryTasksTool,
      metadata: {
        displayName: '查询任务',
        description: '查询任务列表，支持多种过滤条件',
        readonly: true,
        version: '1.0.0',
      },
    },
    {
      tool: querySchedulableTasksTool,
      metadata: {
        displayName: '查询可调度任务',
        description: '获取所有可以被安排到日程中的任务',
        readonly: true,
        version: '1.0.0',
      },
    },
    {
      tool: createScheduleBlockTool,
      metadata: {
        displayName: '创建日程块',
        description: '创建新的日程安排，自动检测冲突',
        readonly: false,
        version: '1.0.0',
        parameters: [
          {
            name: 'type',
            importance: 'high',
            required: false,
            hasDefault: true,
            defaultDescription: '如果提供 taskId 默认为 task，否则为 event',
            onMissing: 'use_default',
            explanation:
              'task 类型表示关联任务的日程块，event 类型表示临时事件。大多数情况下会关联任务。',
          },
          {
            name: 'taskId',
            importance: 'critical',
            required: false,
            hasDefault: false,
            onMissing: 'ask_user',
            clarificationPrompt:
              '请问你想为哪个任务安排日程？请告诉我任务的ID或描述。如果这是一个临时事件（不关联任务），请告诉我事件标题。',
            explanation:
              '当 type=task 时，taskId 是必需的。如果用户没有明确提供任务 ID，应该询问用户想为哪个任务安排日程，或者建议用户使用 querySchedulableTasks 查看可调度任务列表。',
          },
          {
            name: 'title',
            importance: 'critical',
            required: false,
            hasDefault: false,
            onMissing: 'ask_user',
            clarificationPrompt: '请问这个事件的标题是什么？',
            explanation:
              '当 type=event 时，title 是必需的。对于任务型日程块，title 会自动从任务信息中获取。',
          },
          {
            name: 'date',
            importance: 'critical',
            required: true,
            hasDefault: false,
            onMissing: 'ask_user',
            clarificationPrompt:
              '请问你想在哪一天安排这个日程？可以说"今天"、"明天"、"后天"或具体日期（YYYY-MM-DD）。',
            explanation:
              '必须提供日期。支持自然语言（today/tomorrow/今天/明天/后天）或标准格式（YYYY-MM-DD）。如果用户说"明天下午3点学习"，应提取"明天"作为 date。',
          },
          {
            name: 'startTime',
            importance: 'critical',
            required: true,
            hasDefault: false,
            onMissing: 'ask_user',
            clarificationPrompt:
              '请问日程从什么时间开始？请提供 HH:MM 格式的时间，例如 "15:00"。',
            explanation:
              '必须提供开始时间。格式为 HH:MM（24小时制）。如果用户说"下午3点"，应转换为 "15:00"。',
          },
          {
            name: 'endTime',
            importance: 'medium',
            required: false,
            hasDefault: true,
            defaultDescription: '开始时间 + 1小时',
            onMissing: 'use_default',
            explanation:
              '结束时间可选。如果用户没有明确说明结束时间，系统会自动设置为开始时间+1小时。如果用户说"学习到4点"或"4点到9点"，应提取结束时间。',
          },
          {
            name: 'comment',
            importance: 'low',
            required: false,
            hasDefault: false,
            onMissing: 'skip',
            explanation: '备注信息完全可选，用户没有提供时可以忽略。',
          },
          {
            name: 'categoryId',
            importance: 'low',
            required: false,
            hasDefault: false,
            onMissing: 'skip',
            explanation: '分类ID完全可选，通常情况下不需要。',
          },
        ],
      },
    },
    {
      tool: updateScheduleBlockTool,
      metadata: {
        displayName: '更新日程块',
        description: '更新已存在的日程块信息',
        readonly: false,
        version: '1.0.0',
      },
    },
    {
      tool: deleteScheduleBlockTool,
      metadata: {
        displayName: '删除日程块',
        description: '删除指定的日程块',
        readonly: false,
        version: '1.0.0',
      },
    },
  ]
}
