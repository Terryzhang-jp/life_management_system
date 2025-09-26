"use client"

import { useState } from 'react'
import Link from 'next/link'
import { Edit, Trash2, Eye, Tag, Calendar, MoreVertical } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { type MentalModel } from '@/lib/mental-models-db'

interface MentalModelCardProps {
  model: MentalModel
  onUpdate: () => void
}

export function MentalModelCard({ model, onUpdate }: MentalModelCardProps) {
  const [showMenu, setShowMenu] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  // 删除心智模型
  const handleDelete = async () => {
    if (!confirm('确定要删除这个心智模型吗？此操作无法撤销。')) {
      return
    }

    try {
      setIsDeleting(true)
      const response = await fetch(`/api/mental-models?id=${model.id}`, {
        method: 'DELETE'
      })

      const result = await response.json()

      if (result.success) {
        onUpdate() // 刷新列表
      } else {
        console.error('Failed to delete mental model:', result.error)
        alert('删除失败，请重试')
      }
    } catch (error) {
      console.error('Error deleting mental model:', error)
      alert('删除失败，请重试')
    } finally {
      setIsDeleting(false)
      setShowMenu(false)
    }
  }

  // 格式化时间
  const formatDate = (dateString?: string) => {
    if (!dateString) return '未知'

    const date = new Date(dateString)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))

    if (days === 0) return '今天'
    if (days === 1) return '昨天'
    if (days < 7) return `${days}天前`
    if (days < 30) return `${Math.floor(days / 7)}周前`
    if (days < 365) return `${Math.floor(days / 30)}个月前`
    return `${Math.floor(days / 365)}年前`
  }

  // 生成缩略图预览
  const renderThumbnail = () => {
    if (model.thumbnail) {
      return (
        <img
          src={model.thumbnail}
          alt={model.title}
          className="w-full h-32 object-cover"
        />
      )
    }

    // 如果没有缩略图，显示简单的可视化预览
    return (
      <div className="flex h-32 w-full items-center justify-center bg-neutral-100">
        <div className="space-y-3 text-center">
          <div className="mx-auto h-12 w-20 border border-neutral-300" />
          <div className="mx-auto h-px w-24 bg-neutral-300" />
          <p className="text-xs uppercase tracking-[0.3em] text-neutral-400">Canvas</p>
        </div>
      </div>
    )
  }

  return (
    <Card className="group flex flex-col border border-neutral-200 bg-white transition-colors hover:border-neutral-400">
      {/* 缩略图区域 */}
      <div className="relative">
        {renderThumbnail()}

        {/* 操作菜单 */}
        <div className="absolute top-2 right-2">
          <div className="relative">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 rounded-none border border-neutral-200 bg-white/90 p-0 text-neutral-600 hover:bg-white"
              onClick={() => setShowMenu(!showMenu)}
            >
              <MoreVertical className="w-4 h-4" />
            </Button>

            {showMenu && (
              <div className="absolute right-0 top-8 z-10 min-w-32 border border-neutral-200 bg-white py-1 text-sm">
                <Link href={`/mental-models/${model.id}`}>
                  <button className="flex w-full items-center gap-2 px-3 py-2 text-left text-neutral-700 hover:bg-neutral-100">
                    <Eye className="h-3 w-3" />
                    查看
                  </button>
                </Link>
                <button
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-neutral-700 hover:bg-neutral-100 disabled:opacity-50"
                >
                  <Trash2 className="h-3 w-3" />
                  {isDeleting ? '删除中…' : '删除'}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* 分类标签 */}
        {model.category && (
          <div className="absolute bottom-2 left-2">
            <span className="inline-flex items-center gap-1 border border-white bg-white/90 px-2 py-1 text-xs font-medium text-neutral-600">
              <Tag className="h-3 w-3" />
              {model.category}
            </span>
          </div>
        )}
      </div>

      {/* 内容区域 */}
      <div className="flex flex-1 flex-col gap-4 p-4">
        <Link href={`/mental-models/${model.id}`}>
          <h3 className="mb-1 line-clamp-1 text-base font-medium text-neutral-900 transition group-hover:text-neutral-600">
            {model.title}
          </h3>
        </Link>

        <p className="text-sm text-neutral-500 line-clamp-3">
          {model.description || '暂无描述'}
        </p>

        {/* 标签 */}
        {model.tags && model.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {model.tags.slice(0, 3).map(tag => (
              <span
                key={tag}
                className="inline-block border border-neutral-200 px-2 py-0.5 text-xs text-neutral-500"
              >
                #{tag}
              </span>
            ))}
            {model.tags.length > 3 && (
              <span className="inline-block border border-neutral-200 px-2 py-0.5 text-xs text-neutral-500">
                +{model.tags.length - 3}
              </span>
            )}
          </div>
        )}

        {/* 底部信息 */}
        <div className="mt-auto flex items-center justify-between text-xs text-neutral-500">
          <div className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            <span>更新于 {formatDate(model.updatedAt)}</span>
          </div>

          <Link href={`/mental-models/${model.id}`} className="text-neutral-700 transition hover:text-neutral-900">
            <span className="inline-flex items-center gap-1 text-xs font-medium">
              <Edit className="h-3 w-3" />
              编辑
            </span>
          </Link>
        </div>
      </div>

      {/* 点击遮罩，关闭菜单 */}
      {showMenu && (
        <div
          className="fixed inset-0 z-0"
          onClick={() => setShowMenu(false)}
        />
      )}
    </Card>
  )
}
