"use client"

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Plus, X, Edit2, Save } from 'lucide-react'
import { cn } from '@/lib/utils'

interface WhiteboardTab {
  id: number
  title: string
}

interface WhiteboardTabsProps {
  whiteboards: WhiteboardTab[]
  activeWhiteboardId: number | null
  onWhiteboardSelect: (id: number) => void
  onWhiteboardCreate: (title: string) => void
  onWhiteboardRename: (id: number, title: string) => void
  onWhiteboardDelete: (id: number) => void
}

export default function WhiteboardTabs({
  whiteboards,
  activeWhiteboardId,
  onWhiteboardSelect,
  onWhiteboardCreate,
  onWhiteboardRename,
  onWhiteboardDelete
}: WhiteboardTabsProps) {
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editingTitle, setEditingTitle] = useState('')
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [newTitle, setNewTitle] = useState('')

  // 开始编辑标题
  const startEditing = (id: number, currentTitle: string) => {
    setEditingId(id)
    setEditingTitle(currentTitle)
  }

  // 保存编辑
  const saveEdit = () => {
    if (editingId && editingTitle.trim()) {
      onWhiteboardRename(editingId, editingTitle.trim())
    }
    setEditingId(null)
    setEditingTitle('')
  }

  // 取消编辑
  const cancelEdit = () => {
    setEditingId(null)
    setEditingTitle('')
  }

  // 创建新白板
  const createWhiteboard = () => {
    if (newTitle.trim()) {
      onWhiteboardCreate(newTitle.trim())
      setNewTitle('')
      setShowCreateForm(false)
    }
  }

  // 取消创建
  const cancelCreate = () => {
    setNewTitle('')
    setShowCreateForm(false)
  }

  return (
    <div className="flex items-center gap-2 px-4 py-2 bg-white border-b">
      {/* 现有白板标签 */}
      {whiteboards.map(whiteboard => (
        <div
          key={whiteboard.id}
          className={cn(
            'group flex items-center gap-2 px-3 py-1 rounded-md cursor-pointer transition-colors',
            activeWhiteboardId === whiteboard.id
              ? 'bg-blue-100 text-blue-700'
              : 'hover:bg-gray-100'
          )}
        >
          {editingId === whiteboard.id ? (
            // 编辑状态
            <div className="flex items-center gap-1">
              <Input
                value={editingTitle}
                onChange={(e) => setEditingTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') saveEdit()
                  if (e.key === 'Escape') cancelEdit()
                }}
                onBlur={saveEdit}
                className="h-6 px-2 py-1 text-xs w-24"
                autoFocus
              />
            </div>
          ) : (
            // 正常状态
            <>
              <span
                className="text-sm font-medium"
                onClick={() => onWhiteboardSelect(whiteboard.id)}
              >
                {whiteboard.title}
              </span>

              {/* 操作按钮 */}
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-5 w-5 p-0"
                  onClick={(e) => {
                    e.stopPropagation()
                    startEditing(whiteboard.id, whiteboard.title)
                  }}
                >
                  <Edit2 className="h-3 w-3" />
                </Button>

                {whiteboards.length > 1 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-5 w-5 p-0 text-red-500 hover:text-red-600"
                    onClick={(e) => {
                      e.stopPropagation()
                      onWhiteboardDelete(whiteboard.id)
                    }}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                )}
              </div>
            </>
          )}
        </div>
      ))}

      {/* 创建新白板 */}
      {showCreateForm ? (
        <div className="flex items-center gap-1">
          <Input
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') createWhiteboard()
              if (e.key === 'Escape') cancelCreate()
            }}
            placeholder="白板名称"
            className="h-6 px-2 py-1 text-xs w-24"
            autoFocus
          />
          <Button
            variant="ghost"
            size="sm"
            className="h-5 w-5 p-0"
            onClick={createWhiteboard}
          >
            <Save className="h-3 w-3" />
          </Button>
        </div>
      ) : (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowCreateForm(true)}
          className="h-7 px-2 text-xs"
        >
          <Plus className="h-3 w-3 mr-1" />
          新建白板
        </Button>
      )}
    </div>
  )
}