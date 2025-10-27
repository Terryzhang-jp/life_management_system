/**
 * Agent 工具系统 - 计算工具
 *
 * 提供基础数学计算功能
 */

import { tool } from '@langchain/core/tools'
import { z } from 'zod'
import type { ToolMetadata } from '../types'
import type { DynamicStructuredTool } from '@langchain/core/tools'

/**
 * 加法工具
 */
export const addTool = tool(
  async ({ a, b }: { a: number; b: number }) => {
    const result = a + b
    return `计算结果: ${a} + ${b} = ${result}`
  },
  {
    name: 'add',
    description: '计算两个数字的和',
    schema: z.object({
      a: z.number().describe('第一个数字'),
      b: z.number().describe('第二个数字'),
    }),
  }
)

/**
 * 减法工具
 */
export const subtractTool = tool(
  async ({ a, b }: { a: number; b: number }) => {
    const result = a - b
    return `计算结果: ${a} - ${b} = ${result}`
  },
  {
    name: 'subtract',
    description: '计算两个数字的差',
    schema: z.object({
      a: z.number().describe('被减数'),
      b: z.number().describe('减数'),
    }),
  }
)

/**
 * 乘法工具
 */
export const multiplyTool = tool(
  async ({ a, b }: { a: number; b: number }) => {
    const result = a * b
    return `计算结果: ${a} × ${b} = ${result}`
  },
  {
    name: 'multiply',
    description: '计算两个数字的乘积',
    schema: z.object({
      a: z.number().describe('第一个数字'),
      b: z.number().describe('第二个数字'),
    }),
  }
)

/**
 * 除法工具
 */
export const divideTool = tool(
  async ({ a, b }: { a: number; b: number }) => {
    if (b === 0) {
      return '错误: 除数不能为零'
    }
    const result = a / b
    return `计算结果: ${a} ÷ ${b} = ${result}`
  },
  {
    name: 'divide',
    description: '计算两个数字的商',
    schema: z.object({
      a: z.number().describe('被除数'),
      b: z.number().describe('除数（不能为0）'),
    }),
  }
)

/**
 * 获取所有计算工具及其元数据
 */
export function getCalculationTools(): Array<{
  tool: DynamicStructuredTool
  metadata: Omit<ToolMetadata, 'category'>
}> {
  return [
    {
      tool: addTool,
      metadata: {
        displayName: '加法',
        description: '计算两个数字的和',
        readonly: true,
        version: '1.0.0',
      },
    },
    {
      tool: subtractTool,
      metadata: {
        displayName: '减法',
        description: '计算两个数字的差',
        readonly: true,
        version: '1.0.0',
      },
    },
    {
      tool: multiplyTool,
      metadata: {
        displayName: '乘法',
        description: '计算两个数字的乘积',
        readonly: true,
        version: '1.0.0',
      },
    },
    {
      tool: divideTool,
      metadata: {
        displayName: '除法',
        description: '计算两个数字的商',
        readonly: true,
        version: '1.0.0',
      },
    },
  ]
}
