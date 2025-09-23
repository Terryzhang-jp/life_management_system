"use client"

import { useState, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { ArrowLeft, Edit2, Trash2, Save, X } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import Link from "next/link"

interface Thought {
  id?: number
  content: string
  createdAt?: string
  page?: string
}

export default function ThoughtsPage() {
  const [thoughts, setThoughts] = useState<Thought[]>([])
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editContent, setEditContent] = useState("")
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  // 加载思考记录
  const loadThoughts = async () => {
    try {
      const response = await fetch('/api/thoughts')
      if (response.ok) {
        const data = await response.json()
        setThoughts(data)
      }
    } catch (error) {
      console.error('Error loading thoughts:', error)
    }
  }

  useEffect(() => {
    loadThoughts()
  }, [])

  // 开始编辑
  const startEdit = (thought: Thought) => {
    setEditingId(thought.id!)
    setEditContent(thought.content)
  }

  // 取消编辑
  const cancelEdit = () => {
    setEditingId(null)
    setEditContent("")
  }

  // 保存编辑
  const saveEdit = async () => {
    if (!editContent.trim()) {
      toast({
        title: "提示",
        description: "内容不能为空",
        variant: "destructive"
      })
      return
    }

    setLoading(true)
    try {
      const response = await fetch('/api/thoughts', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingId,
          content: editContent.trim()
        })
      })

      if (response.ok) {
        await loadThoughts()
        setEditingId(null)
        setEditContent("")
        toast({
          title: "成功",
          description: "思考已更新"
        })
      } else {
        throw new Error('Failed to update thought')
      }
    } catch (error) {
      toast({
        title: "错误",
        description: "更新失败",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  // 删除思考
  const deleteThought = async (id: number) => {
    if (!confirm('确定要删除这条思考记录吗？')) return

    setLoading(true)
    try {
      const response = await fetch(`/api/thoughts?id=${id}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        await loadThoughts()
        toast({
          title: "成功",
          description: "思考已删除"
        })
      } else {
        throw new Error('Failed to delete thought')
      }
    } catch (error) {
      toast({
        title: "错误",
        description: "删除失败",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  // 格式化时间
  const formatTime = (timeString?: string) => {
    if (!timeString) return ''
    const date = new Date(timeString)
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        {/* 头部 */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <Link href="/">
              <Button variant="outline" size="sm">
                <ArrowLeft className="w-4 h-4 mr-2" />
                返回主页
              </Button>
            </Link>
            <Link href="/past">
              <Button variant="outline" size="sm">
                过去页面
              </Button>
            </Link>
          </div>
          <h1 className="text-3xl font-bold text-gray-900">💭 思考记录</h1>
          <p className="text-gray-600 mt-2">记录您的所思所想，留下思考的足迹</p>
        </div>

        {/* 思考记录列表 */}
        <div className="space-y-4">
          {thoughts.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500 text-lg">还没有任何思考记录</p>
              <p className="text-gray-400 text-sm mt-2">点击右下角的💡按钮开始记录您的想法</p>
            </div>
          ) : (
            thoughts.map((thought) => (
              <Card key={thought.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <span>{formatTime(thought.createdAt)}</span>
                      {thought.page && (
                        <>
                          <span>•</span>
                          <span className="bg-gray-100 px-2 py-1 rounded text-xs">
                            {thought.page === '/' ? '首页' :
                             thought.page === '/tasks' ? '任务管理' :
                             thought.page === '/thoughts' ? '思考记录' : thought.page}
                          </span>
                        </>
                      )}
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => startEdit(thought)}
                        disabled={loading || editingId === thought.id}
                        className="h-8 w-8 p-0"
                      >
                        <Edit2 className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteThought(thought.id!)}
                        disabled={loading}
                        className="h-8 w-8 p-0 text-red-500 hover:text-red-700"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {editingId === thought.id ? (
                    <div className="space-y-3">
                      <Textarea
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        className="min-h-[100px]"
                        autoFocus
                      />
                      <div className="flex gap-2 justify-end">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={cancelEdit}
                          disabled={loading}
                        >
                          <X className="h-3 w-3 mr-1" />
                          取消
                        </Button>
                        <Button
                          size="sm"
                          onClick={saveEdit}
                          disabled={loading || !editContent.trim()}
                        >
                          <Save className="h-3 w-3 mr-1" />
                          保存
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-gray-800 whitespace-pre-wrap leading-relaxed">
                      {thought.content}
                    </p>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  )
}