import questsDbManager from './quests-db'
import milestonesDbManager from './milestones-db'
import checkpointsDbManager from './checkpoints-db'

/**
 * Quest进度信息
 */
export interface QuestProgress {
  questId: number
  overallProgress: number       // 0-100 整体进度百分比
  completedMilestones: number
  totalMilestones: number
  currentMilestone: MilestoneProgress | null
  recentCompletions: RecentCompletion[]
  momentumStatus: 'active' | 'paused' | 'stalled'
  lastActivityAt: Date | null
}

/**
 * Milestone进度信息
 */
export interface MilestoneProgress {
  milestoneId: number
  title: string
  progress: number              // 0-100 Checkpoint完成百分比
  completedCheckpoints: number
  totalCheckpoints: number
}

/**
 * 最近完成项
 */
export interface RecentCompletion {
  type: 'milestone' | 'checkpoint'
  title: string
  completedAt: Date
  daysAgo: number
}

/**
 * 计算Quest的整体进度
 *
 * 算法：
 * - 已完成的Milestone = 100%
 * - 当前Milestone = Checkpoint完成百分比
 * - 总进度 = (完成Milestone数 * 100 + 当前Milestone进度) / 总Milestone数
 */
export async function calculateQuestProgress(questId: number): Promise<QuestProgress> {
  const quest = await questsDbManager.getQuest(questId)
  if (!quest) {
    throw new Error(`Quest ${questId} not found`)
  }

  const milestones = await milestonesDbManager.getMilestonesByQuest(questId)
  const completedMilestones = milestones.filter(m => m.status === 'completed')
  const currentMilestone = milestones.find(m => m.status === 'current')

  let totalProgress = 0
  const totalMilestones = milestones.length

  if (totalMilestones > 0) {
    // 已完成的Milestone贡献
    totalProgress += completedMilestones.length * 100

    // 当前Milestone的Checkpoint进度贡献
    if (currentMilestone?.id) {
      const checkpoints = await checkpointsDbManager.getCheckpointsByMilestone(currentMilestone.id)
      const completedCheckpoints = checkpoints.filter(cp => cp.isCompleted)
      const checkpointProgress = checkpoints.length > 0
        ? (completedCheckpoints.length / checkpoints.length) * 100
        : 0
      totalProgress += checkpointProgress
    }

    totalProgress = Math.round(totalProgress / totalMilestones)
  }

  // 计算当前Milestone的详细进度
  let currentMilestoneProgress: MilestoneProgress | null = null
  if (currentMilestone?.id) {
    currentMilestoneProgress = await calculateMilestoneProgress(currentMilestone.id)
  }

  // 获取最近完成项
  const recentCompletions = await getRecentCompletions(questId, 5)

  // 判断活跃状态
  const lastActivityAt = quest.lastActivityAt ? new Date(quest.lastActivityAt) : null
  const momentumStatus = getMomentumStatus(lastActivityAt)

  return {
    questId,
    overallProgress: totalProgress,
    completedMilestones: completedMilestones.length,
    totalMilestones,
    currentMilestone: currentMilestoneProgress,
    recentCompletions,
    momentumStatus,
    lastActivityAt
  }
}

/**
 * 计算Milestone的Checkpoint进度
 */
export async function calculateMilestoneProgress(milestoneId: number): Promise<MilestoneProgress> {
  const milestones = await milestonesDbManager.getMilestonesByQuest(1) // 暂时获取所有
  const milestone = milestones.find(m => m.id === milestoneId)

  if (!milestone) {
    throw new Error(`Milestone ${milestoneId} not found`)
  }

  const checkpoints = await checkpointsDbManager.getCheckpointsByMilestone(milestoneId)
  const completedCheckpoints = checkpoints.filter(cp => cp.isCompleted)

  const progress = checkpoints.length > 0
    ? Math.round((completedCheckpoints.length / checkpoints.length) * 100)
    : 0

  return {
    milestoneId,
    title: milestone.title,
    progress,
    completedCheckpoints: completedCheckpoints.length,
    totalCheckpoints: checkpoints.length
  }
}

/**
 * 获取Quest的最近完成项
 */
export async function getRecentCompletions(
  questId: number,
  limit: number = 5
): Promise<RecentCompletion[]> {
  const completions: RecentCompletion[] = []
  const now = Date.now()

  // 获取已完成的Milestones
  const milestones = await milestonesDbManager.getMilestonesByQuest(questId)
  const completedMilestones = milestones
    .filter(m => m.status === 'completed' && m.completedAt)
    .sort((a, b) => {
      const dateA = new Date(a.completedAt!).getTime()
      const dateB = new Date(b.completedAt!).getTime()
      return dateB - dateA  // 降序
    })

  for (const milestone of completedMilestones) {
    const completedAt = new Date(milestone.completedAt!)
    const daysAgo = Math.floor((now - completedAt.getTime()) / (1000 * 60 * 60 * 24))

    completions.push({
      type: 'milestone',
      title: milestone.title,
      completedAt,
      daysAgo
    })
  }

  // 获取已完成的Checkpoints（从当前和最近的Milestones）
  for (const milestone of milestones) {
    if (milestone.id) {
      const checkpoints = await checkpointsDbManager.getCheckpointsByMilestone(milestone.id)
      const completedCheckpoints = checkpoints
        .filter(cp => cp.isCompleted && cp.completedAt)
        .sort((a, b) => {
          const dateA = new Date(a.completedAt!).getTime()
          const dateB = new Date(b.completedAt!).getTime()
          return dateB - dateA
        })

      for (const checkpoint of completedCheckpoints) {
        const completedAt = new Date(checkpoint.completedAt!)
        const daysAgo = Math.floor((now - completedAt.getTime()) / (1000 * 60 * 60 * 24))

        completions.push({
          type: 'checkpoint',
          title: checkpoint.title,
          completedAt,
          daysAgo
        })
      }
    }
  }

  // 按完成时间降序排列，取前N项
  return completions
    .sort((a, b) => b.completedAt.getTime() - a.completedAt.getTime())
    .slice(0, limit)
}

/**
 * 判断Quest的活跃状态（Momentum）
 *
 * - 🔥 Active: 3天内有活动
 * - ⏸️ Paused: 3-14天没活动
 * - ⚠️ Stalled: 超过14天没活动
 */
export function getMomentumStatus(lastActivityAt: Date | null): 'active' | 'paused' | 'stalled' {
  if (!lastActivityAt) {
    return 'stalled'
  }

  const now = Date.now()
  const daysSinceActivity = Math.floor((now - lastActivityAt.getTime()) / (1000 * 60 * 60 * 24))

  if (daysSinceActivity <= 3) {
    return 'active'   // 🔥 最近3天有活动
  } else if (daysSinceActivity <= 14) {
    return 'paused'   // ⏸️ 1-2周没活动
  } else {
    return 'stalled'  // ⚠️ 超过2周没活动
  }
}

/**
 * 格式化相对时间（用于显示）
 */
export function formatRelativeTime(date: Date): string {
  const now = Date.now()
  const diff = now - date.getTime()

  const minutes = Math.floor(diff / (1000 * 60))
  const hours = Math.floor(diff / (1000 * 60 * 60))
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  const weeks = Math.floor(days / 7)
  const months = Math.floor(days / 30)

  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  if (hours < 24) return `${hours}h ago`
  if (days === 1) return 'yesterday'
  if (days < 7) return `${days}d ago`
  if (weeks < 4) return `${weeks}w ago`
  return `${months}mo ago`
}

/**
 * 批量计算多个Quest的进度
 */
export async function calculateMultipleQuestsProgress(questIds: number[]): Promise<QuestProgress[]> {
  const results: QuestProgress[] = []

  for (const questId of questIds) {
    try {
      const progress = await calculateQuestProgress(questId)
      results.push(progress)
    } catch (error) {
      console.error(`Failed to calculate progress for quest ${questId}:`, error)
    }
  }

  return results
}
