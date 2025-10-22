/**
 * Quest Progress Types
 *
 * 类型定义文件，可以在客户端组件中安全导入
 * 不包含任何数据库相关的实现
 */

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
 * Momentum状态类型
 */
export type MomentumStatus = 'active' | 'paused' | 'stalled'
