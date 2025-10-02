"use client"

import { useState, useEffect } from 'react'
import '@excalidraw/excalidraw/index.css'
import '../excalidraw-styles.css'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Save, Settings, Eye, EyeOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { MentalModelCanvas } from '@/components/mental-model-canvas'
import { type MentalModel } from '@/lib/mental-models-db'

export default function MentalModelCanvasPage() {
  const params = useParams()
  const router = useRouter()
  const id = Number(params.id)

  const [model, setModel] = useState<MentalModel | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [localTitle, setLocalTitle] = useState('')
  const [localDescription, setLocalDescription] = useState('')
  const [localCategory, setLocalCategory] = useState('')
  const [localTags, setLocalTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState('')

  // 获取心智模型数据
  const fetchModel = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/mental-models/${id}`)
      const result = await response.json()

      if (result.success) {
        setModel(result.data)
        setLocalTitle(result.data.title)
        setLocalDescription(result.data.description || '')
        setLocalCategory(result.data.category || '')
        setLocalTags(result.data.tags || [])
      } else {
        console.error('Failed to fetch mental model:', result.error)
        if (response.status === 404) {
          router.push('/mental-models')
        }
      }
    } catch (error) {
      console.error('Error fetching mental model:', error)
    } finally {
      setLoading(false)
    }
  }

  // 保存心智模型
  const saveModel = async (updates: Partial<MentalModel> = {}) => {
    if (!model) return

    try {
      setSaving(true)

      const updateData = {
        id: model.id,
        title: localTitle,
        description: localDescription,
        category: localCategory || undefined,
        tags: localTags,
        ...updates
      }

      const response = await fetch('/api/mental-models', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updateData)
      })

      const result = await response.json()

      if (result.success) {
        setModel(result.data)
        // 如果只是自动保存画布数据，不显示成功提示
        if (!updates.canvasData) {
          // 可以添加toast提示保存成功
        }
      } else {
        console.error('Failed to save mental model:', result.error)
        alert('保存失败，请重试')
      }
    } catch (error) {
      console.error('Error saving mental model:', error)
      alert('保存失败，请重试')
    } finally {
      setSaving(false)
    }
  }

  // 处理画布数据变化
  const handleCanvasChange = async (canvasData: any) => {
    if (!model) return

    // 静默保存画布数据，不更新UI状态
    try {
      const updateData = {
        id: model.id,
        canvasData
      }

      await fetch('/api/mental-models', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updateData)
      })

      // 不调用 setModel，避免触发重新渲染
    } catch (error) {
      console.error('Error auto-saving canvas:', error)
    }
  }

  // 添加标签
  const addTag = () => {
    const tag = tagInput.trim()
    if (tag && !localTags.includes(tag)) {
      setLocalTags([...localTags, tag])
      setTagInput('')
    }
  }

  // 删除标签
  const removeTag = (tagToRemove: string) => {
    setLocalTags(localTags.filter(tag => tag !== tagToRemove))
  }

  // 处理标签输入键盘事件
  const handleTagInputKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      addTag()
    }
  }

  useEffect(() => {
    if (isNaN(id)) {
      router.push('/mental-models')
      return
    }
    fetchModel()
  }, [id])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-500">加载中...</p>
        </div>
      </div>
    )
  }

  if (!model) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-700 mb-2">心智模型不存在</h2>
          <Button onClick={() => router.push('/mental-models')}>
            返回列表
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* 顶部工具栏 */}
      <div className="flex-shrink-0 bg-white border-b border-gray-200">
        <div className="flex items-center justify-between px-6 py-3">
          {/* 左侧 */}
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push('/mental-models')}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              返回列表
            </Button>

            <div className="border-l border-gray-300 pl-4">
              <h1 className="font-semibold text-gray-900">{model.title}</h1>
              <p className="text-sm text-gray-500">心智模型画布</p>
            </div>
          </div>

          {/* 右侧 */}
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowSettings(!showSettings)}
            >
              {showSettings ? <EyeOff className="w-4 h-4" /> : <Settings className="w-4 h-4" />}
              {showSettings ? '隐藏设置' : '显示设置'}
            </Button>

            <Button
              size="sm"
              onClick={() => saveModel()}
              disabled={saving}
              className="bg-purple-600 hover:bg-purple-700"
            >
              <Save className="w-4 h-4 mr-2" />
              {saving ? '保存中...' : '保存'}
            </Button>
          </div>
        </div>
      </div>

      {/* 主内容区域 */}
      <div className="flex-1 flex">
        {/* 设置面板 */}
        {showSettings && (
          <div className="w-80 bg-white border-r border-gray-200 p-6 overflow-y-auto">
            <h3 className="font-semibold text-gray-900 mb-4">模型设置</h3>

            {/* 标题 */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                标题
              </label>
              <Input
                value={localTitle}
                onChange={(e) => setLocalTitle(e.target.value)}
                placeholder="输入心智模型标题"
              />
            </div>

            {/* 描述 */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                描述
              </label>
              <Textarea
                value={localDescription}
                onChange={(e) => setLocalDescription(e.target.value)}
                placeholder="描述这个心智模型的用途和内容"
                rows={3}
              />
            </div>

            {/* 分类 */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                分类
              </label>
              <Input
                value={localCategory}
                onChange={(e) => setLocalCategory(e.target.value)}
                placeholder="如：健身、商业、学习等"
              />
            </div>

            {/* 标签 */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                标签
              </label>
              <div className="flex gap-2 mb-2">
                <Input
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyPress={handleTagInputKeyPress}
                  placeholder="输入标签后按回车"
                  className="flex-1"
                />
                <Button size="sm" onClick={addTag}>
                  添加
                </Button>
              </div>
              <div className="flex gap-2 flex-wrap">
                {localTags.map(tag => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 px-2 py-1 bg-purple-100 text-purple-700 text-sm rounded-full cursor-pointer hover:bg-purple-200"
                    onClick={() => removeTag(tag)}
                  >
                    #{tag}
                    <span className="text-purple-500 hover:text-purple-700">×</span>
                  </span>
                ))}
              </div>
            </div>

            {/* 应用按钮 */}
            <Button
              onClick={() => saveModel()}
              disabled={saving}
              className="w-full"
            >
              {saving ? '应用中...' : '应用设置'}
            </Button>
          </div>
        )}

        {/* 画布区域 */}
        <div className="flex-1">
          <MentalModelCanvas
            initialData={model.canvasData || []}
            onChange={handleCanvasChange}
          />
        </div>
      </div>
    </div>
  )
}
