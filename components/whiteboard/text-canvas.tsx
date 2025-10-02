"use client"

import { useState, useRef, useCallback, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { ZoomIn, ZoomOut, RotateCcw, Palette, Save, Type } from 'lucide-react'
import TextBlock from './text-block'
import { TextBlock as TextBlockType } from '@/lib/whiteboard-db'
import { cn } from '@/lib/utils'

interface TextCanvasProps {
  textBlocks: TextBlockType[]
  canvasState: {
    zoom: number
    panX: number
    panY: number
  }
  onTextBlocksChange: (textBlocks: TextBlockType[]) => void
  onCanvasStateChange: (state: { zoom: number; panX: number; panY: number }) => void
  onSave?: () => void
}

export default function TextCanvas({
  textBlocks,
  canvasState,
  onTextBlocksChange,
  onCanvasStateChange,
  onSave
}: TextCanvasProps) {
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null)
  const [isPanning, setIsPanning] = useState(false)
  const [panStart, setPanStart] = useState({ x: 0, y: 0 })
  const [currentColor, setCurrentColor] = useState<TextBlockType['color']>('yellow')

  const canvasRef = useRef<HTMLDivElement>(null)

  // 生成唯一ID
  const generateId = () => `block_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

  // 创建新文字块
  const createTextBlock = useCallback((x: number, y: number): TextBlockType => {
    return {
      id: generateId(),
      content: '',
      x: (x - canvasState.panX) / canvasState.zoom,
      y: (y - canvasState.panY) / canvasState.zoom,
      width: 200,
      height: 60,
      color: currentColor,
      fontSize: 14,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  }, [canvasState, currentColor])

  // 双击创建文字块
  const handleDoubleClick = (e: React.MouseEvent) => {
    e.preventDefault()

    const rect = canvasRef.current?.getBoundingClientRect()
    if (!rect) return

    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    const newBlock = createTextBlock(x, y)
    const updatedBlocks = [...textBlocks, newBlock]
    onTextBlocksChange(updatedBlocks)
    setSelectedBlockId(newBlock.id)
  }

  // 更新文字块
  const updateTextBlock = (id: string, updates: Partial<TextBlockType>) => {
    const updatedBlocks = textBlocks.map(block =>
      block.id === id
        ? { ...block, ...updates, updatedAt: new Date().toISOString() }
        : block
    )
    onTextBlocksChange(updatedBlocks)
  }

  // 删除文字块
  const deleteTextBlock = (id: string) => {
    const updatedBlocks = textBlocks.filter(block => block.id !== id)
    onTextBlocksChange(updatedBlocks)
    if (selectedBlockId === id) {
      setSelectedBlockId(null)
    }
  }

  // 画布平移
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 0 && !e.target || e.currentTarget === e.target) {
      setIsPanning(true)
      setPanStart({ x: e.clientX - canvasState.panX, y: e.clientY - canvasState.panY })
      setSelectedBlockId(null)
    }
  }

  const handleMouseMove = (e: MouseEvent) => {
    if (isPanning) {
      onCanvasStateChange({
        ...canvasState,
        panX: e.clientX - panStart.x,
        panY: e.clientY - panStart.y
      })
    }
  }

  const handleMouseUp = () => {
    setIsPanning(false)
  }

  // 全局鼠标事件
  useEffect(() => {
    if (isPanning) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
      return () => {
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)
      }
    }
  }, [isPanning, panStart])

  // 缩放功能
  const handleZoom = (delta: number) => {
    const newZoom = Math.max(0.1, Math.min(3, canvasState.zoom + delta))
    onCanvasStateChange({ ...canvasState, zoom: newZoom })
  }

  // 重置视图
  const resetView = () => {
    onCanvasStateChange({ zoom: 1, panX: 0, panY: 0 })
  }

  // 颜色选项
  const colorOptions: { color: TextBlockType['color']; label: string; bgClass: string }[] = [
    { color: 'yellow', label: '黄色', bgClass: 'bg-yellow-200' },
    { color: 'blue', label: '蓝色', bgClass: 'bg-blue-200' },
    { color: 'green', label: '绿色', bgClass: 'bg-green-200' },
    { color: 'pink', label: '粉色', bgClass: 'bg-pink-200' },
    { color: 'white', label: '白色', bgClass: 'bg-white' }
  ]

  return (
    <div className="relative w-full h-full bg-gray-50 overflow-hidden">
      {/* 工具栏 */}
      <div className="absolute top-4 left-4 z-10 flex items-center gap-2 bg-white rounded-lg shadow-lg p-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => handleZoom(0.1)}
          title="放大"
        >
          <ZoomIn className="h-4 w-4" />
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => handleZoom(-0.1)}
          title="缩小"
        >
          <ZoomOut className="h-4 w-4" />
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={resetView}
          title="重置视图"
        >
          <RotateCcw className="h-4 w-4" />
        </Button>

        <div className="w-px h-6 bg-gray-300" />

        {/* 颜色选择 */}
        <div className="flex items-center gap-1">
          <Palette className="h-4 w-4 text-gray-600" />
          {colorOptions.map(({ color, label, bgClass }) => (
            <button
              key={color}
              className={cn(
                'w-6 h-6 rounded-full border-2 transition-all',
                bgClass,
                currentColor === color ? 'border-blue-500 scale-110' : 'border-gray-300'
              )}
              onClick={() => setCurrentColor(color)}
              title={label}
            />
          ))}
        </div>

        <div className="w-px h-6 bg-gray-300" />

        {onSave && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onSave}
            title="保存"
          >
            <Save className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* 缩放信息 */}
      <div className="absolute top-4 right-4 z-10 bg-white rounded-lg shadow-lg px-3 py-1 text-sm text-gray-600">
        {Math.round(canvasState.zoom * 100)}%
      </div>

      {/* 提示信息 */}
      {textBlocks.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-center text-gray-400">
            <Type className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p className="text-lg font-medium">双击创建文字块</p>
            <p className="text-sm">开始记录你的想法</p>
          </div>
        </div>
      )}

      {/* 画布区域 */}
      <div
        ref={canvasRef}
        className="w-full h-full cursor-grab active:cursor-grabbing relative"
        onMouseDown={handleMouseDown}
        onDoubleClick={handleDoubleClick}
        style={{
          backgroundImage: `
            radial-gradient(circle, #d1d5db 1px, transparent 1px)
          `,
          backgroundSize: `${20 * canvasState.zoom}px ${20 * canvasState.zoom}px`,
          backgroundPosition: `${canvasState.panX}px ${canvasState.panY}px`
        }}
      >
        {/* 文字块容器 */}
        <div
          className="absolute inset-0"
          style={{
            transform: `translate(${canvasState.panX}px, ${canvasState.panY}px)`
          }}
        >
          {textBlocks.map(textBlock => (
            <TextBlock
              key={textBlock.id}
              textBlock={textBlock}
              isSelected={selectedBlockId === textBlock.id}
              onUpdate={(updates) => updateTextBlock(textBlock.id, updates)}
              onDelete={() => deleteTextBlock(textBlock.id)}
              onSelect={() => setSelectedBlockId(textBlock.id)}
              scale={canvasState.zoom}
            />
          ))}
        </div>
      </div>
    </div>
  )
}