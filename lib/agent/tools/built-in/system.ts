/**
 * Agent 工具系统 - 系统工具
 *
 * 提供系统级功能（时间、日期等）
 */

import { tool } from '@langchain/core/tools'
import { z } from 'zod'
import type { ToolMetadata } from '../types'
import type { DynamicStructuredTool } from '@langchain/core/tools'
import { toolRegistry } from '../registry'

/**
 * 获取当前时间工具
 */
export const getCurrentTimeTool = tool(
  async () => {
    const now = new Date()
    const timeString = now.toLocaleString('zh-CN', {
      timeZone: 'Asia/Shanghai',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      weekday: 'long',
    })
    return `当前时间: ${timeString}`
  },
  {
    name: 'getCurrentTime',
    description: '获取当前日期和时间（北京时间）',
    schema: z.object({}),
  }
)

/**
 * 获取当前日期工具
 */
export const getCurrentDateTool = tool(
  async () => {
    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const day = String(now.getDate()).padStart(2, '0')
    const weekday = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][
      now.getDay()
    ]
    return `今天是 ${year}-${month}-${day} ${weekday}`
  },
  {
    name: 'getCurrentDate',
    description: '获取当前日期（YYYY-MM-DD 格式）',
    schema: z.object({}),
  }
)

/**
 * 计算日期差工具
 */
export const dateDifferenceTool = tool(
  async ({ date1, date2 }: { date1: string; date2: string }) => {
    try {
      const d1 = new Date(date1)
      const d2 = new Date(date2)

      if (isNaN(d1.getTime()) || isNaN(d2.getTime())) {
        return '错误: 日期格式不正确，请使用 YYYY-MM-DD 格式'
      }

      const diffTime = Math.abs(d2.getTime() - d1.getTime())
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

      return `日期差: ${date1} 和 ${date2} 相差 ${diffDays} 天`
    } catch (error) {
      return `错误: 无法计算日期差 - ${error instanceof Error ? error.message : String(error)}`
    }
  },
  {
    name: 'dateDifference',
    description: '计算两个日期之间相差的天数',
    schema: z.object({
      date1: z.string().describe('第一个日期 (YYYY-MM-DD)'),
      date2: z.string().describe('第二个日期 (YYYY-MM-DD)'),
    }),
  }
)

/**
 * 获取工具文档元工具
 *
 * Agent 在调用工具前可以使用此工具查询参数要求
 * 实现 Progressive Disclosure - 按需加载文档
 */
export const getToolDocumentationTool = tool(
  async ({ toolName }: { toolName: string }) => {
    try {
      // 从 registry 获取工具元数据
      const metadata = toolRegistry.getMetadata(toolName)

      if (!metadata) {
        return `错误: 未找到工具 "${toolName}"。请确认工具名称正确。`
      }

      // 构造文档内容
      let doc = `# ${metadata.displayName}\n\n`
      doc += `**描述**: ${metadata.description}\n\n`

      // 参数文档
      if (metadata.parameters && metadata.parameters.length > 0) {
        doc += `## 参数要求\n\n`

        metadata.parameters.forEach(param => {
          doc += `### ${param.name}\n`
          doc += `- **重要性**: ${param.importance}\n`
          doc += `- **必需**: ${param.required ? '是' : '否'}\n`

          if (param.hasDefault) {
            doc += `- **默认值**: ${param.defaultDescription || '有默认值'}\n`
          }

          doc += `- **缺失时处理**: ${param.onMissing}\n`

          if (param.onMissing === 'ask_user' && param.clarificationPrompt) {
            doc += `- **询问提示**: ${param.clarificationPrompt}\n`
          }

          if (param.explanation) {
            doc += `- **说明**: ${param.explanation}\n`
          }

          doc += `\n`
        })
      } else {
        doc += `## 参数要求\n\n该工具暂无详细参数文档。\n`
      }

      return doc
    } catch (error) {
      return `错误: 无法获取工具文档 - ${error instanceof Error ? error.message : String(error)}`
    }
  },
  {
    name: 'getToolDocumentation',
    description: '查询指定工具的详细参数要求和使用说明。在调用工具前，如果不确定参数如何填写，请先使用此工具获取文档。',
    schema: z.object({
      toolName: z.string().describe('要查询的工具名称（如 "createScheduleBlock"）'),
    }),
  }
)

/**
 * 获取所有系统工具及其元数据
 */
export function getSystemTools(): Array<{
  tool: DynamicStructuredTool
  metadata: Omit<ToolMetadata, 'category'>
}> {
  return [
    {
      tool: getCurrentTimeTool,
      metadata: {
        displayName: '获取当前时间',
        description: '获取当前日期和时间（北京时间）',
        readonly: true,
        version: '1.0.0',
      },
    },
    {
      tool: getCurrentDateTool,
      metadata: {
        displayName: '获取当前日期',
        description: '获取当前日期（YYYY-MM-DD 格式）',
        readonly: true,
        version: '1.0.0',
      },
    },
    {
      tool: dateDifferenceTool,
      metadata: {
        displayName: '计算日期差',
        description: '计算两个日期之间相差的天数',
        readonly: true,
        version: '1.0.0',
      },
    },
    {
      tool: getToolDocumentationTool,
      metadata: {
        displayName: '获取工具文档',
        description: '查询指定工具的详细参数要求和使用说明',
        readonly: true,
        version: '1.0.0',
      },
    },
  ]
}
