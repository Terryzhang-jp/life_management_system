"use client"

import { useState, useEffect, useCallback } from 'react'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Save, FileText } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { Note } from '@/lib/notes-db'

interface NoteEditorProps {
  note: Note | null
  onSave?: () => void
}

export default function NoteEditor({ note, onSave }: NoteEditorProps) {
  const { toast } = useToast()
  const [content, setContent] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)

  // 当笔记改变时更新内容
  useEffect(() => {
    if (note) {
      setContent(note.content)
      setHasUnsavedChanges(false)
    } else {
      setContent('')
      setHasUnsavedChanges(false)
    }
  }, [note])

  // 内容变化时标记为未保存
  const handleContentChange = (value: string) => {
    setContent(value)
    setHasUnsavedChanges(value !== (note?.content || ''))
  }

  // 保存笔记
  const handleSave = useCallback(async () => {
    if (!note || !hasUnsavedChanges) return

    setIsSaving(true)
    try {
      const response = await fetch(`/api/notes/${note.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content })
      })

      if (response.ok) {
        setHasUnsavedChanges(false)
        onSave?.()
        toast({
          title: "已保存",
          description: "笔记内容已保存"
        })
      } else {
        throw new Error('保存失败')
      }
    } catch (error) {
      console.error('Error saving note:', error)
      toast({
        title: "保存失败",
        description: "请稍后重试",
        variant: "destructive"
      })
    } finally {
      setIsSaving(false)
    }
  }, [note, content, hasUnsavedChanges, onSave, toast])

  // 自动保存 - 停止输入2秒后
  useEffect(() => {
    if (hasUnsavedChanges) {
      const timer = setTimeout(handleSave, 2000)
      return () => clearTimeout(timer)
    }
  }, [content, hasUnsavedChanges, handleSave])

  // 键盘快捷键保存
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault()
        handleSave()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [handleSave])

  if (!note) {
    return (
      <div className="h-full flex items-center justify-center text-gray-500">
        <div className="text-center">
          <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p className="text-lg font-medium">选择笔记开始编辑</p>
          <p className="text-sm">或创建一个新笔记</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      {/* 编辑器头部 */}
      <div className="flex items-center justify-between p-4 border-b bg-white">
        <h2 className="text-lg font-medium text-gray-900">{note.title}</h2>
        <div className="flex items-center gap-2">
          {hasUnsavedChanges && (
            <span className="text-xs text-orange-500">未保存</span>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={handleSave}
            disabled={!hasUnsavedChanges || isSaving}
          >
            <Save className="h-4 w-4 mr-2" />
            {isSaving ? '保存中...' : '保存'}
          </Button>
        </div>
      </div>

      {/* 文本编辑区域 */}
      <div className="flex-1 p-4">
        <Textarea
          value={content}
          onChange={(e) => handleContentChange(e.target.value)}
          placeholder="开始记录你的想法..."
          className="w-full h-full resize-none border-none shadow-none text-base leading-relaxed"
          style={{ minHeight: 'calc(100vh - 200px)' }}
        />
      </div>

      {/* 底部提示 */}
      <div className="px-4 py-2 border-t bg-gray-50 text-xs text-gray-500">
        提示：Ctrl+S 快速保存 • 停止输入2秒后自动保存
      </div>
    </div>
  )
}