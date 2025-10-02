import { LLMGenerateParams, LLMResponse, LLMStreamChunk } from './types'

/**
 * LLM Provider 接口
 * 定义所有 LLM 提供商必须实现的方法
 */
export interface LLMProvider {
  /**
   * 非流式文本生成
   */
  generateText(params: LLMGenerateParams): Promise<LLMResponse>

  /**
   * 流式文本生成
   */
  streamText(params: LLMGenerateParams): AsyncGenerator<LLMStreamChunk>
}
