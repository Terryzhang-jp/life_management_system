"use client"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { X, Loader2, Upload } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import Image from "next/image"

interface MemoryFormProps {
  onMemoryAdded?: () => void
  onClose: () => void
  editMemory?: {
    id: number
    title?: string
    description?: string
    location?: string
    datetime: string
    photos: string[]
    isPinned: boolean
  }
}

export function MemoryForm({ onMemoryAdded, onClose, editMemory }: MemoryFormProps) {
  const { toast } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [loading, setLoading] = useState(false)
  const [uploadingPhotos, setUploadingPhotos] = useState(false)

  // 表单数据
  const [title, setTitle] = useState(editMemory?.title || "")
  const [description, setDescription] = useState(editMemory?.description || "")
  const [location, setLocation] = useState(editMemory?.location || "")
  const [datetime, setDatetime] = useState(
    editMemory?.datetime
      ? new Date(editMemory.datetime).toISOString().slice(0, 16)
      : new Date().toISOString().slice(0, 16)
  )
  const [isPinned, setIsPinned] = useState(editMemory?.isPinned || false)
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [uploadedPhotos, setUploadedPhotos] = useState<string[]>(editMemory?.photos || [])

  // 处理文件选择
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || [])

    if (files.length === 0) return

    // 验证文件类型
    const invalidFiles = files.filter(file => !file.type.startsWith('image/'))
    if (invalidFiles.length > 0) {
      toast({
        title: "文件类型错误",
        description: "只能上传图片文件",
        variant: "destructive"
      })
      return
    }

    // 验证文件数量
    if (files.length + uploadedPhotos.length > 10) {
      toast({
        title: "照片数量限制",
        description: "最多只能上传10张照片",
        variant: "destructive"
      })
      return
    }

    // 验证文件大小
    const oversizedFiles = files.filter(file => file.size > 5 * 1024 * 1024)
    if (oversizedFiles.length > 0) {
      toast({
        title: "文件太大",
        description: "单个文件不能超过5MB",
        variant: "destructive"
      })
      return
    }

    setSelectedFiles(prev => [...prev, ...files])
  }

  // 上传照片
  const uploadPhotos = async (): Promise<string[]> => {
    if (selectedFiles.length === 0) return []

    setUploadingPhotos(true)
    try {
      const formData = new FormData()
      formData.append('datetime', new Date(datetime).toISOString())

      selectedFiles.forEach(file => {
        formData.append('photos', file)
      })

      const response = await fetch('/api/memories/upload', {
        method: 'POST',
        body: formData
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Upload failed')
      }

      const result = await response.json()
      return result.photos || []

    } catch (error) {
      console.error('Photo upload error:', error)
      toast({
        title: "照片上传失败",
        description: error instanceof Error ? error.message : "上传照片失败",
        variant: "destructive"
      })
      return []
    } finally {
      setUploadingPhotos(false)
    }
  }

  // 移除选中的文件
  const removeSelectedFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index))
  }

  // 移除已上传的照片
  const removeUploadedPhoto = (index: number) => {
    setUploadedPhotos(prev => prev.filter((_, i) => i !== index))
  }

  // 提交表单
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!datetime) {
      toast({
        title: "错误",
        description: "请选择时间",
        variant: "destructive"
      })
      return
    }

    setLoading(true)

    try {
      // 先上传新选择的照片
      const newPhotos = await uploadPhotos()

      // 合并所有照片路径
      const allPhotos = [...uploadedPhotos, ...newPhotos]

      const url = editMemory ? '/api/memories' : '/api/memories'
      const method = editMemory ? 'PUT' : 'POST'
      const body = editMemory
        ? {
            id: editMemory.id,
            title: title.trim(),
            description: description.trim(),
            location: location.trim(),
            datetime: new Date(datetime).toISOString(),
            photos: allPhotos,
            isPinned
          }
        : {
            title: title.trim(),
            description: description.trim(),
            location: location.trim(),
            datetime: new Date(datetime).toISOString(),
            photos: allPhotos,
            isPinned
          }

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      })

      if (response.ok) {
        toast({
          title: "成功",
          description: editMemory ? "记忆已更新" : "记忆已添加"
        })

        // 重置表单
        setTitle("")
        setDescription("")
        setLocation("")
        setDatetime(new Date().toISOString().slice(0, 16))
        setIsPinned(false)
        setSelectedFiles([])
        setUploadedPhotos([])

        onClose()

        if (onMemoryAdded) {
          onMemoryAdded()
        }
      } else {
        const error = await response.json()
        throw new Error(error.error || 'Failed to save memory')
      }

    } catch (error) {
      console.error('Submit error:', error)
      toast({
        title: editMemory ? "更新失败" : "添加失败",
        description: error instanceof Error ? error.message : "操作失败",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl mx-4 relative max-h-[90vh] overflow-y-auto">
        {/* 关闭按钮 */}
        <Button
          variant="ghost"
          size="sm"
          onClick={onClose}
          className="absolute top-2 right-2 h-8 w-8 p-0"
        >
          <X className="h-4 w-4" />
        </Button>

        {/* 表单标题 */}
        <h3 className="text-lg font-semibold mb-4">
          {editMemory ? "编辑记忆" : "添加记忆"}
        </h3>

        {/* 表单内容 */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* 时间选择 */}
          <div className="space-y-2">
            <Label htmlFor="datetime">时间</Label>
            <Input
              id="datetime"
              type="datetime-local"
              value={datetime}
              onChange={(e) => setDatetime(e.target.value)}
              required
            />
          </div>

          {/* 地点 */}
          <div className="space-y-2">
            <Label htmlFor="location">地点</Label>
            <Input
              id="location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="在哪里的记忆..."
            />
          </div>

          {/* 标题 */}
          <div className="space-y-2">
            <Label htmlFor="title">标题</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="给这个记忆起个名字..."
            />
          </div>

          {/* 描述 */}
          <div className="space-y-2">
            <Label htmlFor="description">描述</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="记录下当时的感受和想法..."
              rows={4}
            />
          </div>

          {/* 照片上传 */}
          <div className="space-y-2">
            <Label>照片</Label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
              />

              <Button
                type="button"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingPhotos || (selectedFiles.length + uploadedPhotos.length >= 10)}
                className="w-full"
              >
                <Upload className="h-4 w-4 mr-2" />
                选择照片 ({selectedFiles.length + uploadedPhotos.length}/10)
              </Button>

              {/* 显示选中的文件 */}
              {selectedFiles.length > 0 && (
                <div className="mt-4">
                  <h4 className="text-sm font-medium mb-2">新选择的照片:</h4>
                  <div className="grid grid-cols-3 gap-2">
                    {selectedFiles.map((file, index) => (
                      <div key={index} className="relative h-20">
                        <Image
                          src={URL.createObjectURL(file)}
                          alt={`Preview ${index + 1}`}
                          fill
                          sizes="150px"
                          className="object-cover rounded"
                          unoptimized
                        />
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          onClick={() => removeSelectedFile(index)}
                          className="absolute top-1 right-1 h-6 w-6 p-0"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 显示已上传的照片 */}
              {uploadedPhotos.length > 0 && (
                <div className="mt-4">
                  <h4 className="text-sm font-medium mb-2">已有照片:</h4>
                  <div className="grid grid-cols-3 gap-2">
                    {uploadedPhotos.map((photo, index) => (
                      <div key={index} className="relative h-20">
                        <Image
                          src={photo}
                          alt={`Uploaded ${index + 1}`}
                          fill
                          sizes="150px"
                          className="object-cover rounded"
                          unoptimized
                        />
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          onClick={() => removeUploadedPhoto(index)}
                          className="absolute top-1 right-1 h-6 w-6 p-0"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 置顶选择 */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="isPinned"
              checked={isPinned}
              onCheckedChange={(checked) => setIsPinned(!!checked)}
            />
            <Label htmlFor="isPinned">置顶这个记忆</Label>
          </div>

          {/* 提交按钮 */}
          <div className="flex gap-2 pt-4">
            <Button
              type="submit"
              className="flex-1"
              disabled={loading || uploadingPhotos}
            >
              {loading || uploadingPhotos ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  {uploadingPhotos ? "上传中..." : editMemory ? "更新中..." : "添加中..."}
                </>
              ) : (
                editMemory ? "更新记忆" : "添加记忆"
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={loading || uploadingPhotos}
            >
              取消
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
