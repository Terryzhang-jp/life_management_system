"use client"

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import Link from 'next/link'
import SimpleTaskTree from '../whiteboard/simple-task-tree'
import NoteEditor from './note-editor'
import NoteTabs from './note-tabs'
import ChatInterface from '../workspace/chat-interface'
import { Note } from '@/lib/notes-db'

export default function NotesWorkspace() {
  const { toast } = useToast()
  const [notes, setNotes] = useState<Note[]>([])
  const [activeNote, setActiveNote] = useState<Note | null>(null)
  const [loading, setLoading] = useState(false)

  // 加载所有笔记
  const loadNotes = useCallback(async () => {
    try {
      const response = await fetch('/api/notes')
      if (response.ok) {
        const data = await response.json()
        setNotes(data)

        // 如果没有活跃笔记但有笔记列表，选择第一个
        if (!activeNote && data.length > 0) {
          setActiveNote(data[0])
        }
      }
    } catch (error) {
      console.error('Error loading notes:', error)
      toast({
        title: "错误",
        description: "加载笔记列表失败",
        variant: "destructive"
      })
    }
  }, [activeNote, toast])

  // 选择笔记
  const selectNote = async (id: number) => {
    try {
      setLoading(true)
      const response = await fetch(`/api/notes/${id}`)
      if (response.ok) {
        const note = await response.json()
        setActiveNote(note)
      } else {
        throw new Error('Failed to load note')
      }
    } catch (error) {
      console.error('Error loading note:', error)
      toast({
        title: "错误",
        description: "加载笔记失败",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  // 创建新笔记
  const createNote = async (title: string) => {
    try {
      const response = await fetch('/api/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title })
      })

      if (response.ok) {
        const { id } = await response.json()
        await loadNotes()
        await selectNote(id)
        toast({
          title: "成功",
          description: "笔记创建成功"
        })
      } else {
        throw new Error('Failed to create note')
      }
    } catch (error) {
      console.error('Error creating note:', error)
      toast({
        title: "错误",
        description: "创建笔记失败",
        variant: "destructive"
      })
    }
  }

  // 重命名笔记
  const renameNote = async (id: number, title: string) => {
    try {
      const response = await fetch(`/api/notes/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title })
      })

      if (response.ok) {
        await loadNotes()
        if (activeNote?.id === id) {
          setActiveNote(prev => prev ? { ...prev, title } : null)
        }
        toast({
          title: "成功",
          description: "笔记重命名成功"
        })
      } else {
        throw new Error('Failed to rename note')
      }
    } catch (error) {
      console.error('Error renaming note:', error)
      toast({
        title: "错误",
        description: "重命名笔记失败",
        variant: "destructive"
      })
    }
  }

  // 删除笔记
  const deleteNote = async (id: number) => {
    try {
      const response = await fetch(`/api/notes/${id}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        await loadNotes()

        // 如果删除的是当前活跃笔记，切换到其他笔记
        if (activeNote?.id === id) {
          const remainingNotes = notes.filter(n => n.id !== id)
          if (remainingNotes.length > 0) {
            setActiveNote(remainingNotes[0])
          } else {
            setActiveNote(null)
          }
        }

        toast({
          title: "成功",
          description: "笔记删除成功"
        })
      } else {
        throw new Error('Failed to delete note')
      }
    } catch (error) {
      console.error('Error deleting note:', error)
      toast({
        title: "错误",
        description: "删除笔记失败",
        variant: "destructive"
      })
    }
  }

  // 刷新笔记列表（保存后调用）
  const handleNoteSaved = async () => {
    await loadNotes()
  }

  // 初始化 - 只加载笔记，不自动创建
  useEffect(() => {
    loadNotes()
  }, [])

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 头部 */}
      <div className="bg-white border-b">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-4">
            <Link href="/tasks">
              <Button variant="outline" size="sm">
                <ArrowLeft className="w-4 h-4 mr-2" />
                返回任务管理
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">📝 思维整理工作台</h1>
              <p className="text-sm text-gray-600">左侧查看任务，中间记录想法，右侧AI助手</p>
            </div>
          </div>
        </div>

        {/* 笔记标签页 */}
        <NoteTabs
          notes={notes}
          activeNoteId={activeNote?.id || null}
          onNoteSelect={selectNote}
          onNoteCreate={createNote}
          onNoteRename={renameNote}
          onNoteDelete={deleteNote}
        />
      </div>

      {/* 主工作区 - 三栏布局 */}
      <div className="flex h-[calc(100vh-140px)] w-full">
        {/* 左侧：任务树面板 */}
        <div className="w-1/4 min-w-0 flex-shrink-0 border-r bg-white overflow-y-auto">
          <SimpleTaskTree />
        </div>

        {/* 中间：文本编辑器 */}
        <div className="w-5/12 min-w-0 flex-shrink-0 border-r bg-white overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-gray-500">加载中...</div>
            </div>
          ) : notes.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center text-gray-500">
                <p className="text-lg font-medium mb-2">📝 还没有思维整理笔记</p>
                <p className="text-sm mb-4">点击上方的 &ldquo;+ 新建&rdquo; 按钮创建你的第一个笔记</p>
                <p className="text-xs text-gray-400">所有笔记将按创建日期排列，方便回顾</p>
              </div>
            </div>
          ) : (
            <NoteEditor
              note={activeNote}
              onSave={handleNoteSaved}
            />
          )}
        </div>

        {/* 右侧：AI聊天助手 */}
        <div className="flex-1 min-w-0 bg-gray-50 overflow-hidden">
          <ChatInterface />
        </div>
      </div>
    </div>
  )
}