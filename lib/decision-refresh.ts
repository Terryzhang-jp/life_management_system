import { getLocalDateString } from './date-utils'

// 决策自动刷新逻辑
export async function checkAndRefreshDecisions(): Promise<{ needsRefresh: boolean; processedCount?: number }> {
  try {
    // 1. 检查是否需要刷新
    const checkResponse = await fetch('/api/decisions/refresh', {
      method: 'GET'
    })

    if (!checkResponse.ok) {
      console.error('Failed to check refresh status')
      return { needsRefresh: false }
    }

    const checkData = await checkResponse.json()

    // 如果今天已经刷新过，直接返回
    if (!checkData.needsRefresh) {
      return { needsRefresh: false }
    }

    // 2. 执行刷新
    const refreshResponse = await fetch('/api/decisions/refresh', {
      method: 'POST'
    })

    if (!refreshResponse.ok) {
      console.error('Failed to refresh decisions')
      return { needsRefresh: true }
    }

    const refreshData = await refreshResponse.json()

    console.log(`Decision refresh completed: ${refreshData.processedCount} decisions processed`)

    return {
      needsRefresh: true,
      processedCount: refreshData.processedCount
    }

  } catch (error) {
    console.error('Error during decision refresh check:', error)
    return { needsRefresh: false }
  }
}

// 检查决策是否为昨日或更早的日期
export function isDecisionExpired(decisionDate: string): boolean {
  const today = getLocalDateString()
  return decisionDate < today
}

// 计算延期天数
export function calculateDelayDays(decisionDate: string): number {
  const today = new Date(`${getLocalDateString()}T00:00:00`)
  const decision = new Date(`${decisionDate}T00:00:00`)
  const timeDiff = today.getTime() - decision.getTime()
  return Math.floor(timeDiff / (1000 * 60 * 60 * 24))
}
