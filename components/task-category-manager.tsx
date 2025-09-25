"use client"

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Settings, Plus, Edit2, Trash2, Save, X } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface TaskCategory {
  id?: number
  name: string
  color: string
  icon?: string
  order?: number
}

export default function TaskCategoryManager() {
  const { toast } = useToast()
  const [categories, setCategories] = useState<TaskCategory[]>([])
  const [showManager, setShowManager] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editingCategory, setEditingCategory] = useState<TaskCategory | null>(null)
  const [newCategory, setNewCategory] = useState<TaskCategory>({ name: '', color: '#3B82F6' })
  const [showNewForm, setShowNewForm] = useState(false)
  const [loading, setLoading] = useState(false)

  // 加载分类列表
  const loadCategories = async () => {
    try {
      const res = await fetch('/api/task-categories')
      if (res.ok) {
        const data = await res.json()
        setCategories(data)
      }
    } catch (error) {
      console.error('Failed to load categories:', error)
      toast({
        title: "加载失败",
        description: "无法加载分类列表",
        variant: "destructive"
      })
    }
  }

  useEffect(() => {
    loadCategories()
  }, [])

  // 创建新分类
  const handleCreate = async () => {
    if (!newCategory.name.trim()) {
      toast({
        title: "请输入分类名称",
        variant: "destructive"
      })
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/task-categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newCategory)
      })

      if (res.ok) {
        const created = await res.json()
        setCategories([...categories, created])
        setNewCategory({ name: '', color: '#3B82F6' })
        setShowNewForm(false)
        toast({
          title: "创建成功",
          description: `分类 "${created.name}" 已创建`
        })
      } else {
        const error = await res.json()
        toast({
          title: "创建失败",
          description: error.error || "无法创建分类",
          variant: "destructive"
        })
      }
    } catch (error) {
      toast({
        title: "创建失败",
        description: "网络错误",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  // 更新分类
  const handleUpdate = async () => {
    if (!editingCategory || !editingCategory.name.trim()) {
      toast({
        title: "请输入分类名称",
        variant: "destructive"
      })
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/task-categories', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...editingCategory, id: editingId })
      })

      if (res.ok) {
        const updated = await res.json()
        setCategories(categories.map(c => c.id === editingId ? updated : c))
        setEditingId(null)
        setEditingCategory(null)
        toast({
          title: "更新成功",
          description: `分类 "${updated.name}" 已更新`
        })
      } else {
        const error = await res.json()
        toast({
          title: "更新失败",
          description: error.error || "无法更新分类",
          variant: "destructive"
        })
      }
    } catch (error) {
      toast({
        title: "更新失败",
        description: "网络错误",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  // 删除分类
  const handleDelete = async (id: number) => {
    if (!confirm('确定要删除这个分类吗？')) {
      return
    }

    setLoading(true)
    try {
      const res = await fetch(`/api/task-categories?id=${id}`, {
        method: 'DELETE'
      })

      if (res.ok) {
        setCategories(categories.filter(c => c.id !== id))
        toast({
          title: "删除成功",
          description: "分类已删除"
        })
      } else {
        const error = await res.json()
        toast({
          title: "删除失败",
          description: error.error || "无法删除分类",
          variant: "destructive"
        })
      }
    } catch (error) {
      toast({
        title: "删除失败",
        description: "网络错误",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      {/* 管理按钮 */}
      <Button
        onClick={() => setShowManager(!showManager)}
        size="sm"
        variant="outline"
        className="gap-2"
      >
        <Settings className="h-4 w-4" />
        分类管理
      </Button>

      {/* 管理弹窗 */}
      {showManager && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-lg p-6 w-[500px] max-h-[600px] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">任务分类管理</h3>
              <Button
                onClick={() => setShowManager(false)}
                size="icon"
                variant="ghost"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* 分类列表 */}
            <div className="space-y-2 mb-4">
              {categories.map(category => (
                <div key={category.id} className="flex items-center gap-2 p-2 rounded hover:bg-gray-50">
                  {editingId === category.id ? (
                    <>
                      <Input
                        value={editingCategory?.name || ''}
                        onChange={(e) => setEditingCategory({ ...editingCategory!, name: e.target.value })}
                        className="flex-1"
                        placeholder="分类名称"
                      />
                      <Input
                        type="color"
                        value={editingCategory?.color || '#3B82F6'}
                        onChange={(e) => setEditingCategory({ ...editingCategory!, color: e.target.value })}
                        className="w-16"
                      />
                      <Button
                        onClick={handleUpdate}
                        size="icon"
                        variant="ghost"
                        disabled={loading}
                      >
                        <Save className="h-4 w-4" />
                      </Button>
                      <Button
                        onClick={() => {
                          setEditingId(null)
                          setEditingCategory(null)
                        }}
                        size="icon"
                        variant="ghost"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </>
                  ) : (
                    <>
                      <div
                        className="w-6 h-6 rounded"
                        style={{ backgroundColor: category.color }}
                      />
                      <span className="flex-1">{category.name}</span>
                      <Button
                        onClick={() => {
                          setEditingId(category.id!)
                          setEditingCategory(category)
                        }}
                        size="icon"
                        variant="ghost"
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        onClick={() => handleDelete(category.id!)}
                        size="icon"
                        variant="ghost"
                        disabled={loading}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                </div>
              ))}
            </div>

            {/* 新增分类表单 */}
            {showNewForm ? (
              <div className="flex items-center gap-2 p-2 border rounded">
                <Input
                  value={newCategory.name}
                  onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })}
                  className="flex-1"
                  placeholder="分类名称"
                />
                <Input
                  type="color"
                  value={newCategory.color}
                  onChange={(e) => setNewCategory({ ...newCategory, color: e.target.value })}
                  className="w-16"
                />
                <Button
                  onClick={handleCreate}
                  size="icon"
                  variant="ghost"
                  disabled={loading}
                >
                  <Save className="h-4 w-4" />
                </Button>
                <Button
                  onClick={() => {
                    setShowNewForm(false)
                    setNewCategory({ name: '', color: '#3B82F6' })
                  }}
                  size="icon"
                  variant="ghost"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <Button
                onClick={() => setShowNewForm(true)}
                className="w-full"
                variant="outline"
              >
                <Plus className="h-4 w-4 mr-2" />
                添加新分类
              </Button>
            )}
          </div>
        </div>
      )}
    </>
  )
}