"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Loader2, X } from "lucide-react"

interface SimpleTask {
  id: number
  title: string
  type: string
}

interface QuickTaskCreateModalProps {
  isOpen: boolean
  onClose: () => void
  onCreated: (taskTitle: string) => void
}

export function QuickTaskCreateModal({ isOpen, onClose, onCreated }: QuickTaskCreateModalProps) {
  const [mainTasks, setMainTasks] = useState<SimpleTask[]>([])
  const [mainTasksLoading, setMainTasksLoading] = useState(false)
  const [subTasks, setSubTasks] = useState<SimpleTask[]>([])
  const [subTasksLoading, setSubTasksLoading] = useState(false)
  const [selectedMainTaskId, setSelectedMainTaskId] = useState<string>("")
  const [selectedSubTaskId, setSelectedSubTaskId] = useState<string>("")
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const resetForm = useCallback(() => {
    setSelectedMainTaskId("")
    setSelectedSubTaskId("")
    setSubTasks([])
    setTitle("")
    setDescription("")
    setError(null)
    setIsSubmitting(false)
  }, [])

  const fetchMainTasks = useCallback(async () => {
    setMainTasksLoading(true)
    try {
      const response = await fetch("/api/tasks")
      if (!response.ok) {
        throw new Error("无法加载主任务")
      }
      const data = await response.json()

      const normalized: SimpleTask[] = [
        ...(Array.isArray(data.routines) ? data.routines : []),
        ...(Array.isArray(data.longTermTasks) ? data.longTermTasks : []),
        ...(Array.isArray(data.shortTermTasks) ? data.shortTermTasks : [])
      ]
        .filter((task: any) => task?.id && task.type !== 'routine')
        .map((task: any) => ({
          id: task.id as number,
          title: task.title as string,
          type: task.type as string
        }))

      setMainTasks(normalized)
    } catch (err) {
      console.error(err)
      setMainTasks([])
      setError((err as Error).message)
    } finally {
      setMainTasksLoading(false)
    }
  }, [])

  const fetchSubTasks = useCallback(async (parentId: number) => {
    setSubTasksLoading(true)
    try {
      const response = await fetch(`/api/tasks/subtasks?parentId=${parentId}&level=1`)
      if (!response.ok) {
        throw new Error("无法加载子任务")
      }
      const data = await response.json()

      const normalized: SimpleTask[] = Array.isArray(data)
        ? data
          .filter((task: any) => task?.id && task.type !== 'routine')
          .map((task: any) => ({
            id: task.id as number,
            title: task.title as string,
            type: task.type as string
          }))
        : []

      setSubTasks(normalized)
    } catch (err) {
      console.error(err)
      setSubTasks([])
      setError((err as Error).message)
    } finally {
      setSubTasksLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!isOpen) {
      return
    }

    resetForm()
    void fetchMainTasks()
  }, [isOpen, fetchMainTasks, resetForm])

  useEffect(() => {
    if (!isOpen) {
      return
    }

    if (selectedMainTaskId) {
      const id = Number(selectedMainTaskId)
      void fetchSubTasks(id)
    } else {
      setSubTasks([])
      setSelectedSubTaskId("")
    }
  }, [isOpen, selectedMainTaskId, fetchSubTasks])

  const handleCreate = async () => {
    if (!selectedMainTaskId) {
      setError("请选择主任务")
      return
    }

    if (!title.trim()) {
      setError("请输入任务标题")
      return
    }

    const mainTask = mainTasks.find(task => task.id === Number(selectedMainTaskId))
    if (!mainTask) {
      setError("所选主任务不存在")
      return
    }

    const subTask = selectedSubTaskId
      ? subTasks.find(task => task.id === Number(selectedSubTaskId))
      : undefined

    const payload = {
      type: subTask ? subTask.type : mainTask.type,
      title: title.trim(),
      description: description.trim(),
      priority: 999,
      parentId: subTask ? subTask.id : mainTask.id,
      level: subTask ? 2 : 1
    }

    setIsSubmitting(true)
    setError(null)
    try {
      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      if (!response.ok) {
        const data = await response.json().catch(() => null)
        throw new Error(data?.error || '创建任务失败')
      }

      onCreated(payload.title)
      onClose()
    } catch (err) {
      console.error(err)
      setError((err as Error).message)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isOpen) {
    return null
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">快速创建任务</h2>
            <p className="text-sm text-gray-500 mt-1">选择任务层级并填写信息，即可添加至任务池</p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="关闭">
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="space-y-4">
          <div>
            <Label htmlFor="quick-task-main" className="text-sm">主任务</Label>
            <select
              id="quick-task-main"
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={selectedMainTaskId}
              onChange={(e) => setSelectedMainTaskId(e.target.value)}
              disabled={mainTasksLoading || isSubmitting}
            >
              <option value="">请选择主任务</option>
              {mainTasks.map(task => (
                <option key={task.id} value={task.id}>
                  {task.title}
                </option>
              ))}
            </select>
            {mainTasksLoading && (
              <p className="text-xs text-gray-500 mt-1">加载主任务中...</p>
            )}
          </div>

          <div>
            <Label htmlFor="quick-task-sub" className="text-sm">子任务（可选）</Label>
            <select
              id="quick-task-sub"
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={selectedSubTaskId}
              onChange={(e) => setSelectedSubTaskId(e.target.value)}
              disabled={!selectedMainTaskId || subTasksLoading || isSubmitting}
            >
              <option value="">无需选择（创建子任务）</option>
              {subTasks.map(task => (
                <option key={task.id} value={task.id}>
                  {task.title}
                </option>
              ))}
            </select>
            {selectedMainTaskId && subTasksLoading && (
              <p className="text-xs text-gray-500 mt-1">加载子任务中...</p>
            )}
            {selectedMainTaskId && !subTasksLoading && subTasks.length === 0 && (
              <p className="text-xs text-gray-500 mt-1">当前主任务暂无子任务，创建后将作为新的子任务</p>
            )}
          </div>

          <div>
            <Label htmlFor="quick-task-title" className="text-sm">任务标题</Label>
            <Input
              id="quick-task-title"
              className="mt-1"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="请输入任务标题"
              disabled={isSubmitting}
              autoFocus
            />
          </div>

          <div>
            <Label htmlFor="quick-task-desc" className="text-sm">任务描述（可选）</Label>
            <Textarea
              id="quick-task-desc"
              className="mt-1"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="补充背景、目的或提醒"
              disabled={isSubmitting}
              rows={3}
            />
          </div>

          <p className="text-xs text-gray-500">注：如果选定子任务，新任务将创建为其子子任务；否则创建为主任务下的子任务。</p>

          {error && (
            <div className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            取消
          </Button>
          <Button onClick={handleCreate} disabled={isSubmitting || !selectedMainTaskId || !title.trim()}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                创建中
              </>
            ) : (
              "创建任务"
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
