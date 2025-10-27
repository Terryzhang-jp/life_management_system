/**
 * Agent 工具系统 - 分类常量
 *
 * 定义所有工具分类的常量和描述
 */

import type { ToolCategory } from './types'

/**
 * 工具分类枚举
 * 使用常量对象模式，提供类型安全和运行时值
 */
export const ToolCategories = {
  CALCULATION: 'calculation' as ToolCategory,
  SYSTEM: 'system' as ToolCategory,
  SCHEDULE: 'schedule' as ToolCategory,
  TASKS: 'tasks' as ToolCategory,
  MEMORY: 'memory' as ToolCategory,
  QUEST: 'quest' as ToolCategory,
} as const

/**
 * 工具分类描述
 * 用于 UI 显示和文档生成
 */
export const ToolCategoryDescriptions: Record<ToolCategory, string> = {
  calculation: '数学计算工具（加减乘除、统计等）',
  system: '系统工具（时间、日期、环境信息等）',
  schedule: '日程管理工具（查询、创建、更新日程）',
  tasks: '任务管理工具（查询、创建、更新任务）',
  memory: '记忆系统工具（存储和检索用户偏好）',
  quest: 'Quest 管理工具（Milestone 创建、进度跟踪）',
}

/**
 * 工具分类优先级
 * 数字越小优先级越高，用于工具列表排序
 */
export const ToolCategoryPriority: Record<ToolCategory, number> = {
  system: 1,
  calculation: 2,
  schedule: 3,
  tasks: 4,
  quest: 5,
  memory: 6,
}

/**
 * 获取分类的显示名称
 */
export function getCategoryDisplayName(category: ToolCategory): string {
  return ToolCategoryDescriptions[category] || category
}

/**
 * 获取所有分类列表（按优先级排序）
 */
export function getAllCategories(): ToolCategory[] {
  return Object.values(ToolCategories).sort(
    (a, b) => ToolCategoryPriority[a] - ToolCategoryPriority[b]
  )
}
