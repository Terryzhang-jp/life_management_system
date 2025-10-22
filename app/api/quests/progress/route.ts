import { NextRequest, NextResponse } from 'next/server'
import {
  calculateQuestProgress,
  calculateMultipleQuestsProgress
} from '@/lib/quest-progress'
import type { QuestProgress } from '@/lib/quest-progress-types'

/**
 * Quest进度查询API
 *
 * 支持两种查询模式：
 * 1. 单个Quest: GET /api/quests/progress?id=1
 * 2. 批量查询: GET /api/quests/progress?ids=1,2,3
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)

    // 单个Quest查询
    const questIdParam = searchParams.get('id')
    if (questIdParam) {
      const questId = parseInt(questIdParam, 10)

      if (isNaN(questId) || questId <= 0) {
        return NextResponse.json(
          {
            success: false,
            error: 'Invalid quest ID. Must be a positive integer.'
          },
          { status: 400 }
        )
      }

      try {
        const progress = await calculateQuestProgress(questId)

        return NextResponse.json({
          success: true,
          data: progress
        })
      } catch (error: any) {
        // Quest不存在的情况
        if (error.message.includes('not found')) {
          return NextResponse.json(
            {
              success: false,
              error: `Quest ${questId} not found`
            },
            { status: 404 }
          )
        }

        // 其他错误
        throw error
      }
    }

    // 批量查询
    const idsParam = searchParams.get('ids')
    if (idsParam) {
      // 解析逗号分隔的ID列表
      const questIds = idsParam
        .split(',')
        .map(id => parseInt(id.trim(), 10))
        .filter(id => !isNaN(id) && id > 0)

      if (questIds.length === 0) {
        return NextResponse.json(
          {
            success: false,
            error: 'No valid quest IDs provided. Use format: ids=1,2,3'
          },
          { status: 400 }
        )
      }

      const progressList = await calculateMultipleQuestsProgress(questIds)

      return NextResponse.json({
        success: true,
        data: progressList,
        meta: {
          total: progressList.length,
          requested: questIds.length
        }
      })
    }

    // 没有提供任何查询参数
    return NextResponse.json(
      {
        success: false,
        error: 'Missing query parameter. Use "id" for single quest or "ids" for multiple quests.'
      },
      { status: 400 }
    )

  } catch (error: any) {
    console.error('[Quest Progress API] Error:', error)

    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to calculate quest progress'
      },
      { status: 500 }
    )
  }
}

/**
 * API使用示例：
 *
 * 1. 单个Quest进度查询
 *    GET /api/quests/progress?id=1
 *    Response: {
 *      success: true,
 *      data: {
 *        questId: 1,
 *        overallProgress: 45,
 *        completedMilestones: 2,
 *        totalMilestones: 5,
 *        currentMilestone: {
 *          milestoneId: 3,
 *          title: "完成原型设计",
 *          progress: 60,
 *          completedCheckpoints: 3,
 *          totalCheckpoints: 5
 *        },
 *        recentCompletions: [...],
 *        momentumStatus: 'active',
 *        lastActivityAt: '2025-01-10T12:30:00Z'
 *      }
 *    }
 *
 * 2. 批量Quest进度查询
 *    GET /api/quests/progress?ids=1,2,3
 *    Response: {
 *      success: true,
 *      data: [
 *        { questId: 1, overallProgress: 45, ... },
 *        { questId: 2, overallProgress: 78, ... },
 *        { questId: 3, overallProgress: 12, ... }
 *      ],
 *      meta: {
 *        total: 3,
 *        requested: 3
 *      }
 *    }
 *
 * 3. 错误响应
 *    - 400 Bad Request: 参数错误
 *    - 404 Not Found: Quest不存在
 *    - 500 Internal Server Error: 服务器错误
 */
