"use client"

import { useState } from 'react'
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Lightbulb, X, Save } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { usePathname } from 'next/navigation'

export default function GlobalThoughtBubble() {
  const [isOpen, setIsOpen] = useState(false)
  const [content, setContent] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()
  const pathname = usePathname()

  const handleSave = async () => {
    if (!content.trim()) {
      toast({
        title: "提示",
        description: "请输入您的思考内容",
        variant: "destructive"
      })
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch('/api/thoughts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: content.trim(),
          page: pathname
        })
      })

      if (response.ok) {
        toast({
          title: "成功",
          description: "思考已记录"
        })
        setContent("")
        setIsOpen(false)
      } else {
        throw new Error('Failed to save thought')
      }
    } catch (error) {
      toast({
        title: "错误",
        description: "保存失败，请重试",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleCancel = () => {
    setContent("")
    setIsOpen(false)
  }

  return (
    <>
      {/* 悬浮按钮 */}
      <div className="fixed bottom-6 right-6 z-50">
        <Button
          onClick={() => setIsOpen(true)}
          className="w-14 h-14 rounded-full shadow-lg bg-blue-500 hover:bg-blue-600 text-white"
          size="sm"
        >
          <Lightbulb className="h-6 w-6" />
        </Button>
      </div>

      {/* 思考记录弹窗 */}
      {isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-md shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">💭 记录思考</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCancel}
                disabled={isLoading}
                className="h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <Textarea
              placeholder="记录你的所思所想..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="min-h-[120px] mb-4"
              autoFocus
              disabled={isLoading}
            />

            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={handleCancel}
                disabled={isLoading}
                size="sm"
              >
                取消
              </Button>
              <Button
                onClick={handleSave}
                disabled={isLoading || !content.trim()}
                size="sm"
              >
                {isLoading ? (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent mr-2" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                保存
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}