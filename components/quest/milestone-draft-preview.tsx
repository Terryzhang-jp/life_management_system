"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { CheckCircle, XCircle, Edit2, Save, X, AlertTriangle } from "lucide-react"

/**
 * Milestone草稿预览组件
 * 显示AI生成的milestone和checkpoints，支持编辑和确认
 */

interface GeneratedCheckpoint {
  title: string
  description: string
  estimatedDays: number
  deadline: string
  orderIndex: number
}

interface GeneratedMilestone {
  title: string
  completionCriteria: string[]  // API返回数组
  deadline: string
  checkpoints: GeneratedCheckpoint[]
}

interface SMARTCheck {
  Specific: { pass: boolean; note: string }
  Measurable: { pass: boolean; note: string }
  Achievable: { pass: boolean; note: string }
  Relevant: { pass: boolean; note: string }
  "Time-bound": { pass: boolean; note: string }
}

interface MilestoneDraftPreviewProps {
  milestone: GeneratedMilestone
  smartCheck: SMARTCheck
  sidebar?: string
  onConfirm: (editedMilestone: GeneratedMilestone) => void
  onCancel: () => void
  isLoading?: boolean
}

export function MilestoneDraftPreview({
  milestone: initialMilestone,
  smartCheck,
  sidebar,
  onConfirm,
  onCancel,
  isLoading = false
}: MilestoneDraftPreviewProps) {
  // 编辑状态
  const [isEditing, setIsEditing] = useState(false)
  const [editedMilestone, setEditedMilestone] = useState<GeneratedMilestone>(initialMilestone)

  // SMART检查结果
  const smartChecks = [
    { name: 'Specific', ...smartCheck.Specific },
    { name: 'Measurable', ...smartCheck.Measurable },
    { name: 'Achievable', ...smartCheck.Achievable },
    { name: 'Relevant', ...smartCheck.Relevant },
    { name: 'Time-bound', ...smartCheck['Time-bound'] }
  ]

  const failedChecks = smartChecks.filter(check => !check.pass)
  const hasWarnings = failedChecks.length > 0

  const handleConfirm = () => {
    onConfirm(editedMilestone)
  }

  const updateCheckpoint = (index: number, field: keyof GeneratedCheckpoint, value: any) => {
    const newCheckpoints = [...editedMilestone.checkpoints]
    newCheckpoints[index] = { ...newCheckpoints[index], [field]: value }
    setEditedMilestone({ ...editedMilestone, checkpoints: newCheckpoints })
  }

  return (
    <div className="space-y-8">
      {/* SMART检查结果 */}
      {hasWarnings && (
        <div className="border-2 border-amber-400 bg-amber-50 rounded-lg p-6">
          <div className="flex items-start gap-3 mb-4">
            <AlertTriangle className="w-6 h-6 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-amber-900 mb-2">
                SMART 检查发现 {failedChecks.length} 个潜在问题
              </h3>
              <p className="text-sm text-amber-800 mb-3">
                AI 建议您review以下维度，但您可以选择接受或修改：
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {failedChecks.map((check) => (
              <div key={check.name} className="flex items-start gap-3 text-sm">
                <XCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <span className="font-medium text-amber-900">{check.name}:</span>
                  <span className="text-amber-800 ml-2">{check.note}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Milestone信息 */}
      <div className="border-2 border-gray-200 rounded-lg p-6 space-y-6">
        <div className="flex items-start justify-between">
          <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wider">
            Milestone草稿
          </h3>
          {!isEditing && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsEditing(true)}
              className="text-gray-500 hover:text-gray-900"
            >
              <Edit2 className="w-4 h-4 mr-2" />
              编辑
            </Button>
          )}
        </div>

        {/* 标题 */}
        <div>
          <label className="text-xs font-medium text-gray-500 mb-2 block">标题</label>
          {isEditing ? (
            <Input
              value={editedMilestone.title}
              onChange={(e) => setEditedMilestone({ ...editedMilestone, title: e.target.value })}
              className="text-2xl font-bold border-2"
            />
          ) : (
            <h2 className="text-2xl font-bold text-gray-900">{editedMilestone.title}</h2>
          )}
        </div>

        {/* 完成标准 */}
        <div>
          <label className="text-xs font-medium text-gray-500 mb-2 block">完成标准</label>
          {isEditing ? (
            <Textarea
              value={editedMilestone.completionCriteria.join('\n')}
              onChange={(e) => setEditedMilestone({
                ...editedMilestone,
                completionCriteria: e.target.value.split('\n').filter(line => line.trim())
              })}
              className="min-h-[100px] border-2"
              placeholder="每行一个标准"
            />
          ) : (
            <ul className="list-disc list-inside space-y-2 text-gray-700">
              {editedMilestone.completionCriteria.map((criterion, index) => (
                <li key={index}>{criterion}</li>
              ))}
            </ul>
          )}
        </div>

        {/* Deadline */}
        <div>
          <label className="text-xs font-medium text-gray-500 mb-2 block">截止日期</label>
          {isEditing ? (
            <Input
              type="date"
              value={editedMilestone.deadline}
              onChange={(e) => setEditedMilestone({ ...editedMilestone, deadline: e.target.value })}
              className="border-2"
            />
          ) : (
            <p className="text-lg font-semibold text-gray-900">
              {new Date(editedMilestone.deadline).toLocaleDateString('zh-CN', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </p>
          )}
        </div>
      </div>

      {/* Checkpoints */}
      <div className="space-y-4">
        <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wider">
          Checkpoints ({editedMilestone.checkpoints.length})
        </h3>

        <div className="space-y-3">
          {editedMilestone.checkpoints.map((checkpoint, index) => (
            <div
              key={index}
              className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors"
            >
              <div className="flex items-start gap-3">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-gray-100 text-xs font-medium text-gray-600 flex-shrink-0 mt-1">
                  {index + 1}
                </span>
                <div className="flex-1 space-y-2">
                  {isEditing ? (
                    <>
                      <Input
                        value={checkpoint.title}
                        onChange={(e) => updateCheckpoint(index, 'title', e.target.value)}
                        className="font-medium"
                        placeholder="Checkpoint标题"
                      />
                      <Textarea
                        value={checkpoint.description}
                        onChange={(e) => updateCheckpoint(index, 'description', e.target.value)}
                        className="text-sm"
                        placeholder="描述"
                        rows={2}
                      />
                      <div className="flex gap-3 text-sm">
                        <div className="flex items-center gap-2">
                          <span className="text-gray-500">时长:</span>
                          <Input
                            type="number"
                            value={checkpoint.estimatedDays}
                            onChange={(e) => updateCheckpoint(index, 'estimatedDays', parseInt(e.target.value))}
                            className="w-20"
                            min="1"
                          />
                          <span className="text-gray-500">天</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-gray-500">截止:</span>
                          <Input
                            type="date"
                            value={checkpoint.deadline}
                            onChange={(e) => updateCheckpoint(index, 'deadline', e.target.value)}
                            className="w-36"
                          />
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      <p className="font-medium text-gray-900">{checkpoint.title}</p>
                      <p className="text-sm text-gray-600">{checkpoint.description}</p>
                      <div className="flex gap-4 text-xs text-gray-500">
                        <span>📅 {new Date(checkpoint.deadline).toLocaleDateString('zh-CN')}</span>
                        <span>⏱️ {checkpoint.estimatedDays} 天</span>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* AI Sidebar */}
      {sidebar && (
        <div className="border-l-4 border-blue-400 bg-blue-50 p-6 rounded-r-lg">
          <h4 className="font-medium text-blue-900 mb-2">AI 综合评估</h4>
          <p className="text-sm text-blue-800 leading-relaxed">{sidebar}</p>
        </div>
      )}

      {/* 操作按钮 */}
      <div className="flex gap-4 pt-6 border-t border-gray-200">
        {isEditing ? (
          <>
            <Button
              onClick={() => setIsEditing(false)}
              className="flex-1 bg-gray-900 hover:bg-gray-800"
            >
              <Save className="w-4 h-4 mr-2" />
              保存修改
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setEditedMilestone(initialMilestone)
                setIsEditing(false)
              }}
            >
              <X className="w-4 h-4 mr-2" />
              取消编辑
            </Button>
          </>
        ) : (
          <>
            <Button
              onClick={handleConfirm}
              disabled={isLoading}
              className="flex-1 bg-blue-600 hover:bg-blue-700"
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              {isLoading ? '创建中...' : '确认创建'}
            </Button>
            <Button
              variant="outline"
              onClick={onCancel}
              disabled={isLoading}
            >
              取消
            </Button>
          </>
        )}
      </div>

      {/* SMART通过的检查（折叠显示） */}
      {smartChecks.some(c => c.pass) && (
        <details className="text-sm">
          <summary className="cursor-pointer text-gray-500 hover:text-gray-700">
            查看通过的SMART检查 ({smartChecks.filter(c => c.pass).length})
          </summary>
          <div className="mt-3 space-y-2 pl-4">
            {smartChecks.filter(c => c.pass).map((check) => (
              <div key={check.name} className="flex items-start gap-2 text-gray-600">
                <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                <div>
                  <span className="font-medium">{check.name}:</span>
                  <span className="ml-2">{check.note}</span>
                </div>
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  )
}
