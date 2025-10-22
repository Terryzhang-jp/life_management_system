"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { useToast } from "@/hooks/use-toast"
import {
  Plus,
  Pin,
  Trash2,
  Edit2,
  Tag,
  X,
  Lightbulb,
  Bell,
  Archive,
  Menu,
  Search,
  Check,
  Palette,
  ImagePlus,
  MoreVertical,
  CheckSquare,
  Square,
  Calendar,
  Clock,
  Bold
} from "lucide-react"
import { formatRelativeTime, formatDateOnly } from "@/lib/utils"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"

interface ChecklistItem {
  id: string
  text: string
  checked: boolean
}

interface KeepLabel {
  id?: number
  name: string
  color: string
  createdAt?: string
}

interface KeepNote {
  id?: number
  title?: string
  content: string
  noteType: 'text' | 'checklist'
  checklistItems?: ChecklistItem[]
  color: string
  isPinned: boolean
  labels?: KeepLabel[]
  createdAt?: string
  updatedAt?: string
}

// Google Keep 风格的颜色预设
const NOTE_COLORS = [
  { name: "默认", value: "#ffffff" },
  { name: "红色", value: "#f28b82" },
  { name: "橙色", value: "#fbbc04" },
  { name: "黄色", value: "#fff475" },
  { name: "绿色", value: "#ccff90" },
  { name: "青色", value: "#a7ffeb" },
  { name: "蓝色", value: "#cbf0f8" },
  { name: "深蓝", value: "#aecbfa" },
  { name: "紫色", value: "#d7aefb" },
  { name: "粉色", value: "#fdcfe8" },
  { name: "棕色", value: "#e6c9a8" },
  { name: "灰色", value: "#e8eaed" }
]

const LABEL_COLORS = [
  "#e8eaed",
  "#f28b82",
  "#fbbc04",
  "#fff475",
  "#ccff90",
  "#a7ffeb",
  "#cbf0f8",
  "#d7aefb",
  "#fdcfe8"
]

export function KeepPage() {
  const { toast } = useToast()
  const [notes, setNotes] = useState<KeepNote[]>([])
  const [labels, setLabels] = useState<KeepLabel[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshKey, setRefreshKey] = useState(0)

  // 侧边栏状态
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [selectedLabel, setSelectedLabel] = useState<number | null>(null)
  const [showLabelManager, setShowLabelManager] = useState(false)

  // 时间过滤状态
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | '7days' | '30days' | 'custom'>('all')
  const [customStartDate, setCustomStartDate] = useState("")
  const [customEndDate, setCustomEndDate] = useState("")
  const [showCustomDatePicker, setShowCustomDatePicker] = useState(false)

  // 快速输入状态
  const [inputExpanded, setInputExpanded] = useState(false)
  const [quickTitle, setQuickTitle] = useState("")
  const [quickInput, setQuickInput] = useState("")
  const [quickNoteType, setQuickNoteType] = useState<'text' | 'checklist'>('text')
  const [quickChecklistItems, setQuickChecklistItems] = useState<ChecklistItem[]>([])
  const [quickInputColor, setQuickInputColor] = useState("#ffffff")
  const [quickInputLabels, setQuickInputLabels] = useState<KeepLabel[]>([])
  const [showQuickColorPicker, setShowQuickColorPicker] = useState(false)
  const [showQuickLabelPicker, setShowQuickLabelPicker] = useState(false)
  const [showQuickMoreMenu, setShowQuickMoreMenu] = useState(false)
  const quickInputRef = useRef<HTMLTextAreaElement | null>(null)

  // 编辑模态框状态
  const [editingNote, setEditingNote] = useState<KeepNote | null>(null)
  const [editTitle, setEditTitle] = useState("")
  const [editContent, setEditContent] = useState("")
  const [editNoteType, setEditNoteType] = useState<'text' | 'checklist'>('text')
  const [editChecklistItems, setEditChecklistItems] = useState<ChecklistItem[]>([])
  const [editColor, setEditColor] = useState("#ffffff")
  const [editLabels, setEditLabels] = useState<KeepLabel[]>([])
  const [showEditColorPicker, setShowEditColorPicker] = useState(false)
  const [showEditLabelPicker, setShowEditLabelPicker] = useState(false)
  const [showEditMoreMenu, setShowEditMoreMenu] = useState(false)
  const editContentRef = useRef<HTMLTextAreaElement | null>(null)
  const [editPreviewMode, setEditPreviewMode] = useState<'edit' | 'preview'>('edit')

  // 标签管理
  const [newLabelName, setNewLabelName] = useState("")
  const [newLabelColor, setNewLabelColor] = useState("#e8eaed")
  const [editingLabelId, setEditingLabelId] = useState<number | null>(null)
  const [editingLabelName, setEditingLabelName] = useState("")
  const [editingLabelColor, setEditingLabelColor] = useState("#e8eaed")

  const wrapSelectionWith = (
    ref: React.RefObject<HTMLTextAreaElement>,
    value: string,
    setter: (next: string) => void,
    prefix: string,
    suffix?: string,
    placeholder = "重点内容"
  ) => {
    const textarea = ref.current
    if (!textarea) return

    const start = textarea.selectionStart ?? 0
    const end = textarea.selectionEnd ?? start
    const actualSuffix = suffix ?? prefix

    const selectedText = value.slice(start, end)
    const textToWrap = selectedText || placeholder

    const nextValue =
      value.slice(0, start) +
      `${prefix}${textToWrap}${actualSuffix}` +
      value.slice(end)

    setter(nextValue)

    const selectionStart = start + prefix.length
    const selectionEnd = selectionStart + textToWrap.length

    requestAnimationFrame(() => {
      textarea.focus()
      textarea.setSelectionRange(selectionStart, selectionEnd)
      textarea.style.height = "auto"
      textarea.style.height = `${textarea.scrollHeight}px`
    })
  }

  const handleQuickBold = () => {
    wrapSelectionWith(quickInputRef, quickInput, setQuickInput, "**")
  }

  const handleEditBold = () => {
    wrapSelectionWith(editContentRef, editContent, setEditContent, "**")
  }

  useEffect(() => {
    setEditPreviewMode('edit')
  }, [editingNote?.id])

  useEffect(() => {
    if (editPreviewMode === 'edit' && editContentRef.current) {
      const textarea = editContentRef.current
      textarea.style.height = 'auto'
      textarea.style.height = `${textarea.scrollHeight}px`
    }
  }, [editPreviewMode, editContent])

  // 获取所有笔记
  const fetchNotes = useCallback(async () => {
    try {
      // 构建查询参数
      const params = new URLSearchParams()

      // 根据 dateFilter 设置日期范围
      if (dateFilter === 'today') {
        const today = formatDateOnly(new Date())
        params.append('startDate', today)
        params.append('endDate', today)
      } else if (dateFilter === '7days') {
        const endDate = new Date()
        const startDate = new Date()
        startDate.setDate(startDate.getDate() - 7)
        params.append('startDate', formatDateOnly(startDate))
        params.append('endDate', formatDateOnly(endDate))
      } else if (dateFilter === '30days') {
        const endDate = new Date()
        const startDate = new Date()
        startDate.setDate(startDate.getDate() - 30)
        params.append('startDate', formatDateOnly(startDate))
        params.append('endDate', formatDateOnly(endDate))
      } else if (dateFilter === 'custom' && customStartDate && customEndDate) {
        params.append('startDate', customStartDate)
        params.append('endDate', customEndDate)
      }

      const url = params.toString() ? `/api/keep?${params.toString()}` : '/api/keep'
      const response = await fetch(url)

      if (response.ok) {
        const data = await response.json()
        setNotes(data)
      }
    } catch (error) {
      console.error('获取笔记失败:', error)
    }
  }, [dateFilter, customStartDate, customEndDate])

  // 获取所有标签
  const fetchLabels = useCallback(async () => {
    try {
      const response = await fetch('/api/keep/labels')
      if (response.ok) {
        const data = await response.json()
        setLabels(data)
      }
    } catch (error) {
      console.error('获取标签失败:', error)
    }
  }, [])

  // 初始加载
  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      await Promise.all([fetchNotes(), fetchLabels()])
      setLoading(false)
    }
    void loadData()
  }, [fetchNotes, fetchLabels, refreshKey])

  // 过滤笔记（按标签）
  const filteredNotes = selectedLabel
    ? notes.filter(note => note.labels?.some(label => label.id === selectedLabel))
    : notes

  // 添加复选框项
  const addChecklistItem = (isQuickInput: boolean) => {
    const newItem: ChecklistItem = {
      id: Date.now().toString(),
      text: "",
      checked: false
    }
    if (isQuickInput) {
      setQuickChecklistItems([...quickChecklistItems, newItem])
    } else {
      setEditChecklistItems([...editChecklistItems, newItem])
    }
  }

  // 更新复选框项
  const updateChecklistItem = (id: string, updates: Partial<ChecklistItem>, isQuickInput: boolean) => {
    const updateItems = (items: ChecklistItem[]) =>
      items.map(item => item.id === id ? { ...item, ...updates } : item)

    if (isQuickInput) {
      setQuickChecklistItems(updateItems(quickChecklistItems))
    } else {
      setEditChecklistItems(updateItems(editChecklistItems))
    }
  }

  // 删除复选框项
  const deleteChecklistItem = (id: string, isQuickInput: boolean) => {
    if (isQuickInput) {
      setQuickChecklistItems(quickChecklistItems.filter(item => item.id !== id))
    } else {
      setEditChecklistItems(editChecklistItems.filter(item => item.id !== id))
    }
  }

  // 切换笔记类型
  const toggleNoteType = (isQuickInput: boolean) => {
    if (isQuickInput) {
      const newType = quickNoteType === 'text' ? 'checklist' : 'text'
      setQuickNoteType(newType)
      if (newType === 'checklist' && quickChecklistItems.length === 0) {
        addChecklistItem(true)
      }
    } else {
      const newType = editNoteType === 'text' ? 'checklist' : 'text'
      setEditNoteType(newType)
      if (newType === 'checklist' && editChecklistItems.length === 0) {
        addChecklistItem(false)
      }
    }
  }

  // 创建笔记
  const handleCreateNote = async () => {
    const trimmedTitle = quickTitle.trim()
    const trimmedInput = quickInput.trim()
    const hasChecklistContent = quickChecklistItems.some(item => item.text.trim())

    // 至少要有标题、内容或复选框内容其中之一
    if (!trimmedTitle && !trimmedInput && !hasChecklistContent) {
      toast({
        title: "请输入内容",
        description: "标题、笔记内容或复选框至少填写一项",
        variant: "destructive"
      })
      return
    }

    try {
      const response = await fetch('/api/keep', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: trimmedTitle || undefined,
          content: trimmedInput || (trimmedTitle || '空笔记'),
          noteType: quickNoteType,
          checklistItems: quickNoteType === 'checklist' ? quickChecklistItems : undefined,
          color: quickInputColor,
          isPinned: false,
          labels: quickInputLabels
        })
      })

      if (response.ok) {
        toast({ title: "笔记已创建" })
        setQuickTitle("")
        setQuickInput("")
        setQuickNoteType('text')
        setQuickChecklistItems([])
        setQuickInputColor("#ffffff")
        setQuickInputLabels([])
        setInputExpanded(false)
        setRefreshKey(prev => prev + 1)
      } else {
        const error = await response.json()
        toast({
          title: "创建失败",
          description: error.error || "未知错误",
          variant: "destructive"
        })
      }
    } catch (error) {
      console.error('创建笔记失败:', error)
      toast({ title: "创建失败", variant: "destructive" })
    }
  }

  // 编辑笔记
  const handleEditNote = (note: KeepNote) => {
    setEditingNote(note)
    setEditTitle(note.title || "")
    setEditContent(note.content)
    setEditNoteType(note.noteType)
    setEditChecklistItems(note.checklistItems || [])
    setEditColor(note.color)
    setEditLabels(note.labels || [])

    // 延迟调整textarea高度，确保DOM已渲染
    setTimeout(() => {
      const textarea = document.querySelector('.edit-content-textarea') as HTMLTextAreaElement
      if (textarea) {
        textarea.style.height = 'auto'
        textarea.style.height = textarea.scrollHeight + 'px'
      }
    }, 0)
  }

  // 保存编辑
  const handleSaveEdit = async () => {
    if (!editingNote) return

    const trimmedContent = editContent.trim()
    const hasChecklistContent = editChecklistItems.some(item => item.text.trim())

    if (!trimmedContent && !hasChecklistContent) return

    try {
      const response = await fetch('/api/keep', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingNote.id,
          title: editTitle || undefined,
          content: trimmedContent || '(空笔记)',
          noteType: editNoteType,
          checklistItems: editNoteType === 'checklist' ? editChecklistItems : undefined,
          color: editColor,
          labels: editLabels
        })
      })

      if (response.ok) {
        setEditingNote(null)
        setRefreshKey(prev => prev + 1)
      }
    } catch (error) {
      console.error('更新笔记失败:', error)
    }
  }

  // 切换置顶
  const handleTogglePin = async (note: KeepNote, e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      await fetch('/api/keep', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: note.id, action: 'toggle-pin' })
      })
      setRefreshKey(prev => prev + 1)
    } catch (error) {
      console.error('切换置顶失败:', error)
    }
  }

  // 删除笔记
  const handleDeleteNote = async (noteId: number, e: React.MouseEvent) => {
    e.stopPropagation()

    if (!confirm('确定要删除这条笔记吗？')) {
      return
    }

    try {
      const response = await fetch(`/api/keep?id=${noteId}`, { method: 'DELETE' })
      if (response.ok) {
        toast({ title: "笔记已删除" })
        setRefreshKey(prev => prev + 1)
      } else {
        toast({ title: "删除失败", variant: "destructive" })
      }
    } catch (error) {
      console.error('删除笔记失败:', error)
      toast({ title: "删除失败", variant: "destructive" })
    }
  }

  // 创建标签
  const handleCreateLabel = async () => {
    if (!newLabelName.trim()) return

    try {
      const response = await fetch('/api/keep/labels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newLabelName, color: newLabelColor })
      })

      if (response.ok) {
        setNewLabelName("")
        setNewLabelColor("#e8eaed")
        await fetchLabels()
      } else if (response.status === 409) {
        toast({ title: "标签名称已存在", variant: "destructive" })
      }
    } catch (error) {
      console.error('创建标签失败:', error)
    }
  }

  // 开始编辑标签
  const handleStartEditLabel = (label: KeepLabel) => {
    setEditingLabelId(label.id || null)
    setEditingLabelName(label.name)
    setEditingLabelColor(label.color)
  }

  // 保存编辑标签
  const handleSaveEditLabel = async () => {
    if (!editingLabelId || !editingLabelName.trim()) return

    try {
      const response = await fetch('/api/keep/labels', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingLabelId,
          name: editingLabelName.trim(),
          color: editingLabelColor
        })
      })

      if (response.ok) {
        toast({ title: "标签已更新" })
        setEditingLabelId(null)
        await fetchLabels()
        setRefreshKey(prev => prev + 1)
      } else if (response.status === 409) {
        toast({ title: "标签名称已存在", variant: "destructive" })
      } else {
        toast({ title: "更新失败", variant: "destructive" })
      }
    } catch (error) {
      console.error('更新标签失败:', error)
      toast({ title: "更新失败", variant: "destructive" })
    }
  }

  // 取消编辑标签
  const handleCancelEditLabel = () => {
    setEditingLabelId(null)
    setEditingLabelName("")
    setEditingLabelColor("#e8eaed")
  }

  // 删除标签
  const handleDeleteLabel = async (labelId: number) => {
    if (!confirm('确定要删除这个标签吗？标签会从所有笔记中移除。')) {
      return
    }

    try {
      const response = await fetch(`/api/keep/labels?id=${labelId}`, { method: 'DELETE' })
      if (response.ok) {
        toast({ title: "标签已删除" })
        await fetchLabels()
        setRefreshKey(prev => prev + 1)
      } else {
        toast({ title: "删除失败", variant: "destructive" })
      }
    } catch (error) {
      console.error('删除标签失败:', error)
      toast({ title: "删除失败", variant: "destructive" })
    }
  }

  // 切换标签选择
  const toggleLabel = (label: KeepLabel, isQuickInput: boolean) => {
    if (isQuickInput) {
      const exists = quickInputLabels.find(l => l.id === label.id)
      setQuickInputLabels(exists
        ? quickInputLabels.filter(l => l.id !== label.id)
        : [...quickInputLabels, label]
      )
    } else {
      const exists = editLabels.find(l => l.id === label.id)
      setEditLabels(exists
        ? editLabels.filter(l => l.id !== label.id)
        : [...editLabels, label]
      )
    }
  }

  // 渲染笔记卡片内容
  const renderNoteContent = (note: KeepNote) => {
    if (note.noteType === 'checklist' && note.checklistItems) {
      return (
        <div className="space-y-1 mb-2">
          {note.checklistItems.slice(0, 5).map(item => (
            <div key={item.id} className="flex items-center gap-2">
              <Checkbox checked={item.checked} disabled className="h-4 w-4" />
              <span className={`text-sm ${item.checked ? 'line-through text-gray-500' : 'text-gray-800'}`}>
                {item.text}
              </span>
            </div>
          ))}
          {note.checklistItems.length > 5 && (
            <div className="text-xs text-gray-500 pl-6">
              +{note.checklistItems.length - 5} 更多项
            </div>
          )}
        </div>
      )
    }
    return (
      <div className="text-sm text-gray-800 break-words mb-2 leading-relaxed">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            strong: ({ children }) => <strong className="font-semibold text-gray-900">{children}</strong>,
            a: ({ node, ...props }) => (
              <a {...props} className="text-indigo-600 hover:underline" target="_blank" rel="noreferrer" />
            ),
            ul: ({ children }) => <ul className="list-disc space-y-1 pl-5">{children}</ul>,
            ol: ({ children }) => <ol className="list-decimal space-y-1 pl-5">{children}</ol>,
            li: ({ children }) => <li className="text-sm leading-relaxed text-gray-800">{children}</li>,
            code: ({ children }) => (
              <code className="rounded bg-gray-100 px-1 py-0.5 text-[12px] text-gray-700">{children}</code>
            ),
            blockquote: ({ children }) => (
              <blockquote className="border-l-4 border-indigo-200 pl-3 italic text-gray-600">{children}</blockquote>
            )
          }}
        >
          {note.content}
        </ReactMarkdown>
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-white">
      {/* 左侧边栏 */}
      <aside className={`${sidebarOpen ? 'w-64' : 'w-16'} border-r border-gray-200 flex flex-col transition-all duration-300`}>
        <div className="p-4 flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="h-10 w-10 p-0"
          >
            <Menu className="h-5 w-5" />
          </Button>
          {sidebarOpen && (
            <>
              <Lightbulb className="h-6 w-6 text-yellow-500" />
              <span className="font-semibold text-xl text-gray-700">Keep</span>
            </>
          )}
        </div>

        <nav className="flex-1 px-2 py-2 space-y-1">
          {/* Notes */}
          <button
            onClick={() => setSelectedLabel(null)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-r-full hover:bg-gray-100 ${
              selectedLabel === null ? 'bg-orange-50' : ''
            }`}
          >
            <Lightbulb className="h-5 w-5" />
            {sidebarOpen && <span className="text-sm">笔记</span>}
          </button>

          {/* Reminders */}
          <button className="w-full flex items-center gap-3 px-4 py-3 rounded-r-full hover:bg-gray-100">
            <Bell className="h-5 w-5" />
            {sidebarOpen && <span className="text-sm">提醒</span>}
          </button>

          {/* 时间过滤 */}
          {sidebarOpen && (
            <div className="pt-4 pb-2 border-t border-gray-200 mt-2">
              <div className="px-4 text-xs text-gray-500 mb-2 flex items-center gap-1">
                <Clock className="h-3 w-3" />
                时间过滤
              </div>

              <button
                onClick={() => {
                  setDateFilter('all')
                  setShowCustomDatePicker(false)
                }}
                className={`w-full flex items-center gap-3 px-4 py-2 rounded-r-full hover:bg-gray-100 ${
                  dateFilter === 'all' ? 'bg-blue-50 text-blue-600' : ''
                }`}
              >
                <Calendar className="h-4 w-4" />
                <span className="text-sm">全部</span>
              </button>

              <button
                onClick={() => {
                  setDateFilter('today')
                  setShowCustomDatePicker(false)
                  setRefreshKey(prev => prev + 1)
                }}
                className={`w-full flex items-center gap-3 px-4 py-2 rounded-r-full hover:bg-gray-100 ${
                  dateFilter === 'today' ? 'bg-blue-50 text-blue-600' : ''
                }`}
              >
                <Calendar className="h-4 w-4" />
                <span className="text-sm">今天</span>
              </button>

              <button
                onClick={() => {
                  setDateFilter('7days')
                  setShowCustomDatePicker(false)
                  setRefreshKey(prev => prev + 1)
                }}
                className={`w-full flex items-center gap-3 px-4 py-2 rounded-r-full hover:bg-gray-100 ${
                  dateFilter === '7days' ? 'bg-blue-50 text-blue-600' : ''
                }`}
              >
                <Calendar className="h-4 w-4" />
                <span className="text-sm">最近7天</span>
              </button>

              <button
                onClick={() => {
                  setDateFilter('30days')
                  setShowCustomDatePicker(false)
                  setRefreshKey(prev => prev + 1)
                }}
                className={`w-full flex items-center gap-3 px-4 py-2 rounded-r-full hover:bg-gray-100 ${
                  dateFilter === '30days' ? 'bg-blue-50 text-blue-600' : ''
                }`}
              >
                <Calendar className="h-4 w-4" />
                <span className="text-sm">最近30天</span>
              </button>

              <button
                onClick={() => setShowCustomDatePicker(!showCustomDatePicker)}
                className={`w-full flex items-center gap-3 px-4 py-2 rounded-r-full hover:bg-gray-100 ${
                  dateFilter === 'custom' ? 'bg-blue-50 text-blue-600' : ''
                }`}
              >
                <Calendar className="h-4 w-4" />
                <span className="text-sm">自定义</span>
              </button>

              {/* 自定义日期选择器 */}
              {showCustomDatePicker && (
                <div className="px-4 py-3 bg-gray-50 rounded-lg mx-2 mt-2 space-y-2">
                  <div>
                    <label className="text-xs text-gray-600 mb-1 block">开始日期</label>
                    <Input
                      type="date"
                      value={customStartDate}
                      onChange={(e) => setCustomStartDate(e.target.value)}
                      className="text-xs h-8"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-600 mb-1 block">结束日期</label>
                    <Input
                      type="date"
                      value={customEndDate}
                      onChange={(e) => setCustomEndDate(e.target.value)}
                      className="text-xs h-8"
                    />
                  </div>
                  <Button
                    onClick={() => {
                      if (customStartDate && customEndDate) {
                        setDateFilter('custom')
                        setRefreshKey(prev => prev + 1)
                      } else {
                        toast({
                          title: "请选择日期范围",
                          description: "开始和结束日期都需要填写",
                          variant: "destructive"
                        })
                      }
                    }}
                    size="sm"
                    className="w-full text-xs"
                  >
                    应用
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* 标签列表 */}
          {sidebarOpen && labels.length > 0 && (
            <div className="pt-4 pb-2">
              <div className="px-4 text-xs text-gray-500 mb-2">标签</div>
              {labels.map(label => (
                <button
                  key={label.id}
                  onClick={() => setSelectedLabel(label.id || null)}
                  className={`w-full flex items-center gap-3 px-4 py-2 rounded-r-full hover:bg-gray-100 ${
                    selectedLabel === label.id ? 'bg-orange-50' : ''
                  }`}
                >
                  <Tag className="h-5 w-5" />
                  <span className="text-sm truncate">{label.name}</span>
                </button>
              ))}
            </div>
          )}

          {/* Edit labels */}
          {sidebarOpen && (
            <button
              onClick={() => setShowLabelManager(true)}
              className="w-full flex items-center gap-3 px-4 py-2 rounded-r-full hover:bg-gray-100"
            >
              <Edit2 className="h-5 w-5" />
              <span className="text-sm">编辑标签</span>
            </button>
          )}

          {/* Archive */}
          <button className="w-full flex items-center gap-3 px-4 py-3 rounded-r-full hover:bg-gray-100">
            <Archive className="h-5 w-5" />
            {sidebarOpen && <span className="text-sm">归档</span>}
          </button>

          {/* Bin */}
          <button className="w-full flex items-center gap-3 px-4 py-3 rounded-r-full hover:bg-gray-100">
            <Trash2 className="h-5 w-5" />
            {sidebarOpen && <span className="text-sm">垃圾箱</span>}
          </button>
        </nav>
      </aside>

      {/* 主内容区域 */}
      <main className="flex-1 overflow-y-auto">
        {/* 搜索栏 */}
        <header className="sticky top-0 bg-white border-b border-gray-200 z-10">
          <div className="max-w-5xl mx-auto px-6 py-3">
            <div className="flex items-center gap-4 bg-gray-100 rounded-lg px-4 py-2">
              <Search className="h-5 w-5 text-gray-500" />
              <input
                type="text"
                placeholder="搜索"
                className="flex-1 bg-transparent border-0 outline-none text-sm"
              />
            </div>
          </div>
        </header>

        <div className="max-w-5xl mx-auto px-6 py-8">
          {/* 快速输入 */}
          <div className="mb-8">
            {!inputExpanded ? (
              <div
                onClick={() => setInputExpanded(true)}
                className="cursor-text bg-white border border-gray-300 rounded-lg shadow-sm px-4 py-3 hover:shadow-md transition-shadow"
              >
                <div className="flex items-center gap-3">
                  <span className="text-gray-500 text-sm">记笔记...</span>
                  <div className="ml-auto flex gap-2">
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                      <CheckSquare className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                      <ImagePlus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <div
                className="bg-white border border-gray-300 rounded-lg shadow-lg p-4"
                style={{ backgroundColor: quickInputColor }}
              >
                <Input
                  placeholder="标题"
                  value={quickTitle}
                  onChange={(e) => setQuickTitle(e.target.value)}
                  className="mb-3 border-0 p-0 font-medium text-base focus-visible:ring-0 bg-transparent"
                />

                {quickNoteType === 'text' ? (
                  <>
                    <Textarea
                      ref={quickInputRef}
                      placeholder="记笔记..."
                      value={quickInput}
                      onChange={(e) => {
                        setQuickInput(e.target.value)
                        e.target.style.height = 'auto'
                        e.target.style.height = e.target.scrollHeight + 'px'
                      }}
                      className="mb-2 border-0 p-0 resize-none focus-visible:ring-0 bg-transparent text-sm min-h-[60px]"
                      style={{ overflow: 'hidden' }}
                    />
                    <div className="mb-3 flex items-center gap-2 text-xs text-gray-500">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleQuickBold}
                        className="h-8 w-8 p-0"
                        title="加粗选中文本"
                      >
                        <Bold className="h-4 w-4" />
                      </Button>
                      <span>选中文本后点击加粗。</span>
                    </div>
                  </>
                ) : (
                  <div className="mb-3 space-y-2">
                    {quickChecklistItems.map((item, index) => (
                      <div key={item.id} className="flex items-center gap-2">
                        <Checkbox
                          checked={item.checked}
                          onCheckedChange={(checked) =>
                            updateChecklistItem(item.id, { checked: checked as boolean }, true)
                          }
                        />
                        <Input
                          placeholder="列表项"
                          value={item.text}
                          onChange={(e) => updateChecklistItem(item.id, { text: e.target.value }, true)}
                          className="flex-1 border-0 p-0 h-auto focus-visible:ring-0 bg-transparent text-sm"
                        />
                        <Button
                          onClick={() => deleteChecklistItem(item.id, true)}
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                    <Button
                      onClick={() => addChecklistItem(true)}
                      variant="ghost"
                      size="sm"
                      className="text-sm"
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      添加列表项
                    </Button>
                  </div>
                )}

                {/* 标签显示 */}
                {quickInputLabels.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-3">
                    {quickInputLabels.map(label => (
                      <Badge
                        key={label.id}
                        style={{ backgroundColor: label.color }}
                        className="text-xs cursor-pointer text-gray-800"
                        onClick={() => toggleLabel(label, true)}
                      >
                        {label.name}
                        <X className="h-3 w-3 ml-1" />
                      </Badge>
                    ))}
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <div className="flex gap-1">
                    {/* 颜色选择 */}
                    <div className="relative">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={() => setShowQuickColorPicker(!showQuickColorPicker)}
                      >
                        <Palette className="h-4 w-4" />
                      </Button>
                      {showQuickColorPicker && (
                        <div className="absolute left-0 top-full mt-1 bg-white border rounded-lg shadow-lg p-2 z-20 flex gap-1">
                          {NOTE_COLORS.map(color => (
                            <button
                              key={color.value}
                              onClick={() => {
                                setQuickInputColor(color.value)
                                setShowQuickColorPicker(false)
                              }}
                              className={`w-7 h-7 rounded-full border-2 hover:border-gray-500 ${
                                quickInputColor === color.value ? 'border-gray-900' : 'border-gray-300'
                              }`}
                              style={{ backgroundColor: color.value }}
                              title={color.name}
                            />
                          ))}
                        </div>
                      )}
                    </div>

                    {/* 标签选择 */}
                    <div className="relative">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        title="添加标签"
                        onClick={() => setShowQuickLabelPicker(!showQuickLabelPicker)}
                      >
                        <Tag className="h-4 w-4" />
                      </Button>
                      {showQuickLabelPicker && (
                        <div className="absolute left-0 top-full mt-1 bg-white border rounded-lg shadow-lg py-2 z-20 min-w-[200px]">
                          {labels.length === 0 ? (
                            <div className="px-4 py-3 text-sm text-gray-500 text-center">
                              暂无标签<br/>
                              <button
                                onClick={() => {
                                  setShowLabelManager(true)
                                  setShowQuickLabelPicker(false)
                                }}
                                className="text-blue-600 hover:underline mt-1"
                              >
                                创建标签
                              </button>
                            </div>
                          ) : (
                            <>
                              {labels.map(label => (
                                <div
                                  key={label.id}
                                  onClick={() => toggleLabel(label, true)}
                                  className="flex items-center gap-2 px-3 py-2 hover:bg-gray-100 cursor-pointer"
                                >
                                  <div
                                    className="w-3 h-3 rounded-full"
                                    style={{ backgroundColor: label.color }}
                                  />
                                  <span className="text-sm flex-1">{label.name}</span>
                                  {quickInputLabels.find(l => l.id === label.id) && (
                                    <Check className="h-4 w-4 text-green-600" />
                                  )}
                                </div>
                              ))}
                              <div className="border-t mt-1 pt-1">
                                <button
                                  onClick={() => {
                                    setShowLabelManager(true)
                                    setShowQuickLabelPicker(false)
                                  }}
                                  className="w-full px-3 py-2 text-sm text-left hover:bg-gray-100 text-blue-600"
                                >
                                  + 管理标签
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      )}
                    </div>

                    {/* 更多菜单 */}
                    <div className="relative">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={() => setShowQuickMoreMenu(!showQuickMoreMenu)}
                      >
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                      {showQuickMoreMenu && (
                        <div className="absolute left-0 top-full mt-1 bg-white border rounded-lg shadow-lg py-1 z-20 min-w-[180px]">
                          <button
                            onClick={() => {
                              toggleNoteType(true)
                              setShowQuickMoreMenu(false)
                            }}
                            className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2"
                          >
                            {quickNoteType === 'text' ? <CheckSquare className="h-4 w-4" /> : <Square className="h-4 w-4" />}
                            {quickNoteType === 'text' ? '显示复选框' : '隐藏复选框'}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      onClick={() => {
                        setInputExpanded(false)
                        setQuickTitle("")
                        setQuickInput("")
                        setQuickNoteType('text')
                        setQuickChecklistItems([])
                        setQuickInputColor("#ffffff")
                        setQuickInputLabels([])
                      }}
                      variant="ghost"
                      size="sm"
                    >
                      取消
                    </Button>
                    <Button onClick={handleCreateNote} size="sm">
                      完成
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 笔记网格 */}
          {loading ? (
            <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-4">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="animate-pulse h-48 bg-gray-200 rounded-lg"></div>
              ))}
            </div>
          ) : filteredNotes.length === 0 ? (
            <div className="text-center py-12">
              <Lightbulb className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-500">
                {selectedLabel ? "此标签下还没有笔记" : "还没有笔记"}
              </h3>
            </div>
          ) : (
            <div
              className="w-full columns-2 md:columns-3 lg:columns-4"
              style={{ columnGap: '16px' }}
            >
              {filteredNotes.map((note) => (
                <div
                  key={note.id}
                  onClick={() => handleEditNote(note)}
                  className="group break-inside-avoid mb-4 border border-gray-300 rounded-lg p-3 hover:shadow-lg transition-all cursor-pointer relative"
                  style={{ backgroundColor: note.color }}
                >
                  {/* 标题 */}
                  {note.title && (
                    <div className="font-medium text-base text-gray-900 mb-2">
                      {note.title}
                    </div>
                  )}

                  {/* 笔记内容 */}
                  {renderNoteContent(note)}

                  {/* 标签 */}
                  {note.labels && note.labels.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-2">
                      {note.labels.map(label => (
                        <Badge
                          key={label.id}
                          style={{ backgroundColor: label.color }}
                          className="text-xs text-gray-800"
                        >
                          {label.name}
                        </Badge>
                      ))}
                    </div>
                  )}

                  {/* 时间信息 */}
                  <div className="text-xs text-gray-500 mt-2 border-t border-gray-200 pt-2">
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      <span>{formatRelativeTime(note.createdAt)}</span>
                    </div>
                    {note.updatedAt && note.createdAt !== note.updatedAt && (
                      <div className="text-xs text-gray-400 mt-1">
                        已编辑
                      </div>
                    )}
                  </div>

                  {/* 置顶图标（始终显示） */}
                  {note.isPinned && (
                    <div className="absolute top-2 right-2">
                      <Pin className="h-4 w-4 text-gray-600 fill-current" />
                    </div>
                  )}

                  {/* 操作按钮（悬停显示） */}
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 pt-2 border-t border-gray-300">
                    <Button
                      onClick={(e) => handleTogglePin(note, e)}
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0"
                      title={note.isPinned ? "取消置顶" : "置顶"}
                    >
                      <Pin className={`h-4 w-4 ${note.isPinned ? 'fill-current' : ''}`} />
                    </Button>
                    <Button
                      onClick={(e) => note.id && handleDeleteNote(note.id, e)}
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0"
                      title="删除"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 ml-auto"
                    >
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* 编辑笔记模态框 */}
      {editingNote && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={() => setEditingNote(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-2xl border border-gray-300 rounded-lg shadow-2xl p-6"
            style={{ backgroundColor: editColor }}
          >
            <Input
              placeholder="标题"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              className="mb-4 border-0 p-0 font-medium text-base focus-visible:ring-0 bg-transparent"
            />

            {editNoteType === 'text' ? (
              <>
                <div className="mb-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="inline-flex items-center rounded-full bg-white/80 border border-white/80 shadow-inner p-1 text-xs">
                    <button
                      type="button"
                      onClick={() => setEditPreviewMode('edit')}
                      className={`px-4 py-1.5 rounded-full transition-all ${
                        editPreviewMode === 'edit'
                          ? 'bg-gray-900 text-white shadow'
                          : 'text-gray-500 hover:text-gray-800'
                      }`}
                    >
                      编辑
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditPreviewMode('preview')}
                      className={`px-4 py-1.5 rounded-full transition-all ${
                        editPreviewMode === 'preview'
                          ? 'bg-gray-900 text-white shadow'
                          : 'text-gray-500 hover:text-gray-800'
                      }`}
                    >
                      预览
                    </button>
                  </div>

                  {editPreviewMode === 'edit' && (
                    <div className="flex items-center gap-2 text-xs text-gray-600">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleEditBold}
                        className="h-8 w-8 p-0"
                        title="加粗选中文本"
                      >
                        <Bold className="h-4 w-4" />
                      </Button>
                      <span>选中想强调的内容，一键加粗。</span>
                    </div>
                  )}
                </div>

                {editPreviewMode === 'edit' ? (
                  <Textarea
                    ref={editContentRef}
                    value={editContent}
                    onChange={(e) => {
                      setEditContent(e.target.value)
                      e.target.style.height = 'auto'
                      e.target.style.height = e.target.scrollHeight + 'px'
                    }}
                    className="mb-4 min-h-[160px] bg-transparent border border-white/70 rounded-2xl px-4 py-3 resize-none focus-visible:ring-0 edit-content-textarea shadow-inner"
                    placeholder="笔记内容..."
                    style={{ overflow: 'hidden' }}
                  />
                ) : (
                  <div className="mb-4 min-h-[160px] rounded-2xl border border-white/70 bg-white/85 shadow-inner px-4 py-3 text-sm text-gray-800 leading-relaxed">
                    {editContent.trim() ? (
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={{
                          strong: ({ children }) => <strong className="font-semibold text-gray-900">{children}</strong>,
                          a: ({ node, ...props }) => (
                            <a {...props} className="text-indigo-600 hover:underline" target="_blank" rel="noreferrer" />
                          ),
                          ul: ({ children }) => <ul className="list-disc space-y-1 pl-5">{children}</ul>,
                          ol: ({ children }) => <ol className="list-decimal space-y-1 pl-5">{children}</ol>,
                          li: ({ children }) => <li className="text-sm leading-relaxed text-gray-800">{children}</li>,
                          code: ({ children }) => (
                            <code className="rounded bg-gray-100 px-1 py-0.5 text-[12px] text-gray-700">{children}</code>
                          ),
                          blockquote: ({ children }) => (
                            <blockquote className="border-l-4 border-indigo-200 pl-3 italic text-gray-600">
                              {children}
                            </blockquote>
                          )
                        }}
                      >
                        {editContent}
                      </ReactMarkdown>
                    ) : (
                      <div className="text-xs text-gray-400 italic">当前内容为空</div>
                    )}
                  </div>
                )}
              </>
            ) : (
              <div className="mb-4 space-y-2">
                {editChecklistItems.map((item) => (
                  <div key={item.id} className="flex items-center gap-2">
                    <Checkbox
                      checked={item.checked}
                      onCheckedChange={(checked) =>
                        updateChecklistItem(item.id, { checked: checked as boolean }, false)
                      }
                    />
                    <Input
                      placeholder="列表项"
                      value={item.text}
                      onChange={(e) => updateChecklistItem(item.id, { text: e.target.value }, false)}
                      className="flex-1 border-0 p-0 h-auto focus-visible:ring-0 bg-transparent"
                    />
                    <Button
                      onClick={() => deleteChecklistItem(item.id, false)}
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
                <Button
                  onClick={() => addChecklistItem(false)}
                  variant="ghost"
                  size="sm"
                  className="text-sm"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  添加列表项
                </Button>
              </div>
            )}

            {/* 标签 */}
            {editLabels.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-4">
                {editLabels.map(label => (
                  <Badge
                    key={label.id}
                    style={{ backgroundColor: label.color }}
                    className="cursor-pointer text-gray-800"
                    onClick={() => toggleLabel(label, false)}
                  >
                    {label.name}
                    <X className="h-3 w-3 ml-1" />
                  </Badge>
                ))}
              </div>
            )}

            <div className="flex items-center justify-between pt-4 border-t border-gray-300">
              <div className="flex gap-1">
                {/* 颜色选择 */}
                <div className="relative">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={() => setShowEditColorPicker(!showEditColorPicker)}
                  >
                    <Palette className="h-4 w-4" />
                  </Button>
                  {showEditColorPicker && (
                    <div className="absolute left-0 bottom-full mb-1 bg-white border rounded-lg shadow-lg p-2 z-20 flex gap-1">
                      {NOTE_COLORS.map(color => (
                        <button
                          key={color.value}
                          onClick={() => {
                            setEditColor(color.value)
                            setShowEditColorPicker(false)
                          }}
                          className={`w-7 h-7 rounded-full border-2 ${
                            editColor === color.value ? 'border-gray-900' : 'border-gray-300'
                          }`}
                          style={{ backgroundColor: color.value }}
                        />
                      ))}
                    </div>
                  )}
                </div>

                {/* 标签选择 */}
                <div className="relative">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                    title="添加标签"
                    onClick={() => setShowEditLabelPicker(!showEditLabelPicker)}
                  >
                    <Tag className="h-4 w-4" />
                  </Button>
                  {showEditLabelPicker && (
                    <div className="absolute left-0 bottom-full mb-1 bg-white border rounded-lg shadow-lg py-2 z-20 min-w-[200px]">
                      {labels.length === 0 ? (
                        <div className="px-4 py-3 text-sm text-gray-500 text-center">
                          暂无标签<br/>
                          <button
                            onClick={() => {
                              setShowLabelManager(true)
                              setShowEditLabelPicker(false)
                            }}
                            className="text-blue-600 hover:underline mt-1"
                          >
                            创建标签
                          </button>
                        </div>
                      ) : (
                        <>
                          {labels.map(label => (
                            <div
                              key={label.id}
                              onClick={() => toggleLabel(label, false)}
                              className="flex items-center gap-2 px-3 py-2 hover:bg-gray-100 cursor-pointer"
                            >
                              <div
                                className="w-3 h-3 rounded-full"
                                style={{ backgroundColor: label.color }}
                              />
                              <span className="text-sm flex-1">{label.name}</span>
                              {editLabels.find(l => l.id === label.id) && (
                                <Check className="h-4 w-4 text-green-600" />
                              )}
                            </div>
                          ))}
                          <div className="border-t mt-1 pt-1">
                            <button
                              onClick={() => {
                                setShowLabelManager(true)
                                setShowEditLabelPicker(false)
                              }}
                              className="w-full px-3 py-2 text-sm text-left hover:bg-gray-100 text-blue-600"
                            >
                              + 管理标签
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>

                {/* 更多菜单 */}
                <div className="relative">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={() => setShowEditMoreMenu(!showEditMoreMenu)}
                  >
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                  {showEditMoreMenu && (
                    <div className="absolute left-0 bottom-full mb-1 bg-white border rounded-lg shadow-lg py-1 z-20 min-w-[180px]">
                      <button
                        onClick={() => {
                          toggleNoteType(false)
                          setShowEditMoreMenu(false)
                        }}
                        className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2"
                      >
                        {editNoteType === 'text' ? <CheckSquare className="h-4 w-4" /> : <Square className="h-4 w-4" />}
                        {editNoteType === 'text' ? '显示复选框' : '隐藏复选框'}
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <Button onClick={handleSaveEdit} size="sm">
                完成
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 标签管理模态框 */}
      {showLabelManager && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={() => setShowLabelManager(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md bg-white rounded-lg shadow-2xl p-6"
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">编辑标签</h3>
              <Button
                onClick={() => setShowLabelManager(false)}
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* 创建新标签 */}
            <div className="mb-4 p-4 bg-gray-50 rounded-lg">
              <Input
                placeholder="创建新标签"
                value={newLabelName}
                onChange={(e) => setNewLabelName(e.target.value)}
                className="mb-2"
              />
              <div className="flex gap-2 mb-2">
                {LABEL_COLORS.map(color => (
                  <button
                    key={color}
                    onClick={() => setNewLabelColor(color)}
                    className={`w-6 h-6 rounded-full border-2 ${
                      newLabelColor === color ? 'border-gray-900' : 'border-gray-300'
                    }`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
              <Button onClick={handleCreateLabel} size="sm" className="w-full">
                创建
              </Button>
            </div>

            {/* 标签列表 */}
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {labels.map(label => (
                <div
                  key={label.id}
                  className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg"
                >
                  {editingLabelId === label.id ? (
                    // 编辑模式
                    <>
                      <div className="flex-1 space-y-2">
                        <Input
                          value={editingLabelName}
                          onChange={(e) => setEditingLabelName(e.target.value)}
                          className="text-sm"
                          placeholder="标签名称"
                        />
                        <div className="flex gap-1">
                          {LABEL_COLORS.map(color => (
                            <button
                              key={color}
                              onClick={() => setEditingLabelColor(color)}
                              className={`w-5 h-5 rounded-full border-2 ${
                                editingLabelColor === color ? 'border-gray-900' : 'border-gray-300'
                              }`}
                              style={{ backgroundColor: color }}
                            />
                          ))}
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          onClick={handleSaveEditLabel}
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          title="保存"
                        >
                          <Check className="h-4 w-4 text-green-600" />
                        </Button>
                        <Button
                          onClick={handleCancelEditLabel}
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          title="取消"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </>
                  ) : (
                    // 显示模式
                    <>
                      <div
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: label.color }}
                      />
                      <span className="flex-1 text-sm">{label.name}</span>
                      <Button
                        onClick={() => handleStartEditLabel(label)}
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        title="编辑"
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        onClick={() => label.id && handleDeleteLabel(label.id)}
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        title="删除"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
