/**
 * Quest UI Components
 *
 * 简约风格的Quest系统UI组件库
 * - 黑/白/灰配色
 * - 大字体，清晰的信息层级
 * - 流畅的动画和交互
 */

export { default as QuestProgressBar } from './quest-progress-bar'
export type { QuestProgressBarProps } from './quest-progress-bar'

export { default as MomentumBadge } from './momentum-badge'
export type { MomentumBadgeProps } from './momentum-badge'

export { default as MilestoneMiniCard } from './milestone-mini-card'
export type { MilestoneMiniCardProps } from './milestone-mini-card'

// Milestone Creator Components
export { AdaptiveQuestion } from './adaptive-question'
export { MilestoneDraftPreview } from './milestone-draft-preview'
export { MilestoneCreatorDialog } from './milestone-creator-dialog'

// Re-export types from quest-progress-types for convenience
export type { MomentumStatus, MilestoneProgress, QuestProgress, RecentCompletion } from '@/lib/quest-progress-types'
