/**
 * Agent 页面
 *
 * 路由: /agent
 * 功能: 与 Intelligent Agentic Agent 对话
 */

import AgentChatPanel from '@/components/agent/agent-chat-panel'

export const metadata = {
  title: 'AI 助手 - 生活管理系统',
  description: 'Intelligent Agentic AI Agent with 5-Node Architecture'
}

export default function AgentPage() {
  return <AgentChatPanel />
}
