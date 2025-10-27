/**
 * Agent 工具系统 - 注册中心
 *
 * 管理所有工具的注册、查询、过滤
 * 提供统一的工具访问接口
 */

import type { DynamicStructuredTool } from '@langchain/core/tools'
import type {
  ToolCategory,
  RegisteredTool,
  ToolMetadata,
  ToolRegistrationOptions,
  ToolQueryFilter,
} from './types'
import { ToolCategoryPriority } from './categories'

/**
 * 工具注册中心
 * 单例模式，全局唯一实例
 */
export class ToolRegistry {
  private static instance: ToolRegistry | null = null
  private tools: Map<string, RegisteredTool> = new Map()

  private constructor() {
    // 私有构造函数，强制使用 getInstance()
  }

  /**
   * 获取注册中心实例（单例）
   */
  public static getInstance(): ToolRegistry {
    if (!ToolRegistry.instance) {
      ToolRegistry.instance = new ToolRegistry()
    }
    return ToolRegistry.instance
  }

  /**
   * 注册单个工具
   *
   * @param tool - LangChain 工具实例
   * @param metadata - 工具元数据
   * @param options - 注册选项
   * @returns 是否注册成功
   */
  public register(
    tool: DynamicStructuredTool,
    metadata: ToolMetadata,
    options: ToolRegistrationOptions = {}
  ): boolean {
    const { overwrite = false, validate = true } = options
    const toolName = tool.name

    // 检查工具是否已存在
    if (this.tools.has(toolName) && !overwrite) {
      console.warn(`[ToolRegistry] 工具 "${toolName}" 已存在，跳过注册`)
      return false
    }

    // 验证工具（可选）
    if (validate) {
      if (!toolName || toolName.trim().length === 0) {
        console.error('[ToolRegistry] 工具名称不能为空')
        return false
      }

      if (!metadata.category) {
        console.error(`[ToolRegistry] 工具 "${toolName}" 缺少分类`)
        return false
      }
    }

    // 注册工具
    this.tools.set(toolName, { tool, metadata })

    if (process.env.NODE_ENV === 'development') {
      console.log(
        `[ToolRegistry] ✅ 注册工具: ${toolName} (${metadata.category})`
      )
    }

    return true
  }

  /**
   * 批量注册工具
   *
   * @param tools - 工具列表
   * @param category - 统一分类（可选）
   * @param options - 注册选项
   * @returns 成功注册的工具数量
   */
  public registerBatch(
    tools: Array<{ tool: DynamicStructuredTool; metadata: ToolMetadata }>,
    options: ToolRegistrationOptions = {}
  ): number {
    let successCount = 0

    for (const { tool, metadata } of tools) {
      if (this.register(tool, metadata, options)) {
        successCount++
      }
    }

    if (process.env.NODE_ENV === 'development') {
      console.log(
        `[ToolRegistry] 批量注册完成: ${successCount}/${tools.length} 个工具`
      )
    }

    return successCount
  }

  /**
   * 注册一个分类的所有工具
   *
   * @param category - 工具分类
   * @param tools - 工具数组（包含 tool 和 metadata）
   * @param options - 注册选项
   */
  public registerCategory(
    category: ToolCategory,
    tools: Array<{ tool: DynamicStructuredTool; metadata: Omit<ToolMetadata, 'category'> }>,
    options: ToolRegistrationOptions = {}
  ): number {
    const toolsWithCategory = tools.map(({ tool, metadata }) => ({
      tool,
      metadata: { ...metadata, category },
    }))

    return this.registerBatch(toolsWithCategory, options)
  }

  /**
   * 获取单个工具
   *
   * @param name - 工具名称
   * @returns 工具实例，如果不存在则返回 null
   */
  public getTool(name: string): DynamicStructuredTool | null {
    const registered = this.tools.get(name)
    return registered ? registered.tool : null
  }

  /**
   * 获取工具的元数据
   *
   * @param name - 工具名称
   * @returns 工具元数据，如果不存在则返回 null
   */
  public getMetadata(name: string): ToolMetadata | null {
    const registered = this.tools.get(name)
    return registered ? registered.metadata : null
  }

  /**
   * 查询工具（支持过滤）
   *
   * @param filter - 查询过滤器
   * @returns 符合条件的工具数组
   */
  public query(filter: ToolQueryFilter = {}): DynamicStructuredTool[] {
    const {
      categories,
      enabledOnly = true,
      readonlyOnly,
      namePattern,
    } = filter

    let results = Array.from(this.tools.values())

    // 按分类过滤
    if (categories && categories.length > 0) {
      results = results.filter(({ metadata }) =>
        categories.includes(metadata.category)
      )
    }

    // 按启用状态过滤
    if (enabledOnly) {
      results = results.filter(
        ({ metadata }) => metadata.enabled !== false
      )
    }

    // 按只读属性过滤
    if (readonlyOnly !== undefined) {
      results = results.filter(
        ({ metadata }) => metadata.readonly === readonlyOnly
      )
    }

    // 按名称模式过滤
    if (namePattern) {
      const pattern = new RegExp(namePattern, 'i')
      results = results.filter(({ tool }) => pattern.test(tool.name))
    }

    // 按分类优先级排序
    results.sort((a, b) => {
      const priorityA = ToolCategoryPriority[a.metadata.category] || 999
      const priorityB = ToolCategoryPriority[b.metadata.category] || 999
      return priorityA - priorityB
    })

    return results.map(({ tool }) => tool)
  }

  /**
   * 获取所有工具（已启用）
   *
   * @returns 所有已启用的工具数组
   */
  public getAllTools(): DynamicStructuredTool[] {
    return this.query({ enabledOnly: true })
  }

  /**
   * 获取指定分类的所有工具
   *
   * @param category - 工具分类
   * @returns 该分类的所有工具
   */
  public getToolsByCategory(
    category: ToolCategory
  ): DynamicStructuredTool[] {
    return this.query({ categories: [category] })
  }

  /**
   * 获取多个分类的工具
   *
   * @param categories - 分类数组
   * @returns 这些分类的所有工具
   */
  public getToolsByCategories(
    categories: ToolCategory[]
  ): DynamicStructuredTool[] {
    return this.query({ categories })
  }

  /**
   * 检查工具是否已注册
   *
   * @param name - 工具名称
   * @returns 是否已注册
   */
  public has(name: string): boolean {
    return this.tools.has(name)
  }

  /**
   * 注销工具
   *
   * @param name - 工具名称
   * @returns 是否注销成功
   */
  public unregister(name: string): boolean {
    const existed = this.tools.has(name)
    this.tools.delete(name)

    if (existed && process.env.NODE_ENV === 'development') {
      console.log(`[ToolRegistry] 🗑️  注销工具: ${name}`)
    }

    return existed
  }

  /**
   * 清空所有工具
   */
  public clear(): void {
    this.tools.clear()

    if (process.env.NODE_ENV === 'development') {
      console.log('[ToolRegistry] 🧹 清空所有工具')
    }
  }

  /**
   * 获取注册统计信息
   *
   * @returns 统计信息对象
   */
  public getStats(): {
    total: number
    enabled: number
    disabled: number
    byCategory: Record<ToolCategory, number>
  } {
    const allTools = Array.from(this.tools.values())

    const stats = {
      total: allTools.length,
      enabled: allTools.filter(({ metadata }) => metadata.enabled !== false)
        .length,
      disabled: allTools.filter(({ metadata }) => metadata.enabled === false)
        .length,
      byCategory: {} as Record<ToolCategory, number>,
    }

    // 统计每个分类的工具数量
    for (const { metadata } of allTools) {
      const category = metadata.category
      stats.byCategory[category] = (stats.byCategory[category] || 0) + 1
    }

    return stats
  }

  /**
   * 打印注册信息（调试用）
   */
  public printRegistry(): void {
    const stats = this.getStats()

    console.log('\n📊 [ToolRegistry] 工具注册统计:')
    console.log(`   总计: ${stats.total} 个工具`)
    console.log(`   启用: ${stats.enabled} 个`)
    console.log(`   禁用: ${stats.disabled} 个`)
    console.log('\n   按分类统计:')

    for (const [category, count] of Object.entries(stats.byCategory)) {
      console.log(`   - ${category}: ${count} 个工具`)
    }

    console.log('\n   工具列表:')
    for (const [name, { metadata }] of this.tools) {
      const status = metadata.enabled === false ? '❌' : '✅'
      const readonly = metadata.readonly ? '[只读]' : ''
      console.log(
        `   ${status} ${name} (${metadata.category}) ${readonly}`
      )
    }
    console.log('')
  }
}

/**
 * 导出全局单例实例
 */
export const toolRegistry = ToolRegistry.getInstance()
