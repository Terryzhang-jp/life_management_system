"use client"

import { useState, useEffect } from 'react'
import { Mic, MicOff, Check } from 'lucide-react'
import { Button } from './button'
import { cn } from '@/lib/utils'
import { useSonioxRecorderWS } from '@/lib/soniox/useSonioxRecorderWS'
import { AudioRecorder } from '@/lib/audio/recorder'

interface VoiceRecorderProps {
  apiKey?: string  // 现在是可选的，不传会自动获取临时key
  language?: 'zh' | 'en' | 'ja'
  onTranscriptComplete: (text: string) => void
  placeholder?: string
  className?: string
  showManualFinalize?: boolean  // 是否显示手动完成按钮
}

/**
 * 可复用的语音录制组件
 *
 * 功能：
 * - 录音控制（开始/停止）
 * - 实时显示 final 和 interim transcript
 * - 手动完成按钮
 * - 错误提示
 * - 自动 fallback 到 Web Speech API
 */
export default function VoiceRecorder({
  apiKey,
  language = 'zh',
  onTranscriptComplete,
  placeholder = '您的语音会实时显示在这里...',
  className,
  showManualFinalize = true
}: VoiceRecorderProps) {
  const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([])
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('')

  const {
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
    setMicrophoneDevice
  } = useSonioxRecorderWS({
    apiKey,  // 可选，不传会自动获取临时key
    language,
    enableFallback: true
  })

  // 加载可用的音频设备
  useEffect(() => {
    const loadDevices = async () => {
      const devices = await AudioRecorder.getAudioDevices()
      setAudioDevices(devices)

      // 默认选择第一个设备
      if (devices.length > 0 && !selectedDeviceId) {
        const defaultDevice = devices[0].deviceId
        setSelectedDeviceId(defaultDevice)
        setMicrophoneDevice(defaultDevice)
      }
    }

    loadDevices()
  }, [])

  // 处理设备切换
  const handleDeviceChange = (deviceId: string) => {
    setSelectedDeviceId(deviceId)
    setMicrophoneDevice(deviceId || undefined)
    console.log('🎤 用户选择设备:', deviceId)
  }

  const handleComplete = () => {
    if (transcript.trim()) {
      onTranscriptComplete(transcript.trim())
      clearTranscript()
    }
  }

  return (
    <div className={cn('space-y-6', className)}>
      {/* 麦克风设备选择 */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-700">
          选择麦克风设备:
        </label>
        <select
          value={selectedDeviceId}
          onChange={(e) => handleDeviceChange(e.target.value)}
          disabled={isRecording}
          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <option value="">默认麦克风</option>
          {audioDevices.map((device) => (
            <option key={device.deviceId} value={device.deviceId}>
              {device.label || `麦克风 ${device.deviceId.slice(0, 8)}...`}
            </option>
          ))}
        </select>
        {audioDevices.length === 0 && (
          <p className="text-xs text-gray-500">
            正在加载麦克风设备...
          </p>
        )}
      </div>

      {/* 状态信息 */}
      <div className="text-center space-y-1">
        <div className="text-xs text-gray-500">
          {provider === 'soniox-ws' && 'Soniox WebSocket 语音识别'}
          {provider === 'webspeech' && '浏览器语音识别（Fallback）'}
          {provider === 'none' && '语音识别未初始化'}
        </div>
        {error && (
          <div className="text-xs text-red-600">
            {error}
          </div>
        )}
      </div>

      {/* 录音控制区域 */}
      <div className="flex justify-center items-center gap-4">
        {/* 麦克风按钮 */}
        <button
          type="button"
          onClick={isRecording ? stopRecording : startRecording}
          disabled={state === 'error'}
          className={cn(
            'relative w-20 h-20 rounded-full flex items-center justify-center',
            'transition-all duration-300 shadow-lg',
            isRecording
              ? 'bg-red-500 hover:bg-red-600 scale-110'
              : 'bg-blue-500 hover:bg-blue-600 scale-100',
            state === 'error' && 'opacity-50 cursor-not-allowed'
          )}
        >
          {isRecording ? (
            <>
              <MicOff className="w-8 h-8 text-white" />
              {/* 录音动画 */}
              <span className="absolute inset-0 rounded-full bg-red-500 animate-ping opacity-75"></span>
            </>
          ) : (
            <Mic className="w-8 h-8 text-white" />
          )}
        </button>

        {/* 手动完成按钮 */}
        {showManualFinalize && isRecording && (
          <Button
            onClick={finalize}
            variant="outline"
            size="lg"
            className="gap-2"
          >
            <Check className="w-4 h-4" />
            完成当前句子
          </Button>
        )}
      </div>

      {/* 状态提示 */}
      <div className="text-center text-sm text-gray-600">
        {isRecording ? (
          <div className="space-y-1">
            <p className="font-medium text-red-600">🎤 正在录音...</p>
            <p className="text-xs">点击麦克风停止，或点击"完成当前句子"按钮</p>
          </div>
        ) : (
          <p>点击麦克风开始录音</p>
        )}
      </div>

      {/* 转录显示区域 */}
      <div className="relative min-h-[200px] p-4 border border-gray-300 rounded-lg bg-gray-50">
        {/* Final transcript */}
        {transcript && (
          <div className="text-base text-gray-900 leading-relaxed">
            {transcript}
          </div>
        )}

        {/* Interim transcript */}
        {interimTranscript && (
          <span className="text-base text-gray-400 italic leading-relaxed">
            {interimTranscript}
          </span>
        )}

        {/* Placeholder */}
        {!transcript && !interimTranscript && (
          <div className="text-gray-400 text-sm">
            {placeholder}
          </div>
        )}
      </div>

      {/* 字数统计 */}
      <div className="flex justify-between items-center text-sm text-gray-500">
        <span>已输入 {transcript.length} 字</span>
        {transcript && (
          <button
            onClick={clearTranscript}
            className="text-blue-600 hover:text-blue-700 text-xs"
          >
            清空
          </button>
        )}
      </div>

      {/* 提交按钮 */}
      <Button
        onClick={handleComplete}
        disabled={!transcript.trim() || isRecording}
        className="w-full"
        size="lg"
      >
        {isRecording ? '请先停止录音' : '提交'}
      </Button>

      {/* 使用提示 */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-gray-700">
        <p className="font-medium mb-2">💡 使用提示：</p>
        <ul className="space-y-1 text-xs list-disc list-inside">
          <li>点击麦克风按钮开始录音</li>
          <li>说话时文字会实时显示（灰色为临时文本）</li>
          <li>点击"完成当前句子"可立即完成当前识别</li>
          <li>点击麦克风按钮停止录音</li>
          <li>检查转录内容后点击"提交"按钮</li>
        </ul>
      </div>
    </div>
  )
}
