"use client"

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import Link from 'next/link'
import TaskTreePanel from './task-tree-panel'
import TextCanvas from './text-canvas'
import WhiteboardTabs from './whiteboard-tabs'
import { Whiteboard, TextBlock } from '@/lib/whiteboard-db'

interface WhiteboardTab {
  id: number
  title: string
}

export default function WhiteboardWorkspace() {
  const { toast } = useToast()
  const [whiteboards, setWhiteboards] = useState<WhiteboardTab[]>([])
  const [activeWhiteboard, setActiveWhiteboard] = useState<Whiteboard | null>(null)
  const [loading, setLoading] = useState(false)
  const [autoSaveTimeout, setAutoSaveTimeout] = useState<NodeJS.Timeout | null>(null)

  // 加载所有白板列表
  const loadWhiteboards = useCallback(async () => {
    try {
      const response = await fetch('/api/whiteboards')
      if (response.ok) {
        const data = await response.json()
        setWhiteboards(data)

        // 如果没有活跃白板但有白板列表，选择第一个
        if (!activeWhiteboard && data.length > 0) {
          await loadWhiteboard(data[0].id)
        }
      }
    } catch (error) {
      console.error('Error loading whiteboards:', error)
      toast({
        title: "错误",
        description: "加载白板列表失败",
        variant: "destructive"
      })
    }
  }, [activeWhiteboard])

  // 加载特定白板
  const loadWhiteboard = async (id: number) => {
    try {
      setLoading(true)
      const response = await fetch(`/api/whiteboards/${id}`)
      if (response.ok) {
        const data = await response.json()
        setActiveWhiteboard(data)
      } else {
        throw new Error('Failed to load whiteboard')
      }
    } catch (error) {
      console.error('Error loading whiteboard:', error)
      toast({
        title: "错误",
        description: "加载白板失败",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  // 创建新白板
  const createWhiteboard = async (title: string) => {
    try {
      const response = await fetch('/api/whiteboards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title })
      })

      if (response.ok) {
        const { id } = await response.json()
        await loadWhiteboards()
        await loadWhiteboard(id)
        toast({
          title: "成功",
          description: "白板创建成功"
        })
      } else {
        throw new Error('Failed to create whiteboard')
      }
    } catch (error) {
      console.error('Error creating whiteboard:', error)
      toast({
        title: "错误",
        description: "创建白板失败",
        variant: "destructive"
      })
    }
  }

  // 重命名白板
  const renameWhiteboard = async (id: number, title: string) => {
    try {
      const response = await fetch(`/api/whiteboards/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title })
      })

      if (response.ok) {
        await loadWhiteboards()
        if (activeWhiteboard?.id === id) {
          setActiveWhiteboard(prev => prev ? { ...prev, title } : null)
        }
        toast({
          title: "成功",
          description: "白板重命名成功"
        })
      } else {
        throw new Error('Failed to rename whiteboard')
      }
    } catch (error) {
      console.error('Error renaming whiteboard:', error)
      toast({
        title: "错误",
        description: "重命名白板失败",
        variant: "destructive"
      })
    }
  }

  // 删除白板
  const deleteWhiteboard = async (id: number) => {
    try {
      const response = await fetch(`/api/whiteboards/${id}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        await loadWhiteboards()

        // 如果删除的是当前活跃白板，切换到其他白板
        if (activeWhiteboard?.id === id) {
          const remainingBoards = whiteboards.filter(w => w.id !== id)
          if (remainingBoards.length > 0) {
            await loadWhiteboard(remainingBoards[0].id)
          } else {
            setActiveWhiteboard(null)
          }
        }

        toast({
          title: "成功",
          description: "白板删除成功"
        })
      } else {
        throw new Error('Failed to delete whiteboard')
      }
    } catch (error) {
      console.error('Error deleting whiteboard:', error)
      toast({
        title: "错误",
        description: "删除白板失败",
        variant: "destructive"
      })
    }
  }

  // 自动保存白板
  const autoSave = useCallback(async () => {
    if (!activeWhiteboard) return

    try {
      await fetch(`/api/whiteboards/${activeWhiteboard.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          textBlocks: activeWhiteboard.textBlocks,
          canvasState: activeWhiteboard.canvasState
        })
      })
    } catch (error) {
      console.error('Auto-save failed:', error)
    }
  }, [activeWhiteboard])

  // 更新文字块
  const updateTextBlocks = (textBlocks: TextBlock[]) => {
    if (!activeWhiteboard) return

    setActiveWhiteboard({
      ...activeWhiteboard,
      textBlocks
    })

    // 防抖自动保存
    if (autoSaveTimeout) {
      clearTimeout(autoSaveTimeout)
    }

    const timeout = setTimeout(autoSave, 1000)
    setAutoSaveTimeout(timeout)
  }

  // 更新画布状态
  const updateCanvasState = (canvasState: { zoom: number; panX: number; panY: number }) => {
    if (!activeWhiteboard) return

    setActiveWhiteboard({
      ...activeWhiteboard,
      canvasState
    })

    // 画布状态变化立即保存
    if (autoSaveTimeout) {
      clearTimeout(autoSaveTimeout)
    }

    const timeout = setTimeout(autoSave, 500)
    setAutoSaveTimeout(timeout)
  }

  // 手动保存
  const handleManualSave = async () => {
    if (autoSaveTimeout) {
      clearTimeout(autoSaveTimeout)
    }
    await autoSave()
    toast({
      title: "已保存",
      description: "白板内容已保存"
    })
  }

  // 初始化
  useEffect(() => {
    loadWhiteboards()

    // 如果没有白板，创建第一个
    if (whiteboards.length === 0) {
      createWhiteboard('思维整理')
    }
  }, [])

  // 清理定时器
  useEffect(() => {
    return () => {
      if (autoSaveTimeout) {
        clearTimeout(autoSaveTimeout)
      }
    }
  }, [autoSaveTimeout])

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
              <h1 className="text-2xl font-bold text-gray-900">🎨 思维整理工作台</h1>
              <p className="text-sm text-gray-600">左侧查看任务，右侧自由思考</p>
            </div>
          </div>
        </div>

        {/* 白板标签页 */}
        <WhiteboardTabs
          whiteboards={whiteboards}
          activeWhiteboardId={activeWhiteboard?.id || null}
          onWhiteboardSelect={loadWhiteboard}
          onWhiteboardCreate={createWhiteboard}
          onWhiteboardRename={renameWhiteboard}
          onWhiteboardDelete={deleteWhiteboard}
        />
      </div>

      {/* 主工作区 */}
      <div className="flex h-[calc(100vh-120px)]">
        {/* 左侧：任务树面板 */}
        <div className="w-1/3 border-r bg-white">
          <TaskTreePanel />
        </div>

        {/* 右侧：白板画布 */}
        <div className="flex-1">
          {activeWhiteboard ? (
            <TextCanvas
              textBlocks={activeWhiteboard.textBlocks}
              canvasState={activeWhiteboard.canvasState}
              onTextBlocksChange={updateTextBlocks}
              onCanvasStateChange={updateCanvasState}
              onSave={handleManualSave}
            />
          ) : loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-gray-500">加载中...</div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center text-gray-500">
                <p className="text-lg font-medium mb-2">还没有白板</p>
                <Button onClick={() => createWhiteboard('思维整理')}>
                  创建第一个白板
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}