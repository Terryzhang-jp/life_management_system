"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { AdaptiveQuestion } from "./adaptive-question"
import { MilestoneDraftPreview } from "./milestone-draft-preview"
import { Sparkles, X } from "lucide-react"

/**
 * Milestone Creator 对话框
 * 整合完整的AI辅助创建Milestone流程
 */

interface Message {
  role: 'user' | 'assistant'
  content: string
}

interface MilestoneCreatorDialogProps {
  questId: number
  isOpen: boolean
  onClose: () => void
  onMilestoneCreated: () => void
}

export function MilestoneCreatorDialog({
  questId,
  isOpen,
  onClose,
  onMilestoneCreated
}: MilestoneCreatorDialogProps) {
  const { toast } = useToast()

  // 对话状态
  const [history, setHistory] = useState<Message[]>([])
  const [context, setContext] = useState<any>({})
  const [currentResponse, setCurrentResponse] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [questionCount, setQuestionCount] = useState(0)

  // 流程状态
  const [phase, setPhase] = useState<'questioning' | 'preview' | 'completed'>('questioning')

  // 重置状态
  const resetDialog = () => {
    setHistory([])
    setContext({})
    setCurrentResponse(null)
    setQuestionCount(0)
    setPhase('questioning')
  }

  // 当Dialog打开时自动开始对话
  useEffect(() => {
    if (isOpen && !currentResponse && phase === 'questioning' && !isLoading) {
      startConversation()
    }
  }, [isOpen])

  // 初始化 - 开始对话
  const startConversation = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/milestone-creator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: "我想创建一个milestone",
          history: [],
          context: {}
        })
      })

      if (!response.ok) {
        throw new Error('Failed to start conversation')
      }

      const data = await response.json()
      if (data.success) {
        setCurrentResponse(data.response)
        setQuestionCount(1)
      } else {
        throw new Error(data.error || 'Unknown error')
      }
    } catch (error: any) {
      console.error('Failed to start conversation:', error)
      toast({
        title: "启动失败",
        description: error.message || "无法连接到AI服务",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  // 用户回答问题
  const handleAnswer = async (answer: string | string[]) => {
    const answerText = Array.isArray(answer) ? answer.join(', ') : answer

    // 更新历史 (顺序：先是AI的问题，再是用户的回答)
    const newHistory: Message[] = [
      ...history,
      { role: 'assistant', content: currentResponse?.question?.main || '' },
      { role: 'user', content: answerText }
    ]

    setIsLoading(true)
    try {
      const response = await fetch('/api/milestone-creator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: answerText,
          history: newHistory,
          context: { ...context, ...currentResponse?.context }
        })
      })

      if (!response.ok) {
        throw new Error('Failed to send answer')
      }

      const data = await response.json()
      if (data.success) {
        setHistory(newHistory)
        setCurrentResponse(data.response)
        setContext({ ...context, ...data.response.context })

        // 检查是否进入生成阶段
        if (data.response.phase === 'generate') {
          setPhase('preview')
        } else {
          setQuestionCount(prev => prev + 1)
        }
      } else {
        throw new Error(data.error || 'Unknown error')
      }
    } catch (error: any) {
      console.error('Failed to send answer:', error)
      toast({
        title: "发送失败",
        description: error.message || "无法处理您的回答",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  // 确认创建Milestone
  const handleConfirm = async (editedMilestone: any) => {
    setIsLoading(true)
    try {
      // 转换数据格式以匹配现有API
      const milestoneData = {
        questId,
        title: editedMilestone.title,
        completionCriteria: editedMilestone.completionCriteria.join('\n'), // 数组转字符串
        status: 'future' as const
      }

      // 创建Milestone
      const milestoneResponse = await fetch('/api/milestones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(milestoneData)
      })

      if (!milestoneResponse.ok) {
        throw new Error('Failed to create milestone')
      }

      const milestoneResult = await milestoneResponse.json()
      const milestoneId = milestoneResult.id

      if (!milestoneId) {
        throw new Error('Milestone created but no ID returned')
      }

      // 创建Checkpoints
      const checkpointPromises = editedMilestone.checkpoints.map((cp: any) =>
        fetch('/api/checkpoints', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            milestoneId,
            title: cp.title,
            description: cp.description,
            isCompleted: false
          })
        })
      )

      await Promise.all(checkpointPromises)

      // 成功
      toast({
        title: "创建成功! 🎉",
        description: `已创建Milestone和${editedMilestone.checkpoints.length}个Checkpoints`
      })

      setPhase('completed')
      setTimeout(() => {
        onMilestoneCreated()
        onClose()
        resetDialog()
      }, 1500)

    } catch (error: any) {
      console.error('Failed to create milestone:', error)
      toast({
        title: "创建失败",
        description: error.message || "无法保存到数据库",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  // 当对话框关闭时重置状态
  const handleOpenChange = (open: boolean) => {
    if (!open) {
      onClose()
      // 延迟重置，避免用户看到重置过程
      setTimeout(resetDialog, 300)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2 text-2xl">
              <Sparkles className="w-6 h-6 text-amber-500" />
              AI Milestone Creator
            </DialogTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleOpenChange(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
          <p className="text-sm text-gray-500 mt-2">
            {phase === 'questioning' && '通过几个问题帮助您创建一个清晰、可执行的Milestone'}
            {phase === 'preview' && '请review AI生成的Milestone草稿，您可以编辑后确认'}
            {phase === 'completed' && '创建完成！'}
          </p>
        </DialogHeader>

        <div className="mt-6">
          {/* 问答阶段 */}
          {phase === 'questioning' && currentResponse && currentResponse.question && (
            <AdaptiveQuestion
              question={currentResponse.question}
              sidebar={currentResponse.sidebar}
              onAnswer={handleAnswer}
              isLoading={isLoading}
              questionNumber={questionCount}
              totalQuestions={10} // 估算值，实际会动态变化
            />
          )}

          {/* 加载中 */}
          {phase === 'questioning' && isLoading && !currentResponse && (
            <div className="flex flex-col items-center justify-center py-16 text-gray-500">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
              <p>AI正在思考...</p>
            </div>
          )}

          {/* 预览阶段 */}
          {phase === 'preview' && currentResponse?.milestone && (
            <MilestoneDraftPreview
              milestone={currentResponse.milestone}
              smartCheck={currentResponse.smart_check}
              sidebar={currentResponse.sidebar}
              onConfirm={handleConfirm}
              onCancel={() => handleOpenChange(false)}
              isLoading={isLoading}
            />
          )}

          {/* 完成阶段 */}
          {phase === 'completed' && (
            <div className="text-center py-16">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Sparkles className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">创建成功！</h3>
              <p className="text-gray-600">Milestone已添加到您的Quest</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
