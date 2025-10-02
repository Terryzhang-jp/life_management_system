"use client"

import { useEffect, useState, useCallback, useRef } from 'react'
import dynamic from 'next/dynamic'

// 动态导入 Excalidraw 组件，避免 SSR 问题
const Excalidraw = dynamic(
  async () => (await import("@excalidraw/excalidraw")).Excalidraw,
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">加载画布中...</p>
        </div>
      </div>
    )
  }
)

interface MentalModelCanvasProps {
  initialData: any
  onChange: (data: any) => void
}

export function MentalModelCanvas({ initialData, onChange }: MentalModelCanvasProps) {
  const [mounted, setMounted] = useState(false)
  const [excalidrawAPI, setExcalidrawAPI] = useState<any>(null)
  const changeTimeoutRef = useRef<NodeJS.Timeout>()

  // 处理画布数据变化
  const handleCanvasChange = useCallback((elements: any, appState: any, files: any) => {
    // 清除之前的定时器
    if (changeTimeoutRef.current) {
      clearTimeout(changeTimeoutRef.current)
    }

    // 设置防抖定时器，避免频繁保存
    changeTimeoutRef.current = setTimeout(() => {
      // 从 API 获取完整的场景数据（包括 files）
      if (excalidrawAPI) {
        const sceneData = excalidrawAPI.getSceneElements()
        const filesData = excalidrawAPI.getFiles()

        const canvasData = {
          elements: sceneData,
          appState: {
            // 只保存必要的应用状态
            theme: appState.theme,
            viewBackgroundColor: appState.viewBackgroundColor,
            gridSize: appState.gridSize,
            zoom: appState.zoom,
            scrollX: appState.scrollX,
            scrollY: appState.scrollY,
          },
          files: filesData // 保存图片文件数据
        }

        onChange(canvasData)
      } else {
        // 如果 API 还未准备好，使用传入的数据
        const canvasData = {
          elements,
          appState: {
            theme: appState.theme,
            viewBackgroundColor: appState.viewBackgroundColor,
            gridSize: appState.gridSize,
            zoom: appState.zoom,
            scrollX: appState.scrollX,
            scrollY: appState.scrollY,
          },
          files: files || {}
        }
        onChange(canvasData)
      }
    }, 3000) // 3秒后自动保存
  }, [onChange, excalidrawAPI])

  useEffect(() => {
    setMounted(true)

    // 清理定时器
    return () => {
      if (changeTimeoutRef.current) {
        clearTimeout(changeTimeoutRef.current)
      }
    }
  }, [])

  // 在服务端渲染时显示占位符
  if (!mounted) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-16 h-16 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
            <svg
              className="w-8 h-8 text-purple-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
              />
            </svg>
          </div>
          <p className="text-gray-600">准备画布环境...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full h-full relative excalidraw-wrapper">
        <Excalidraw
          excalidrawAPI={(api: any) => setExcalidrawAPI(api)}
          initialData={{
            elements: initialData?.elements || [],
            appState: {
              theme: "light",
              viewBackgroundColor: "#ffffff",
              currentItemFontFamily: 1,
              currentItemTextAlign: "left",
              currentItemRoundness: "round",
              gridSize: null,
              colorPalette: {},
              ...initialData?.appState,
            },
            files: initialData?.files || {}
          }}
          onChange={handleCanvasChange}
          langCode="zh-CN"
          UIOptions={{
            canvasActions: {
              loadScene: true,
              saveAsImage: true,
              export: {
                saveFileToDisk: true
              },
              toggleTheme: true,
            },
            tools: {
              image: true,
            }
          }}
        />

      {/* 如果没有内容时显示引导 */}
      {(!initialData?.elements || initialData.elements.length === 0) && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 pointer-events-none">
          <div className="bg-purple-100 text-purple-700 px-4 py-2 rounded-lg shadow-sm">
            <p className="text-sm font-medium">💡 开始创建你的心智模型</p>
            <p className="text-xs mt-1">使用左侧工具栏绘制思维导图、流程图或自由创作</p>
          </div>
        </div>
      )}
    </div>
  )
}
