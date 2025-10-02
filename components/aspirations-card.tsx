"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Plus, X, Edit2, Save, Sparkles } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface Aspiration {
  id?: number
  title: string
  description?: string
  tags?: string[]
  createdAt?: string
  updatedAt?: string
}

export default function AspirationsCard() {
  const { toast } = useToast()
  const [aspirations, setAspirations] = useState<Aspiration[]>([])
  const [loading, setLoading] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)

  // 表单状态
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")

  useEffect(() => {
    fetchAspirations()
  }, [])

  const fetchAspirations = async () => {
    try {
      const response = await fetch('/api/aspirations')
      if (response.ok) {
        const data = await response.json()
        setAspirations(data)
      }
    } catch (error) {
      console.error('Failed to fetch aspirations:', error)
    }
  }

  const addAspiration = async () => {
    if (!title.trim()) {
      toast({
        title: "请输入心愿标题",
        variant: "destructive"
      })
      return
    }

    setLoading(true)
    try {
      const response = await fetch('/api/aspirations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim()
        })
      })

      if (response.ok) {
        await fetchAspirations()
        setTitle("")
        setDescription("")
        setShowForm(false)
        toast({
          title: "心愿已添加 ✨"
        })
      }
    } catch (error) {
      toast({
        title: "添加失败",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const updateAspiration = async (id: number, newTitle: string, newDesc: string) => {
    if (!newTitle.trim()) return

    setLoading(true)
    try {
      const response = await fetch('/api/aspirations', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id,
          title: newTitle.trim(),
          description: newDesc.trim()
        })
      })

      if (response.ok) {
        await fetchAspirations()
        setEditingId(null)
        toast({
          title: "心愿已更新"
        })
      }
    } catch (error) {
      toast({
        title: "更新失败",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const deleteAspiration = async (id: number) => {
    if (!confirm('确定要删除这个心愿吗？')) return

    setLoading(true)
    try {
      const response = await fetch(`/api/aspirations?id=${id}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        await fetchAspirations()
        toast({
          title: "心愿已删除"
        })
      }
    } catch (error) {
      toast({
        title: "删除失败",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const AspirationItem = ({ aspiration }: { aspiration: Aspiration }) => {
    const [isEditing, setIsEditing] = useState(false)
    const [editTitle, setEditTitle] = useState(aspiration.title)
    const [editDesc, setEditDesc] = useState(aspiration.description || "")

    if (isEditing) {
      return (
        <div className="space-y-2 p-3 bg-gray-50 rounded-lg">
          <Input
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            placeholder="心愿标题"
            autoFocus
          />
          <Textarea
            value={editDesc}
            onChange={(e) => setEditDesc(e.target.value)}
            placeholder="为什么想做这个？"
            className="min-h-[60px]"
          />
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={() => {
                updateAspiration(aspiration.id!, editTitle, editDesc)
                setIsEditing(false)
              }}
              disabled={loading}
            >
              <Save className="h-3 w-3 mr-1" />
              保存
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setEditTitle(aspiration.title)
                setEditDesc(aspiration.description || "")
                setIsEditing(false)
              }}
            >
              取消
            </Button>
          </div>
        </div>
      )
    }

    return (
      <div className="group p-3 hover:bg-gray-50 rounded-lg transition-colors">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-amber-500 flex-shrink-0" />
              <h3 className="font-medium text-gray-900 truncate">{aspiration.title}</h3>
            </div>
            {aspiration.description && (
              <p className="text-sm text-gray-600 mt-1 line-clamp-2">{aspiration.description}</p>
            )}
          </div>
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity ml-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setIsEditing(true)}
              className="h-7 w-7 p-0"
            >
              <Edit2 className="h-3 w-3" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => deleteAspiration(aspiration.id!)}
              className="h-7 w-7 p-0 hover:text-red-600"
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <Card className="h-fit">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-amber-500" />
          心愿
        </CardTitle>
        <p className="text-sm text-gray-600">没有压力，只是想做的事情</p>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* 心愿列表 */}
        {aspirations.length === 0 && !showForm && (
          <div className="text-center py-8 text-gray-400">
            <Sparkles className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">还没有心愿</p>
          </div>
        )}

        {aspirations.map((aspiration) => (
          <AspirationItem key={aspiration.id} aspiration={aspiration} />
        ))}

        {/* 添加表单 */}
        {showForm ? (
          <div className="space-y-2 p-3 border-2 border-dashed border-amber-200 rounded-lg bg-amber-50/30">
            <Input
              placeholder="想做什么？"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              autoFocus
            />
            <Textarea
              placeholder="为什么想做这个？（可选）"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="min-h-[60px]"
            />
            <div className="flex gap-2">
              <Button
                onClick={addAspiration}
                disabled={loading || !title.trim()}
                size="sm"
              >
                <Plus className="h-3 w-3 mr-1" />
                添加
              </Button>
              <Button
                variant="ghost"
                onClick={() => {
                  setShowForm(false)
                  setTitle("")
                  setDescription("")
                }}
                size="sm"
              >
                取消
              </Button>
            </div>
          </div>
        ) : (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowForm(true)}
            className="w-full border-dashed border-amber-300 hover:bg-amber-50 hover:border-amber-400"
          >
            <Plus className="h-3 w-3 mr-1" />
            添加心愿
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
