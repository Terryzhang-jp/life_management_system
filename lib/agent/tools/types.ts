/**
 * Agent 工具系统 - 类型定义
 *
 * 定义工具注册、分类、元数据等核心类型
 */

import type { DynamicStructuredTool } from '@langchain/core/tools'

/**
 * 工具分类
 * 用于组织和过滤工具
 */
export type ToolCategory =
  | 'calculation'  // 计算工具（加减乘除等）
  | 'system'       // 系统工具（时间、日期等）
  | 'schedule'     // 日程管理工具
  | 'tasks'        // 任务管理工具
  | 'memory'       // 记忆系统工具
  | 'quest'        // Quest 管理工具
  | 'expense'      // 开销管理工具
  | 'vision'       // 图像分析工具

/**
 * 参数重要性级别
 */
export type ParameterImportance = 'critical' | 'high' | 'medium' | 'low'

/**
 * 参数缺失时的处理策略
 */
export type OnMissingStrategy = 'ask_user' | 'use_default' | 'skip'

/**
 * 工具参数元数据
 * 用于 Progressive Disclosure - Agent 按需查询
 */
export interface ParameterMetadata {
  /** 参数名称 */
  name: string

  /** 参数重要性级别 */
  importance: ParameterImportance

  /** 是否必需（从 Zod Schema 推断） */
  required: boolean

  /** 是否有默认值 */
  hasDefault: boolean

  /** 默认值的描述（如果有） */
  defaultDescription?: string

  /** 缺失时应该怎么办 */
  onMissing: OnMissingStrategy

  /** 询问用户的提示语（如果 onMissing = 'ask_user'） */
  clarificationPrompt?: string

  /** 参数说明（给 Agent 看的） */
  explanation?: string
}

/**
 * 工具元数据
 * 提供工具的额外信息，用于管理和控制
 */
export interface ToolMetadata {
  /** 工具所属分类 */
  category: ToolCategory

  /** 工具显示名称（中文） */
  displayName: string

  /** 工具详细描述（中文） */
  description: string

  /** 是否为只读工具（不修改数据） */
  readonly?: boolean

  /** 是否需要特殊权限 */
  requiresPermission?: boolean

  /** 工具版本 */
  version?: string

  /** 工具作者/维护者 */
  author?: string

  /** 是否启用（默认 true） */
  enabled?: boolean

  /** 参数元数据（用于 Progressive Disclosure） */
  parameters?: ParameterMetadata[]
}

/**
 * 注册的工具
 * 包含 LangChain 工具实例和元数据
 */
export interface RegisteredTool {
  /** LangChain 工具实例 */
  tool: DynamicStructuredTool

  /** 工具元数据 */
  metadata: ToolMetadata
}

/**
 * 工具注册选项
 */
export interface ToolRegistrationOptions {
  /** 是否覆盖已存在的同名工具 */
  overwrite?: boolean

  /** 是否在注册时验证工具 */
  validate?: boolean
}

/**
 * 工具查询过滤器
 */
export interface ToolQueryFilter {
  /** 按分类过滤 */
  categories?: ToolCategory[]

  /** 只返回已启用的工具 */
  enabledOnly?: boolean

  /** 只返回只读工具 */
  readonlyOnly?: boolean

  /** 按名称模糊匹配 */
  namePattern?: string
}
