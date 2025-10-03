"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Plus, X, Edit2, Save, Loader2, ArrowLeft, Expand, ChevronRight, HelpCircle, CheckSquare, Square, MessageSquare, CheckCircle2, Palette, GripVertical } from "lucide-react"
import { DatePicker, DateDisplay } from "@/components/ui/date-picker"
import { TaskCompletionDialog } from "./task-completion-dialog"
import TaskCategoryManager from "./task-category-manager"
import AspirationsCard from "./aspirations-card"
import { SortableTaskItem } from "./sortable-task-item"
import { useToast } from "@/hooks/use-toast"
import Link from "next/link"
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy
} from '@dnd-kit/sortable'

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
  sortOrder?: number
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

  // 新布局状态：三列固定显示
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<TaskType | 'all'>('all')
  const [selectedMainTask, setSelectedMainTask] = useState<Task | null>(null)
  const [subTasks, setSubTasks] = useState<Task[]>([])
  const [selectedSubTask, setSelectedSubTask] = useState<Task | null>(null)
  const [subSubTasks, setSubSubTasks] = useState<Task[]>([])

  // 完成对话框状态
  const [showCompletionDialog, setShowCompletionDialog] = useState(false)
  const [taskToComplete, setTaskToComplete] = useState<Task | null>(null)

  // 子任务表单状态
  const [showMainTaskForm, setShowMainTaskForm] = useState(false)
  const [newMainTaskType, setNewMainTaskType] = useState<TaskType>('routine')
  const [newMainTaskTitle, setNewMainTaskTitle] = useState("")
  const [newMainTaskDesc, setNewMainTaskDesc] = useState("")
  const [newMainTaskPriority, setNewMainTaskPriority] = useState(999)
  const [newMainTaskCategoryId, setNewMainTaskCategoryId] = useState<number | undefined>(undefined)
  const [showSubTaskForm, setShowSubTaskForm] = useState(false)
  const [newSubTaskTitle, setNewSubTaskTitle] = useState("")
  const [newSubTaskDesc, setNewSubTaskDesc] = useState("")
  const [showSubSubTaskForm, setShowSubSubTaskForm] = useState(false)
  const [newSubSubTaskTitle, setNewSubSubTaskTitle] = useState("")
  const [newSubSubTaskDesc, setNewSubSubTaskDesc] = useState("")

  // 拖拽传感器配置（用于所有拖拽操作）
  const dragSensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

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

  // 处理主任务排序
  const handleMainTasksReorder = useCallback(async (type: TaskType, newTasks: Task[]) => {
    // 构建排序更新数据
    const taskOrders = newTasks.map((task, index) => ({
      id: task.id!,
      sortOrder: index + 1
    }))

    try {
      const response = await fetch('/api/tasks/reorder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskOrders })
      })

      if (response.ok) {
        // 更新本地状态
        setTasks(prev => ({
          ...prev,
          [type === 'routine' ? 'routines' : type === 'long-term' ? 'longTermTasks' : 'shortTermTasks']: newTasks
        }))
      }
    } catch (error) {
      console.error('Failed to reorder tasks:', error)
      toast({
        title: "排序失败",
        description: "无法保存任务顺序",
        variant: "destructive"
      })
    }
  }, [toast])

  // 处理子任务排序
  const handleSubTasksReorder = useCallback(async (newSubTasks: Task[]) => {
    const taskOrders = newSubTasks.map((task, index) => ({
      id: task.id!,
      sortOrder: index + 1
    }))

    try {
      const response = await fetch('/api/tasks/reorder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskOrders })
      })

      if (response.ok) {
        setSubTasks(newSubTasks)
      }
    } catch (error) {
      console.error('Failed to reorder sub-tasks:', error)
      toast({
        title: "排序失败",
        description: "无法保存子任务顺序",
        variant: "destructive"
      })
    }
  }, [toast])

  // 处理子子任务排序
  const handleSubSubTasksReorder = useCallback(async (newSubSubTasks: Task[]) => {
    const taskOrders = newSubSubTasks.map((task, index) => ({
      id: task.id!,
      sortOrder: index + 1
    }))

    try {
      const response = await fetch('/api/tasks/reorder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskOrders })
      })

      if (response.ok) {
        setSubSubTasks(newSubSubTasks)
      }
    } catch (error) {
      console.error('Failed to reorder sub-sub-tasks:', error)
      toast({
        title: "排序失败",
        description: "无法保存子子任务顺序",
        variant: "destructive"
      })
    }
  }, [toast])

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

  // 当任务类型筛选改变时，清空选中状态
  useEffect(() => {
    setSelectedMainTask(null)
    setSelectedSubTask(null)
    setSubTasks([])
    setSubSubTasks([])
    setEditingId(null)
    setShowMainTaskForm(false)
    setNewMainTaskTitle("")
    setNewMainTaskDesc("")
    setNewMainTaskPriority(999)
    setNewMainTaskCategoryId(undefined)
  }, [selectedTypeFilter])

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
  const selectMainTask = async (task: Task) => {
    setSelectedMainTask(task)
    setSelectedSubTask(null)
    setSubSubTasks([])
    if (task.id) {
      await loadSubTasks(task.id, 1)
    }
  }

  const openMainTaskForm = () => {
    if (showMainTaskForm) {
      resetMainTaskForm()
      return
    }
    const defaultType = selectedTypeFilter === 'all' ? 'routine' : selectedTypeFilter
    setNewMainTaskType(defaultType as TaskType)
    setNewMainTaskTitle("")
    setNewMainTaskDesc("")
    setNewMainTaskPriority(999)
    setNewMainTaskCategoryId(undefined)
    setShowMainTaskForm(true)
  }

  const resetMainTaskForm = () => {
    setShowMainTaskForm(false)
    setNewMainTaskType('routine')
    setNewMainTaskTitle("")
    setNewMainTaskDesc("")
    setNewMainTaskPriority(999)
    setNewMainTaskCategoryId(undefined)
  }

  const handleAddMainTask = async () => {
    await addTask(newMainTaskType, newMainTaskTitle, newMainTaskDesc, newMainTaskPriority, newMainTaskCategoryId)
    resetMainTaskForm()
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
    setSelectedMainTask(null)
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
    if (!selectedMainTask?.id || !newSubTaskTitle.trim()) return

    setLoading(true)
    try {
      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: selectedMainTask.type,
          title: newSubTaskTitle.trim(),
          description: newSubTaskDesc.trim(),
          parentId: selectedMainTask.id,
          level: 1
        })
      })

      if (response.ok) {
        await loadSubTasks(selectedMainTask.id, 1)
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
        if (selectedMainTask?.id) {
          await loadSubTasks(selectedMainTask.id, 1)
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
        if (selectedMainTask?.id) {
          await loadSubTasks(selectedMainTask.id, 1)
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
        if (selectedMainTask?.id) {
          await loadSubTasks(selectedMainTask.id, 1)
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
    if (selectedMainTask?.id) {
      await loadSubTasks(selectedMainTask.id, 1)
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
        if (selectedMainTask?.id) {
          await loadSubTasks(selectedMainTask.id, 1)
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

    // 配置拖拽传感器
    const sensors = useSensors(
      useSensor(PointerSensor),
      useSensor(KeyboardSensor, {
        coordinateGetter: sortableKeyboardCoordinates,
      })
    )

    // 处理拖拽结束
    const handleDragEnd = (event: DragEndEvent) => {
      const { active, over } = event

      if (over && active.id !== over.id) {
        const activeId = Number(active.id)
        const overId = Number(over.id)
        if (Number.isNaN(activeId) || Number.isNaN(overId)) return

        const oldIndex = tasks.findIndex(task => task.id === activeId)
        const newIndex = tasks.findIndex(task => task.id === overId)

        const newTasks = arrayMove(tasks, oldIndex, newIndex)
        handleMainTasksReorder(type, newTasks)
      }
    }

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
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={tasks.map(task => task.id!)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-3 pl-6">
                {tasks.map((task) => {
                  const isEditing = editingId === task.id
                  return (
                    <SortableTaskItem key={task.id} id={task.id!}>
                      <TaskItem
                        task={task}
                        isEditing={isEditing}
                        onEdit={() => setEditingId(task.id!)}
                        onSave={(title, description, priority, categoryId) => updateTask(task.id!, title, description, priority, categoryId)}
                        onCancel={() => setEditingId(null)}
                        onDelete={() => deleteTask(task.id!)}
                        onExpand={() => selectMainTask(task)}
                        onComplete={() => showTaskCompletionDialog(task)}
                        onUncomplete={() => uncompleteTask(task.id!)}
                        disabled={loading}
                      />
                    </SortableTaskItem>
                  )
                })}
              </div>
            </SortableContext>
          </DndContext>

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
          <div className="flex gap-2 text-xs">
            <Button
              size="sm"
              variant="outline"
              onClick={onExpand}
              disabled={disabled}
              className="h-7 px-2 flex items-center gap-1"
            >
              <Expand className="h-3 w-3" />
              <span>查看</span>
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={onEdit}
              disabled={disabled}
              className="h-7 px-2 flex items-center gap-1"
            >
              <Edit2 className="h-3 w-3" />
              <span>编辑</span>
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={onDelete}
              disabled={disabled}
              className="h-7 px-2 flex items-center gap-1"
            >
              <X className="h-3 w-3" />
              <span>删除</span>
            </Button>
          </div>
        </div>
      </div>
    )
  }

  const MainTaskEditForm = ({
    task,
    onSave,
    onCancel,
    disabled,
    categories
  }: {
    task: Task
    onSave: (title: string, description: string, priority: number, categoryId?: number) => void
    onCancel: () => void
    disabled: boolean
    categories: TaskCategory[]
  }) => {
    const [editTitle, setEditTitle] = useState(task.title)
    const [editDescription, setEditDescription] = useState(task.description || "")
    const [editPriority, setEditPriority] = useState(task.priority || 999)
    const [editCategoryId, setEditCategoryId] = useState<number | undefined>(task.categoryId)

    return (
      <div className="p-3 border-2 border-dashed rounded mb-2 space-y-2 bg-blue-50/40">
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
        <div className="flex flex-wrap items-center gap-4">
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
              value={editCategoryId ?? ''}
              onChange={(e) => setEditCategoryId(e.target.value ? Number(e.target.value) : undefined)}
              className="px-2 py-1 border rounded text-sm"
            >
              <option value="">无分类</option>
              {categories.map(category => (
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
            onClick={() => onSave(editTitle, editDescription, editPriority, editCategoryId)}
            disabled={disabled || !editTitle.trim()}
          >
            {disabled ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Save className="h-3 w-3 mr-1" />}
            保存
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={onCancel}
            disabled={disabled}
          >
            取消
          </Button>
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
    const inheritedCategory = subTask.categoryId
      ? categories.find(category => category.id === subTask.categoryId)
      : null

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
          {inheritedCategory && (
            <p className="text-xs text-gray-500">
              分类: {inheritedCategory.name}（继承）
            </p>
          )}
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
    const inheritedCategory = subSubTask.categoryId
      ? categories.find(category => category.id === subSubTask.categoryId)
      : null

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
          {inheritedCategory && (
            <p className="text-xs text-gray-500">
              分类: {inheritedCategory.name}（继承）
            </p>
          )}
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
              <Link href="/whiteboard">
                <Button variant="outline" size="sm">
                  <Palette className="w-4 h-4 mr-2" />
                  思维整理
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

        {/* 顶部任务类型筛选卡片 */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <button
            onClick={() => setSelectedTypeFilter('all')}
            className={`p-4 rounded-lg border-2 transition-all ${
              selectedTypeFilter === 'all'
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <h3 className="font-bold text-lg mb-1">全部任务</h3>
            <p className="text-sm text-gray-600">
              显示所有类型的任务
            </p>
          </button>
          <button
            onClick={() => setSelectedTypeFilter('routine')}
            className={`p-4 rounded-lg border-2 transition-all ${
              selectedTypeFilter === 'routine'
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <h3 className="font-bold text-lg mb-1">日常习惯</h3>
            <p className="text-sm text-gray-600">
              终身性的习惯和实践
            </p>
          </button>
          <button
            onClick={() => setSelectedTypeFilter('long-term')}
            className={`p-4 rounded-lg border-2 transition-all ${
              selectedTypeFilter === 'long-term'
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <h3 className="font-bold text-lg mb-1">长期任务</h3>
            <p className="text-sm text-gray-600">
              持续几个月到几年
            </p>
          </button>
          <button
            onClick={() => setSelectedTypeFilter('short-term')}
            className={`p-4 rounded-lg border-2 transition-all ${
              selectedTypeFilter === 'short-term'
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <h3 className="font-bold text-lg mb-1">短期任务</h3>
            <p className="text-sm text-gray-600">
              持续几小时到几天
            </p>
          </button>
        </div>

        {/* 三列固定布局 */}
        <div className="grid grid-cols-3 gap-4 mb-6" style={{ height: 'calc(100vh - 400px)' }}>
          {/* 左列：主任务列表 */}
          <div className="border rounded-lg bg-white p-4 overflow-y-auto flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-lg">
                主任务
                <span className="text-sm font-normal text-gray-500 ml-2">
                  (点击查看子任务)
                </span>
              </h2>
              <Button size="sm" onClick={openMainTaskForm} disabled={loading}>
                <Plus className="h-3 w-3 mr-1" />
                添加主任务
              </Button>
            </div>
            {showMainTaskForm && (
              <div className="p-3 border-2 border-dashed rounded mb-3 space-y-2">
                {selectedTypeFilter === 'all' && (
                  <div className="flex flex-col gap-1 text-sm">
                    <label className="font-medium">任务类型</label>
                    <select
                      value={newMainTaskType}
                      onChange={(e) => setNewMainTaskType(e.target.value as TaskType)}
                      className="px-2 py-1 border rounded"
                    >
                      <option value="routine">日常习惯</option>
                      <option value="long-term">长期任务</option>
                      <option value="short-term">短期任务</option>
                    </select>
                  </div>
                )}
                <Input
                  placeholder="任务标题"
                  value={newMainTaskTitle}
                  onChange={(e) => setNewMainTaskTitle(e.target.value)}
                  autoFocus
                />
                <Textarea
                  placeholder="为什么要做这个任务？对你的意义是什么？"
                  value={newMainTaskDesc}
                  onChange={(e) => setNewMainTaskDesc(e.target.value)}
                  className="min-h-[60px]"
                />
                <div className="flex flex-wrap items-center gap-4">
                  <div className="flex items-center gap-2">
                    <label className="text-sm font-medium">重要度:</label>
                    <select
                      value={newMainTaskPriority}
                      onChange={(e) => setNewMainTaskPriority(Number(e.target.value))}
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
                      value={newMainTaskCategoryId ?? ''}
                      onChange={(e) => setNewMainTaskCategoryId(e.target.value ? Number(e.target.value) : undefined)}
                      className="px-2 py-1 border rounded text-sm"
                    >
                      <option value="">无分类</option>
                      {categories.map(category => (
                        <option key={category.id} value={category.id}>
                          {category.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleAddMainTask} disabled={loading || !newMainTaskTitle.trim()}>
                    {loading ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Save className="h-3 w-3 mr-1" />}
                    保存
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={resetMainTaskForm}
                    disabled={loading}
                  >
                    取消
                  </Button>
                </div>
              </div>
            )}
            <div className="space-y-2 flex-1">
              {(() => {
                // 根据筛选器获取任务列表
                let mainTasks: Task[] = []
                let taskType: TaskType = 'routine'

                if (selectedTypeFilter === 'all') {
                  mainTasks = [...tasks.routines, ...tasks.longTermTasks, ...tasks.shortTermTasks]
                } else if (selectedTypeFilter === 'routine') {
                  mainTasks = tasks.routines
                  taskType = 'routine'
                } else if (selectedTypeFilter === 'long-term') {
                  mainTasks = tasks.longTermTasks
                  taskType = 'long-term'
                } else {
                  mainTasks = tasks.shortTermTasks
                  taskType = 'short-term'
                }

                // 应用分类筛选
                if (selectedCategoryFilter) {
                  mainTasks = mainTasks.filter(t => t.categoryId === selectedCategoryFilter)
                }

                if (mainTasks.length === 0) {
                  return <p className="text-gray-500 text-sm">暂无任务</p>
                }

                // 只在具体类型筛选时启用拖拽排序
                if (selectedTypeFilter === 'all') {
                  // 全部任务视图：不支持拖拽，只显示列表
                  return mainTasks.map(task => {
                    const isSelected = selectedMainTask?.id === task.id
                    const isCompleted = task.completion?.isCompleted || false
                    const taskCategory = task.categoryId ? categories.find(c => c.id === task.categoryId) : null
                    const isEditing = editingId === task.id

                    if (isEditing) {
                      return (
                        <div key={task.id} className="relative">
                          <MainTaskEditForm
                            task={task}
                            disabled={loading}
                            categories={categories}
                            onSave={(title, description, priority, categoryId) => updateTask(task.id!, title, description, priority, categoryId)}
                            onCancel={() => setEditingId(null)}
                          />
                        </div>
                      )
                    }

                    return (
                      <div
                        key={task.id}
                        onClick={() => selectMainTask(task)}
                        className={`p-3 border rounded cursor-pointer transition-all ${
                          isSelected
                            ? 'bg-blue-100 border-blue-500'
                            : isCompleted
                              ? 'bg-gray-100 border-gray-300'
                              : 'hover:bg-gray-50'
                        }`}
                      >
                        <div className="flex items-start gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={(e) => {
                              e.stopPropagation()
                              if (isCompleted) {
                                uncompleteTask(task.id!)
                              } else {
                                showTaskCompletionDialog(task)
                              }
                            }}
                            className="h-5 w-5 p-0"
                          >
                            {isCompleted ? (
                              <CheckSquare className="h-4 w-4 text-green-600" />
                            ) : (
                              <Square className="h-4 w-4 text-gray-400" />
                            )}
                          </Button>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className={`font-medium text-sm ${isCompleted ? 'text-gray-500 line-through' : ''}`}>
                                {task.title}
                              </span>
                              {task.priority && task.priority <= 5 && (
                                <span className="text-xs px-1.5 py-0.5 rounded bg-blue-100 text-blue-800">
                                  {task.priority}
                                </span>
                              )}
                              {taskCategory && (
                                <span
                                  className="text-xs px-1.5 py-0.5 rounded text-white"
                                  style={{ backgroundColor: taskCategory.color }}
                                >
                                  {taskCategory.name}
                                </span>
                              )}
                            </div>
                            {task.description && (
                              <p className={`text-xs mt-1 ${isCompleted ? 'text-gray-400' : 'text-gray-600'}`}>
                                {task.description.substring(0, 50)}{task.description.length > 50 ? '...' : ''}
                              </p>
                            )}
                          </div>
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={(e) => {
                                e.stopPropagation()
                                setEditingId(task.id!)
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
                                deleteTask(task.id!)
                              }}
                              className="h-6 w-6 p-0"
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    )
                  })
                }

                // 具体类型视图：支持拖拽排序
                const handleDragEnd = (event: DragEndEvent) => {
                  const { active, over } = event
                  if (!over || active.id === over.id) return

                  const activeId = Number(active.id)
                  const overId = Number(over.id)
                  if (Number.isNaN(activeId) || Number.isNaN(overId)) return

                  const oldIndex = mainTasks.findIndex(t => t.id === activeId)
                  const newIndex = mainTasks.findIndex(t => t.id === overId)

                  const reorderedTasks = arrayMove(mainTasks, oldIndex, newIndex)
                  handleMainTasksReorder(taskType, reorderedTasks)
                }

                return (
                  <DndContext
                    sensors={dragSensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                  >
                    <SortableContext
                      items={mainTasks.map(t => t.id!)}
                      strategy={verticalListSortingStrategy}
                    >
                      {mainTasks.map(task => {
                        const isSelected = selectedMainTask?.id === task.id
                        const isCompleted = task.completion?.isCompleted || false
                        const taskCategory = task.categoryId ? categories.find(c => c.id === task.categoryId) : null
                        const isEditing = editingId === task.id

                        return (
                          <SortableTaskItem key={task.id} id={task.id!} hideHandle={isEditing}>
                            {isEditing ? (
                              <MainTaskEditForm
                                task={task}
                                categories={categories}
                                disabled={loading}
                                onSave={(title, description, priority, categoryId) => updateTask(task.id!, title, description, priority, categoryId)}
                                onCancel={() => setEditingId(null)}
                              />
                            ) : (
                              <div
                                onClick={() => selectMainTask(task)}
                                className={`p-3 border rounded cursor-pointer transition-all ${
                                  isSelected
                                    ? 'bg-blue-100 border-blue-500'
                                    : isCompleted
                                      ? 'bg-gray-100 border-gray-300'
                                      : 'hover:bg-gray-50'
                                }`}
                              >
                                <div className="flex items-start gap-2">
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      if (isCompleted) {
                                        uncompleteTask(task.id!)
                                      } else {
                                        showTaskCompletionDialog(task)
                                      }
                                    }}
                                    className="h-5 w-5 p-0"
                                  >
                                    {isCompleted ? (
                                      <CheckSquare className="h-4 w-4 text-green-600" />
                                    ) : (
                                      <Square className="h-4 w-4 text-gray-400" />
                                    )}
                                  </Button>
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                      <span className={`font-medium text-sm ${isCompleted ? 'text-gray-500 line-through' : ''}`}>
                                        {task.title}
                                      </span>
                                      {task.priority && task.priority <= 5 && (
                                        <span className="text-xs px-1.5 py-0.5 rounded bg-blue-100 text-blue-800">
                                          {task.priority}
                                        </span>
                                      )}
                                      {taskCategory && (
                                        <span
                                          className="text-xs px-1.5 py-0.5 rounded text-white"
                                          style={{ backgroundColor: taskCategory.color }}
                                        >
                                          {taskCategory.name}
                                        </span>
                                      )}
                                    </div>
                                    {task.description && (
                                      <p className={`text-xs mt-1 ${isCompleted ? 'text-gray-400' : 'text-gray-600'}`}>
                                        {task.description.substring(0, 50)}{task.description.length > 50 ? '...' : ''}
                                      </p>
                                    )}
                                  </div>
                                  <div className="flex gap-1">
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        setEditingId(task.id!)
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
                                        deleteTask(task.id!)
                                      }}
                                      className="h-6 w-6 p-0"
                                    >
                                      <X className="h-3 w-3" />
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            )}
                          </SortableTaskItem>
                        )
                      })}
                    </SortableContext>
                  </DndContext>
                )
              })()}
            </div>
          </div>

          {/* 中列：子任务列表 */}
          <div className="border rounded-lg bg-white p-4 overflow-y-auto flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-lg">
                子任务
                {selectedMainTask && <span className="text-sm font-normal text-gray-500 ml-2">→ {selectedMainTask.title}</span>}
              </h2>
              {selectedMainTask && (
                <Button size="sm" onClick={() => setShowSubTaskForm(true)}>
                  <Plus className="h-3 w-3 mr-1" />
                  添加
                </Button>
              )}
            </div>

            {!selectedMainTask ? (
              <p className="text-gray-500 text-sm">← 请选择左侧主任务</p>
            ) : (
              <div className="space-y-2 flex-1">
                {showSubTaskForm && (
                  <div className="p-3 border-2 border-dashed rounded mb-2">
                    <Input
                      placeholder="子任务标题"
                      value={newSubTaskTitle}
                      onChange={(e) => setNewSubTaskTitle(e.target.value)}
                      autoFocus
                      className="mb-2"
                    />
                    <div className="flex gap-2">
                      <Button size="sm" onClick={handleAddSubTask} disabled={!newSubTaskTitle.trim()}>
                        保存
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => { setShowSubTaskForm(false); setNewSubTaskTitle("") }}>
                        取消
                      </Button>
                    </div>
                  </div>
                )}

                {subTasks.length === 0 ? (
                  <p className="text-gray-500 text-sm">暂无子任务</p>
                ) : (
                  <DndContext
                    sensors={dragSensors}
                    collisionDetection={closestCenter}
                    onDragEnd={(event) => {
                      const { active, over } = event
                      if (!over || active.id === over.id) return

                      const activeId = Number(active.id)
                      const overId = Number(over.id)
                      if (Number.isNaN(activeId) || Number.isNaN(overId)) return

                      const oldIndex = subTasks.findIndex(t => t.id === activeId)
                      const newIndex = subTasks.findIndex(t => t.id === overId)

                      const reorderedSubTasks = arrayMove(subTasks, oldIndex, newIndex)
                      handleSubTasksReorder(reorderedSubTasks)
                    }}
                  >
                    <SortableContext
                      items={subTasks.map(t => t.id!)}
                      strategy={verticalListSortingStrategy}
                    >
                      {subTasks.map(subTask => {
                        const isSelected = selectedSubTask?.id === subTask.id
                        const isCompleted = subTask.completion?.isCompleted || false
                        const isEditing = editingSubTask?.id === subTask.id

                        return (
                          <SortableTaskItem key={subTask.id} id={subTask.id!} hideHandle={isEditing}>
                            {isEditing ? (
                              <SubTaskEditForm
                                subTask={subTask}
                                onSave={(title, description, priority, deadline) => updateSubTask(subTask.id!, title, description, priority, deadline)}
                                onCancel={() => setEditingSubTask(null)}
                                disabled={loading}
                              />
                            ) : (
                              <div
                                onClick={() => selectSubTask(subTask)}
                                className={`p-3 border rounded cursor-pointer transition-all ${
                                  isSelected
                                    ? 'bg-green-100 border-green-500'
                                    : isCompleted
                                      ? 'bg-gray-100'
                                      : 'hover:bg-gray-50'
                                }`}
                              >
                                <div className="flex items-start gap-2">
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      if (isCompleted) {
                                        uncompleteTask(subTask.id!)
                                      } else {
                                        showTaskCompletionDialog(subTask)
                                      }
                                    }}
                                    className="h-5 w-5 p-0"
                                  >
                                    {isCompleted ? (
                                      <CheckSquare className="h-4 w-4 text-green-600" />
                                    ) : (
                                      <Square className="h-4 w-4" />
                                    )}
                                  </Button>
                                  <div className="flex-1">
                                    <span className={`font-medium text-sm ${isCompleted ? 'text-gray-500 line-through' : ''}`}>
                                      {subTask.title}
                                    </span>
                                    {subTask.description && (
                                      <p className="text-xs text-gray-600 mt-1">{subTask.description.substring(0, 40)}...</p>
                                    )}
                                  </div>
                                  <div className="flex gap-1">
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
                                  </div>
                                </div>
                              </div>
                            )}
                          </SortableTaskItem>
                        )
                      })}
                    </SortableContext>
                  </DndContext>
                )}
              </div>
            )}
          </div>

          {/* 右列：子子任务列表 */}
          <div className="border rounded-lg bg-white p-4 overflow-y-auto flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-lg">
                子子任务
                {selectedSubTask && <span className="text-sm font-normal text-gray-500 ml-2">→ {selectedSubTask.title}</span>}
              </h2>
              {selectedSubTask && (
                <Button size="sm" onClick={() => setShowSubSubTaskForm(true)}>
                  <Plus className="h-3 w-3 mr-1" />
                  添加
                </Button>
              )}
            </div>

            {!selectedSubTask ? (
              <p className="text-gray-500 text-sm">← 请选择中间子任务</p>
            ) : (
              <div className="space-y-2 flex-1">
                {showSubSubTaskForm && (
                  <div className="p-3 border-2 border-dashed rounded mb-2">
                    <Input
                      placeholder="子子任务标题"
                      value={newSubSubTaskTitle}
                      onChange={(e) => setNewSubSubTaskTitle(e.target.value)}
                      autoFocus
                      className="mb-2"
                    />
                    <div className="flex gap-2">
                      <Button size="sm" onClick={handleAddSubSubTask} disabled={!newSubSubTaskTitle.trim()}>
                        保存
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => { setShowSubSubTaskForm(false); setNewSubSubTaskTitle("") }}>
                        取消
                      </Button>
                    </div>
                  </div>
                )}

                {subSubTasks.length === 0 ? (
                  <p className="text-gray-500 text-sm">暂无子子任务</p>
                ) : (
                  <DndContext
                    sensors={dragSensors}
                    collisionDetection={closestCenter}
                    onDragEnd={(event) => {
                      const { active, over } = event
                      if (!over || active.id === over.id) return

                      const activeId = Number(active.id)
                      const overId = Number(over.id)
                      if (Number.isNaN(activeId) || Number.isNaN(overId)) return

                      const oldIndex = subSubTasks.findIndex(t => t.id === activeId)
                      const newIndex = subSubTasks.findIndex(t => t.id === overId)

                      const reorderedSubSubTasks = arrayMove(subSubTasks, oldIndex, newIndex)
                      handleSubSubTasksReorder(reorderedSubSubTasks)
                    }}
                  >
                    <SortableContext
                      items={subSubTasks.map(t => t.id!)}
                      strategy={verticalListSortingStrategy}
                    >
                      {subSubTasks.map(subSubTask => {
                        const isCompleted = subSubTask.completion?.isCompleted || false
                        const isEditing = editingSubSubTask?.id === subSubTask.id

                        return (
                          <SortableTaskItem key={subSubTask.id} id={subSubTask.id!} hideHandle={isEditing}>
                            {isEditing ? (
                              <SubSubTaskEditForm
                                subSubTask={subSubTask}
                                onSave={(title, description, priority, deadline) => updateSubSubTask(subSubTask.id!, title, description, priority, deadline)}
                                onCancel={() => setEditingSubSubTask(null)}
                                disabled={loading}
                              />
                            ) : (
                              <div className={`p-3 border rounded ${isCompleted ? 'bg-gray-100' : 'hover:bg-gray-50'}`}>
                                <div className="flex items-start gap-2">
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => {
                                      if (isCompleted) {
                                        uncompleteTask(subSubTask.id!)
                                      } else {
                                        showTaskCompletionDialog(subSubTask)
                                      }
                                    }}
                                    className="h-5 w-5 p-0"
                                  >
                                    {isCompleted ? (
                                      <CheckSquare className="h-4 w-4 text-green-600" />
                                    ) : (
                                      <Square className="h-4 w-4" />
                                    )}
                                  </Button>
                                  <div className="flex-1">
                                    <span className={`font-medium text-sm ${isCompleted ? 'text-gray-500 line-through' : ''}`}>
                                      {subSubTask.title}
                                    </span>
                                  </div>
                                  <div className="flex gap-1">
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
                            )}
                          </SortableTaskItem>
                        )
                      })}
                    </SortableContext>
                  </DndContext>
                )}
              </div>
            )}
          </div>
        </div>
        {/* 心愿卡片 - 第二行独立 */}
        <AspirationsCard />
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
