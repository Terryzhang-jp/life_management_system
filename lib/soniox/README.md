# Soniox WebSocket 语音识别系统

基于 Soniox 实时语音转写 API 的完整 WebSocket 实现，支持麦克风设备选择、实时转写和自动 fallback。

## 🏗️ 架构设计

```
┌─────────────────────────────────────────────────────────┐
│                    React 组件层                          │
│  VoiceRecorder / VoiceInput / 其他UI组件                │
└────────────────────┬────────────────────────────────────┘
                     │
                     ↓
┌─────────────────────────────────────────────────────────┐
│                 useSonioxRecorderWS                      │
│           (React Hook - 状态管理层)                      │
└────────┬──────────────────────────┬─────────────────────┘
         │                          │
         ↓                          ↓
┌─────────────────────┐    ┌──────────────────────────────┐
│  SonioxWSClient     │    │    AudioRecorder             │
│  (WebSocket 客户端)  │    │    (音频采集)                 │
└──────────┬──────────┘    └──────────┬───────────────────┘
           │                          │
           ↓                          ↓
    wss://stt-rt.soniox.com      MediaRecorder API
```

## 📦 核心模块

### 1. AudioRecorder (lib/audio/recorder.ts)
**职责**: 音频采集和设备管理

**核心功能**:
- 麦克风权限请求
- 音频编码格式选择（Opus 优先）
- 每 250ms 产生音频块
- 支持指定设备录制
- 音频电平监控（开发模式）

**使用示例**:
```typescript
import { AudioRecorder } from '@/lib/audio/recorder'

// 获取可用设备
const devices = await AudioRecorder.getAudioDevices()

// 开始录音
const recorder = new AudioRecorder()
await recorder.start(
  (audioBlob) => {
    // 处理音频数据
    console.log('音频块:', audioBlob.size, 'bytes')
  },
  deviceId  // 可选：指定设备ID
)

// 停止录音
recorder.stop()
```

---

### 2. SonioxWSClient (lib/soniox/ws-client.ts)
**职责**: WebSocket 连接和通信

**核心功能**:
- 建立 WebSocket 连接
- 发送配置和音频数据
- 接收转写结果
- 状态管理和错误处理
- 音频缓冲机制

**使用示例**:
```typescript
import { SonioxWSClient } from '@/lib/soniox/ws-client'

const client = new SonioxWSClient(
  (message) => {
    // 处理转写结果
    console.log('收到:', message.tokens)
  },
  (state) => {
    // 处理状态变化
    console.log('状态:', state)
  },
  (error) => {
    // 处理错误
    console.error('错误:', error)
  }
)

// 连接
await client.connect({
  api_key: 'temp_xxx',
  model: 'stt-rt-preview',
  audio_format: 'auto',
  language_hints: ['zh']
})

// 发送音频
client.sendAudio(audioBlob)

// 结束转写
client.finalize()

// 关闭连接
client.close()
```

---

### 3. useSonioxRecorderWS (lib/soniox/useSonioxRecorderWS.ts)
**职责**: React Hook - 整合音频录制和语音识别

**核心功能**:
- 自动获取临时 API Key
- 整合 AudioRecorder 和 SonioxWSClient
- 状态管理（transcript / interimTranscript）
- Web Speech API fallback
- 设备选择

**使用示例**:
```typescript
import { useSonioxRecorderWS } from '@/lib/soniox/useSonioxRecorderWS'

function MyComponent() {
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
    setMicrophoneDevice
  } = useSonioxRecorderWS({
    language: 'zh',
    enableFallback: true,
    onTranscriptUpdate: (finalText, interim) => {
      console.log('Final:', finalText)
      console.log('Interim:', interim)
    },
    onError: (err) => {
      console.error(err)
    }
  })

  // 选择麦克风
  setMicrophoneDevice('device-id-xxx')

  // 开始录音
  await startRecording()

  // 停止录音
  stopRecording()

  // 手动完成当前句子
  finalize()

  return (
    <div>
      <p>状态: {state}</p>
      <p>最终文本: {transcript}</p>
      <p>临时文本: {interimTranscript}</p>
    </div>
  )
}
```

---

### 4. VoiceRecorder (components/ui/voice-recorder.tsx)
**职责**: 完整的 UI 组件

**核心功能**:
- 麦克风设备下拉选择器
- 录音控制按钮
- 实时转写结果显示
- 手动 finalize 按钮
- 状态和错误提示

**使用示例**:
```typescript
import VoiceRecorder from '@/components/ui/voice-recorder'

function MyPage() {
  return (
    <VoiceRecorder
      language="zh"
      onTranscriptComplete={(text) => {
        console.log('完成转写:', text)
      }}
      placeholder="开始说话..."
      showManualFinalize={true}
    />
  )
}
```

---

## 🔐 安全性设计

### 临时 API Key 机制

**为什么需要临时 Key？**
- 永久 API Key 不能暴露给前端
- 临时 Key 有效期 5 分钟，安全性高
- 只能用于指定用途（WebSocket 转写）

**流程**:
```
前端 → POST /api/soniox-temp-key → 后端
                                     ↓
                            使用永久 Key 请求 Soniox
                                     ↓
                            返回临时 Key (5分钟有效)
                                     ↓
前端 ← 临时 Key ← 后端
  ↓
使用临时 Key 连接 WebSocket
```

**配置**:
```env
# .env.local (服务器端)
SONIOX_API_KEY=your_permanent_api_key_here
```

---

## 🚀 快速开始

### 1. 安装依赖
```bash
# 无额外依赖，使用浏览器原生 API
```

### 2. 配置环境变量
```bash
# .env.local
SONIOX_API_KEY=your_soniox_api_key
```

### 3. 使用预封装组件
```typescript
import VoiceRecorder from '@/components/ui/voice-recorder'

export default function MyPage() {
  return (
    <VoiceRecorder
      language="zh"
      onTranscriptComplete={(text) => {
        // 处理完整的转写结果
        console.log(text)
      }}
    />
  )
}
```

### 4. 或使用 Hook 自定义
```typescript
import { useSonioxRecorderWS } from '@/lib/soniox/useSonioxRecorderWS'

export default function CustomRecorder() {
  const {
    transcript,
    isRecording,
    startRecording,
    stopRecording
  } = useSonioxRecorderWS({ language: 'zh' })

  return (
    <div>
      <button onClick={isRecording ? stopRecording : startRecording}>
        {isRecording ? '停止' : '开始'}
      </button>
      <p>{transcript}</p>
    </div>
  )
}
```

---

## 🛠️ 高级功能

### 麦克风设备选择
```typescript
const { setMicrophoneDevice } = useSonioxRecorderWS({ language: 'zh' })

// 获取可用设备
const devices = await AudioRecorder.getAudioDevices()

// 选择设备
setMicrophoneDevice(devices[0].deviceId)
```

### 翻译功能（未来扩展）
```typescript
useSonioxRecorderWS({
  language: 'zh',
  enableTranslation: true,
  targetLanguage: 'en'
})
```

### Web Speech API Fallback
```typescript
useSonioxRecorderWS({
  language: 'zh',
  enableFallback: true  // Soniox 失败时自动切换
})
```

---

## 📋 类型定义

所有类型定义位于 `lib/soniox/ws-types.ts`:

```typescript
// 录音状态
type RecorderState = 'idle' | 'recording' | 'processing' | 'error'

// 识别引擎
type RecognitionProvider = 'soniox-ws' | 'webspeech' | 'none'

// WebSocket 状态
enum WSState {
  IDLE = 'idle',
  CONNECTING = 'connecting',
  STREAMING = 'streaming',
  FINALIZING = 'finalizing',
  CLOSED = 'closed',
  ERROR = 'error'
}

// Soniox 配置
interface SonioxConfig {
  api_key: string
  model: string
  audio_format?: string
  enable_language_identification?: boolean
  language_hints?: string[]
  enable_speaker_diarization?: boolean
  translation?: {
    type: 'one_way' | 'two_way'
    target_language: string
  }
}

// Token 结构
interface SonioxToken {
  text: string
  is_final?: boolean
  translation_status?: 'original' | 'translation'
  language?: string
  speaker?: number
}
```

---

## 🐛 调试技巧

### 开发模式日志
```typescript
// 开发模式下自动启用详细日志
process.env.NODE_ENV === 'development'

// 日志包括:
// - 🎙️ 音频设置
// - 🔊 音频电平
// - 收到转写结果
// - WebSocket 状态
```

### 常见问题排查

**1. 音频电平为 0**
- 检查系统麦克风权限
- 检查浏览器麦克风权限
- 尝试切换麦克风设备

**2. WebSocket 连接失败**
- 检查 API Key 是否正确
- 检查网络连接
- 查看控制台错误信息

**3. 没有转写结果**
- 确认音频电平正常（> 5）
- 确认说话声音足够大
- 检查语言设置是否正确

---

## 📚 参考资源

- [Soniox 官方文档](https://soniox.com/docs)
- [Soniox WebSocket API](https://soniox.com/docs/websocket)
- [Web Audio API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API)
- [MediaRecorder API](https://developer.mozilla.org/en-US/docs/Web/API/MediaRecorder)

---

## 🔄 版本历史

### v2.0.0 (2025-01-10)
- ✅ 完全重写为 WebSocket 实现
- ✅ 添加临时 API Key 机制
- ✅ 添加麦克风设备选择
- ✅ 添加音频电平监控
- ✅ 清理调试日志
- ✅ 完善类型定义

### v1.0.0 (之前)
- SDK 方式实现（已废弃）

