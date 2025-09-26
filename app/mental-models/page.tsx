"use client"

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Plus, Search, Filter, ArrowLeft, Brain } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { MentalModelCard } from '@/components/mental-model-card'
import { type MentalModel } from '@/lib/mental-models-db'

export default function MentalModelsPage() {
  const [models, setModels] = useState<MentalModel[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [categories, setCategories] = useState<string[]>([])

  // 获取心智模型列表
  const fetchModels = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()

      if (searchQuery) {
        params.append('search', searchQuery)
      } else if (selectedCategory !== 'all') {
        params.append('category', selectedCategory)
      }

      const response = await fetch(`/api/mental-models?${params}`)
      const result = await response.json()

      if (result.success) {
        setModels(result.data)
      } else {
        console.error('Failed to fetch mental models:', result.error)
      }
    } catch (error) {
      console.error('Error fetching mental models:', error)
    } finally {
      setLoading(false)
    }
  }

  // 获取分类列表
  const fetchCategories = async () => {
    try {
      const response = await fetch('/api/mental-models/categories')
      const result = await response.json()

      if (result.success) {
        setCategories(result.data)
      }
    } catch (error) {
      console.error('Error fetching categories:', error)
    }
  }

  // 创建新的心智模型
  const createNewModel = async () => {
    try {
      const newModel = {
        title: '新的心智模型',
        description: '点击编辑描述',
        canvasData: [],
        category: selectedCategory !== 'all' ? selectedCategory : '通用'
      }

      const response = await fetch('/api/mental-models', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(newModel)
      })

      const result = await response.json()

      if (result.success) {
        // 跳转到新创建的画布页面
        window.location.href = `/mental-models/${result.data.id}`
      } else {
        console.error('Failed to create mental model:', result.error)
      }
    } catch (error) {
      console.error('Error creating mental model:', error)
    }
  }

  useEffect(() => {
    fetchModels()
  }, [searchQuery, selectedCategory])

  useEffect(() => {
    fetchCategories()
  }, [])

  return (
    <div className="min-h-screen bg-neutral-100 text-neutral-900">
      <div className="mx-auto flex min-h-screen max-w-5xl flex-col px-6 py-10 sm:px-8">
        {/* 头部 */}
        <header className="mb-10 space-y-6">
          <div className="flex items-center justify-between">
            <Link href="/">
              <Button
                variant="ghost"
                size="sm"
                className="rounded-none border border-transparent px-3 py-1 text-sm text-neutral-500 hover:border-neutral-300 hover:bg-white hover:text-neutral-800"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />返回
              </Button>
            </Link>

            <Button
              onClick={createNewModel}
              className="rounded-none border border-neutral-900 bg-neutral-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-neutral-800"
            >
              <Plus className="mr-2 h-4 w-4" />新建心智模型
            </Button>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <Brain className="h-6 w-6 text-neutral-400" />
              <h1 className="text-3xl font-semibold tracking-tight">心智模型</h1>
            </div>
            <p className="max-w-2xl text-sm text-neutral-500">
              将你的思考框架集中在一处。黑白留白，让内容成为焦点。
            </p>
          </div>

          {/* 工具栏 */}
          <div className="flex flex-col gap-3 border-t border-b border-neutral-200 py-4 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
              <Input
                placeholder="搜索心智模型"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="rounded-none border-neutral-300 pl-10 text-sm text-neutral-800 placeholder:text-neutral-400 focus:border-neutral-900 focus:ring-0"
              />
            </div>

            <div className="flex items-center gap-2 text-sm text-neutral-500">
              <Filter className="h-4 w-4" />
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="rounded-none border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-700 focus:border-neutral-900 focus:outline-none focus:ring-0"
              >
                <option value="all">所有分类</option>
                {categories.map(category => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </header>

        {/* 内容区域 */}
        {loading ? (
          <div className="flex flex-1 items-center justify-center">
            <div className="text-center">
              <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border border-neutral-200 border-t-neutral-900" />
              <p className="text-sm text-neutral-500">正在整理你的模型...</p>
            </div>
          </div>
        ) : models.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center text-center">
            <Brain className="mb-6 h-16 w-16 text-neutral-200" />
            <h3 className="mb-3 text-xl font-medium text-neutral-700">
              {searchQuery || selectedCategory !== 'all' ? '未找到匹配的模型' : '暂无心智模型'}
            </h3>
            <p className="mb-6 max-w-sm text-sm text-neutral-500">
              {searchQuery || selectedCategory !== 'all'
                ? '换个关键词试试，或重置筛选条件。'
                : '点击右上角「新建心智模型」，开始第一个画布。'}
            </p>
            {!searchQuery && selectedCategory === 'all' && (
              <Button
                onClick={createNewModel}
                className="rounded-none border border-neutral-900 bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800"
              >
                <Plus className="mr-2 h-4 w-4" />创建心智模型
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 items-start gap-6 pb-10 md:grid-cols-2 xl:grid-cols-3">
            {models.map(model => (
              <MentalModelCard
                key={model.id}
                model={model}
                onUpdate={fetchModels}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
