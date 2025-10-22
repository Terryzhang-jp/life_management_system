/**
 * Soniox WebSocket API 类型定义
 * 基于官方文档: https://soniox.com/docs/websocket
 */

// WebSocket 状态
export enum WSState {
  IDLE = 'idle',
  CONNECTING = 'connecting',
  STREAMING = 'streaming',
  FINALIZING = 'finalizing',
  CLOSED = 'closed',
  ERROR = 'error',
}

// Soniox 配置对象（发送到 WebSocket 的第一条消息）
export interface SonioxConfig {
  api_key: string
  model: string // 'stt-rt-preview'
  audio_format?: string // 'auto' | 'opus' | 'pcm_s16le'
  enable_language_identification?: boolean
  language_hints?: string[] // ['zh', 'en', 'ja']
  enable_speaker_diarization?: boolean
  translation?: {
    type: 'one_way' | 'two_way'
    target_language: string // 'en' | 'zh' | 'ja'
  }
}

// Token 结构
export interface SonioxToken {
  text: string
  is_final?: boolean
  final?: boolean // 兼容旧字段
  translation_status?: 'original' | 'translation'
  language?: string
  speaker?: number
  start_ms?: number
  duration_ms?: number
}

// WebSocket 接收的消息
export interface SonioxMessage {
  tokens: SonioxToken[]
  finished?: boolean
  final_audio_proc_ms?: number
  total_audio_proc_ms?: number
}

// Finalize 消息
export interface FinalizeMessage {
  type: 'finalize'
}

// 录音状态
export type RecorderState = 'idle' | 'recording' | 'processing' | 'error'

// 识别引擎提供者
export type RecognitionProvider = 'soniox-ws' | 'webspeech' | 'none'

// Hook 配置选项
export interface UseSonioxRecorderOptions {
  apiKey?: string // 如果不传，会自动请求临时key
  language?: 'zh' | 'en' | 'ja' | string
  enableTranslation?: boolean
  targetLanguage?: 'en' | 'zh' | 'ja'
  enableSpeakerDiarization?: boolean
  onTranscriptUpdate?: (finalText: string, interimText: string) => void
  onError?: (error: Error) => void
  enableFallback?: boolean
}

// Hook 返回值
export interface UseSonioxRecorderReturn {
  state: RecorderState
  isRecording: boolean
  transcript: string
  interimTranscript: string
  error: string | null
  provider: RecognitionProvider
  startRecording: () => Promise<void>
  stopRecording: () => void
  finalize: () => void
  clearTranscript: () => void
  resetError: () => void
  setMicrophoneDevice: (deviceId: string | undefined) => void
}
