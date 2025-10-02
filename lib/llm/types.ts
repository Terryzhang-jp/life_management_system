// LLM 消息类型
export interface LLMMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

// LLM 非流式响应
export interface LLMResponse {
  content: string
  finishReason: 'stop' | 'length' | 'error'
  usage?: {
    promptTokens: number
    completionTokens: number
    totalTokens: number
  }
}

// LLM 流式响应块
export interface LLMStreamChunk {
  content: string
  done: boolean
  toolCalls?: Array<{
    toolName: string
    args: any
  }>
}

// LLM 生成参数
export interface LLMGenerateParams {
  messages: LLMMessage[]
  temperature?: number
  maxTokens?: number
  tools?: Record<string, any>  // Vercel AI SDK tools 参数
}
