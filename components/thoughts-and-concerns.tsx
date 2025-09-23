"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Plus, Edit2, Trash2, Check, ChevronDown, ChevronUp, History } from "lucide-react"
import { ConcernForm } from "./concern-form"
import { useToast } from "@/hooks/use-toast"

interface ConcernRecord {
  id?: number
  concern: string
  status: 'pending' | 'resolved'
  createdAt: string
  resolvedAt?: string
  updatedAt: string
}

interface ThoughtsAndConcernsProps {
  className?: string
}

export function ThoughtsAndConcerns({ className }: ThoughtsAndConcernsProps) {
  const { toast } = useToast()
  const [concerns, setConcerns] = useState<ConcernRecord[]>([])
  const [resolvedConcerns, setResolvedConcerns] = useState<ConcernRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingHistory, setLoadingHistory] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [editingConcern, setEditingConcern] = useState<{id: number, concern: string} | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)

  // 获取未解决的纠结
  const fetchActiveConcerns = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/concerns?type=active')
      if (response.ok) {
        const data = await response.json()
        setConcerns(data)
      }
    } catch (error) {
      console.error('Failed to fetch concerns:', error)
    } finally {
      setLoading(false)
    }
  }

  // 获取已解决的纠结（历史记录）
  const fetchResolvedConcerns = async () => {
    try {
      setLoadingHistory(true)
      const response = await fetch('/api/concerns?type=history&limit=20')
      if (response.ok) {
        const data = await response.json()
        setResolvedConcerns(data)
      }
    } catch (error) {
      console.error('Failed to fetch resolved concerns:', error)
    } finally {
      setLoadingHistory(false)
    }
  }

  // 切换历史记录显示
  const toggleHistorySection = () => {
    if (!showHistory) {
      fetchResolvedConcerns()
    }
    setShowHistory(!showHistory)
  }

  useEffect(() => {
    fetchActiveConcerns()
  }, [refreshKey])

  // 当新纠结添加或编辑时刷新数据
  const handleConcernAddedOrEdited = () => {
    setRefreshKey(prev => prev + 1)
    if (showHistory) {
      fetchResolvedConcerns()
    }
    setShowForm(false)
    setEditingConcern(null)
  }

  // 标记纠结为已解决
  const handleResolveConcern = async (id: number) => {
    try {
      const response = await fetch('/api/concerns', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          id,
          action: 'resolve'
        })
      })

      if (response.ok) {
        toast({
          title: "成功",
          description: "纠结已解决"
        })
        setRefreshKey(prev => prev + 1)
        if (showHistory) {
          fetchResolvedConcerns()
        }
      } else {
        const error = await response.json()
        throw new Error(error.error || 'Resolve failed')
      }
    } catch (error) {
      console.error('Resolve error:', error)
      toast({
        title: "操作失败",
        description: error instanceof Error ? error.message : "标记已解决失败",
        variant: "destructive"
      })
    }
  }

  // 删除纠结
  const handleDeleteConcern = async (id: number, isResolved: boolean = false) => {
    if (!confirm('确定要删除这个纠结吗？')) return

    try {
      const response = await fetch(`/api/concerns?id=${id}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        toast({
          title: "成功",
          description: "纠结已删除"
        })
        if (isResolved && showHistory) {
          fetchResolvedConcerns()
        } else {
          setRefreshKey(prev => prev + 1)
        }
      } else {
        const error = await response.json()
        throw new Error(error.error || 'Delete failed')
      }
    } catch (error) {
      console.error('Delete error:', error)
      toast({
        title: "删除失败",
        description: error instanceof Error ? error.message : "删除纠结失败",
        variant: "destructive"
      })
    }
  }

  // 开始编辑
  const handleEditConcern = (concern: ConcernRecord) => {
    setEditingConcern({ id: concern.id!, concern: concern.concern })
    setShowForm(true)
  }

  // 格式化时间
  const formatTime = (timeString: string) => {
    const date = new Date(timeString)
    return date.toLocaleDateString('zh-CN', {
      month: '2-digit',
      day: '2-digit'
    })
  }

  if (loading) {
    return (
      <div className={`bg-white rounded-lg border p-4 ${className}`}>
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-sm font-medium">最近在思考或纠结</h3>
        </div>
        <div className="animate-pulse space-y-2">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-16 bg-yellow-100 rounded shadow"></div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className={`bg-white rounded-lg border p-4 ${className}`}>
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-sm font-medium">最近在思考或纠结</h3>
        {concerns.length < 3 && (
          <Button
            onClick={() => setShowForm(true)}
            size="sm"
            variant="outline"
            className="flex items-center gap-1 text-xs"
          >
            <Plus className="h-3 w-3" />
            添加
          </Button>
        )}
      </div>

      {/* 纠结列表 - 便签纸风格 */}
      <div className="space-y-2">
        {concerns.map((concern, index) => (
          <Card
            key={concern.id}
            className="border border-yellow-200 bg-yellow-50 shadow-sm transform rotate-1 hover:rotate-0 transition-transform"
            style={{
              transform: `rotate(${(index % 2 === 0 ? 1 : -1) * 0.5}deg)`
            }}
          >
            <CardContent className="p-3">
              <div className="flex justify-between items-start gap-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-medium text-orange-600">
                      纠结 {index + 1}
                    </span>
                    <span className="text-xs text-gray-500">
                      {formatTime(concern.createdAt)}
                    </span>
                  </div>
                  <p className="text-sm text-gray-800 leading-relaxed">
                    {concern.concern}
                  </p>
                </div>
                <div className="flex gap-1">
                  <Button
                    onClick={() => handleResolveConcern(concern.id!)}
                    size="sm"
                    variant="ghost"
                    className="h-6 w-6 p-0 text-gray-400 hover:text-green-500"
                    title="标记已解决"
                  >
                    <Check className="h-3 w-3" />
                  </Button>
                  <Button
                    onClick={() => handleEditConcern(concern)}
                    size="sm"
                    variant="ghost"
                    className="h-6 w-6 p-0 text-gray-400 hover:text-blue-500"
                    title="编辑"
                  >
                    <Edit2 className="h-3 w-3" />
                  </Button>
                  <Button
                    onClick={() => handleDeleteConcern(concern.id!)}
                    size="sm"
                    variant="ghost"
                    className="h-6 w-6 p-0 text-gray-400 hover:text-red-500"
                    title="删除"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {/* 空白占位符 - 便签纸风格 */}
        {concerns.length < 3 && (
          Array.from({ length: 3 - concerns.length }).map((_, index) => (
            <Card
              key={`empty-${index}`}
              className="border border-dashed border-yellow-300 bg-yellow-25"
            >
              <CardContent className="p-3">
                <div className="flex items-center justify-center h-10">
                  <span className="text-xs text-yellow-600">
                    纠结 {concerns.length + index + 1} - 待添加
                  </span>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* 历史记录区域 */}
      {resolvedConcerns.length > 0 && (
        <div className="mt-4 border-t pt-3">
          <Button
            onClick={toggleHistorySection}
            variant="ghost"
            className="w-full justify-between p-2 h-8 text-xs"
          >
            <span className="text-green-600 flex items-center gap-1">
              <History className="h-3 w-3" />
              已解决历史 ({resolvedConcerns.length})
            </span>
            {showHistory ? (
              <ChevronUp className="h-3 w-3" />
            ) : (
              <ChevronDown className="h-3 w-3" />
            )}
          </Button>

          {showHistory && (
            <div className="mt-2 space-y-2">
              {loadingHistory ? (
                <div className="animate-pulse space-y-2">
                  {[1, 2].map(i => (
                    <div key={i} className="h-12 bg-green-100 rounded"></div>
                  ))}
                </div>
              ) : (
                resolvedConcerns.map((concern) => (
                  <Card key={concern.id} className="border border-green-200 bg-green-50">
                    <CardContent className="p-3">
                      <div className="flex justify-between items-start gap-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs text-green-600 font-medium">
                              已解决
                            </span>
                            <span className="text-xs text-gray-500">
                              {concern.resolvedAt && formatTime(concern.resolvedAt)}
                            </span>
                          </div>
                          <p className="text-sm text-gray-700 line-through">{concern.concern}</p>
                        </div>
                        <Button
                          onClick={() => handleDeleteConcern(concern.id!, true)}
                          size="sm"
                          variant="ghost"
                          className="h-6 w-6 p-0 text-gray-400 hover:text-red-500"
                          title="删除"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          )}
        </div>
      )}

      {/* 说明文字 */}
      <div className="mt-3 text-xs text-gray-500">
        <p>记录生活中的思考与纠结，最多3条未解决</p>
      </div>

      {/* 弹框表单 */}
      {showForm && (
        <ConcernForm
          onConcernAdded={handleConcernAddedOrEdited}
          onClose={() => {
            setShowForm(false)
            setEditingConcern(null)
          }}
          editConcern={editingConcern}
        />
      )}
    </div>
  )
}