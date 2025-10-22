"use client"

import { useState, useEffect, useRef, useCallback } from 'react'
import {
  RecorderState,
  RecognitionProvider,
  UseSonioxRecorderOptions,
  UseSonioxRecorderReturn,
  SonioxPartialResult,
  SonioxToken
} from './types'

/**
 * Soniox 语音识别 React Hook（正确实现）
 *
 * 基于官方文档的正确方式：
 * 1. 只使用 onPartialResult 处理结果
 * 2. 移除 include_nonfinal（已废弃）和 onResult（不存在）
 * 3. 使用 is_final 区分历史和临时 tokens
 * 4. 可选显式传递 MediaStream
 */
export function useSonioxRecorder(options: UseSonioxRecorderOptions): UseSonioxRecorderReturn {
  const {
    apiKey,
    language = 'zh',
    onTranscriptUpdate,
    onError,
    enableFallback = true
  } = options

  // 状态
  const [state, setState] = useState<RecorderState>('idle')
  const [transcript, setTranscript] = useState('')
  const [interimTranscript, setInterimTranscript] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [provider, setProvider] = useState<RecognitionProvider>('none')

  // Refs
  const sonioxClientRef = useRef<any>(null)
  const recognitionRef = useRef<any>(null)
  const mediaStreamRef = useRef<MediaStream | null>(null)

  // 是否正在录音
  const isRecording = state === 'recording'

  // 初始化 Soniox（正确方式）
  useEffect(() => {
    if (typeof window === 'undefined') return

    const initSoniox = async () => {
      try {
        const { SonioxClient } = await import('@soniox/speech-to-text-web')

        if (!apiKey) {
          throw new Error('SONIOX_API_KEY 未配置')
        }

        // 正确的 SonioxClient 初始化
        const client = new SonioxClient({
          apiKey: apiKey,

          // ✅ 只在这里设置 onPartialResult（官方正确方式）
          onPartialResult: (result: SonioxPartialResult) => {
            console.log('📝 Partial result:', result)
            processTokens(result.tokens)
          },

          onError: (status: string, message: string) => {
            console.error('❌ Soniox error:', status, message)
            const errorMsg = `语音识别错误: ${message}`
            setError(errorMsg)
            setState('error')
            onError?.(new Error(errorMsg))

            // Fallback
            if (enableFallback && provider === 'soniox') {
              console.log('🔄 Soniox 失败，切换到 Web Speech API')
              fallbackToWebSpeech()
            }
          },

          onStateChange: (state: string) => {
            console.log('🔄 Soniox state change:', state)
          }
        })

        sonioxClientRef.current = client
        setProvider('soniox')
        console.log('✅ Soniox 客户端初始化成功')
      } catch (err: any) {
        console.error('❌ Soniox 初始化失败:', err)
        setError('Soniox 初始化失败')

        // 启用 fallback
        if (enableFallback) {
          console.log('🔄 尝试使用 Web Speech API')
          initWebSpeech()
        } else {
          setState('error')
        }
      }
    }

    initSoniox()

    return () => {
      // 清理资源
      if (sonioxClientRef.current) {
        try {
          sonioxClientRef.current.stop()
        } catch (e) {
          console.warn('清理 Soniox 客户端时出错:', e)
        }
      }
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop()
        } catch (e) {
          console.warn('清理 Web Speech 时出错:', e)
        }
      }
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(track => track.stop())
      }
    }
  }, [apiKey, enableFallback])

  // 处理 tokens（正确方式：按 is_final 区分）
  const processTokens = useCallback((tokens: SonioxToken[]) => {
    if (!tokens || tokens.length === 0) return

    const finalTokens: string[] = []
    let interimText = ''

    for (const token of tokens) {
      const text = token.text || ''

      // ✅ 只过滤 <fin> 标记，不过滤所有 <>
      if (text === '<fin>') {
        console.log('✅ 收到 finalization 标记')
        continue
      }

      // ✅ 按 is_final 区分历史和临时
      if (token.is_final) {
        finalTokens.push(text)
      } else {
        interimText += text
      }
    }

    // 更新历史 transcript（累加 final tokens）
    if (finalTokens.length > 0) {
      const finalText = finalTokens.join('')
      console.log('✅ Final tokens:', finalText)
      setTranscript(prev => prev + finalText)
    }

    // 更新临时 transcript（替换，不累加）
    console.log('💭 Interim text:', interimText)
    setInterimTranscript(interimText)

    // 触发回调
    onTranscriptUpdate?.(transcript, interimText)
  }, [transcript, onTranscriptUpdate])

  // 初始化 Web Speech API (fallback)
  const initWebSpeech = useCallback(() => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      setError('浏览器不支持语音识别')
      setState('error')
      setProvider('none')
      return
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    const recognition = new SpeechRecognition()

    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = language === 'zh' ? 'zh-CN' : 'en-US'

    recognition.onresult = (event: any) => {
      let finalText = ''
      let interimText = ''

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript
        if (event.results[i].isFinal) {
          finalText += transcript
        } else {
          interimText += transcript
        }
      }

      if (finalText) {
        setTranscript(prev => prev + finalText)
      }
      setInterimTranscript(interimText)

      onTranscriptUpdate?.(transcript, interimText)
    }

    recognition.onerror = (event: any) => {
      console.error('❌ Web Speech API 错误:', event.error)
      setError(`语音识别错误: ${event.error}`)
      setState('error')
    }

    recognitionRef.current = recognition
    setProvider('webspeech')
    console.log('✅ Web Speech API 初始化成功')
  }, [language, onTranscriptUpdate])

  // Fallback 到 Web Speech API
  const fallbackToWebSpeech = useCallback(() => {
    if (provider === 'webspeech' || !enableFallback) return
    initWebSpeech()
  }, [provider, enableFallback, initWebSpeech])

  // 开始录音（正确方式）
  const startRecording = useCallback(async () => {
    try {
      setError(null)
      setInterimTranscript('')
      setState('recording')

      if (provider === 'soniox' && sonioxClientRef.current) {
        // ✅ 简化配置：让 SDK 自己处理麦克风（不手动传 stream）
        console.log('🎤 开始 Soniox 录音（SDK 自动采麦）...')

        // ✅ 正确的 start 配置（让 SDK 自己采麦）
        await sonioxClientRef.current.start({
          model: 'stt-rt-preview',

          // ❌ 不传 stream，让 SDK 自己处理
          // stream: stream,

          // ✅ 使用驼峰命名
          languageHints: [language],  // 只用单语言试试
          // enableLanguageIdentification: false,  // 先禁用语言识别
          // enableEndpointDetection: false,  // 先禁用端点检测

          onStarted: () => {
            console.log('✅ Soniox 录音开始')
            setState('recording')
          },

          onFinished: () => {
            console.log('⏹️ Soniox 录音结束')
            setState('idle')
            setInterimTranscript('')
          }
        })

        console.log('✅ Soniox start 调用成功')
      } else if (provider === 'webspeech' && recognitionRef.current) {
        // 使用 Web Speech API
        recognitionRef.current.start()
        console.log('🎤 Web Speech API 录音开始')
      } else {
        throw new Error('语音识别未初始化')
      }
    } catch (err: any) {
      console.error('❌ 开始录音失败:', err)
      setError(`开始录音失败: ${err.message}`)
      setState('error')
      onError?.(err)
    }
  }, [provider, language, onError])

  // 停止录音（正确方式）
  const stopRecording = useCallback(() => {
    try {
      if (provider === 'soniox' && sonioxClientRef.current) {
        // ✅ 使用 stop() 优雅等待所有 final tokens
        sonioxClientRef.current.stop()
        console.log('⏹️ 停止 Soniox 录音')
      } else if (provider === 'webspeech' && recognitionRef.current) {
        recognitionRef.current.stop()
        console.log('⏹️ 停止 Web Speech API 录音')
      }

      // 停止麦克风
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(track => track.stop())
        mediaStreamRef.current = null
      }

      setState('idle')
      // 清空临时文本
      setInterimTranscript('')
    } catch (err: any) {
      console.error('❌ 停止录音失败:', err)
    }
  }, [provider])

  // 手动触发 finalization（正确方式）
  const finalize = useCallback(() => {
    if (provider === 'soniox' && sonioxClientRef.current && isRecording) {
      try {
        // ✅ 使用 finalize() 立即把 non-final 变成 final
        sonioxClientRef.current.finalize()
        console.log('✅ 手动 finalization 触发')
      } catch (err) {
        console.error('❌ Finalization 失败:', err)
      }
    }
  }, [provider, isRecording])

  // 清空转录文本
  const clearTranscript = useCallback(() => {
    setTranscript('')
    setInterimTranscript('')
  }, [])

  // 重置错误
  const resetError = useCallback(() => {
    setError(null)
    if (state === 'error') {
      setState('idle')
    }
  }, [state])

  return {
    state,
    isRecording,
    transcript,
    interimTranscript,
    error,
    provider,
    startRecording,
    stopRecording,
    finalize,
    clearTranscript,
    resetError
  }
}
