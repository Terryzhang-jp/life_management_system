"use client"

import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { CheckCircle, XCircle, AlertCircle } from "lucide-react"
import { PendingTaskAction } from "@/lib/workspace/task-tools"

interface PendingActionCardProps {
  action: PendingTaskAction
  onConfirm: () => void
  onCancel: () => void
  loading?: boolean
}

/**
 * 待确认的任务操作卡片
 * 显示AI建议的任务操作，等待用户确认或取消
 */
export default function PendingActionCard({
  action,
  onConfirm,
  onCancel,
  loading = false
}: PendingActionCardProps) {
  return (
    <Card className="p-4 bg-yellow-50 border-yellow-200">
      <div className="flex items-start gap-3">
        {/* 图标 */}
        <div className="flex-shrink-0 mt-1">
          <AlertCircle className="w-5 h-5 text-yellow-600" />
        </div>

        {/* 内容 */}
        <div className="flex-1 min-w-0">
          {/* 操作类型标签 */}
          <div className="flex items-center gap-2 mb-2">
            <Badge variant="outline" className="text-xs">
              {action.operation === 'create_task' ? '创建任务' : '更新任务'}
            </Badge>
            <span className="text-xs text-yellow-700">需要你的确认</span>
          </div>

          {/* 操作描述 */}
          <p className="text-sm text-gray-900 mb-3 whitespace-pre-wrap break-words">
            {action.description}
          </p>

          {/* 操作按钮 */}
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              onClick={onConfirm}
              disabled={loading}
              className="gap-1"
            >
              <CheckCircle className="w-4 h-4" />
              确认执行
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={onCancel}
              disabled={loading}
              className="gap-1"
            >
              <XCircle className="w-4 h-4" />
              取消
            </Button>
          </div>
        </div>
      </div>
    </Card>
  )
}
