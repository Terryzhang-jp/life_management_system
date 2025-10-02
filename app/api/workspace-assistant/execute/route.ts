import { NextRequest } from 'next/server'
import { validateTaskParams, taskLevelToNumber, TaskOperation } from '@/lib/workspace/task-tools'

/**
 * POST - 执行任务操作API
 * 在用户确认后执行AI建议的任务操作
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { operation, params } = body as {
      operation: TaskOperation
      params: any
    }

    if (!operation || !params) {
      return new Response(
        JSON.stringify({ error: 'Operation and params are required' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      )
    }

    // 验证参数
    const validation = validateTaskParams(operation, params)
    if (!validation.valid) {
      return new Response(
        JSON.stringify({ error: validation.error }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      )
    }

    // 根据操作类型调用对应的API
    let result: any
    let message = ''

    if (operation === 'create_task') {
      // 转换level为数字
      const taskData = {
        ...params,
        level: taskLevelToNumber(params.level)
      }

      // 调用创建任务API
      const response = await fetch(`${request.nextUrl.origin}/api/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(taskData)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create task')
      }

      result = await response.json()
      message = `任务创建成功：${params.title}`

    } else if (operation === 'update_task') {
      // 调用更新任务API
      const response = await fetch(`${request.nextUrl.origin}/api/tasks`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to update task')
      }

      result = await response.json()
      message = `任务更新成功 (ID: ${params.id})`
    }

    return new Response(
      JSON.stringify({
        success: true,
        message,
        data: result
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    )

  } catch (error: any) {
    console.error('Execute API error:', error)
    return new Response(
      JSON.stringify({
        error: 'Failed to execute operation',
        details: error.message
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    )
  }
}
