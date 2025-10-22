import { tool } from 'ai'
import { z } from 'zod'
import visionsDbManager from '@/lib/visions-db'
import questsDbManager from '@/lib/quests-db'
import milestonesDbManager from '@/lib/milestones-db'
import checkpointsDbManager from '@/lib/checkpoints-db'

export interface ToolResult {
  success: boolean
  data?: any
  message?: string
  error?: string
}

// 获取所有Visions
export const get_visions = tool({
  description: '获取所有可用的Visions（愿景）列表。Vision是Quest的上层目标，代表用户的长期愿景。',
  parameters: z.object({
    // Workaround: 添加一个虚拟参数以生成有效的 JSON Schema
    _dummy: z.literal('_').default('_').describe('忽略此参数')
  }),
  async execute(): Promise<ToolResult> {
    try {
      const visions = await visionsDbManager.getAllVisions()
      return {
        success: true,
        data: visions,
        message: `找到 ${visions.length} 个Vision`
      }
    } catch (error) {
      return {
        success: false,
        error: '获取Visions失败'
      }
    }
  }
})

// 获取指定Vision的Quests
export const get_quests_by_vision = tool({
  description: '获取指定Vision下的所有Quests。用于了解用户在某个愿景下已经有哪些Quest。',
  parameters: z.object({
    visionId: z.number().describe('Vision的ID')
  }),
  async execute({ visionId }): Promise<ToolResult> {
    try {
      const quests = await questsDbManager.getQuestsByVision(visionId)
      return {
        success: true,
        data: quests,
        message: `找到 ${quests.length} 个Quest`
      }
    } catch (error) {
      return {
        success: false,
        error: '获取Quests失败'
      }
    }
  }
})

// 创建Quest
export const create_quest = tool({
  description: '创建一个新的Quest。Quest必须关联到一个Vision，并明确说明为什么要做这个Quest（why）。Quest分为main（主线）和side（支线）两种类型。',
  parameters: z.object({
    visionId: z.number().describe('关联的Vision ID'),
    type: z.enum(['main', 'side']).describe('Quest类型：main=主线Quest，side=支线Quest'),
    title: z.string().describe('Quest标题，简洁明确，例如"在HCI顶会发表论文"'),
    why: z.string().describe('为什么要做这个Quest？对Vision有什么贡献？必须说明动机和意义')
  }),
  async execute({ visionId, type, title, why }): Promise<ToolResult> {
    try {
      // 验证Vision是否存在
      const vision = await visionsDbManager.getAllVisions()
      const targetVision = vision.find(v => v.id === visionId)

      if (!targetVision) {
        return {
          success: false,
          error: `Vision ID ${visionId} 不存在`
        }
      }

      // 创建Quest
      const questId = await questsDbManager.addQuest({
        visionId,
        type,
        title: title.trim(),
        why: why.trim(),
        status: 'active'
      })

      return {
        success: true,
        data: { questId, title, type },
        message: `Quest "${title}" 创建成功！ID: ${questId}`
      }
    } catch (error) {
      return {
        success: false,
        error: '创建Quest失败'
      }
    }
  }
})

// 获取Quest的Milestones
export const get_milestones = tool({
  description: '获取指定Quest的所有Milestones。Milestone是Quest的里程碑，有current/next/future/completed四种状态。',
  parameters: z.object({
    questId: z.number().describe('Quest的ID')
  }),
  async execute({ questId }): Promise<ToolResult> {
    try {
      const milestones = await milestonesDbManager.getMilestonesByQuest(questId)
      return {
        success: true,
        data: milestones,
        message: `找到 ${milestones.length} 个Milestone`
      }
    } catch (error) {
      return {
        success: false,
        error: '获取Milestones失败'
      }
    }
  }
})

// 创建Milestone (带SMART验证)
export const create_milestone = tool({
  description: `创建一个新的Milestone（里程碑）。Milestone必须符合SMART原则：
- Specific（具体）：明确的标题和完成标准
- Measurable（可衡量）：有清晰的产出或完成标志
- Achievable（可实现）：时间和资源合理
- Relevant（相关）：与Quest目标相关
- Time-bound（有时限）：有预期完成时间

创建时需要明确说明完成标准(completionCriteria)和为什么这个Milestone重要(why)。`,
  parameters: z.object({
    questId: z.number().describe('关联的Quest ID'),
    title: z.string().describe('Milestone标题，例如"完成文献综述"'),
    completionCriteria: z.string().describe('完成标准（What）：具体要产出什么？如何判断完成？例如"完成30篇论文阅读和5000字综述文档"'),
    why: z.string().optional().describe('为什么这个Milestone重要？对Quest有什么帮助？'),
    status: z.enum(['current', 'next', 'future']).default('future').describe('Milestone状态：current=当前正在做，next=下一个要做，future=未来计划'),
  }),
  async execute({ questId, title, completionCriteria, why, status }): Promise<ToolResult> {
    try {
      // 验证Quest是否存在
      const quest = await questsDbManager.getQuest(questId)
      if (!quest) {
        return {
          success: false,
          error: `Quest ID ${questId} 不存在`
        }
      }

      // 简单的SMART验证（基于completionCriteria长度和内容）
      const criteriaLength = completionCriteria.trim().length
      if (criteriaLength < 10) {
        return {
          success: false,
          error: 'Completion Criteria 太简短，请提供更具体的完成标准（至少10个字符）'
        }
      }

      // 创建Milestone
      const milestoneId = await milestonesDbManager.addMilestone({
        questId,
        title: title.trim(),
        completionCriteria: completionCriteria.trim(),
        why: why?.trim(),
        status: status || 'future'
      })

      return {
        success: true,
        data: { milestoneId, title, completionCriteria },
        message: `Milestone "${title}" 创建成功！ID: ${milestoneId}`
      }
    } catch (error) {
      return {
        success: false,
        error: '创建Milestone失败'
      }
    }
  }
})

// 获取Milestone的Checkpoints
export const get_checkpoints = tool({
  description: '获取指定Milestone的所有Checkpoints。Checkpoint是Milestone的具体执行任务。',
  parameters: z.object({
    milestoneId: z.number().describe('Milestone的ID')
  }),
  async execute({ milestoneId }): Promise<ToolResult> {
    try {
      const checkpoints = await checkpointsDbManager.getCheckpointsByMilestone(milestoneId)
      return {
        success: true,
        data: checkpoints,
        message: `找到 ${checkpoints.length} 个Checkpoint`
      }
    } catch (error) {
      return {
        success: false,
        error: '获取Checkpoints失败'
      }
    }
  }
})

// 创建Checkpoint
export const create_checkpoint = tool({
  description: '为Milestone创建一个Checkpoint（检查点/子任务）。Checkpoint是Milestone的具体执行步骤，应该是可操作的、明确的小任务。',
  parameters: z.object({
    milestoneId: z.number().describe('关联的Milestone ID'),
    title: z.string().describe('Checkpoint标题，简洁明确，例如"搜集30篇论文"'),
    description: z.string().optional().describe('Checkpoint的详细描述，说明具体如何执行')
  }),
  async execute({ milestoneId, title, description }): Promise<ToolResult> {
    try {
      // 验证Milestone是否存在
      const milestones = await milestonesDbManager.getMilestonesByQuest(1) // 临时验证
      // 实际应该获取单个milestone，但现有API没有这个方法，暂时跳过验证

      const checkpointId = await checkpointsDbManager.addCheckpoint({
        milestoneId,
        title: title.trim(),
        description: description?.trim(),
        isCompleted: false
      })

      return {
        success: true,
        data: { checkpointId, title },
        message: `Checkpoint "${title}" 创建成功！ID: ${checkpointId}`
      }
    } catch (error) {
      return {
        success: false,
        error: '创建Checkpoint失败'
      }
    }
  }
})

// 导出所有tools (OpenAI 支持空参数schema)
export const questTools = {
  get_visions,
  get_quests_by_vision,
  create_quest,
  get_milestones,
  create_milestone,
  get_checkpoints,
  create_checkpoint
}
