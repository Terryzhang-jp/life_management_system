"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Plus, X, Edit2, Save, Loader2, ArrowLeft, Expand, ChevronRight, HelpCircle, CheckSquare, Square, MessageSquare, CheckCircle2 } from "lucide-react"
import { DatePicker, DateDisplay } from "@/components/ui/date-picker"
import { TaskCompletionDialog } from "./task-completion-dialog"
import TaskCategoryManager from "./task-category-manager"
import { useToast } from "@/hooks/use-toast"
import Link from "next/link"

type TaskType = 'routine' | 'long-term' | 'short-term'

interface TaskCompletionInfo {
  taskId: number
  isCompleted: boolean
  completedAt?: string
  completionComment?: string
}

interface Task {
  id?: number
  type: TaskType
  title: string
  description?: string
  priority?: number
  parentId?: number
  level?: number
  deadline?: string
  isUnclear?: boolean
  unclearReason?: string
  hasUnclearChildren?: boolean
  categoryId?: number
  completion?: TaskCompletionInfo
  createdAt?: string
  updatedAt?: string
}

interface TaskCategory {
  id?: number
  name: string
  color: string
  icon?: string
  order?: number
}

interface TasksData {
  routines: Task[]
  longTermTasks: Task[]
  shortTermTasks: Task[]
}

export default function TasksPage() {
  const { toast } = useToast()
  const [tasks, setTasks] = useState<TasksData>({
    routines: [],
    longTermTasks: [],
    shortTermTasks: []
  })
  const [categories, setCategories] = useState<TaskCategory[]>([])
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)

  // 展开视图状态
  const [expandedTask, setExpandedTask] = useState<Task | null>(null)
  const [subTasks, setSubTasks] = useState<Task[]>([])
  const [subSubTasks, setSubSubTasks] = useState<Task[]>([])
  const [selectedSubTask, setSelectedSubTask] = useState<Task | null>(null)

  // 完成对话框状态
  const [showCompletionDialog, setShowCompletionDialog] = useState(false)
  const [taskToComplete, setTaskToComplete] = useState<Task | null>(null)

  // 子任务表单状态
  const [showSubTaskForm, setShowSubTaskForm] = useState(false)
  const [newSubTaskTitle, setNewSubTaskTitle] = useState("")
  const [newSubTaskDesc, setNewSubTaskDesc] = useState("")
  const [showSubSubTaskForm, setShowSubSubTaskForm] = useState(false)
  const [newSubSubTaskTitle, setNewSubSubTaskTitle] = useState("")
  const [newSubSubTaskDesc, setNewSubSubTaskDesc] = useState("")

  // 编辑状态
  const [editingSubTask, setEditingSubTask] = useState<Task | null>(null)
  const [editingSubSubTask, setEditingSubSubTask] = useState<Task | null>(null)

  // 模糊度管理状态
  const [showUnclearForm, setShowUnclearForm] = useState(false)
  const [unclearTaskId, setUnclearTaskId] = useState<number | null>(null)
  const [unclearReason, setUnclearReason] = useState("")

  // 检查任务是否有模糊的子任务
  const checkTaskUnclearChildren = useCallback(async (taskId: number): Promise<boolean> => {
    try {
      const response = await fetch(`/api/tasks/unclear?taskId=${taskId}`)
      if (response.ok) {
        const data = await response.json()
        return data.hasUnclearChildren
      }
    } catch (error) {
      console.error('Error checking unclear children:', error)
    }
    return false
  }, [])

  // 加载任务
  const loadTasks = useCallback(async () => {
    try {
      const response = await fetch('/api/tasks')
      if (response.ok) {
        const data = await response.json()

        // 为每个主任务检查是否有模糊的子任务
        const enhancedData = {
          routines: await Promise.all(data.routines.map(async (task: Task) => ({
            ...task,
            hasUnclearChildren: task.id ? await checkTaskUnclearChildren(task.id) : false
          }))),
          longTermTasks: await Promise.all(data.longTermTasks.map(async (task: Task) => ({
            ...task,
            hasUnclearChildren: task.id ? await checkTaskUnclearChildren(task.id) : false
          }))),
          shortTermTasks: await Promise.all(data.shortTermTasks.map(async (task: Task) => ({
            ...task,
            hasUnclearChildren: task.id ? await checkTaskUnclearChildren(task.id) : false
          })))
        }

        setTasks(enhancedData)
      }
    } catch (error) {
      console.error('Error loading tasks:', error)
    }
  }, [checkTaskUnclearChildren])

  // 加载分类列表
  const loadCategories = useCallback(async () => {
    try {
      const response = await fetch('/api/task-categories')
      if (response.ok) {
        const data = await response.json()
        setCategories(data)
      }
    } catch (error) {
      console.error('Error loading categories:', error)
    }
  }, [])

  useEffect(() => {
    void loadTasks()
    void loadCategories()
  }, [loadTasks, loadCategories])

  // 加载子任务
  const loadSubTasks = useCallback(async (parentId: number, level: number = 1) => {
    try {
      const response = await fetch(`/api/tasks/subtasks?parentId=${parentId}&level=${level}`)
      if (response.ok) {
        const data = await response.json()

        // 为子任务检查是否有模糊的子子任务
        const enhancedData = await Promise.all(data.map(async (task: Task) => ({
          ...task,
          hasUnclearChildren: task.id && level === 1 ? await checkTaskUnclearChildren(task.id) : false
        })))

        if (level === 1) {
          setSubTasks(enhancedData)
        } else if (level === 2) {
          setSubSubTasks(enhancedData)
        }
      }
    } catch (error) {
      console.error('Error loading subtasks:', error)
    }
  }, [checkTaskUnclearChildren])

  // 展开任务详情
  const expandTask = async (task: Task) => {
    setExpandedTask(task)
    setSelectedSubTask(null)
    setSubSubTasks([])
    if (task.id) {
      await loadSubTasks(task.id, 1)
    }
  }

  // 选择子任务
  const selectSubTask = async (subTask: Task) => {
    setSelectedSubTask(subTask)
    if (subTask.id) {
      await loadSubTasks(subTask.id, 2)
    }
  }

  // 关闭展开视图
  const closeExpandedView = () => {
    setExpandedTask(null)
    setSubTasks([])
    setSubSubTasks([])
    setSelectedSubTask(null)
    setShowSubTaskForm(false)
    setShowSubSubTaskForm(false)
    setNewSubTaskTitle("")
    setNewSubTaskDesc("")
    setNewSubSubTaskTitle("")
    setNewSubSubTaskDesc("")
    setEditingSubTask(null)
    setEditingSubSubTask(null)
  }

  // 添加子任务
  const handleAddSubTask = async () => {
    if (!expandedTask?.id || !newSubTaskTitle.trim()) return

    setLoading(true)
    try {
      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: expandedTask.type,
          title: newSubTaskTitle.trim(),
          description: newSubTaskDesc.trim(),
          parentId: expandedTask.id,
          level: 1
        })
      })

      if (response.ok) {
        await loadSubTasks(expandedTask.id, 1)
        setNewSubTaskTitle("")
        setNewSubTaskDesc("")
        setShowSubTaskForm(false)
        toast({
          title: "成功",
          description: "子任务已添加"
        })
      } else {
        throw new Error('Failed to add subtask')
      }
    } catch (error) {
      toast({
        title: "错误",
        description: "添加子任务失败",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  // 添加子子任务
  const handleAddSubSubTask = async () => {
    if (!selectedSubTask?.id || !newSubSubTaskTitle.trim()) return

    setLoading(true)
    try {
      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: selectedSubTask.type,
          title: newSubSubTaskTitle.trim(),
          description: newSubSubTaskDesc.trim(),
          parentId: selectedSubTask.id,
          level: 2
        })
      })

      if (response.ok) {
        await loadSubTasks(selectedSubTask.id, 2)
        setNewSubSubTaskTitle("")
        setNewSubSubTaskDesc("")
        setShowSubSubTaskForm(false)
        toast({
          title: "成功",
          description: "子子任务已添加"
        })
      } else {
        throw new Error('Failed to add sub-subtask')
      }
    } catch (error) {
      toast({
        title: "错误",
        description: "添加子子任务失败",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  // 删除子任务
  const deleteSubTask = async (id: number) => {
    setLoading(true)
    try {
      const response = await fetch(`/api/tasks?id=${id}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        if (expandedTask?.id) {
          await loadSubTasks(expandedTask.id, 1)
        }
        // 如果删除的是当前选中的子任务，清空右列
        if (selectedSubTask?.id === id) {
          setSelectedSubTask(null)
          setSubSubTasks([])
        }
        toast({
          title: "成功",
          description: "子任务已删除"
        })
      } else {
        throw new Error('Failed to delete subtask')
      }
    } catch (error) {
      toast({
        title: "错误",
        description: "删除子任务失败",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  // 删除子子任务
  const deleteSubSubTask = async (id: number) => {
    setLoading(true)
    try {
      const response = await fetch(`/api/tasks?id=${id}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        if (selectedSubTask?.id) {
          await loadSubTasks(selectedSubTask.id, 2)
        }
        toast({
          title: "成功",
          description: "子子任务已删除"
        })
      } else {
        throw new Error('Failed to delete sub-subtask')
      }
    } catch (error) {
      toast({
        title: "错误",
        description: "删除子子任务失败",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  // 开始编辑子任务
  const startEditSubTask = (subTask: Task) => {
    setEditingSubTask(subTask)
  }

  // 开始编辑子子任务
  const startEditSubSubTask = (subSubTask: Task) => {
    setEditingSubSubTask(subSubTask)
  }

  // 更新子任务
  const updateSubTask = async (id: number, title: string, description: string, priority: number = 999, deadline?: string) => {
    setLoading(true)
    try {
      const response = await fetch('/api/tasks', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id,
          title,
          description,
          priority,
          deadline
        })
      })

      if (response.ok) {
        if (expandedTask?.id) {
          await loadSubTasks(expandedTask.id, 1)
        }
        setEditingSubTask(null)
        toast({
          title: "成功",
          description: "子任务已更新"
        })
      } else {
        throw new Error('Failed to update subtask')
      }
    } catch (error) {
      toast({
        title: "错误",
        description: "更新子任务失败",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  // 更新子子任务
  const updateSubSubTask = async (id: number, title: string, description: string, priority: number = 999, deadline?: string) => {
    setLoading(true)
    try {
      const response = await fetch('/api/tasks', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id,
          title,
          description,
          priority,
          deadline
        })
      })

      if (response.ok) {
        if (selectedSubTask?.id) {
          await loadSubTasks(selectedSubTask.id, 2)
        }
        setEditingSubSubTask(null)
        toast({
          title: "成功",
          description: "子子任务已更新"
        })
      } else {
        throw new Error('Failed to update sub-subtask')
      }
    } catch (error) {
      toast({
        title: "错误",
        description: "更新子子任务失败",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  // 标记任务为模糊
  const markTaskAsUnclear = (taskId: number, currentUnclearReason?: string) => {
    setUnclearTaskId(taskId)
    setUnclearReason(currentUnclearReason || "")
    setShowUnclearForm(true)
  }

  // 提交模糊状态
  const submitUnclearStatus = async (isUnclear: boolean) => {
    if (!unclearTaskId) return

    setLoading(true)
    try {
      const response = await fetch('/api/tasks/unclear', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: unclearTaskId,
          isUnclear,
          unclearReason: isUnclear ? unclearReason.trim() : ''
        })
      })

      if (response.ok) {
        // 重新加载任务数据
        await loadTasks()
        if (expandedTask?.id) {
          await loadSubTasks(expandedTask.id, 1)
          if (selectedSubTask?.id) {
            await loadSubTasks(selectedSubTask.id, 2)
          }
        }

        setShowUnclearForm(false)
        setUnclearTaskId(null)
        setUnclearReason("")

        toast({
          title: "成功",
          description: isUnclear ? "任务已标记为模糊" : "已取消模糊标记"
        })
      } else {
        throw new Error('Failed to update unclear status')
      }
    } catch (error) {
      toast({
        title: "错误",
        description: "更新模糊状态失败",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  // 切换任务模糊状态
  const handleToggleUnclear = (task: Task) => {
    if (task.isUnclear) {
      // 如果当前是模糊状态，直接取消
      setUnclearTaskId(task.id!)
      submitUnclearStatus(false)
    } else {
      // 如果当前不是模糊状态，显示表单
      setUnclearTaskId(task.id!)
      setShowUnclearForm(true)
    }
  }

  // 添加任务
  const addTask = async (type: TaskType, title: string, description: string, priority: number = 999, categoryId?: number) => {
    if (!title.trim()) {
      toast({
        title: "错误",
        description: "任务标题不能为空",
        variant: "destructive"
      })
      return
    }

    setLoading(true)
    try {
      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, title: title.trim(), description: description.trim(), priority, categoryId })
      })

      if (response.ok) {
        await loadTasks()
        toast({
          title: "成功",
          description: "任务已添加"
        })
      } else {
        throw new Error('Failed to add task')
      }
    } catch (error) {
      toast({
        title: "错误",
        description: "添加任务失败",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  // 更新任务
  const updateTask = async (id: number, title: string, description: string, priority?: number, categoryId?: number) => {
    if (!title.trim()) {
      toast({
        title: "错误",
        description: "任务标题不能为空",
        variant: "destructive"
      })
      return
    }

    setLoading(true)
    try {
      const updateData: any = { id, title: title.trim(), description: description.trim() }
      if (priority !== undefined) {
        updateData.priority = priority
      }
      if (categoryId !== undefined) {
        updateData.categoryId = categoryId
      }

      const response = await fetch('/api/tasks', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData)
      })

      if (response.ok) {
        await loadTasks()
        setEditingId(null)
        toast({
          title: "成功",
          description: "任务已更新"
        })
      } else {
        throw new Error('Failed to update task')
      }
    } catch (error) {
      toast({
        title: "错误",
        description: "更新任务失败",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  // 删除任务
  const deleteTask = async (id: number) => {
    setLoading(true)
    try {
      const response = await fetch(`/api/tasks?id=${id}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        await loadTasks()
        toast({
          title: "成功",
          description: "任务已删除"
        })
      } else {
        throw new Error('Failed to delete task')
      }
    } catch (error) {
      toast({
        title: "错误",
        description: "删除任务失败",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  // 显示完成对话框
  const showTaskCompletionDialog = (task: Task) => {
    setTaskToComplete(task)
    setShowCompletionDialog(true)
  }

  // 关闭完成对话框
  const closeCompletionDialog = () => {
    setShowCompletionDialog(false)
    setTaskToComplete(null)
  }

  // 处理任务完成
  const handleTaskCompleted = async () => {
    await loadTasks() // 重新加载任务以更新完成状态
    if (expandedTask?.id) {
      await loadSubTasks(expandedTask.id, 1)
    }
    if (selectedSubTask?.id) {
      await loadSubTasks(selectedSubTask.id, 2)
    }
  }

  // 取消完成任务
  const uncompleteTask = async (taskId: number) => {
    setLoading(true)
    try {
      const response = await fetch(`/api/completed-tasks?taskId=${taskId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        await loadTasks()
        if (expandedTask?.id) {
          await loadSubTasks(expandedTask.id, 1)
        }
        if (selectedSubTask?.id) {
          await loadSubTasks(selectedSubTask.id, 2)
        }
        toast({
          title: "已取消完成",
          description: "任务已重新激活"
        })
      } else {
        throw new Error('Failed to uncomplete task')
      }
    } catch (error) {
      toast({
        title: "错误",
        description: "取消完成失败",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  // 任务卡片组件
  const TaskCard = ({
    title,
    description,
    tasks,
    type
  }: {
    title: string
    description: string
    tasks: Task[]
    type: TaskType
  }) => {
    const [showForm, setShowForm] = useState(false)
    const [taskTitle, setTaskTitle] = useState("")
    const [taskDesc, setTaskDesc] = useState("")
    const [taskPriority, setTaskPriority] = useState(999)
    const [taskCategoryId, setTaskCategoryId] = useState<number | undefined>(undefined)

    const handleSubmit = async () => {
      await addTask(type, taskTitle, taskDesc, taskPriority, taskCategoryId)
      setTaskTitle("")
      setTaskDesc("")
      setTaskPriority(999)
      setTaskCategoryId(undefined)
      setShowForm(false)
    }

    const handleCancel = () => {
      setTaskTitle("")
      setTaskDesc("")
      setTaskPriority(999)
      setTaskCategoryId(undefined)
      setShowForm(false)
    }

    return (
      <Card className="h-fit">
        <CardHeader>
          <CardTitle className="text-lg">{title}</CardTitle>
          <p className="text-sm text-gray-600">{description}</p>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* 现有任务列表 */}
          {tasks.map((task) => {
            const isEditing = editingId === task.id
            return (
              <TaskItem
                key={task.id}
                task={task}
                isEditing={isEditing}
                onEdit={() => setEditingId(task.id!)}
                onSave={(title, description, priority, categoryId) => updateTask(task.id!, title, description, priority, categoryId)}
                onCancel={() => setEditingId(null)}
                onDelete={() => deleteTask(task.id!)}
                onExpand={() => expandTask(task)}
                onComplete={() => showTaskCompletionDialog(task)}
                onUncomplete={() => uncompleteTask(task.id!)}
                disabled={loading}
              />
            )
          })}

          {/* 添加新任务表单 */}
          {showForm ? (
            <div className="space-y-2 p-3 border-2 border-dashed rounded-lg">
              <Input
                placeholder="任务标题"
                value={taskTitle}
                onChange={(e) => setTaskTitle(e.target.value)}
                autoFocus
              />
              <Textarea
                placeholder="你为什么要做这个事情？对你的好处是什么？"
                value={taskDesc}
                onChange={(e) => setTaskDesc(e.target.value)}
                className="min-h-[60px]"
              />
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium">重要度:</label>
                  <select
                    value={taskPriority}
                    onChange={(e) => setTaskPriority(Number(e.target.value))}
                    className="px-2 py-1 border rounded text-sm"
                  >
                    <option value={1}>1 (最重要)</option>
                    <option value={2}>2 (重要)</option>
                    <option value={3}>3 (较重要)</option>
                    <option value={4}>4 (一般)</option>
                    <option value={5}>5 (较低)</option>
                    <option value={999}>无优先级</option>
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium">分类:</label>
                  <select
                    value={taskCategoryId || ''}
                    onChange={(e) => setTaskCategoryId(e.target.value ? Number(e.target.value) : undefined)}
                    className="px-2 py-1 border rounded text-sm"
                  >
                    <option value="">无分类</option>
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={handleSubmit}
                  disabled={loading || !taskTitle.trim()}
                >
                  {loading ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Save className="h-3 w-3 mr-1" />}
                  保存
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleCancel}
                  disabled={loading}
                >
                  取消
                </Button>
              </div>
            </div>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowForm(true)}
              disabled={loading}
              className="w-full"
            >
              <Plus className="h-4 w-4 mr-2" />
              添加{title.includes('习惯') ? '习惯' : '任务'}
            </Button>
          )}
        </CardContent>
      </Card>
    )
  }

  // 任务项组件
  const TaskItem = ({
    task,
    isEditing,
    onEdit,
    onSave,
    onCancel,
    onDelete,
    onExpand,
    onComplete,
    onUncomplete,
    disabled
  }: {
    task: Task
    isEditing: boolean
    onEdit: () => void
    onSave: (title: string, description: string, priority?: number, categoryId?: number) => void
    onCancel: () => void
    onDelete: () => void
    onExpand: () => void
    onComplete: () => void
    onUncomplete: () => void
    disabled: boolean
  }) => {
    const [editTitle, setEditTitle] = useState(task.title)
    const [editDescription, setEditDescription] = useState(task.description || "")
    const [editPriority, setEditPriority] = useState(task.priority || 999)
    const [editCategoryId, setEditCategoryId] = useState(task.categoryId)

    const handleSave = () => {
      onSave(editTitle, editDescription, editPriority, editCategoryId)
    }

    const handleCancel = () => {
      setEditTitle(task.title)
      setEditDescription(task.description || "")
      setEditPriority(task.priority || 999)
      setEditCategoryId(task.categoryId)
      onCancel()
    }

    // 获取优先级颜色
    const getPriorityColor = (priority: number) => {
      if (priority === 1) return "bg-red-100 border-red-200"
      if (priority === 2) return "bg-orange-100 border-orange-200"
      if (priority === 3) return "bg-yellow-100 border-yellow-200"
      return "bg-gray-50 border-gray-200"
    }

    // 获取优先级标签颜色
    const getPriorityBadgeColor = (priority: number) => {
      if (priority === 1) return "bg-red-200 text-red-800"
      if (priority === 2) return "bg-orange-200 text-orange-800"
      if (priority === 3) return "bg-yellow-200 text-yellow-800"
      if (priority <= 5) return "bg-blue-200 text-blue-800"
      return "bg-gray-200 text-gray-600"
    }

    if (isEditing) {
      return (
        <div className="space-y-2 p-3 border-2 border-blue-200 rounded-lg bg-blue-50">
          <Input
            placeholder="任务标题"
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            autoFocus
          />
          <Textarea
            placeholder="你为什么要做这个事情？对你的好处是什么？"
            value={editDescription}
            onChange={(e) => setEditDescription(e.target.value)}
            className="min-h-[60px]"
          />
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium">重要度:</label>
              <select
                value={editPriority}
                onChange={(e) => setEditPriority(Number(e.target.value))}
                className="px-2 py-1 border rounded text-sm"
              >
                <option value={1}>1 (最重要)</option>
                <option value={2}>2 (重要)</option>
                <option value={3}>3 (较重要)</option>
                <option value={4}>4 (一般)</option>
                <option value={5}>5 (较低)</option>
                <option value={999}>无优先级</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium">分类:</label>
              <select
                value={editCategoryId || ''}
                onChange={(e) => setEditCategoryId(e.target.value ? Number(e.target.value) : undefined)}
                className="px-2 py-1 border rounded text-sm"
              >
                <option value="">无分类</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={handleSave}
              disabled={disabled || !editTitle.trim()}
            >
              {disabled ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Save className="h-3 w-3 mr-1" />}
              保存
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handleCancel}
              disabled={disabled}
            >
              取消
            </Button>
          </div>
        </div>
      )
    }

    // 获取完成状态样式
    const isCompleted = task.completion?.isCompleted || false
    const getCompletionStyles = () => {
      if (isCompleted) {
        return {
          containerClass: "bg-gray-100 border-gray-300",
          titleClass: "text-gray-500 line-through",
          descClass: "text-gray-400 line-through"
        }
      }
      return {
        containerClass: getPriorityColor(task.priority || 999),
        titleClass: "text-gray-900",
        descClass: "text-gray-600"
      }
    }

    const styles = getCompletionStyles()

    // 获取分类信息
    const getTaskCategory = () => {
      if (!task.categoryId) return null
      return categories.find(category => category.id === task.categoryId)
    }

    const taskCategory = getTaskCategory()

    return (
      <div className={`p-3 border rounded-lg transition-colors hover:opacity-80 ${styles.containerClass}`}>
        <div className="flex justify-between items-start">
          <div className="flex items-start gap-3 flex-1">
            {/* 复选框 */}
            <Button
              size="sm"
              variant="ghost"
              onClick={isCompleted ? onUncomplete : onComplete}
              disabled={disabled}
              className="h-5 w-5 p-0 mt-0.5"
              title={isCompleted ? "取消完成" : "标记为完成"}
            >
              {isCompleted ? (
                <CheckSquare className="h-4 w-4 text-green-600" />
              ) : (
                <Square className="h-4 w-4 text-gray-400 hover:text-gray-600" />
              )}
            </Button>

            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h4 className={`font-medium text-sm ${styles.titleClass}`}>{task.title}</h4>
                {(task.priority && task.priority <= 5) && (
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getPriorityBadgeColor(task.priority)}`}>
                    {task.priority === 999 ? '' : task.priority}
                  </span>
                )}
                {task.isUnclear && (
                  <span title={task.unclearReason || "此任务标记为模糊"}>
                    <HelpCircle className="h-4 w-4 text-orange-500" />
                  </span>
                )}
                {task.hasUnclearChildren && (
                  <span title="此任务有模糊的子任务">
                    <HelpCircle className="h-4 w-4 text-yellow-500" />
                  </span>
                )}
                {taskCategory && (
                  <span
                    className="text-xs px-2 py-0.5 rounded-full font-medium text-white"
                    style={{ backgroundColor: taskCategory.color }}
                    title={`分类: ${taskCategory.name}`}
                  >
                    {taskCategory.name}
                  </span>
                )}
              </div>
              {task.description && (
                <p className={`text-xs mt-1 ${styles.descClass}`}>{task.description}</p>
              )}

              {/* 完成信息显示 */}
              {isCompleted && task.completion && (
                <div className="mt-2 flex items-center gap-2 text-xs text-gray-500">
                  <span>✓ 已于 {new Date(task.completion.completedAt!).toLocaleDateString('zh-CN', {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })} 完成</span>
                  {task.completion.completionComment && (
                    <span title={`完成感悟: ${task.completion.completionComment}`}>
                      <MessageSquare className="h-3 w-3 text-gray-400" />
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
          <div className="flex gap-1">
            <Button
              size="sm"
              variant="ghost"
              onClick={onExpand}
              disabled={disabled}
              className="h-6 w-6 p-0"
              title="展开任务详情"
            >
              <Expand className="h-3 w-3" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={onEdit}
              disabled={disabled}
              className="h-6 w-6 p-0"
            >
              <Edit2 className="h-3 w-3" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={onDelete}
              disabled={disabled}
              className="h-6 w-6 p-0"
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // 子任务编辑表单组件
  const SubTaskEditForm = ({
    subTask,
    onSave,
    onCancel,
    disabled
  }: {
    subTask: Task
    onSave: (title: string, description: string, priority?: number, deadline?: string) => void
    onCancel: () => void
    disabled: boolean
  }) => {
    const [editTitle, setEditTitle] = useState(subTask.title)
    const [editDescription, setEditDescription] = useState(subTask.description || "")
    const [editPriority, setEditPriority] = useState(subTask.priority || 999)
    const [editDeadline, setEditDeadline] = useState(subTask.deadline)

    const handleSave = () => {
      onSave(editTitle, editDescription, editPriority, editDeadline)
    }

    const handleCancel = () => {
      setEditTitle(subTask.title)
      setEditDescription(subTask.description || "")
      setEditPriority(subTask.priority || 999)
      setEditDeadline(subTask.deadline)
      onCancel()
    }

    return (
      <div className="p-3 border rounded-lg bg-blue-50 border-blue-200">
        <div className="space-y-2">
          <Input
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            placeholder="任务标题"
            autoFocus
          />
          <Textarea
            value={editDescription}
            onChange={(e) => setEditDescription(e.target.value)}
            placeholder="任务描述"
            className="min-h-[60px]"
          />
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium">优先级:</label>
            <select
              value={editPriority}
              onChange={(e) => setEditPriority(Number(e.target.value))}
              className="px-2 py-1 border rounded text-sm"
            >
              <option value={1}>1 (最重要)</option>
              <option value={2}>2 (重要)</option>
              <option value={3}>3 (较重要)</option>
              <option value={4}>4 (一般)</option>
              <option value={5}>5 (较低)</option>
              <option value={999}>无优先级</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium">截止日期:</label>
            <DatePicker
              value={editDeadline}
              onChange={setEditDeadline}
              placeholder="选择截止日期"
              className="flex-1"
            />
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              onClick={handleSave}
              disabled={disabled || !editTitle.trim()}
            >
              {disabled ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Save className="h-3 w-3 mr-1" />}
              保存
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handleCancel}
              disabled={disabled}
            >
              取消
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // 子子任务编辑表单组件
  const SubSubTaskEditForm = ({
    subSubTask,
    onSave,
    onCancel,
    disabled
  }: {
    subSubTask: Task
    onSave: (title: string, description: string, priority?: number, deadline?: string) => void
    onCancel: () => void
    disabled: boolean
  }) => {
    const [editTitle, setEditTitle] = useState(subSubTask.title)
    const [editDescription, setEditDescription] = useState(subSubTask.description || "")
    const [editPriority, setEditPriority] = useState(subSubTask.priority || 999)
    const [editDeadline, setEditDeadline] = useState(subSubTask.deadline)

    const handleSave = () => {
      onSave(editTitle, editDescription, editPriority, editDeadline)
    }

    const handleCancel = () => {
      setEditTitle(subSubTask.title)
      setEditDescription(subSubTask.description || "")
      setEditPriority(subSubTask.priority || 999)
      setEditDeadline(subSubTask.deadline)
      onCancel()
    }

    return (
      <div className="p-3 border rounded-lg bg-green-50 border-green-200">
        <div className="space-y-2">
          <Input
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            placeholder="任务标题"
            autoFocus
          />
          <Textarea
            value={editDescription}
            onChange={(e) => setEditDescription(e.target.value)}
            placeholder="任务描述"
            className="min-h-[60px]"
          />
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium">优先级:</label>
            <select
              value={editPriority}
              onChange={(e) => setEditPriority(Number(e.target.value))}
              className="px-2 py-1 border rounded text-sm"
            >
              <option value={1}>1 (最重要)</option>
              <option value={2}>2 (重要)</option>
              <option value={3}>3 (较重要)</option>
              <option value={4}>4 (一般)</option>
              <option value={5}>5 (较低)</option>
              <option value={999}>无优先级</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium">截止日期:</label>
            <DatePicker
              value={editDeadline}
              onChange={setEditDeadline}
              placeholder="选择截止日期"
              className="flex-1"
            />
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              onClick={handleSave}
              disabled={disabled || !editTitle.trim()}
            >
              {disabled ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Save className="h-3 w-3 mr-1" />}
              保存
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handleCancel}
              disabled={disabled}
            >
              取消
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* 头部 */}
        <div className="mb-8">
          <div className="flex items-center justify-between gap-4 mb-4">
            <div className="flex items-center gap-4">
              <Link href="/">
                <Button variant="outline" size="sm">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  返回主页
                </Button>
              </Link>
              <Link href="/past/completed">
                <Button variant="outline" size="sm">
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  查看完成时间线
                </Button>
              </Link>
            </div>
            <div className="flex items-center gap-4">
              {/* 分类筛选 */}
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium">筛选分类:</label>
                <select
                  value={selectedCategoryFilter || ''}
                  onChange={(e) => setSelectedCategoryFilter(e.target.value ? Number(e.target.value) : null)}
                  className="px-2 py-1 border rounded text-sm"
                >
                  <option value="">所有分类</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>
              {/* 分类管理 */}
              <TaskCategoryManager />
            </div>
          </div>
          <h1 className="text-3xl font-bold mb-2">任务管理</h1>
          <p className="text-gray-600">整理和追踪所有需要做的事情</p>
        </div>

        {/* 展开视图 */}
        {expandedTask && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg w-full max-w-7xl h-3/5 overflow-hidden">
              {/* 头部 */}
              <div className="bg-gray-100 p-4 border-b flex justify-between items-center">
                <h2 className="text-xl font-bold">任务详情展开</h2>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={closeExpandedView}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {/* 三列内容 */}
              <div className="flex h-full">
                {/* 左列：主任务信息 */}
                <div className="w-1/3 p-4 border-r">
                  <h3 className="font-bold text-lg mb-4">主任务信息</h3>
                  <div className="space-y-3">
                    <div>
                      <label className="text-sm font-medium text-gray-600">标题</label>
                      <p className="text-lg font-medium">{expandedTask.title}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">类型</label>
                      <p className="text-sm">{
                        expandedTask.type === 'routine' ? '日常习惯' :
                        expandedTask.type === 'long-term' ? '长期任务' : '短期任务'
                      }</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">优先级</label>
                      <p className="text-sm">{expandedTask.priority === 999 ? '无排名' : expandedTask.priority}</p>
                    </div>
                    {expandedTask.description && (
                      <div>
                        <label className="text-sm font-medium text-gray-600">描述</label>
                        <p className="text-sm text-gray-700">{expandedTask.description}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* 中列：子任务 */}
                <div className="w-1/3 p-4 border-r">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="font-bold text-lg">子任务</h3>
                    <Button
                      size="sm"
                      onClick={() => setShowSubTaskForm(true)}
                      disabled={loading}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      添加子任务
                    </Button>
                  </div>

                  {/* 添加子任务表单 */}
                  {showSubTaskForm && (
                    <div className="space-y-2 p-3 border-2 border-dashed rounded-lg mb-4">
                      <Input
                        placeholder="子任务标题"
                        value={newSubTaskTitle}
                        onChange={(e) => setNewSubTaskTitle(e.target.value)}
                        autoFocus
                      />
                      <Textarea
                        placeholder="为什么要做这个子任务？"
                        value={newSubTaskDesc}
                        onChange={(e) => setNewSubTaskDesc(e.target.value)}
                        className="min-h-[60px]"
                      />
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={handleAddSubTask}
                          disabled={loading || !newSubTaskTitle.trim()}
                        >
                          {loading ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Save className="h-3 w-3 mr-1" />}
                          保存
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setShowSubTaskForm(false)
                            setNewSubTaskTitle("")
                            setNewSubTaskDesc("")
                          }}
                          disabled={loading}
                        >
                          取消
                        </Button>
                      </div>
                    </div>
                  )}

                  <div className="space-y-2">
                    {subTasks.map((subTask) => {
                      const isEditing = editingSubTask?.id === subTask.id

                      if (isEditing) {
                        return (
                          <SubTaskEditForm
                            key={subTask.id}
                            subTask={subTask}
                            onSave={(title, description, priority, deadline) => updateSubTask(subTask.id!, title, description, priority, deadline)}
                            onCancel={() => setEditingSubTask(null)}
                            disabled={loading}
                          />
                        )
                      }

                      const isCompleted = subTask.completion?.isCompleted || false
                      const titleClass = isCompleted
                        ? 'font-medium text-gray-500 line-through'
                        : 'font-medium text-gray-900'

                      return (
                        <div
                          key={subTask.id}
                          className={`p-3 border rounded cursor-pointer transition-colors ${
                            selectedSubTask?.id === subTask.id
                              ? 'bg-gray-100 border-gray-400'
                              : isCompleted
                                ? 'bg-gray-100 border-gray-300'
                                : 'hover:bg-gray-50'
                          }`}
                          onClick={() => selectSubTask(subTask)}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex items-start gap-2">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  if (!subTask.id) return
                                  if (isCompleted) {
                                    uncompleteTask(subTask.id)
                                  } else {
                                    showTaskCompletionDialog(subTask)
                                  }
                                }}
                                disabled={loading}
                                className="h-6 w-6 p-0 mt-0.5"
                                title={isCompleted ? '取消完成' : '标记为完成'}
                              >
                                {isCompleted ? (
                                  <CheckSquare className="h-3 w-3 text-green-600" />
                                ) : (
                                  <Square className="h-3 w-3 text-gray-400" />
                                )}
                              </Button>
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className={titleClass}>{subTask.title}</span>
                                  {subTask.isUnclear && (
                                    <span title={subTask.unclearReason || "此任务标记为模糊"}>
                                      <HelpCircle className="h-4 w-4 text-orange-500" />
                                    </span>
                                  )}
                                  {subTask.hasUnclearChildren && (
                                    <span title="此任务有模糊的子任务">
                                      <HelpCircle className="h-4 w-4 text-yellow-500" />
                                    </span>
                                  )}
                                  {isCompleted && subTask.completion?.completionComment && (
                                    <span title={`完成感悟: ${subTask.completion.completionComment}`}>
                                      <MessageSquare className="h-3 w-3 text-gray-400" />
                                    </span>
                                  )}
                                </div>
                                {subTask.description && (
                                  <p className={`text-xs mt-1 ${isCompleted ? 'text-gray-400 line-through' : 'text-gray-600'}`}>
                                    {subTask.description}
                                  </p>
                                )}
                                <DateDisplay
                                  date={subTask.deadline}
                                  className={`mt-1 ${isCompleted ? 'text-gray-400' : ''}`}
                                />
                              </div>
                            </div>
                            <div className="flex items-center gap-1">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleToggleUnclear(subTask)
                                }}
                                className="h-6 w-6 p-0"
                                title={subTask.isUnclear ? '取消模糊标记' : '标记为模糊'}
                              >
                                <HelpCircle className={`h-3 w-3 ${subTask.isUnclear ? 'text-orange-500' : 'text-gray-400'}`} />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  startEditSubTask(subTask)
                                }}
                                className="h-6 w-6 p-0"
                              >
                                <Edit2 className="h-3 w-3" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  deleteSubTask(subTask.id!)
                                }}
                                className="h-6 w-6 p-0"
                              >
                                <X className="h-3 w-3" />
                              </Button>
                              <ChevronRight className="h-4 w-4" />
                            </div>
                          </div>
                        </div>
                      )
                    })}
                    {subTasks.length === 0 && (
                      <p className="text-gray-500 text-sm">暂无子任务</p>
                    )}
                  </div>
                </div>

                {/* 右列：子任务的子任务 */}
                <div className="w-1/3 p-4">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="font-bold text-lg">
                      {selectedSubTask ? `${selectedSubTask.title} 的子任务` : '子任务详情'}
                    </h3>
                    {selectedSubTask && (
                      <Button
                        size="sm"
                        onClick={() => setShowSubSubTaskForm(true)}
                        disabled={loading}
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        添加
                      </Button>
                    )}
                  </div>

                  {/* 添加子子任务表单 */}
                  {showSubSubTaskForm && selectedSubTask && (
                    <div className="space-y-2 p-3 border-2 border-dashed rounded-lg mb-4">
                      <Input
                        placeholder="子子任务标题"
                        value={newSubSubTaskTitle}
                        onChange={(e) => setNewSubSubTaskTitle(e.target.value)}
                        autoFocus
                      />
                      <Textarea
                        placeholder="为什么要做这个子子任务？"
                        value={newSubSubTaskDesc}
                        onChange={(e) => setNewSubSubTaskDesc(e.target.value)}
                        className="min-h-[60px]"
                      />
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={handleAddSubSubTask}
                          disabled={loading || !newSubSubTaskTitle.trim()}
                        >
                          {loading ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Save className="h-3 w-3 mr-1" />}
                          保存
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setShowSubSubTaskForm(false)
                            setNewSubSubTaskTitle("")
                            setNewSubSubTaskDesc("")
                          }}
                          disabled={loading}
                        >
                          取消
                        </Button>
                      </div>
                    </div>
                  )}

                  <div className="space-y-2">
                    {selectedSubTask ? (
                      subSubTasks.length > 0 ? (
                        subSubTasks.map((subSubTask) => {
                          const isEditing = editingSubSubTask?.id === subSubTask.id

                          if (isEditing) {
                            return (
                              <SubSubTaskEditForm
                                key={subSubTask.id}
                                subSubTask={subSubTask}
                                onSave={(title, description, priority, deadline) => updateSubSubTask(subSubTask.id!, title, description, priority, deadline)}
                                onCancel={() => setEditingSubSubTask(null)}
                                disabled={loading}
                              />
                            )
                          }

                          const isCompleted = subSubTask.completion?.isCompleted || false

                          return (
                            <div
                              key={subSubTask.id}
                              className={`p-3 border rounded transition-colors ${
                                isCompleted ? 'bg-gray-100 border-gray-300' : 'hover:bg-gray-50'
                              }`}
                            >
                              <div className="flex items-start justify-between">
                                <div className="flex items-start gap-2">
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => {
                                      if (!subSubTask.id) return
                                      if (isCompleted) {
                                        uncompleteTask(subSubTask.id)
                                      } else {
                                        showTaskCompletionDialog(subSubTask)
                                      }
                                    }}
                                    disabled={loading}
                                    className="h-6 w-6 p-0 mt-0.5"
                                    title={isCompleted ? '取消完成' : '标记为完成'}
                                  >
                                    {isCompleted ? (
                                      <CheckSquare className="h-3 w-3 text-green-600" />
                                    ) : (
                                      <Square className="h-3 w-3 text-gray-400" />
                                    )}
                                  </Button>
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <span className={isCompleted ? 'font-medium text-gray-500 line-through' : 'font-medium'}>
                                        {subSubTask.title}
                                      </span>
                                      {subSubTask.isUnclear && (
                                        <div className="text-orange-500" title={subSubTask.unclearReason || '该任务标记为模糊'}>
                                          <HelpCircle className="h-3 w-3" />
                                        </div>
                                      )}
                                      {isCompleted && subSubTask.completion?.completionComment && (
                                        <span title={`完成感悟: ${subSubTask.completion.completionComment}`}>
                                          <MessageSquare className="h-3 w-3 text-gray-400" />
                                        </span>
                                      )}
                                    </div>
                                    {subSubTask.description && (
                                      <p className={`text-xs mt-1 ${isCompleted ? 'text-gray-400 line-through' : 'text-gray-600'}`}>
                                        {subSubTask.description}
                                      </p>
                                    )}
                                    <DateDisplay
                                      date={subSubTask.deadline}
                                      className={`mt-1 ${isCompleted ? 'text-gray-400' : ''}`}
                                    />
                                  </div>
                                </div>
                                <div className="flex items-center gap-1">
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => handleToggleUnclear(subSubTask)}
                                    className="h-6 w-6 p-0"
                                    title={subSubTask.isUnclear ? '取消模糊标记' : '标记为模糊'}
                                  >
                                    <HelpCircle className={`h-3 w-3 ${subSubTask.isUnclear ? 'text-orange-500' : 'text-gray-400'}`} />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => startEditSubSubTask(subSubTask)}
                                    className="h-6 w-6 p-0"
                                  >
                                    <Edit2 className="h-3 w-3" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => deleteSubSubTask(subSubTask.id!)}
                                    className="h-6 w-6 p-0"
                                  >
                                    <X className="h-3 w-3" />
                                  </Button>
                                </div>
                              </div>
                            </div>
                          )
                        })
                      ) : (
                        <p className="text-gray-500 text-sm">暂无子子任务</p>
                      )
                    ) : (
                      <p className="text-gray-500 text-sm">请选择左侧的子任务查看详情</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 模糊度标记表单 */}
        {showUnclearForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg w-full max-w-md p-6">
              <h3 className="text-lg font-bold mb-4">标记任务模糊状态</h3>

              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-600 mb-2 block">
                    为什么这个任务模糊？请具体说明：
                  </label>
                  <Textarea
                    placeholder="例如：不知道使用什么工具、不清楚具体步骤、缺少相关知识等..."
                    value={unclearReason}
                    onChange={(e) => setUnclearReason(e.target.value)}
                    className="min-h-[80px]"
                  />
                </div>

                <div className="flex gap-3">
                  <Button
                    onClick={() => submitUnclearStatus(true)}
                    disabled={loading || !unclearReason.trim()}
                    className="flex-1"
                  >
                    {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <HelpCircle className="h-4 w-4 mr-2" />}
                    标记为模糊
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => submitUnclearStatus(false)}
                    disabled={loading}
                    className="flex-1"
                  >
                    取消模糊标记
                  </Button>
                </div>

                <Button
                  variant="ghost"
                  onClick={() => {
                    setShowUnclearForm(false)
                    setUnclearTaskId(null)
                    setUnclearReason("")
                  }}
                  disabled={loading}
                  className="w-full"
                >
                  关闭
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* 任务卡片网格 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <TaskCard
            title="日常习惯"
            description="终身性的习惯和实践（如：读书、运动）"
            tasks={selectedCategoryFilter ? tasks.routines.filter(task => task.categoryId === selectedCategoryFilter) : tasks.routines}
            type="routine"
          />
          <TaskCard
            title="长期任务"
            description="持续几个月到几年的项目（如：研究）"
            tasks={selectedCategoryFilter ? tasks.longTermTasks.filter(task => task.categoryId === selectedCategoryFilter) : tasks.longTermTasks}
            type="long-term"
          />
          <TaskCard
            title="短期任务"
            description="持续几小时到几天的任务（如：workshop）"
            tasks={selectedCategoryFilter ? tasks.shortTermTasks.filter(task => task.categoryId === selectedCategoryFilter) : tasks.shortTermTasks}
            type="short-term"
          />
        </div>
      </div>

      {/* 完成确认对话框 */}
      {showCompletionDialog && taskToComplete && (
        <TaskCompletionDialog
          task={taskToComplete}
          onCompleted={handleTaskCompleted}
          onClose={closeCompletionDialog}
        />
      )}
    </div>
  )
}
