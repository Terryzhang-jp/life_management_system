/**
 * Agent 工具系统 - 主入口
 *
 * 提供统一的工具访问接口
 */

// 导出核心类型
export type {
  ToolCategory,
  ToolMetadata,
  RegisteredTool,
  ToolRegistrationOptions,
  ToolQueryFilter,
} from './types'

// 导出分类常量和工具
export {
  ToolCategories,
  ToolCategoryDescriptions,
  ToolCategoryPriority,
  getCategoryDisplayName,
  getAllCategories,
} from './categories'

// 导出注册中心
export { ToolRegistry, toolRegistry } from './registry'

// 导出所有内置工具
export { getAllBuiltInTools, getCalculationTools, getSystemTools, getScheduleTools } from './built-in'
