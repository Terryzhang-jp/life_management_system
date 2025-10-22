/**
 * useSonioxRecorderWS - 基于 WebSocket 的语音识别 Hook
 *
 * 完全重写，使用 WebSocket 直连方式（参考成功的实现文档）
 */

"use client"

import { useState, useRef, useCallback, useEffect } from 'react'
import { AudioRecorder } from '@/lib/audio/recorder'
import { SonioxWSClient } from './ws-client'
import {
  RecorderState,
  RecognitionProvider,
  UseSonioxRecorderOptions,
  UseSonioxRecorderReturn,
  SonioxMessage,
  WSState,
  SonioxToken,
} from './ws-types'

export function useSonioxRecorderWS(options: UseSonioxRecorderOptions): UseSonioxRecorderReturn {
  const {
    language = 'zh',
    enableTranslation = false,
    targetLanguage = 'en',
    enableSpeakerDiarization = false,
    onTranscriptUpdate,
    onError,
    enableFallback = true,
  } = options

  // 状态
  const [state, setState] = useState<RecorderState>('idle')
  const [transcript, setTranscript] = useState('')
  const [interimTranscript, setInterimTranscript] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [provider, setProvider] = useState<RecognitionProvider>('none')

  // Refs
  const audioRecorderRef = useRef<AudioRecorder | null>(null)
  const wsClientRef = useRef<SonioxWSClient | null>(null)
  const recognitionRef = useRef<any>(null) // Web Speech API fallback
  const selectedDeviceIdRef = useRef<string | undefined>(undefined)

  const isRecording = state === 'recording'

  // 清理资源
  useEffect(() => {
    return () => {
      if (audioRecorderRef.current) {
        audioRecorderRef.current.stop()
      }
      if (wsClientRef.current) {
        wsClientRef.current.close()
      }
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop()
        } catch (e) {
          // ignore
        }
      }
    }
  }, [])

  // 处理 Soniox WebSocket 消息
  const handleMessage = useCallback((message: SonioxMessage) => {
    let finalChunk = ''
    let nonFinalText = ''

    for (const token of message.tokens || []) {
      const isFinal = token.is_final ?? token.final ?? false
      const tokenText = token.text ?? ''

      // 过滤 <fin> 标记
      if (tokenText === '<fin>') continue

      // 只处理原文（不处理翻译）
      if (token.translation_status === 'translation') continue

      if (isFinal) {
        finalChunk += tokenText
      } else {
        nonFinalText += tokenText
      }
    }

    // 更新 final transcript（累加）
    if (finalChunk) {
      setTranscript(prev => prev + finalChunk)
    }

    // 更新 interim transcript（替换）
    setInterimTranscript(nonFinalText)

    // 触发回调
    if (onTranscriptUpdate) {
      onTranscriptUpdate(transcript + finalChunk, nonFinalText)
    }
  }, [transcript, onTranscriptUpdate])

  // 处理 WebSocket 状态变化
  const handleStateChange = useCallback((wsState: WSState) => {
    if (wsState === WSState.STREAMING) {
      setState('recording')
    } else if (wsState === WSState.CLOSED || wsState === WSState.ERROR) {
      setState('idle')
    }
  }, [])

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
    recognition.lang = language === 'zh' ? 'zh-CN' : language === 'ja' ? 'ja-JP' : 'en-US'

    recognition.onresult = (event: any) => {
      let finalText = ''
      let interimText = ''

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcriptText = event.results[i][0].transcript
        if (event.results[i].isFinal) {
          finalText += transcriptText
        } else {
          interimText += transcriptText
        }
      }

      if (finalText) {
        setTranscript(prev => prev + finalText)
      }
      setInterimTranscript(interimText)

      if (onTranscriptUpdate) {
        onTranscriptUpdate(transcript, interimText)
      }
    }

    recognition.onerror = (event: any) => {
      setError(`语音识别错误: ${event.error}`)
      setState('error')
    }

    recognitionRef.current = recognition
    setProvider('webspeech')
  }, [language, transcript, onTranscriptUpdate])

  // Fallback 到 Web Speech API
  const fallbackToWebSpeech = useCallback(() => {
    if (provider === 'webspeech' || !enableFallback) return
    initWebSpeech()
  }, [provider, enableFallback, initWebSpeech])

  // 处理错误
  const handleError = useCallback((err: Error) => {
    setError(err.message)
    setState('error')

    if (onError) {
      onError(err)
    }

    // Fallback 到 Web Speech API
    if (enableFallback && provider === 'soniox-ws') {
      fallbackToWebSpeech()
    }
  }, [enableFallback, provider, onError, fallbackToWebSpeech])

  // 开始录音（WebSocket 方式）
  const startRecording = useCallback(async () => {
    try {
      setError(null)
      setInterimTranscript('')
      setState('recording')

      // 1. 获取临时 API Key
      const response = await fetch('/api/soniox-temp-key', { method: 'POST' })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || '获取临时 API Key 失败')
      }

      const { apiKey: tempApiKey } = await response.json()

      // 2. 创建 WebSocket 客户端
      wsClientRef.current = new SonioxWSClient(
        handleMessage,
        handleStateChange,
        handleError
      )

      // 3. 连接 WebSocket 并发送配置
      await wsClientRef.current.connect({
        api_key: tempApiKey,
        model: 'stt-rt-preview',
        audio_format: 'auto',
        enable_language_identification: true,
        language_hints: [language],
        enable_speaker_diarization: enableSpeakerDiarization,
        ...(enableTranslation && {
          translation: {
            type: 'one_way',
            target_language: targetLanguage,
          }
        })
      })

      setProvider('soniox-ws')

      // 4. 启动音频录制（使用选定的设备）
      audioRecorderRef.current = new AudioRecorder()
      await audioRecorderRef.current.start(
        (audioData) => {
          // 每 250ms 将音频数据发送到 WebSocket
          if (wsClientRef.current) {
            wsClientRef.current.sendAudio(audioData)
          }
        },
        selectedDeviceIdRef.current  // 传递设备ID
      )

    } catch (err: any) {
      setError(`启动录音失败: ${err.message}`)
      setState('error')

      if (onError) {
        onError(err)
      }

      // 尝试 fallback
      if (enableFallback) {
        try {
          initWebSpeech()
          if (recognitionRef.current) {
            recognitionRef.current.start()
          }
        } catch (fallbackErr) {
          // Fallback 也失败了
        }
      }
    }
  }, [
    language,
    enableTranslation,
    targetLanguage,
    enableSpeakerDiarization,
    enableFallback,
    handleMessage,
    handleStateChange,
    handleError,
    initWebSpeech,
    onError,
  ])

  // 停止录音
  const stopRecording = useCallback(() => {
    try {
      if (provider === 'soniox-ws') {
        // 停止音频录制
        if (audioRecorderRef.current) {
          audioRecorderRef.current.stop()
          audioRecorderRef.current = null
        }

        // 发送 finalize 消息
        if (wsClientRef.current) {
          wsClientRef.current.finalize()
        }
      } else if (provider === 'webspeech') {
        if (recognitionRef.current) {
          recognitionRef.current.stop()
        }
      }

      setState('idle')
      setInterimTranscript('')

    } catch (err: any) {
      console.error('停止录音失败:', err)
    }
  }, [provider])

  // 手动触发 finalization
  const finalize = useCallback(() => {
    if (provider === 'soniox-ws' && wsClientRef.current && isRecording) {
      wsClientRef.current.finalize()
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

  // 设置麦克风设备
  const setMicrophoneDevice = useCallback((deviceId: string | undefined) => {
    selectedDeviceIdRef.current = deviceId
  }, [])

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
    resetError,
    setMicrophoneDevice,
  }
}
