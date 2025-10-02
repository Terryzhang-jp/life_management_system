"use client"

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { TextBlock as TextBlockType } from '@/lib/whiteboard-db'

interface TextBlockProps {
  textBlock: TextBlockType
  isSelected: boolean
  onUpdate: (updates: Partial<TextBlockType>) => void
  onDelete: () => void
  onSelect: () => void
  scale: number
}

const colorVariants = {
  yellow: 'bg-yellow-200 border-yellow-300',
  blue: 'bg-blue-200 border-blue-300',
  green: 'bg-green-200 border-green-300',
  pink: 'bg-pink-200 border-pink-300',
  white: 'bg-white border-gray-300'
}

export default function TextBlock({
  textBlock,
  isSelected,
  onUpdate,
  onDelete,
  onSelect,
  scale
}: TextBlockProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [content, setContent] = useState(textBlock.content)
  const [isDragging, setIsDragging] = useState(false)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })

  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const blockRef = useRef<HTMLDivElement>(null)

  // 开始编辑时自动聚焦
  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus()
      textareaRef.current.select()
    }
  }, [isEditing])

  // 处理鼠标按下事件
  const handleMouseDown = (e: React.MouseEvent) => {
    if (isEditing) return

    e.preventDefault()
    onSelect()

    const rect = blockRef.current?.getBoundingClientRect()
    if (rect) {
      setDragOffset({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      })
      setIsDragging(true)
    }
  }

  // 处理鼠标移动事件
  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging) return

    const container = blockRef.current?.parentElement
    if (!container) return

    const containerRect = container.getBoundingClientRect()
    const newX = (e.clientX - containerRect.left - dragOffset.x) / scale
    const newY = (e.clientY - containerRect.top - dragOffset.y) / scale

    onUpdate({
      x: Math.max(0, newX),
      y: Math.max(0, newY)
    })
  }

  // 处理鼠标松开事件
  const handleMouseUp = () => {
    setIsDragging(false)
  }

  // 添加全局鼠标事件监听
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
      return () => {
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)
      }
    }
  }, [isDragging, dragOffset, scale])

  // 开始编辑
  const startEditing = () => {
    setIsEditing(true)
    onSelect()
  }

  // 保存编辑
  const saveEdit = () => {
    onUpdate({ content: content.trim() })
    setIsEditing(false)
  }

  // 取消编辑
  const cancelEdit = () => {
    setContent(textBlock.content)
    setIsEditing(false)
  }

  // 处理键盘事件
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && e.ctrlKey) {
      saveEdit()
    } else if (e.key === 'Escape') {
      cancelEdit()
    }
  }

  // 自动调整高度
  const adjustHeight = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      const newHeight = Math.max(40, textareaRef.current.scrollHeight)
      textareaRef.current.style.height = `${newHeight}px`

      if (newHeight !== textBlock.height) {
        onUpdate({ height: newHeight })
      }
    }
  }

  useEffect(() => {
    if (isEditing) {
      adjustHeight()
    }
  }, [content, isEditing])

  return (
    <div
      ref={blockRef}
      className={cn(
        'absolute border-2 rounded-lg shadow-sm transition-all duration-200 cursor-move',
        colorVariants[textBlock.color],
        isSelected && 'ring-2 ring-blue-400',
        isDragging && 'shadow-lg scale-105'
      )}
      style={{
        left: textBlock.x,
        top: textBlock.y,
        width: textBlock.width,
        minHeight: textBlock.height,
        fontSize: textBlock.fontSize,
        transform: `scale(${scale})`,
        transformOrigin: 'top left'
      }}
      onMouseDown={handleMouseDown}
      onDoubleClick={startEditing}
    >
      {/* 删除按钮 */}
      {isSelected && !isEditing && (
        <Button
          variant="ghost"
          size="sm"
          className="absolute -top-2 -right-2 h-6 w-6 p-0 bg-red-500 hover:bg-red-600 text-white rounded-full"
          onClick={(e) => {
            e.stopPropagation()
            onDelete()
          }}
        >
          <X className="h-3 w-3" />
        </Button>
      )}

      {/* 内容区域 */}
      <div className="p-3 h-full">
        {isEditing ? (
          <textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={saveEdit}
            className="w-full h-full resize-none border-none outline-none bg-transparent"
            style={{ fontSize: textBlock.fontSize }}
            placeholder="输入文字..."
          />
        ) : (
          <div
            className="whitespace-pre-wrap break-words cursor-text"
            style={{ fontSize: textBlock.fontSize }}
          >
            {textBlock.content || '点击编辑...'}
          </div>
        )}
      </div>
    </div>
  )
}