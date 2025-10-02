import { z } from 'zod'

/**
 * 简化的任务工具schema（无describe，用于测试）
 */

export const SimpleCreateTaskSchema = z.object({
  type: z.enum(['routine', 'long-term', 'short-term']),
  level: z.enum(['main', 'sub', 'subsub']),
  title: z.string(),
  description: z.string().optional(),
  priority: z.number().min(1).max(5).optional(),
  parentId: z.number().optional(),
  deadline: z.string().optional(),
})

export const SimpleUpdateTaskSchema = z.object({
  id: z.number(),
  title: z.string().optional(),
  description: z.string().optional(),
  priority: z.number().min(1).max(5).optional(),
  deadline: z.string().optional(),
  isUnclear: z.boolean().optional(),
  unclearReason: z.string().optional(),
})
