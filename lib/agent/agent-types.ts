/**
 * Agent 类型定义
 *
 * 定义 Agent 系统中使用的所有类型接口
 */

import { BaseMessage } from '@langchain/core/messages'

/**
 * Agent 执行计划
 */
export interface AgentPlan {
  goal: string
  steps: Array<{
    description: string
    status: 'pending' | 'in_progress' | 'completed' | 'failed'
    result?: string
  }>
}

/**
 * 反思结果
 */
export interface ReflectionResult {
  quality: 'good' | 'needs_improvement'
  issues: string[]
  suggestions: string[]
}

/**
 * 工具调用信息
 */
export interface ToolCallInfo {
  name: string
  args: any
  result?: string
  timestamp?: string
}

/**
 * Agent 状态（用于 LangGraph StateGraph）
 */
export interface AgentState {
  messages: BaseMessage[]
  plan: AgentPlan | null
  thoughts: string[]
  reflectionResult: ReflectionResult | null
  learnings: string[]
  threadId: string
  toolCalls: ToolCallInfo[]
}

/**
 * Agent 响应结果
 */
export interface AgentResponse {
  reply: string
  plan?: AgentPlan
  reflection?: ReflectionResult
  learnings?: string[]
  thoughts?: string[]
  toolCalls?: ToolCallInfo[]
  allMessages?: BaseMessage[]
}

/**
 * 聊天消息（UI 使用）
 */
export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  plan?: AgentPlan
  reflection?: ReflectionResult
  learnings?: string[]
  thoughts?: string[]
  toolCalls?: ToolCallInfo[]
  timestamp?: string
}
