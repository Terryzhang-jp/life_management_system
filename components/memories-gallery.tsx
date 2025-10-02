"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Plus, X, Edit2, ImageIcon } from "lucide-react"
import { MemoryForm } from "./memory-form"
import { MemoryDetailView } from "./memory-detail-view"
import { useToast } from "@/hooks/use-toast"
import Image from "next/image"

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

interface PhotoDimensions {
  [key: string]: {
    width: number
    height: number
    aspectRatio: number
  }
}

interface MemoriesGalleryProps {
  className?: string
}

export function MemoriesGallery({ className }: MemoriesGalleryProps) {
  const { toast } = useToast()
  const [memories, setMemories] = useState<MemoryRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingMemory, setEditingMemory] = useState<MemoryRecord | null>(null)
  const [selectedImage, setSelectedImage] = useState<string | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)
  const [photoDimensions, setPhotoDimensions] = useState<PhotoDimensions>({})

  // 新增：详情页面状态
  const [showDetailView, setShowDetailView] = useState(false)
  const [selectedMemory, setSelectedMemory] = useState<MemoryRecord | null>(null)

  // 检测照片尺寸
  const loadImageDimensions = useCallback((src: string): Promise<{ width: number; height: number }> => {
    return new Promise((resolve, reject) => {
      const img = new window.Image()
      img.onload = () => {
        resolve({ width: img.naturalWidth, height: img.naturalHeight })
      }
      img.onerror = reject
      img.src = src
    })
  }, [])


  // 获取所有记忆
  const fetchMemories = useCallback(async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/memories?type=all')
      if (response.ok) {
        const data = await response.json()
        setMemories(data)

        // 加载所有照片的尺寸信息
        const dimensionsPromises = data.flatMap((memory: MemoryRecord) =>
          memory.photos.map(async (photo: string) => {
            try {
              const dimensions = await loadImageDimensions(photo)
              const aspectRatio = dimensions.width / dimensions.height
              return {
                src: photo,
                ...dimensions,
                aspectRatio
              }
            } catch (error) {
              console.error('Failed to load image dimensions:', error)
              return {
                src: photo,
                width: 400,
                height: 300,
                aspectRatio: 4/3 // 默认比例
              }
            }
          })
        )

        const allDimensions = await Promise.all(dimensionsPromises)
        const dimensionsMap: PhotoDimensions = {}
        allDimensions.forEach(dim => {
          dimensionsMap[dim.src] = {
            width: dim.width,
            height: dim.height,
            aspectRatio: dim.aspectRatio
          }
        })
        setPhotoDimensions(dimensionsMap)
      }
    } catch (error) {
      console.error('Failed to fetch memories:', error)
    } finally {
      setLoading(false)
    }
  }, [loadImageDimensions])

  useEffect(() => {
    void fetchMemories()
  }, [fetchMemories, refreshKey])

  // 处理记忆添加或编辑完成
  const handleMemoryAddedOrEdited = () => {
    setRefreshKey(prev => prev + 1)
    setShowForm(false)
    setEditingMemory(null)
  }


  // 开始编辑
  const handleEditMemory = (memory: MemoryRecord) => {
    setEditingMemory(memory)
    setShowForm(true)
  }

  // 显示详情页面
  const handleShowDetail = (memory: MemoryRecord) => {
    setSelectedMemory(memory)
    setShowDetailView(true)
  }

  // 关闭详情页面
  const handleCloseDetail = () => {
    setShowDetailView(false)
    setSelectedMemory(null)
  }

  // 从详情页面进入编辑模式
  const handleEditFromDetail = () => {
    if (selectedMemory) {
      setEditingMemory(selectedMemory)
      setShowDetailView(false)
      setShowForm(true)
    }
  }

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

  // 照片预览
  const openImagePreview = (imageSrc: string) => {
    setSelectedImage(imageSrc)
  }

  const closeImagePreview = () => {
    setSelectedImage(null)
  }

  if (loading) {
    return (
      <div className={`p-6 ${className}`}>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">珍贵记忆</h2>
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="animate-pulse">
              <div className="bg-gray-200 rounded-lg h-64"></div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className={`p-6 ${className}`}>
      {/* 头部 */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">珍贵记忆</h2>
        <Button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          添加记忆
        </Button>
      </div>

      {/* 记忆网格 */}
      {memories.length === 0 ? (
        <div className="text-center py-12">
          <div className="mb-4">
            <ImageIcon className="h-16 w-16 text-gray-300 mx-auto" />
          </div>
          <h3 className="text-lg font-medium text-gray-500 mb-2">还没有记忆</h3>
          <p className="text-gray-400 mb-4">开始记录那些让你有力量的美好时刻</p>
          <Button onClick={() => setShowForm(true)} variant="outline">
            <Plus className="h-4 w-4 mr-2" />
            添加第一个记忆
          </Button>
        </div>
      ) : (
        <div
          className="w-full px-4 columns-2 md:columns-3 lg:columns-4"
          style={{ columnGap: '8px' }}
        >
          {memories.map((memory) => {
            const firstPhoto = memory.photos[0]
            const photoDimension = firstPhoto ? photoDimensions[firstPhoto] : null
            const imageWidth = photoDimension?.width || 800
            const imageHeight = photoDimension?.height || 800

            return (
              <div
                key={memory.id}
                className="break-inside-avoid mb-2 bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => handleShowDetail(memory)}
              >
                {/* 照片显示 */}
                {memory.photos.length > 0 && (
                  <div className="relative">
                    <Image
                      src={memory.photos[0]}
                      alt={memory.title || "记忆照片"}
                      width={imageWidth}
                      height={imageHeight}
                      className="w-full h-auto object-cover rounded-t-lg"
                      onClick={(e) => {
                        e.stopPropagation()
                        openImagePreview(memory.photos[0])
                      }}
                      unoptimized
                    />
                    {memory.photos.length > 1 && (
                      <div className="absolute top-2 right-2 bg-black bg-opacity-60 text-white text-xs px-2 py-1 rounded">
                        +{memory.photos.length - 1}
                      </div>
                    )}

                    {/* 编辑按钮 */}
                    <Button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleEditMemory(memory)
                      }}
                      size="sm"
                      variant="ghost"
                      className="absolute top-2 left-2 h-8 w-8 p-0 bg-white bg-opacity-80 hover:bg-opacity-100 rounded-full shadow-sm"
                    >
                      <Edit2 className="h-3 w-3 text-gray-700" />
                    </Button>
                  </div>
                )}

                {/* 内容 - 小红书风格 */}
                <div className="p-3">
                  {/* 标题 */}
                  {memory.title && (
                    <h3 className="font-medium text-gray-900 text-sm mb-2 line-clamp-2">
                      {memory.title}
                    </h3>
                  )}

                  {/* 作者行 - 简化信息 */}
                  <div className="flex items-center gap-2">
                    {/* 用户头像 */}
                    <div className="w-5 h-5 bg-gray-300 rounded-full flex items-center justify-center">
                      <span className="text-xs text-gray-600">我</span>
                    </div>
                    <span className="text-xs text-gray-600">
                      {formatDate(memory.datetime).split(' ')[0]}
                    </span>
                    {memory.isPinned && (
                      <span className="text-xs text-yellow-600 ml-auto">置顶</span>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* 添加/编辑记忆表单 */}
      {showForm && (
        <MemoryForm
          onMemoryAdded={handleMemoryAddedOrEdited}
          onClose={() => {
            setShowForm(false)
            setEditingMemory(null)
          }}
          editMemory={editingMemory && editingMemory.id ? {
            id: editingMemory.id,
            title: editingMemory.title,
            description: editingMemory.description,
            location: editingMemory.location,
            datetime: editingMemory.datetime,
            photos: editingMemory.photos,
            isPinned: editingMemory.isPinned
          } : undefined}
        />
      )}

      {/* 详情页面 */}
      {showDetailView && selectedMemory && (
        <MemoryDetailView
          memory={selectedMemory}
          onClose={handleCloseDetail}
          onEdit={handleEditFromDetail}
        />
      )}

      {/* 图片预览模态框 */}
      {selectedImage && (
        <div
          className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4"
          onClick={closeImagePreview}
        >
          <div className="relative w-[90vw] max-w-4xl h-[80vh]">
            <Image
              src={selectedImage}
              alt="预览"
              fill
              className="object-contain"
              sizes="90vw"
              unoptimized
            />
            <Button
              onClick={closeImagePreview}
              variant="secondary"
              size="sm"
              className="absolute top-4 right-4"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
