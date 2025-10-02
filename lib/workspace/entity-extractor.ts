/**
 * 实体提取工具
 * 使用正则快速提取任务ID、任务名、指代词等
 */

import { ConversationState } from './conversation-state'

export interface ExtractedEntity {
  taskId?: number
  taskName?: string
  confidence: number  // 0-1，提取的置信度
  source: 'id' | 'quoted' | 'reference' | 'none'
}

/**
 * 提取任务ID（精确匹配）
 * 匹配格式：ID:123, ID 123, (ID:123)
 */
export function extractTaskId(content: string): number | null {
  const idRegex = /ID[:\s]+(\d+)/i
  const match = content.match(idRegex)

  if (match && match[1]) {
    const id = parseInt(match[1], 10)
    return Number.isNaN(id) ? null : id
  }

  return null
}

/**
 * 提取引号包围的文本
 * 匹配：'任务名' "任务名" 「任务名」 『任务名』
 */
export function extractQuotedText(content: string): string | null {
  const quotedRegex = /["'「『]([^"'」』]+)["'」』]/
  const match = content.match(quotedRegex)

  if (match && match[1]) {
    return match[1].trim()
  }

  return null
}

/**
 * 指代消解
 * 检测"这个"、"那个"、"它"、"刚才"等指代词，返回focusTask
 */
export function resolveReference(
  content: string,
  state: ConversationState
): number | null {
  const referenceRegex = /这个|那个|它|刚才|上面|前面/
  const hasReference = referenceRegex.test(content)

  if (hasReference && state.focusTask) {
    return state.focusTask.id
  }

  return null
}

/**
 * 统一实体提取入口
 * 按优先级尝试：ID > 引号 > 指代
 */
export function extractEntities(
  content: string,
  state: ConversationState
): ExtractedEntity {
  // 1. 尝试提取精确ID（最高优先级）
  const taskId = extractTaskId(content)
  if (taskId !== null) {
    return {
      taskId,
      confidence: 1.0,
      source: 'id'
    }
  }

  // 2. 尝试提取引号包围的任务名
  const quotedName = extractQuotedText(content)
  if (quotedName) {
    return {
      taskName: quotedName,
      confidence: 0.9,
      source: 'quoted'
    }
  }

  // 3. 尝试指代消解
  const referenceId = resolveReference(content, state)
  if (referenceId !== null) {
    return {
      taskId: referenceId,
      confidence: 0.85,
      source: 'reference'
    }
  }

  // 4. 无法提取
  return {
    confidence: 0,
    source: 'none'
  }
}

/**
 * 从任务名解析为任务ID（需要查询数据库）
 * 这个函数在后端使用，因为需要访问数据库
 */
export async function resolveTaskName(
  taskName: string,
  tasksDb: any  // 传入 tasksDbManager
): Promise<number | null> {
  try {
    // 获取所有任务
    const allTasks = await tasksDb.getAllTasks()

    // 查找匹配的任务（支持模糊匹配）
    const allTasksFlat = [
      ...allTasks.routines,
      ...allTasks.longTermTasks,
      ...allTasks.shortTermTasks
    ]

    // 精确匹配
    const exactMatch = allTasksFlat.find(
      (task: any) => task.title === taskName
    )
    if (exactMatch) {
      return exactMatch.id
    }

    // 包含匹配
    const partialMatch = allTasksFlat.find(
      (task: any) => task.title.includes(taskName) || taskName.includes(task.title)
    )
    if (partialMatch) {
      return partialMatch.id
    }

    return null
  } catch (error) {
    console.error('Failed to resolve task name:', error)
    return null
  }
}
