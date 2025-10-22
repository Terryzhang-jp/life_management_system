/**
 * SonioxWSClient - Soniox WebSocket 客户端
 *
 * 负责与 Soniox 实时转写服务的 WebSocket 连接和通信
 */

import {
  WSState,
  SonioxConfig,
  SonioxMessage,
  FinalizeMessage,
} from './ws-types'

export class SonioxWSClient {
  private ws: WebSocket | null = null
  private state: WSState = WSState.IDLE
  private config: SonioxConfig | null = null
  private pendingAudioChunks: Blob[] = []
  private finalizeRequested: boolean = false

  // 回调函数
  private messageHandler: ((message: SonioxMessage) => void) | null = null
  private stateChangeHandler: ((state: WSState) => void) | null = null
  private errorHandler: ((error: Error) => void) | null = null

  constructor(
    onMessage?: (message: SonioxMessage) => void,
    onStateChange?: (state: WSState) => void,
    onError?: (error: Error) => void
  ) {
    this.messageHandler = onMessage || null
    this.stateChangeHandler = onStateChange || null
    this.errorHandler = onError || null
  }

  /**
   * 连接到 Soniox WebSocket 服务
   * @param config Soniox 配置对象
   */
  async connect(config: SonioxConfig): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.config = config
        this.setState(WSState.CONNECTING)

        // 创建 WebSocket 连接
        this.ws = new WebSocket('wss://stt-rt.soniox.com/transcribe-websocket')

        // 连接成功
        this.ws.onopen = () => {
          // 发送配置（第一条消息必须是配置）
          const configJson = JSON.stringify(this.config)
          this.ws!.send(configJson)

          // 进入 STREAMING 状态
          this.setState(WSState.STREAMING)

          // 发送缓存的音频数据
          this.flushPendingAudio()

          resolve()
        }

        // 接收消息
        this.ws.onmessage = async (event) => {
          try {
            const message: SonioxMessage = JSON.parse(
              typeof event.data === 'string' ? event.data : await event.data.text()
            )

            // 开发模式日志
            if (process.env.NODE_ENV === 'development' && message.tokens && message.tokens.length > 0) {
              console.log('收到转写结果:', message.tokens.length, '个tokens')
            }

            // 触发消息处理回调
            if (this.messageHandler) {
              this.messageHandler(message)
            }

            // 如果收到 finished 消息且已请求 finalize
            if (message.finished && this.finalizeRequested) {
              this.close()
            }
          } catch (error) {
            console.error('❌ 解析消息失败:', error)
          }
        }

        // 连接关闭
        this.ws.onclose = (event) => {
          if (process.env.NODE_ENV === 'development') {
            console.log('WebSocket 已关闭:', event.code)
          }
          this.setState(WSState.CLOSED)
        }

        // 连接错误
        this.ws.onerror = (event) => {
          console.error('WebSocket 错误:', event)
          this.setState(WSState.ERROR)

          const error = new Error('WebSocket connection error')
          if (this.errorHandler) {
            this.errorHandler(error)
          }

          reject(error)
        }

      } catch (error) {
        console.error('❌ 创建 WebSocket 连接失败:', error)
        this.setState(WSState.ERROR)

        if (this.errorHandler && error instanceof Error) {
          this.errorHandler(error)
        }

        reject(error)
      }
    })
  }

  /**
   * 发送音频数据
   * @param audioData 音频 Blob
   */
  sendAudio(audioData: Blob): void {
    if (this.ws && this.state === WSState.STREAMING) {
      // 直接发送音频数据
      this.ws.send(audioData)
      return
    }

    // 如果还未进入 STREAMING 状态，先缓存
    if (this.state === WSState.CONNECTING) {
      this.pendingAudioChunks.push(audioData)
    }
  }

  /**
   * 发送 finalize 消息，结束转写
   */
  finalize(): void {
    if (this.ws && this.state === WSState.STREAMING) {
      const finalizeMsg: FinalizeMessage = { type: 'finalize' }
      this.ws.send(JSON.stringify(finalizeMsg))
      this.finalizeRequested = true
      this.setState(WSState.FINALIZING)
    }
  }

  /**
   * 关闭连接
   */
  close(): void {
    if (this.ws) {
      if (this.ws.readyState === WebSocket.OPEN) {
        this.ws.close(1000, 'Normal closure')
      }
      this.ws = null
    }

    this.setState(WSState.CLOSED)
    this.pendingAudioChunks = []
    this.finalizeRequested = false
  }

  /**
   * 发送所有缓存的音频数据
   */
  private flushPendingAudio(): void {
    if (this.pendingAudioChunks.length > 0) {
      for (const chunk of this.pendingAudioChunks) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
          this.ws.send(chunk)
        }
      }
      this.pendingAudioChunks = []
    }
  }

  /**
   * 设置状态并触发回调
   */
  private setState(newState: WSState): void {
    if (this.state !== newState) {
      this.state = newState

      if (this.stateChangeHandler) {
        this.stateChangeHandler(newState)
      }
    }
  }

  /**
   * 获取当前状态
   */
  getState(): WSState {
    return this.state
  }

  /**
   * 是否已连接
   */
  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN
  }
}
