import { generateText, streamText } from 'ai'
import { google } from '@ai-sdk/google'
import { LLMProvider } from '../provider'
import { LLMGenerateParams, LLMResponse, LLMStreamChunk } from '../types'

/**
 * Vercel AI SDK Provider 实现
 * 支持 Google, OpenAI, Anthropic 等多个提供商
 */
export class VercelAIProvider implements LLMProvider {
  private model: any

  constructor(provider: 'google' | 'openai' | 'anthropic', modelName: string, apiKey?: string) {
    switch(provider) {
      case 'google':
        // @ai-sdk/google 2.0 只支持从环境变量读取 API key
        // API key 会自动从 GOOGLE_GENERATIVE_AI_API_KEY 或 GEMINI_API_KEY 读取
        this.model = google(modelName)
        break
      // 未来扩展 OpenAI, Anthropic
      case 'openai':
        throw new Error('OpenAI provider not yet implemented')
      case 'anthropic':
        throw new Error('Anthropic provider not yet implemented')
      default:
        throw new Error(`Unknown provider: ${provider}`)
    }
  }

  /**
   * 非流式生成
   */
  async generateText(params: LLMGenerateParams): Promise<LLMResponse> {
    try {
      const result = await generateText({
        model: this.model,
        messages: params.messages.map(msg => ({
          role: msg.role,
          content: msg.content
        })),
        temperature: params.temperature || 0.7,
        maxOutputTokens: params.maxTokens || 2048
      })

      return {
        content: result.text,
        finishReason: 'stop',
        usage: {
          promptTokens: result.usage.inputTokens ?? 0,
          completionTokens: result.usage.outputTokens ?? 0,
          totalTokens: result.usage.totalTokens ?? 0
        }
      }
    } catch (error: any) {
      console.error('LLM generateText error:', error)
      return {
        content: '',
        finishReason: 'error'
      }
    }
  }

  /**
   * 流式生成
   */
  async *streamText(params: LLMGenerateParams): AsyncGenerator<LLMStreamChunk> {
    try {
      const result = streamText({
        model: this.model,
        messages: params.messages.map(msg => ({
          role: msg.role,
          content: msg.content
        })),
        temperature: params.temperature || 0.7,
        maxOutputTokens: params.maxTokens || 2048,
        tools: params.tools  // 传递工具参数
      })

      // 遍历流式响应
      for await (const chunk of result.textStream) {
        yield {
          content: chunk,
          done: false
        }
      }

      // 等待并处理工具调用
      const finalResult = await result
      const toolCalls = await finalResult.toolCalls
      if (toolCalls && toolCalls.length > 0) {
        yield {
          content: '',
          done: false,
          toolCalls: toolCalls.map((call: any) => ({
            toolName: call.toolName,
            args: call.args
          }))
        }
      }

      // 发送结束信号
      yield {
        content: '',
        done: true
      }
    } catch (error: any) {
      console.error('LLM streamText error:', error)
      yield {
        content: '',
        done: true
      }
    }
  }
}
