"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Camera, Loader2, Upload, X } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { getLocalDateString } from "@/lib/date-utils"
import Image from "next/image"

interface Routine {
  id: number
  title: string
}

interface HabitRecordFormProps {
  onRecordAdded?: () => void
  className?: string
}

export function HabitRecordForm({ onRecordAdded, className }: HabitRecordFormProps) {
  const { toast } = useToast()
  const [routines, setRoutines] = useState<Routine[]>([])
  const [loading, setLoading] = useState(false)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)

  // 表单状态
  const [selectedRoutine, setSelectedRoutine] = useState<string>("")
  const [recordDate, setRecordDate] = useState<string>(getLocalDateString())
  const [description, setDescription] = useState<string>("")
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string>("")

  // 获取所有routine类型的任务
  const fetchRoutines = useCallback(async () => {
    try {
      const response = await fetch('/api/tasks')
      if (response.ok) {
        const data = await response.json()
        setRoutines(data.routines || [])
      }
    } catch (error) {
      console.error('Failed to fetch routines:', error)
    }
  }, [])

  useEffect(() => {
    void fetchRoutines()
  }, [fetchRoutines])

  // 处理照片选择
  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // 验证文件类型
    if (!file.type.startsWith('image/')) {
      toast({
        title: "错误",
        description: "只能上传图片文件",
        variant: "destructive"
      })
      return
    }

    // 验证文件大小 (500KB)
    if (file.size > 500 * 1024) {
      toast({
        title: "错误",
        description: "图片大小不能超过500KB",
        variant: "destructive"
      })
      return
    }

    setPhotoFile(file)

    // 生成预览
    const reader = new FileReader()
    reader.onload = (e) => {
      setPhotoPreview(e.target?.result as string)
    }
    reader.readAsDataURL(file)
  }

  // 清除照片
  const clearPhoto = () => {
    setPhotoFile(null)
    setPhotoPreview("")
  }

  // 上传照片
  const uploadPhoto = async (file: File): Promise<string | null> => {
    try {
      setUploadingPhoto(true)
      const formData = new FormData()
      formData.append('photo', file)
      formData.append('routineId', selectedRoutine)
      formData.append('recordDate', recordDate)

      const response = await fetch('/api/habits/upload', {
        method: 'POST',
        body: formData
      })

      if (response.ok) {
        const data = await response.json()
        return data.photoPath
      } else {
        const error = await response.json()
        throw new Error(error.error || 'Upload failed')
      }
    } catch (error) {
      console.error('Photo upload error:', error)
      toast({
        title: "上传失败",
        description: error instanceof Error ? error.message : "照片上传失败",
        variant: "destructive"
      })
      return null
    } finally {
      setUploadingPhoto(false)
    }
  }

  // 提交打卡记录
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!selectedRoutine) {
      toast({
        title: "错误",
        description: "请选择要打卡的习惯",
        variant: "destructive"
      })
      return
    }

    setLoading(true)

    try {
      let photoPath = null

      // 如果有照片，先上传
      if (photoFile) {
        photoPath = await uploadPhoto(photoFile)
        if (!photoPath) {
          setLoading(false)
          return // 上传失败，停止提交
        }
      }

      // 提交打卡记录
      const response = await fetch('/api/habits/records', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          routineId: parseInt(selectedRoutine),
          recordDate,
          description: description.trim() || undefined,
          photoPath
        })
      })

      if (response.ok) {
        toast({
          title: "成功",
          description: "打卡记录已提交"
        })

        // 重置表单
        setSelectedRoutine("")
        setRecordDate(getLocalDateString())
        setDescription("")
        clearPhoto()

        // 通知父组件更新
        if (onRecordAdded) {
          onRecordAdded()
        }
      } else {
        const error = await response.json()
        throw new Error(error.error || 'Submit failed')
      }

    } catch (error) {
      console.error('Submit error:', error)
      toast({
        title: "提交失败",
        description: error instanceof Error ? error.message : "提交打卡记录失败",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className={className}>
      {!className?.includes('border-0') && (
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">提交打卡记录</CardTitle>
        </CardHeader>
      )}
      <CardContent className={`space-y-3 ${className?.includes('p-0') ? 'p-0' : ''}`}>
        <form onSubmit={handleSubmit}>
          {/* 习惯选择 */}
          <div className="space-y-1">
            <Label htmlFor="routine" className="text-xs">选择习惯</Label>
            <select
              id="routine"
              value={selectedRoutine}
              onChange={(e) => setSelectedRoutine(e.target.value)}
              className="w-full px-2 py-1.5 text-sm border rounded-md"
              required
            >
              <option value="">请选择...</option>
              {routines.map((routine) => (
                <option key={routine.id} value={routine.id.toString()}>
                  {routine.title}
                </option>
              ))}
            </select>
          </div>

          {/* 日期选择 */}
          <div className="space-y-1">
            <Label htmlFor="date" className="text-xs">日期</Label>
            <Input
              id="date"
              type="date"
              value={recordDate}
              onChange={(e) => setRecordDate(e.target.value)}
              className="text-sm"
              required
            />
          </div>

          {/* 描述 */}
          <div className="space-y-1">
            <Label htmlFor="description" className="text-xs">描述 (可选)</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="记录一些细节..."
              className="text-sm min-h-[60px] resize-none"
            />
          </div>

          {/* 照片上传 */}
          <div className="space-y-1">
            <Label className="text-xs">照片 (可选)</Label>
            {!photoPreview ? (
              <div className="relative">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoChange}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <div className="flex items-center justify-center h-20 border-2 border-dashed border-gray-300 rounded-lg hover:border-gray-400 transition-colors">
                  <div className="text-center">
                    <Camera className="h-5 w-5 text-gray-400 mx-auto mb-1" />
                    <span className="text-xs text-gray-500">点击选择照片</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="relative h-20">
                <Image
                  src={photoPreview}
                  alt="Preview"
                  fill
                  sizes="(max-width: 768px) 100vw, 400px"
                  className="object-cover rounded-lg"
                  unoptimized
                />
                <Button
                  type="button"
                  size="sm"
                  variant="destructive"
                  onClick={clearPhoto}
                  className="absolute top-1 right-1 h-6 w-6 p-0"
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            )}
          </div>

          {/* 提交按钮 */}
          <Button
            type="submit"
            className="w-full text-sm"
            disabled={loading || uploadingPhoto}
          >
            {loading ? (
              <>
                <Loader2 className="h-3 w-3 animate-spin mr-1" />
                提交中...
              </>
            ) : uploadingPhoto ? (
              <>
                <Upload className="h-3 w-3 mr-1" />
                上传中...
              </>
            ) : (
              "提交打卡"
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
