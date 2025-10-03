/**
 * Schedule AI Agent 类型定义
 */

// 复用workspace的类型
export type { ExecutionPlan, ExecutionStep } from '../workspace/planner'
export type { ExecutionResult, ExecutionLog } from '../workspace/executor'

/**
 * 工具返回结果
 */
export interface ToolResult {
  success: boolean
  data?: any
  message?: string
  error?: string
}

/**
 * SSE事件类型
 */
export type SSEEventType =
  | 'thinking'           // Agent思考过程
  | 'tool_call'          // 工具调用
  | 'tool_result'        // 工具结果
  | 'message'            // Agent回复
  | 'plan'               // 执行计划
  | 'execution_complete' // 执行完成
  | 'error'              // 错误
  | 'content'            // 文本内容（兼容现有）
  | 'state_update'       // 状态更新（兼容现有）

/**
 * SSE事件数据
 */
export interface SSEEvent {
  type: SSEEventType
  content?: string
  data?: any
  done?: boolean
}

/**
 * Agent消息类型
 */
export interface AgentMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
  toolCalls?: ToolCall[]
  toolResults?: ToolResult[]
  timestamp?: string
}

/**
 * 工具调用信息
 */
export interface ToolCall {
  id: string
  name: string
  parameters: Record<string, any>
}

/**
 * Schedule查询参数
 */
export interface ScheduleQueryParams {
  startDate: string
  endDate: string
  status?: string[]
  taskId?: number
  categoryId?: number
}

/**
 * Task查询参数
 */
export interface TaskQueryParams {
  type?: 'routine' | 'long-term' | 'short-term'
  categoryId?: number
  parentId?: number
}

/**
 * 日程块创建参数
 */
export interface CreateScheduleBlockParams {
  type?: 'task' | 'event'
  taskId?: number
  title?: string
  date: string
  startTime: string
  endTime: string
  comment?: string
  categoryId?: number
}

/**
 * 日程块更新参数
 */
export interface UpdateScheduleBlockParams {
  blockId: number
  type?: 'task' | 'event'
  title?: string
  taskId?: number | null
  date?: string
  startTime?: string
  endTime?: string
  status?: 'scheduled' | 'in_progress' | 'partially_completed' | 'completed' | 'cancelled'
  comment?: string
  categoryId?: number
}
