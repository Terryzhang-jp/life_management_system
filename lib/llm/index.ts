import { LLMProvider } from './provider'
import { VercelAIProvider } from './providers/vercel-ai'

// 导出类型
export * from './types'
export * from './provider'

/**
 * LLM Provider 配置
 */
export interface LLMConfig {
  type: 'vercel-ai' | 'custom'
  provider?: 'google' | 'openai' | 'anthropic'
  modelName?: string
  apiKey?: string
}

/**
 * 创建 LLM Provider 实例
 * 统一的工厂函数，方便未来切换实现
 */
export function createLLMProvider(config: LLMConfig): LLMProvider {
  switch(config.type) {
    case 'vercel-ai':
      if (!config.provider || !config.modelName) {
        throw new Error('Vercel AI provider requires provider and modelName')
      }
      return new VercelAIProvider(config.provider, config.modelName, config.apiKey)

    case 'custom':
      throw new Error('Custom LLM provider not yet implemented')

    default:
      throw new Error(`Unknown LLM type: ${config.type}`)
  }
}

/**
 * 默认配置：使用 Gemini 2.0 Flash
 */
export function createDefaultLLMProvider(): LLMProvider {
  // 读取环境变量中的 API Key
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY

  return createLLMProvider({
    type: 'vercel-ai',
    provider: 'google',
    modelName: 'gemini-2.5-flash',
    apiKey
  })
}
