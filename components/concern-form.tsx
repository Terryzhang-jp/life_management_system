"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { X, Loader2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface ConcernFormProps {
  onConcernAdded?: () => void
  onClose: () => void
  editConcern?: {
    id: number
    concern: string
  }
}

export function ConcernForm({ onConcernAdded, onClose, editConcern }: ConcernFormProps) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [concern, setConcern] = useState(editConcern?.concern || "")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!concern.trim()) {
      toast({
        title: "错误",
        description: "请输入纠结内容",
        variant: "destructive"
      })
      return
    }

    setLoading(true)

    try {
      const url = editConcern ? '/api/concerns' : '/api/concerns'
      const method = editConcern ? 'PUT' : 'POST'
      const body = editConcern
        ? { id: editConcern.id, concern: concern.trim() }
        : { concern: concern.trim() }

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      })

      if (response.ok) {
        toast({
          title: "成功",
          description: editConcern ? "纠结已更新" : "纠结已添加"
        })

        setConcern("")
        onClose()

        if (onConcernAdded) {
          onConcernAdded()
        }
      } else {
        const error = await response.json()
        throw new Error(error.error || 'Failed to save concern')
      }

    } catch (error) {
      console.error('Submit error:', error)
      toast({
        title: editConcern ? "更新失败" : "添加失败",
        description: error instanceof Error ? error.message : "操作失败",
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
        <h3 className="text-lg font-semibold mb-4">
          {editConcern ? "编辑纠结" : "添加纠结"}
        </h3>

        {/* 表单内容 */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="concern">纠结内容</Label>
            <Input
              id="concern"
              value={concern}
              onChange={(e) => setConcern(e.target.value)}
              placeholder="最近在思考或纠结什么..."
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
                  {editConcern ? "更新中..." : "添加中..."}
                </>
              ) : (
                editConcern ? "更新纠结" : "添加纠结"
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