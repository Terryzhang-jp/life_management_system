/**
 * 汇率服务
 *
 * 功能：
 * 1. 从 Wise 获取实时汇率
 * 2. 缓存汇率到 localStorage（24小时）
 * 3. 批量获取多个汇率对
 */

const CACHE_PREFIX = 'exchange_rate_'
const CACHE_DURATION = 24 * 60 * 60 * 1000 // 24小时

interface CachedRate {
  rate: number
  timestamp: number
  source: string
}

interface RatePair {
  from: string
  to: string
}

class ExchangeRateService {
  /**
   * 获取单个汇率
   */
  async getRate(from: string, to: string): Promise<number> {
    // 相同货币汇率为1
    if (from === to) return 1

    const cacheKey = `${CACHE_PREFIX}${from}_${to}`

    // 1. 尝试从缓存获取
    const cached = this.getCachedRate(cacheKey)
    if (cached !== null) {
      console.log(`✅ 使用缓存汇率: ${from} → ${to} = ${cached}`)
      return cached
    }

    // 2. 从 Wise 获取
    console.log(`📡 从 Wise 获取汇率: ${from} → ${to}`)
    const rate = await this.fetchFromWise(from, to)

    // 3. 缓存结果
    this.setCachedRate(cacheKey, rate)

    return rate
  }

  /**
   * 批量获取多个汇率对
   */
  async batchGetRates(pairs: RatePair[]): Promise<Map<string, number>> {
    const results = new Map<string, number>()

    // 并行获取所有汇率
    await Promise.all(
      pairs.map(async ({ from, to }) => {
        try {
          const rate = await this.getRate(from, to)
          results.set(`${from}_${to}`, rate)
        } catch (error) {
          console.error(`获取汇率失败: ${from} → ${to}`, error)
          // 失败时使用1作为默认值（不换算）
          results.set(`${from}_${to}`, 1)
        }
      })
    )

    return results
  }

  /**
   * 从 Wise 获取汇率
   */
  private async fetchFromWise(from: string, to: string): Promise<number> {
    try {
      const url = `https://wise.com/jp/currency-converter/${from.toLowerCase()}-to-${to.toLowerCase()}-rate?amount=1000`

      const response = await fetch(url)

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      const html = await response.text()

      // 尝试多种模式提取汇率
      const patterns = [
        // 模式1: "value":0.00849367
        /"value":\s*(\d+(?:\.\d+)?)/,
        // 模式2: 1 USD = 7.124 CNY
        new RegExp(`1\\s+${from}\\s*=\\s*(\\d+(?:\\.\\d+)?)\\s+${to}`, 'i'),
      ]

      for (const pattern of patterns) {
        const match = html.match(pattern)
        if (match && match[1]) {
          const rate = parseFloat(match[1])
          console.log(`✅ 成功获取汇率: ${from} → ${to} = ${rate}`)
          return rate
        }
      }

      throw new Error('无法从HTML中提取汇率')

    } catch (error) {
      console.error('从 Wise 获取汇率失败:', error)
      throw new Error(`无法获取 ${from} → ${to} 的汇率`)
    }
  }

  /**
   * 从 localStorage 获取缓存的汇率
   */
  private getCachedRate(key: string): number | null {
    if (typeof window === 'undefined') return null

    try {
      const cached = localStorage.getItem(key)
      if (!cached) return null

      const data: CachedRate = JSON.parse(cached)
      const now = Date.now()

      // 检查是否过期
      if (now - data.timestamp > CACHE_DURATION) {
        localStorage.removeItem(key)
        return null
      }

      return data.rate
    } catch (error) {
      console.error('读取缓存失败:', error)
      return null
    }
  }

  /**
   * 将汇率缓存到 localStorage
   */
  private setCachedRate(key: string, rate: number): void {
    if (typeof window === 'undefined') return

    try {
      const data: CachedRate = {
        rate,
        timestamp: Date.now(),
        source: 'Wise'
      }
      localStorage.setItem(key, JSON.stringify(data))
      console.log(`💾 汇率已缓存: ${key}`)
    } catch (error) {
      console.error('缓存汇率失败:', error)
    }
  }

  /**
   * 清除所有汇率缓存
   */
  clearCache(): void {
    if (typeof window === 'undefined') return

    try {
      const keys = Object.keys(localStorage)
      keys.forEach(key => {
        if (key.startsWith(CACHE_PREFIX)) {
          localStorage.removeItem(key)
        }
      })
      console.log('✅ 已清除所有汇率缓存')
    } catch (error) {
      console.error('清除缓存失败:', error)
    }
  }

  /**
   * 获取缓存信息
   */
  getCacheInfo(): { key: string; from: string; to: string; rate: number; age: string }[] {
    if (typeof window === 'undefined') return []

    const info: { key: string; from: string; to: string; rate: number; age: string }[] = []

    try {
      const keys = Object.keys(localStorage)
      keys.forEach(key => {
        if (key.startsWith(CACHE_PREFIX)) {
          const cached = localStorage.getItem(key)
          if (cached) {
            const data: CachedRate = JSON.parse(cached)
            const [, pair] = key.split(CACHE_PREFIX)
            const [from, to] = pair.split('_')
            const ageMs = Date.now() - data.timestamp
            const ageHours = Math.floor(ageMs / (60 * 60 * 1000))

            info.push({
              key,
              from,
              to,
              rate: data.rate,
              age: `${ageHours}小时前`
            })
          }
        }
      })
    } catch (error) {
      console.error('获取缓存信息失败:', error)
    }

    return info
  }
}

// 单例导出
const exchangeRateService = new ExchangeRateService()

export default exchangeRateService
export type { RatePair }
