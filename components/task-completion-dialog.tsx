"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { X, Loader2, CheckCircle, MessageSquare } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { Task } from "@/lib/tasks-db"

interface TaskCompletionDialogProps {
  task: Task
  onCompleted?: () => void
  onClose: () => void
}

export function TaskCompletionDialog({ task, onCompleted, onClose }: TaskCompletionDialogProps) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [completionComment, setCompletionComment] = useState("")

  const handleComplete = async () => {
    setLoading(true)

    try {
      const response = await fetch('/api/completed-tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          taskId: task.id,
          completionComment: completionComment.trim() || undefined
        })
      })

      if (response.ok) {
        toast({
          title: "🎉 恭喜完成！",
          description: "任务已标记为完成"
        })
        onCompleted?.()
        onClose()
      } else {
        const errorData = await response.json()
        toast({
          title: "完成失败",
          description: errorData.error || "无法完成任务",
          variant: "destructive"
        })
      }
    } catch (error) {
      console.error('Failed to complete task:', error)
      toast({
        title: "网络错误",
        description: "无法连接到服务器",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const getTaskTypeLabel = (type: string) => {
    switch (type) {
      case 'routine': return '日常习惯'
      case 'long-term': return '长期任务'
      case 'short-term': return '短期任务'
      default: return '任务'
    }
  }

  const getTaskLevelLabel = (level: number) => {
    switch (level) {
      case 0: return '主任务'
      case 1: return '子任务'
      case 2: return '子子任务'
      default: return '任务'
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full p-6 space-y-4">
        {/* 头部 */}
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            <h2 className="text-lg font-semibold text-gray-900">完成任务</h2>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            disabled={loading}
            className="h-6 w-6 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* 任务信息 */}
        <div className="bg-gray-50 rounded-lg p-4 space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
              {getTaskTypeLabel(task.type)}
            </span>
            {task.level !== undefined && task.level > 0 && (
              <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
                {getTaskLevelLabel(task.level)}
              </span>
            )}
            {task.priority && task.priority <= 5 && (
              <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full">
                优先级 {task.priority}
              </span>
            )}
          </div>
          <h3 className="font-medium text-gray-900">{task.title}</h3>
          {task.description && (
            <p className="text-sm text-gray-600 line-clamp-2">{task.description}</p>
          )}
        </div>

        {/* 感悟输入 */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Label htmlFor="completion-comment" className="text-sm font-medium">
              完成感悟
            </Label>
            <MessageSquare className="h-4 w-4 text-gray-400" />
          </div>
          <Textarea
            id="completion-comment"
            placeholder="分享一下完成这个任务的感悟或收获吧... (可选)"
            value={completionComment}
            onChange={(e) => setCompletionComment(e.target.value)}
            className="min-h-[80px] resize-none"
            disabled={loading}
          />
          <p className="text-xs text-gray-500">记录完成心得，让每次成功都更有意义</p>
        </div>

        {/* 操作按钮 */}
        <div className="flex gap-3 pt-2">
          <Button
            onClick={handleComplete}
            disabled={loading}
            className="flex-1"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                完成中...
              </>
            ) : (
              <>
                <CheckCircle className="h-4 w-4 mr-2" />
                确认完成
              </>
            )}
          </Button>
          <Button
            variant="outline"
            onClick={onClose}
            disabled={loading}
            className="flex-1"
          >
            取消
          </Button>
        </div>
      </div>
    </div>
  )
}