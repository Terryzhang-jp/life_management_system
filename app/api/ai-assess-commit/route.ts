import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import {
  questCommitsDb,
  aiAssessmentsDb,
  checkpointProgressDb
} from '@/lib/quest-commits-db'
import Database from 'better-sqlite3'
import path from 'path'

const DB_PATH = path.join(process.cwd(), 'data', 'quests.db')

interface Checkpoint {
  id: number
  title: string
  description?: string
  progress: number
}

/**
 * POST - AI 评估 Commit 并更新 Checkpoint 进度
 *
 * Body:
 *   - commitId: number
 *
 * 工作流程：
 * 1. 获取 commit 内容和相关 Milestone
 * 2. 获取该 Milestone 的所有 Checkpoints
 * 3. 使用 OpenAI 分析 commit 对每个 Checkpoint 的影响
 * 4. 更新 Checkpoint 进度（0-100%）
 * 5. 记录 AI 评估结果
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { commitId } = body

    if (!commitId) {
      return NextResponse.json(
        { success: false, error: 'commitId is required' },
        { status: 400 }
      )
    }

    // 1. 获取 commit
    const commit = questCommitsDb.getById(commitId)
    if (!commit) {
      return NextResponse.json(
        { success: false, error: 'Commit not found' },
        { status: 404 }
      )
    }

    console.log('[AI Assess] Commit object:', JSON.stringify(commit, null, 2))

    // 2. 获取相关的 Checkpoints
    const db = new Database(DB_PATH)
    let checkpoints: Checkpoint[] = []

    try {
      // better-sqlite3 返回snake_case列名，检查两种可能性
      const milestoneId = (commit as any).milestone_id || (commit as any).milestoneId
      const questId = (commit as any).quest_id || (commit as any).questId

      console.log('[AI Assess] Extracted milestoneId:', milestoneId, 'questId:', questId)

      if (milestoneId) {
        // 有指定 Milestone，获取该 Milestone 的 Checkpoints
        console.log('[AI Assess] Querying checkpoints for milestone:', milestoneId)
        checkpoints = db.prepare(`
          SELECT id, title, description, progress
          FROM checkpoints
          WHERE milestone_id = ?
          AND is_completed = 0
          ORDER BY order_index ASC, id ASC
        `).all(milestoneId) as Checkpoint[]
        console.log('[AI Assess] Found checkpoints:', checkpoints.length)
      } else {
        // 没有指定 Milestone，获取 Quest 的当前 Milestone 的 Checkpoints
        const currentMilestone = db.prepare(`
          SELECT id FROM milestones
          WHERE quest_id = ? AND status = 'current'
          LIMIT 1
        `).get(questId) as { id: number } | undefined

        if (currentMilestone) {
          checkpoints = db.prepare(`
            SELECT id, title, description, progress
            FROM checkpoints
            WHERE milestone_id = ?
            AND is_completed = 0
            ORDER BY order_index ASC, id ASC
          `).all(currentMilestone.id) as Checkpoint[]
        }
      }
    } finally {
      db.close()
    }

    if (checkpoints.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No active checkpoints to assess',
        assessments: []
      })
    }

    // 3. 使用 OpenAI 评估进度
    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      console.error('[AI Assess] OpenAI API Key not found')
      return NextResponse.json(
        { success: false, error: 'API Key not configured' },
        { status: 500 }
      )
    }

    const client = new OpenAI({ apiKey })

    // 构建评估 Prompt
    const assessmentPrompt = `你是一个客观、中立的进度评估助手。

# 任务
根据用户提交的今日进度 Commit，评估每个 Checkpoint 的完成百分比（0-100%）。

# 规则
1. **客观评估**: 基于实际工作内容，不夸大也不贬低
2. **增量进度**: 如果 Checkpoint 之前已有进度，评估本次增加的百分比
3. **具体证据**: 必须在 reasoning 中说明评估依据
4. **保守估计**: 如果不确定，给出保守的评估

# Commit 内容
\`\`\`
${commit.content}
\`\`\`

# Checkpoints
${checkpoints.map((cp) => `
- ID: ${cp.id}, **${cp.title}** (当前进度: ${cp.progress}%)
   ${cp.description ? `描述: ${cp.description}` : ''}
`).join('\n')}

# 输出格式
对每个 Checkpoint，输出 JSON 格式的评估结果：
\`\`\`json
{
  "checkpoints": [
    {
      "checkpointId": 数字ID,
      "newProgress": 数字 (0-100),
      "reasoning": "评估理由，说明为什么给出这个百分比",
      "confidence": 数字 (0-1，可选)
    }
  ]
}
\`\`\`

# 注意
- 如果 Commit 对某个 Checkpoint 没有贡献，newProgress 保持不变
- 新进度必须 >= 当前进度
- 必须为每个 Checkpoint 提供评估`

    console.log('[AI Assess] Calling OpenAI API...')
    const completion = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are an objective progress assessment assistant. Output valid JSON only.'
        },
        {
          role: 'user',
          content: assessmentPrompt
        }
      ],
      temperature: 0.1,
      response_format: { type: 'json_object' }
    })

    const responseText = completion.choices[0].message.content || '{}'
    console.log('[AI Assess] OpenAI response:', responseText)

    let assessmentResult

    try {
      assessmentResult = JSON.parse(responseText)
      console.log('[AI Assess] Parsed result:', JSON.stringify(assessmentResult, null, 2))
    } catch (parseError) {
      console.error('[AI Assess] Failed to parse AI response:', responseText)
      return NextResponse.json(
        { success: false, error: 'Invalid AI response format' },
        { status: 500 }
      )
    }

    // 4. 处理评估结果并更新进度
    const assessments = []
    const progressUpdates = []

    for (const assessment of assessmentResult.checkpoints || []) {
      const { checkpointId, newProgress, reasoning, confidence } = assessment

      const checkpoint = checkpoints.find(cp => cp.id === checkpointId)
      if (!checkpoint) continue

      // 确保新进度不低于当前进度
      const finalProgress = Math.max(checkpoint.progress, Math.min(100, newProgress))

      // 只有进度发生变化时才更新
      if (finalProgress !== checkpoint.progress) {
        // 更新 Checkpoint 进度
        checkpointProgressDb.updateProgress(checkpointId, finalProgress, {
          commitId,
          changeReason: `AI assessment: ${reasoning.substring(0, 200)}`
        })

        progressUpdates.push({
          checkpointId,
          checkpointTitle: checkpoint.title,
          previousProgress: checkpoint.progress,
          newProgress: finalProgress
        })
      }

      // 记录 AI 评估
      const aiAssessment = aiAssessmentsDb.create({
        commitId,
        checkpointId,
        assessedProgress: finalProgress,
        reasoning,
        confidenceScore: confidence ?? null,
        modelVersion: 'gpt-4o-mini'
      })

      assessments.push(aiAssessment)
    }

    return NextResponse.json({
      success: true,
      assessments,
      progressUpdates,
      message: `AI 已评估 ${assessments.length} 个 Checkpoints，${progressUpdates.length} 个进度已更新`
    })

  } catch (error: any) {
    console.error('[AI Assess] Error:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}
