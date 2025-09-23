"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { X, Edit2, Calendar, MapPin, ChevronLeft, ChevronRight } from "lucide-react"

interface MemoryRecord {
  id?: number
  title?: string
  description?: string
  location?: string
  datetime: string
  photos: string[]
  isPinned: boolean
  createdAt?: string
  updatedAt?: string
}

interface MemoryDetailViewProps {
  memory: MemoryRecord
  onClose: () => void
  onEdit: () => void
}

export function MemoryDetailView({ memory, onClose, onEdit }: MemoryDetailViewProps) {
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0)

  // 格式化时间显示
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  // 切换照片
  const nextPhoto = () => {
    if (memory.photos.length > 1) {
      setCurrentPhotoIndex((prev) =>
        prev === memory.photos.length - 1 ? 0 : prev + 1
      )
    }
  }

  const prevPhoto = () => {
    if (memory.photos.length > 1) {
      setCurrentPhotoIndex((prev) =>
        prev === 0 ? memory.photos.length - 1 : prev - 1
      )
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-hidden flex">

        {/* 左侧 - 照片区域 */}
        <div className="flex-1 relative bg-gray-100 flex items-center justify-center">
          {memory.photos.length > 0 ? (
            <>
              <img
                src={memory.photos[currentPhotoIndex]}
                alt={memory.title || "记忆照片"}
                className="max-w-full max-h-full object-contain"
              />

              {/* 照片导航 */}
              {memory.photos.length > 1 && (
                <>
                  <Button
                    onClick={prevPhoto}
                    variant="ghost"
                    size="sm"
                    className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 text-white hover:bg-opacity-70"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    onClick={nextPhoto}
                    variant="ghost"
                    size="sm"
                    className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 text-white hover:bg-opacity-70"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>

                  {/* 照片指示器 */}
                  <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-2">
                    {memory.photos.map((_, index) => (
                      <div
                        key={index}
                        className={`w-2 h-2 rounded-full cursor-pointer ${
                          index === currentPhotoIndex ? 'bg-white' : 'bg-white bg-opacity-50'
                        }`}
                        onClick={() => setCurrentPhotoIndex(index)}
                      />
                    ))}
                  </div>
                </>
              )}
            </>
          ) : (
            <div className="text-gray-400 text-center">
              <span>暂无照片</span>
            </div>
          )}
        </div>

        {/* 右侧 - 文字内容区域 */}
        <div className="flex-1 max-w-md p-6 flex flex-col">

          {/* 头部操作 */}
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-semibold text-gray-900">记忆详情</h2>
            <div className="flex gap-2">
              <Button
                onClick={onEdit}
                variant="outline"
                size="sm"
                className="flex items-center gap-1"
              >
                <Edit2 className="h-3 w-3" />
                编辑
              </Button>
              <Button
                onClick={onClose}
                variant="ghost"
                size="sm"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* 内容区域 */}
          <div className="flex-1 space-y-4">

            {/* 标题 */}
            {memory.title && (
              <div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  {memory.title}
                </h3>
              </div>
            )}

            {/* 时间和地点 */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Calendar className="h-4 w-4" />
                <span>{formatDate(memory.datetime)}</span>
              </div>
              {memory.location && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <MapPin className="h-4 w-4" />
                  <span>{memory.location}</span>
                </div>
              )}
            </div>

            {/* 描述 */}
            {memory.description && (
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">描述</h4>
                <p className="text-gray-600 leading-relaxed whitespace-pre-wrap">
                  {memory.description}
                </p>
              </div>
            )}

            {/* 置顶标记 */}
            {memory.isPinned && (
              <div className="inline-block px-3 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full">
                置顶记忆
              </div>
            )}

            {/* 照片统计 */}
            {memory.photos.length > 0 && (
              <div className="text-xs text-gray-500">
                共 {memory.photos.length} 张照片
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}