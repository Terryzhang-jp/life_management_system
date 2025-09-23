"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { X, Loader2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface DecisionFormProps {
  onDecisionAdded?: () => void
  onClose: () => void
}

export function DecisionForm({ onDecisionAdded, onClose }: DecisionFormProps) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [decision, setDecision] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!decision.trim()) {
      toast({
        title: "错误",
        description: "请输入决策内容",
        variant: "destructive"
      })
      return
    }

    setLoading(true)

    try {
      const response = await fetch('/api/decisions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          decision: decision.trim(),
          date: new Date().toISOString().split('T')[0],
          status: 'pending'
        })
      })

      if (response.ok) {
        toast({
          title: "成功",
          description: "决策已添加"
        })

        setDecision("")
        onClose()

        if (onDecisionAdded) {
          onDecisionAdded()
        }
      } else {
        const error = await response.json()
        throw new Error(error.error || 'Failed to add decision')
      }

    } catch (error) {
      console.error('Submit error:', error)
      toast({
        title: "添加失败",
        description: error instanceof Error ? error.message : "添加决策失败",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4 relative">
        {/* 关闭按钮 */}
        <Button
          variant="ghost"
          size="sm"
          onClick={onClose}
          className="absolute top-2 right-2 h-8 w-8 p-0"
        >
          <X className="h-4 w-4" />
        </Button>

        {/* 表单标题 */}
        <h3 className="text-lg font-semibold mb-4">添加今日决策</h3>

        {/* 表单内容 */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="decision">决策内容</Label>
            <Input
              id="decision"
              value={decision}
              onChange={(e) => setDecision(e.target.value)}
              placeholder="输入今天需要做出的重要决策..."
              className="text-sm"
              required
            />
          </div>

          <div className="flex gap-2">
            <Button
              type="submit"
              className="flex-1"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  添加中...
                </>
              ) : (
                "添加决策"
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={loading}
            >
              取消
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}