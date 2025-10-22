/**
 * AudioRecorder - 音频录制器
 *
 * 基于 MediaRecorder API 实现音频采集
 * 每 250ms 产生一个音频块（Blob）
 */

export class AudioRecorder {
  private mediaRecorder: MediaRecorder | null = null
  private stream: MediaStream | null = null
  private onDataCallback: ((data: Blob) => void) | null = null
  private audioContext: AudioContext | null = null
  private analyser: AnalyserNode | null = null
  private levelCheckInterval: number | null = null

  /**
   * 开始录音
   * @param onData 音频数据回调函数，每 250ms 触发一次
   * @param deviceId 指定的麦克风设备 ID（可选）
   */
  async start(onData: (data: Blob) => void, deviceId?: string): Promise<void> {
    try {
      // 1. 请求麦克风权限
      const constraints: MediaStreamConstraints = {
        audio: deviceId
          ? {
              deviceId: { exact: deviceId },
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true,
            }
          : {
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true,
            }
      }

      this.stream = await navigator.mediaDevices.getUserMedia(constraints)

      // 检查实际的音频设置
      const audioTrack = this.stream.getAudioTracks()[0]
      const settings = audioTrack.getSettings()

      // 设置音频电平监控（开发模式）
      if (process.env.NODE_ENV === 'development') {
        console.log('🎙️ 音频设置:', {
          sampleRate: settings.sampleRate,
          channelCount: settings.channelCount,
          deviceId: audioTrack.label
        })
        this.setupAudioLevelMonitor(this.stream)
      }

      // 2. 选择最佳的编码格式
      const mimeType = this.getSupportedMimeType()

      // 3. 创建 MediaRecorder
      this.mediaRecorder = new MediaRecorder(this.stream, {
        mimeType,
        audioBitsPerSecond: 128000,  // 128 kbps
      })

      this.onDataCallback = onData

      // 4. 监听音频数据
      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          if (this.onDataCallback) {
            this.onDataCallback(event.data)
          }

          // 开发模式警告
          if (process.env.NODE_ENV === 'development' && event.data.size < 1000) {
            console.warn('⚠️ 音频块较小:', event.data.size, 'bytes')
          }
        }
      }

      this.mediaRecorder.onerror = (event: Event) => {
        console.error('❌ MediaRecorder 错误:', event)
        throw new Error('MediaRecorder error')
      }

      // 5. 开始录音，每 250ms 产生一个音频块
      this.mediaRecorder.start(250)

    } catch (error) {
      console.error('❌ AudioRecorder 启动失败:', error)
      throw error
    }
  }

  /**
   * 停止录音
   */
  stop(): void {
    try {
      if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
        this.mediaRecorder.stop()
      }

      if (this.stream) {
        this.stream.getTracks().forEach(track => track.stop())
        this.stream = null
      }

      // 清理音频监控
      if (this.levelCheckInterval) {
        clearInterval(this.levelCheckInterval)
        this.levelCheckInterval = null
      }

      if (this.audioContext) {
        this.audioContext.close()
        this.audioContext = null
      }

      this.mediaRecorder = null
      this.onDataCallback = null

    } catch (error) {
      console.error('停止录音失败:', error)
    }
  }

  /**
   * 设置音频电平监控（用于调试麦克风是否正常工作）
   */
  private setupAudioLevelMonitor(stream: MediaStream): void {
    try {
      // 创建 AudioContext
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
      const source = this.audioContext.createMediaStreamSource(stream)

      // 创建分析器
      this.analyser = this.audioContext.createAnalyser()
      this.analyser.fftSize = 256
      source.connect(this.analyser)

      const bufferLength = this.analyser.frequencyBinCount
      const dataArray = new Uint8Array(bufferLength)

      // 每秒检查一次音频电平（仅开发模式）
      this.levelCheckInterval = window.setInterval(() => {
        if (!this.analyser) return

        this.analyser.getByteFrequencyData(dataArray)

        const sum = dataArray.reduce((a, b) => a + b, 0)
        const average = sum / bufferLength

        if (average > 5) {
          console.log('🔊 音频电平:', Math.round(average))
        } else {
          console.warn('🔇 音频电平过低:', Math.round(average))
        }
      }, 1000)

    } catch (error) {
      console.error('❌ 音频电平监控启动失败:', error)
    }
  }

  /**
   * 获取浏览器支持的音频格式（按优先级）
   */
  private getSupportedMimeType(): string {
    const types = [
      'audio/webm;codecs=opus',  // 首选 Opus 编码（最佳压缩比）
      'audio/ogg;codecs=opus',
      'audio/webm',
      'audio/ogg',
    ]

    for (const type of types) {
      if (MediaRecorder.isTypeSupported(type)) {
        return type
      }
    }

    console.warn('⚠️ 浏览器不支持推荐的音频格式，使用默认格式')
    return ''
  }

  /**
   * 检查浏览器是否支持录音
   */
  static isSupported(): boolean {
    return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia && window.MediaRecorder)
  }

  /**
   * 获取当前状态
   */
  get state(): string {
    return this.mediaRecorder?.state || 'inactive'
  }

  /**
   * 是否正在录音
   */
  get isRecording(): boolean {
    return this.mediaRecorder?.state === 'recording'
  }

  /**
   * 获取所有可用的音频输入设备
   */
  static async getAudioDevices(): Promise<MediaDeviceInfo[]> {
    try {
      // 先请求权限，否则 deviceId 会是空的
      await navigator.mediaDevices.getUserMedia({ audio: true })

      const devices = await navigator.mediaDevices.enumerateDevices()
      const audioInputs = devices.filter(device => device.kind === 'audioinput')

      if (process.env.NODE_ENV === 'development') {
        console.log('可用麦克风设备:', audioInputs.length)
      }

      return audioInputs
    } catch (error) {
      console.error('获取音频设备失败:', error)
      return []
    }
  }
}
