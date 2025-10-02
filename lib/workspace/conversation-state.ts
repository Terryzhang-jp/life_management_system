/**
 * 对话状态管理
 * 实现焦点任务跟踪、最近任务记忆、滑动窗口历史
 */

export interface Message {
  role: 'user' | 'assistant'
  content: string
  displayContent: string
}

export interface FocusTask {
  id: number
  title: string
  type: 'routine' | 'long-term' | 'short-term'
  level: number
}

export interface RecentTask {
  id: number
  title: string
}

export interface ConversationState {
  focusTask?: FocusTask
  recentTasks: RecentTask[]  // 最多5个
  lastIntent?: 'create' | 'update' | 'query' | 'delete'
  recentMessages: Message[]  // 最多3轮
  lastMessageTime: number
}

// 配置常量
export const CONFIG = {
  CONTEXT_WINDOW: 3,  // 滑动窗口大小（轮次）
  MAX_RECENT_TASKS: 5,  // 最近任务数量
  EXPIRY_FOCUS: 10 * 60 * 1000,  // 10分钟（焦点任务过期）
  EXPIRY_FULL: 30 * 60 * 1000,   // 30分钟（全部状态过期）
  STORAGE_KEY: 'workspace_conversation_state'
}

/**
 * 初始化空状态
 */
export function initializeState(): ConversationState {
  return {
    focusTask: undefined,
    recentTasks: [],
    lastIntent: undefined,
    recentMessages: [],
    lastMessageTime: Date.now()
  }
}

/**
 * 检查状态过期（分级清理）
 */
export function checkExpiry(state: ConversationState): ConversationState {
  const elapsed = Date.now() - state.lastMessageTime

  // 级别1：10分钟 - 清空焦点任务
  if (elapsed > CONFIG.EXPIRY_FOCUS) {
    return {
      ...state,
      focusTask: undefined  // 保留 recentTasks
    }
  }

  // 级别2：30分钟 - 清空全部
  if (elapsed > CONFIG.EXPIRY_FULL) {
    return initializeState()
  }

  return state
}

/**
 * 更新焦点任务
 */
export function updateFocusTask(
  state: ConversationState,
  task: FocusTask | undefined
): ConversationState {
  return {
    ...state,
    focusTask: task,
    lastMessageTime: Date.now()
  }
}

/**
 * 添加最近任务（去重，最多5个）
 */
export function addRecentTask(
  state: ConversationState,
  task: RecentTask
): ConversationState {
  // 去重
  const filtered = state.recentTasks.filter(t => t.id !== task.id)

  // 添加到开头，保留最多5个
  const newRecentTasks = [task, ...filtered].slice(0, CONFIG.MAX_RECENT_TASKS)

  return {
    ...state,
    recentTasks: newRecentTasks,
    lastMessageTime: Date.now()
  }
}

/**
 * 更新意图
 */
export function updateIntent(
  state: ConversationState,
  intent: 'create' | 'update' | 'query' | 'delete' | undefined
): ConversationState {
  return {
    ...state,
    lastIntent: intent,
    lastMessageTime: Date.now()
  }
}

/**
 * 添加消息到历史（滑动窗口，只保留最近3轮）
 */
export function addMessage(
  state: ConversationState,
  message: Message
): ConversationState {
  const newMessages = [...state.recentMessages, message].slice(-CONFIG.CONTEXT_WINDOW * 2)

  return {
    ...state,
    recentMessages: newMessages,
    lastMessageTime: Date.now()
  }
}

/**
 * 从 localStorage 加载状态
 */
export function loadStateFromStorage(): ConversationState | null {
  if (typeof window === 'undefined') return null

  try {
    const saved = localStorage.getItem(CONFIG.STORAGE_KEY)
    if (!saved) return null

    const state = JSON.parse(saved) as ConversationState

    // 加载后立即检查过期
    return checkExpiry(state)
  } catch (error) {
    console.error('Failed to load conversation state:', error)
    return null
  }
}

/**
 * 保存状态到 localStorage
 */
export function saveStateToStorage(state: ConversationState): void {
  if (typeof window === 'undefined') return

  try {
    localStorage.setItem(CONFIG.STORAGE_KEY, JSON.stringify(state))
  } catch (error) {
    console.error('Failed to save conversation state:', error)
  }
}

/**
 * 清空 focusTask（用于页面关闭前）
 */
export function clearFocusTask(state: ConversationState): ConversationState {
  return {
    ...state,
    focusTask: undefined
  }
}
