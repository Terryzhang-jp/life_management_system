"use client"

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Plus, X, Edit2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Note } from '@/lib/notes-db'

interface NoteTabsProps {
  notes: Note[]
  activeNoteId: number | null
  onNoteSelect: (id: number) => void
  onNoteCreate: (title: string) => void
  onNoteRename: (id: number, title: string) => void
  onNoteDelete: (id: number) => void
}

export default function NoteTabs({
  notes,
  activeNoteId,
  onNoteSelect,
  onNoteCreate,
  onNoteRename,
  onNoteDelete
}: NoteTabsProps) {
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
      onNoteRename(editingId, editingTitle.trim())
    }
    setEditingId(null)
    setEditingTitle('')
  }

  // 取消编辑
  const cancelEdit = () => {
    setEditingId(null)
    setEditingTitle('')
  }

  // 创建新笔记
  const createNote = () => {
    if (newTitle.trim()) {
      onNoteCreate(newTitle.trim())
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
    <div className="flex items-center gap-2 px-4 py-2 bg-white border-b overflow-x-auto">
      {/* 现有笔记标签 */}
      {notes.map(note => (
        <div
          key={note.id}
          className={cn(
            'group flex items-center gap-2 px-3 py-1 rounded-md cursor-pointer transition-colors whitespace-nowrap',
            activeNoteId === note.id
              ? 'bg-blue-100 text-blue-700'
              : 'hover:bg-gray-100'
          )}
        >
          {editingId === note.id ? (
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
                className="h-6 px-2 py-1 text-xs w-32"
                autoFocus
              />
            </div>
          ) : (
            // 正常状态
            <>
              <div
                className="flex flex-col"
                onClick={() => onNoteSelect(note.id!)}
              >
                <span
                  className="text-sm font-medium truncate max-w-[150px]"
                  title={note.title}
                >
                  {note.title}
                </span>
                <span className="text-xs text-gray-400">
                  {note.createdAt ? new Date(note.createdAt).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' }) : ''}
                </span>
              </div>

              {/* 操作按钮 */}
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-5 w-5 p-0"
                  onClick={(e) => {
                    e.stopPropagation()
                    startEditing(note.id!, note.title)
                  }}
                >
                  <Edit2 className="h-3 w-3" />
                </Button>

                {notes.length > 1 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-5 w-5 p-0 text-red-500 hover:text-red-600"
                    onClick={(e) => {
                      e.stopPropagation()
                      onNoteDelete(note.id!)
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

      {/* 创建新笔记 */}
      {showCreateForm ? (
        <div className="flex items-center gap-1">
          <Input
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') createNote()
              if (e.key === 'Escape') cancelCreate()
            }}
            placeholder="笔记标题"
            className="h-6 px-2 py-1 text-xs w-32"
            autoFocus
          />
          <Button
            variant="ghost"
            size="sm"
            className="h-5 w-5 p-0 text-green-600"
            onClick={createNote}
          >
            <Plus className="h-3 w-3" />
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
          新建笔记
        </Button>
      )}
    </div>
  )
}