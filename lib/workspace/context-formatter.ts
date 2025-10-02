import tasksDbManager, { Task, TasksData } from '../tasks-db'
import completedTasksDbManager, { CompletedTask } from '../completed-tasks-db'
import aspirationsDbManager, { Aspiration } from '../aspirations-db'
import {
  formatPriority,
  formatDeadline,
  formatCreatedAt,
  formatRelativeTime,
  daysBetween,
  isUrgent,
  isOverdue
} from './formatters'

/**
 * 任务树节点（用于显示）
 */
interface TaskTreeNode {
  id?: number
  title: string
  description?: string
  priority: string
  deadline?: string
  createdAt: string
  ageInDays: number
  isUnclear?: boolean
  unclearReason?: string
  level: number
  children: TaskTreeNode[]
}

/**
 * 日常习惯完成统计
 */
interface RoutineStats {
  last7Days: number
  last30Days: number
  lastCompletedAt?: string
}

/**
 * 工作台上下文数据
 */
export interface WorkspaceContext {
  tasks: {
    routines: TaskTreeNode[]
    longTermTasks: TaskTreeNode[]
    shortTermTasks: TaskTreeNode[]
  }
  summary: {
    totalActiveTasks: number
    unclearTasksCount: number
    overdueTasksCount: number
    urgentTasksCount: number
  }
  recentCompletions: Array<{
    title: string
    type: string
    level: number
    mainTaskTitle?: string
    completionComment?: string
    completedAt: string
    daysAgo: number
  }>
  aspirations: Array<{
    title: string
    description?: string
    tags?: string[]
  }>
  timestamp: string
  today: string
}

/**
 * 计算routine任务的完成统计
 */
async function getRoutineStats(routineId: number, today: string): Promise<RoutineStats> {
  const completedTasks = await completedTasksDbManager.getCompletedTasks({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  })

  const routineCompletions = completedTasks.filter(ct => ct.taskId === routineId)

  const last7DaysDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

  const last7Days = routineCompletions.filter(ct => ct.completedAt && ct.completedAt >= last7DaysDate).length
  const last30Days = routineCompletions.length

  const lastCompleted = routineCompletions[0]
  const lastCompletedAt = lastCompleted?.completedAt
    ? formatRelativeTime(lastCompleted.completedAt.split(' ')[0], today)
    : undefined

  return {
    last7Days,
    last30Days,
    lastCompletedAt
  }
}

/**
 * 构建任务树（递归）
 */
async function buildTaskTree(
  task: Task,
  today: string,
  includeTime: boolean = true
): Promise<TaskTreeNode> {
  const node: TaskTreeNode = {
    id: task.id,
    title: task.title,
    description: task.description,
    priority: formatPriority(task.priority),
    createdAt: task.createdAt ? formatCreatedAt(task.createdAt, today) : '',
    ageInDays: task.createdAt ? daysBetween(task.createdAt, today) : 0,
    isUnclear: task.isUnclear,
    unclearReason: task.unclearReason,
    level: task.level || 0,
    children: []
  }

  // 只有非routine任务才显示deadline
  if (includeTime && task.deadline) {
    node.deadline = formatDeadline(task.deadline, today)
  }

  // 递归加载子任务
  if (task.id) {
    const subTasks = await tasksDbManager.getSubTasks(task.id, (task.level || 0) + 1)
    for (const subTask of subTasks) {
      const childNode = await buildTaskTree(subTask, today, includeTime)
      node.children.push(childNode)
    }
  }

  return node
}

/**
 * 递归统计任务树中的模糊任务数量
 */
function countUnclearTasks(nodes: TaskTreeNode[]): number {
  let count = 0
  for (const node of nodes) {
    if (node.isUnclear) count++
    count += countUnclearTasks(node.children)
  }
  return count
}

/**
 * 递归统计任务树中的总任务数
 */
function countTotalTasks(nodes: TaskTreeNode[]): number {
  let count = nodes.length
  for (const node of nodes) {
    count += countTotalTasks(node.children)
  }
  return count
}

/**
 * 递归检查任务树中的逾期任务
 */
function countOverdueTasks(nodes: TaskTreeNode[], today: string): number {
  let count = 0
  for (const node of nodes) {
    if (node.deadline && node.deadline.includes('已逾期')) count++
    count += countOverdueTasks(node.children, today)
  }
  return count
}

/**
 * 递归检查任务树中的紧急任务
 */
function countUrgentTasks(nodes: TaskTreeNode[]): number {
  let count = 0
  for (const node of nodes) {
    if (node.deadline && /\d+天后/.test(node.deadline)) {
      const match = node.deadline.match(/(\d+)天后/)
      if (match && parseInt(match[1]) <= 3) count++
    }
    count += countUrgentTasks(node.children)
  }
  return count
}

/**
 * 格式化任务树为Markdown
 */
function formatTaskTreeMarkdown(
  nodes: TaskTreeNode[],
  indent: number = 0,
  stats?: Map<number, RoutineStats>
): string {
  let markdown = ''
  const prefix = '   '.repeat(indent)

  nodes.forEach((node, index) => {
    const num = index + 1

    // 主任务行
    let line = `${prefix}**${num}. ${node.title}**`
    if (typeof node.id === 'number') {
      line += ` (ID:${node.id})`
    }
    if (node.priority !== '无优先级') line += ` [${node.priority}]`
    if (node.deadline) line += ` ⏰ ${node.deadline}`
    if (!node.deadline && node.createdAt) line += ` 📅 ${node.createdAt}`
    if (node.isUnclear) line += ` ❓ 模糊`

    markdown += line + '\n'

    // 描述
    if (node.description) {
      markdown += `${prefix}   - 描述：${node.description}\n`
    }

    // 模糊原因
    if (node.unclearReason) {
      markdown += `${prefix}   - 模糊原因：${node.unclearReason}\n`
    }

    // Routine完成统计
    if (stats && stats.size > 0) {
      // 这里简化处理，实际应该根据taskId匹配
      const routineStats = Array.from(stats.values())[0]
      if (routineStats) {
        markdown += `${prefix}   - 完成情况：最近7天${routineStats.last7Days}次，最近30天${routineStats.last30Days}次`
        if (routineStats.lastCompletedAt) {
          markdown += `，最后完成：${routineStats.lastCompletedAt}`
        }
        markdown += '\n'
      }
    }

    // 递归子任务
    if (node.children.length > 0) {
      markdown += formatTaskTreeMarkdown(node.children, indent + 1)
    }

    markdown += '\n'
  })

  return markdown
}

/**
 * 构建完整的工作台上下文
 */
export async function formatWorkspaceContext(): Promise<WorkspaceContext> {
  const today = new Date().toISOString().split('T')[0]
  const timestamp = new Date().toISOString()

  // 1. 获取所有任务
  const tasksData: TasksData = await tasksDbManager.getAllTasks()

  // 2. 构建任务树
  const routineTrees: TaskTreeNode[] = []
  for (const task of tasksData.routines) {
    const tree = await buildTaskTree(task, today, false) // routine不显示时间
    routineTrees.push(tree)
  }

  const longTermTrees: TaskTreeNode[] = []
  for (const task of tasksData.longTermTasks) {
    const tree = await buildTaskTree(task, today, true)
    longTermTrees.push(tree)
  }

  const shortTermTrees: TaskTreeNode[] = []
  for (const task of tasksData.shortTermTasks) {
    const tree = await buildTaskTree(task, today, true)
    shortTermTrees.push(tree)
  }

  // 3. 计算统计
  const allTrees = [...routineTrees, ...longTermTrees, ...shortTermTrees]
  const totalActiveTasks = countTotalTasks(allTrees)
  const unclearTasksCount = countUnclearTasks(allTrees)
  const overdueTasksCount = countOverdueTasks([...longTermTrees, ...shortTermTrees], today)
  const urgentTasksCount = countUrgentTasks([...longTermTrees, ...shortTermTrees])

  // 4. 获取最近30天完成任务
  const completions = await completedTasksDbManager.getCompletedTasks({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  })

  const recentCompletions = completions.map(ct => ({
    title: ct.taskTitle,
    type: ct.taskType,
    level: ct.taskLevel,
    mainTaskTitle: ct.mainTaskTitle,
    completionComment: ct.completionComment,
    completedAt: formatRelativeTime(ct.completedAt?.split(' ')[0] || today, today),
    daysAgo: ct.completedAt ? daysBetween(ct.completedAt.split(' ')[0], today) : 0
  }))

  // 5. 获取心愿清单
  const aspirations = await aspirationsDbManager.getAllAspirations()
  const aspirationsList = aspirations.map(a => ({
    title: a.title,
    description: a.description,
    tags: a.tags
  }))

  return {
    tasks: {
      routines: routineTrees,
      longTermTasks: longTermTrees,
      shortTermTasks: shortTermTrees
    },
    summary: {
      totalActiveTasks,
      unclearTasksCount,
      overdueTasksCount,
      urgentTasksCount
    },
    recentCompletions,
    aspirations: aspirationsList,
    timestamp,
    today
  }
}

/**
 * 将上下文格式化为Markdown字符串（用于LLM）
 */
export function contextToMarkdown(context: WorkspaceContext): string {
  let markdown = '# 任务工作台上下文\n\n'

  // 总览
  markdown += '## 📊 总览\n'
  markdown += `- 活跃任务总数：${context.summary.totalActiveTasks}个\n`
  markdown += `- 模糊不清任务：${context.summary.unclearTasksCount}个\n`
  markdown += `- 已逾期任务：${context.summary.overdueTasksCount}个\n`
  markdown += `- 紧急任务（3天内）：${context.summary.urgentTasksCount}个\n\n`

  // 当前任务
  markdown += '## 📋 当前任务\n\n'

  // 日常习惯
  if (context.tasks.routines.length > 0) {
    markdown += `### 日常习惯 (${context.tasks.routines.length}个主任务)\n\n`
    markdown += formatTaskTreeMarkdown(context.tasks.routines)
  }

  // 长期任务
  if (context.tasks.longTermTasks.length > 0) {
    markdown += `### 长期任务 (${context.tasks.longTermTasks.length}个主任务)\n\n`
    markdown += formatTaskTreeMarkdown(context.tasks.longTermTasks)
  }

  // 短期任务
  if (context.tasks.shortTermTasks.length > 0) {
    markdown += `### 短期任务 (${context.tasks.shortTermTasks.length}个主任务)\n\n`
    markdown += formatTaskTreeMarkdown(context.tasks.shortTermTasks)
  }

  // 最近完成
  if (context.recentCompletions.length > 0) {
    markdown += '## ✅ 最近完成 (30天内)\n\n'
    context.recentCompletions.forEach((completion, index) => {
      markdown += `${index + 1}. **${completion.title}**`
      if (completion.mainTaskTitle) {
        markdown += ` [${completion.type} > ${completion.mainTaskTitle}]`
      }
      markdown += `\n   - 完成时间：${completion.completedAt}\n`
      if (completion.completionComment) {
        markdown += `   - 感悟：${completion.completionComment}\n`
      }
      markdown += '\n'
    })
  }

  // 心愿清单
  if (context.aspirations.length > 0) {
    markdown += '## ✨ 心愿清单\n\n'
    context.aspirations.forEach((aspiration, index) => {
      markdown += `${index + 1}. **${aspiration.title}**\n`
      if (aspiration.description) {
        markdown += `   - 描述：${aspiration.description}\n`
      }
      if (aspiration.tags && aspiration.tags.length > 0) {
        markdown += `   - 标签：[${aspiration.tags.join(', ')}]\n`
      }
      markdown += '\n'
    })
  }

  // 时间戳
  markdown += '---\n'
  markdown += `当前时间：${context.timestamp}\n`

  return markdown
}
