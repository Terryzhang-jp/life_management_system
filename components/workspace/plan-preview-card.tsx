"use client"

import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { CheckCircle, XCircle, ListOrdered, ArrowRight } from "lucide-react"

// 执行计划类型定义
export interface ExecutionStep {
  id: string
  action: string
  params: Record<string, any>
  description: string
  dependsOn?: string[]
}

export interface ExecutionPlan {
  summary: string
  steps: ExecutionStep[]
}

interface PlanPreviewCardProps {
  plan: ExecutionPlan
  onConfirm: () => void
  onCancel: () => void
  loading?: boolean
}

/**
 * 执行计划预览卡片
 * 显示AI生成的执行计划，等待用户确认
 */
export default function PlanPreviewCard({
  plan,
  onConfirm,
  onCancel,
  loading = false
}: PlanPreviewCardProps) {
  return (
    <Card className="p-4 bg-blue-50 border-blue-200">
      <div className="flex items-start gap-3">
        {/* 图标 */}
        <div className="flex-shrink-0 mt-1">
          <ListOrdered className="w-5 h-5 text-blue-600" />
        </div>

        {/* 内容 */}
        <div className="flex-1 min-w-0">
          {/* 标题和标签 */}
          <div className="flex items-center gap-2 mb-2">
            <Badge variant="outline" className="text-xs bg-blue-100 border-blue-300">
              执行计划
            </Badge>
            <span className="text-xs text-blue-700">需要你的确认</span>
          </div>

          {/* 计划总结 */}
          <p className="text-sm font-medium text-gray-900 mb-3">
            {plan.summary}
          </p>

          {/* 步骤列表 */}
          <div className="space-y-2 mb-4 pl-2 border-l-2 border-blue-200">
            {plan.steps.map((step, index) => (
              <div key={step.id} className="pl-3">
                <div className="flex items-start gap-2">
                  <span className="flex-shrink-0 text-xs font-semibold text-blue-600 mt-0.5">
                    {index + 1}.
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-800">{step.description}</p>

                    {/* 显示依赖关系 */}
                    {step.dependsOn && step.dependsOn.length > 0 && (
                      <div className="flex items-center gap-1 mt-1 text-xs text-gray-500">
                        <ArrowRight className="w-3 h-3" />
                        <span>
                          依赖：{step.dependsOn.map(dep => {
                            const depIndex = plan.steps.findIndex(s => s.id === dep)
                            return depIndex >= 0 ? `步骤${depIndex + 1}` : dep
                          }).join(', ')}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* 操作按钮 */}
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              onClick={onConfirm}
              disabled={loading}
              className="gap-1 bg-blue-600 hover:bg-blue-700"
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
