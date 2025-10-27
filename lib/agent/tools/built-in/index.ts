/**
 * Agent 工具系统 - 内置工具入口
 *
 * 统一导出所有内置工具
 */

import { getCalculationTools } from './calculation'
import { getSystemTools } from './system'
import { getScheduleTools } from './schedule'
import type { DynamicStructuredTool } from '@langchain/core/tools'
import type { ToolMetadata } from '../types'
import { ToolCategories } from '../categories'

/**
 * 获取所有内置工具
 *
 * @returns 所有内置工具及其元数据（已分类）
 */
export function getAllBuiltInTools(): Array<{
  tool: DynamicStructuredTool
  metadata: ToolMetadata
}> {
  const tools = []

  // 计算工具
  const calculationTools = getCalculationTools()
  for (const { tool, metadata } of calculationTools) {
    tools.push({
      tool,
      metadata: {
        ...metadata,
        category: ToolCategories.CALCULATION,
      },
    })
  }

  // 系统工具
  const systemTools = getSystemTools()
  for (const { tool, metadata } of systemTools) {
    tools.push({
      tool,
      metadata: {
        ...metadata,
        category: ToolCategories.SYSTEM,
      },
    })
  }

  // 日程工具
  const scheduleTools = getScheduleTools()
  for (const { tool, metadata } of scheduleTools) {
    tools.push({
      tool,
      metadata: {
        ...metadata,
        category: ToolCategories.SCHEDULE,
      },
    })
  }

  return tools
}

/**
 * 按分类导出工具
 */
export { getCalculationTools, getSystemTools, getScheduleTools }
