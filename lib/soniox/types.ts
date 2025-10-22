/**
 * Soniox 语音识别 TypeScript 类型定义
 */

// Token 结构（基于 Soniox 官方文档）
export interface SonioxToken {
  text: string
  is_final: boolean
  start_ms?: number
  duration_ms?: number
}

// 部分结果（Partial Result）
export interface SonioxPartialResult {
  tokens: SonioxToken[]
  final_audio_proc_ms: number
  total_audio_proc_ms: number
}

// 录音状态
export type RecorderState = 'idle' | 'recording' | 'processing' | 'error'

// 识别引擎提供者
export type RecognitionProvider = 'soniox' | 'webspeech' | 'none'

// Hook 配置选项
export interface UseSonioxRecorderOptions {
  apiKey: string
  language?: 'zh' | 'en' | string  // 默认中文 'zh'
  includeNonfinal?: boolean        // 是否包含非最终 tokens，默认 true
  onTranscriptUpdate?: (finalText: string, interimText: string) => void
  onError?: (error: Error) => void
  enableFallback?: boolean         // 是否启用 Web Speech API fallback，默认 true
}

// Hook 返回值
export interface UseSonioxRecorderReturn {
  // 状态
  state: RecorderState
  isRecording: boolean
  transcript: string          // 最终确定的文本
  interimTranscript: string   // 临时文本（非最终）
  error: string | null
  provider: RecognitionProvider  // 当前使用的识别引擎

  // 方法
  startRecording: () => Promise<void>
  stopRecording: () => void
  finalize: () => void        // 手动触发 finalization
  clearTranscript: () => void
  resetError: () => void
}

// Soniox Client 配置（与官方 SDK 对应）
export interface SonioxClientConfig {
  apiKey: string
  onError?: (status: string, message: string) => void
  onPartialResult?: (result: SonioxPartialResult) => void
  onStateChange?: (state: string) => void
}

// Soniox start() 方法配置
export interface SonioxStartConfig {
  model: string
  languageHints?: string[]
  include_nonfinal?: boolean
  enableEndpointDetection?: boolean
  onStarted?: () => void
  onFinished?: () => void
  onResult?: (result: SonioxPartialResult) => void
  onError?: (status: string, message: string) => void
}
