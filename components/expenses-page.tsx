"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import {
  ArrowLeft,
  Calendar,
  Edit2,
  Loader2,
  PiggyBank,
  Plus,
  Tag,
  Trash2,
  Palette,
  X,
  Scan,
  BarChart3
} from "lucide-react"
import Link from "next/link"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"
import { Label } from "@/components/ui/label"
import { DatePicker } from "@/components/ui/date-picker"
import { useToast } from "@/hooks/use-toast"
import Image from "next/image"
import SmartReceiptUpload from "@/components/smart-receipt-upload"
import ExpenseAnalytics from "@/components/expense-analytics"
import exchangeRateService from "@/lib/exchange-rate-service"
import ExpenseAgentPanel from "@/components/expense/expense-agent-panel"

interface ExpenseCategory {
  id: number
  name: string
  colorHex: string
}

interface ExpenseRecord {
  id: number
  title: string
  occurredAt: string
  amount: number
  currency: string
  note?: string
  categoryId?: number | null
  category?: ExpenseCategory | null
  receiptPaths?: string[]
}

type CategoryEdits = Record<number, { name: string; colorHex: string }>

const presetColors = [
  "#2563eb",
  "#16a34a",
  "#f97316",
  "#db2777",
  "#facc15",
  "#0ea5e9",
  "#6366f1",
  "#14b8a6",
  "#dc2626",
  "#9333ea"
]

const currencyOptions = [
  { code: "CNY", label: "人民币 (CNY)" },
  { code: "USD", label: "美元 (USD)" },
  { code: "EUR", label: "欧元 (EUR)" },
  { code: "GBP", label: "英镑 (GBP)" },
  { code: "JPY", label: "日元 (JPY)" },
  { code: "HKD", label: "港币 (HKD)" },
  { code: "SGD", label: "新加坡元 (SGD)" },
  { code: "AUD", label: "澳元 (AUD)" },
  { code: "CAD", label: "加元 (CAD)" },
  { code: "CHF", label: "瑞士法郎 (CHF)" }
]

const formatCurrencyValue = (amount: number, currency: string) => {
  try {
    return new Intl.NumberFormat("zh-CN", {
      style: "currency",
      currency
    }).format(amount)
  } catch (error) {
    return `${amount.toFixed(2)} ${currency}`
  }
}

const formatDateTime = (value: string) => {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value

  return date.toLocaleString("zh-CN", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  })
}

export default function ExpensesPage() {
  const { toast } = useToast()

  const [loading, setLoading] = useState(true)
  const [expenseSubmitting, setExpenseSubmitting] = useState(false)
  const [categories, setCategories] = useState<ExpenseCategory[]>([])
  const [expenses, setExpenses] = useState<ExpenseRecord[]>([])
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | "all">("all")
  const [view, setView] = useState<'list' | 'analytics'>('list')
  const [showSmartUpload, setShowSmartUpload] = useState(false)

  // 货币筛选和换算状态
  const [currencyFilter, setCurrencyFilter] = useState<string>('all')
  const [targetCurrency, setTargetCurrency] = useState<string>('none')
  const [exchangeRates, setExchangeRates] = useState<Map<string, number>>(new Map())

  const [showAddExpense, setShowAddExpense] = useState(false)
  const [newExpenseTitle, setNewExpenseTitle] = useState("")
  const getLocalDate = () => {
    const now = new Date()
    return now.toLocaleDateString('sv-SE') // YYYY-MM-DD
  }

const getLocalTime = () => {
  const now = new Date()
  return now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
}

const toInputDate = (value: string) => {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return getLocalDate()
  return date.toLocaleDateString('sv-SE')
}

const toInputTime = (value: string) => {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return getLocalTime()
  return date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
}

  const [newExpenseDate, setNewExpenseDate] = useState<string>(() => getLocalDate())
  const [newExpenseTime, setNewExpenseTime] = useState<string>(() => getLocalTime())
  const [newExpenseAmount, setNewExpenseAmount] = useState("")
  const [newExpenseCategory, setNewExpenseCategory] = useState<number | "none">("none")
  const [newExpenseNote, setNewExpenseNote] = useState("")
  const [newExpenseCurrency, setNewExpenseCurrency] = useState("CNY")
  const [newExpenseReceipts, setNewExpenseReceipts] = useState<File[]>([])

  const [showEditExpense, setShowEditExpense] = useState(false)
  const [editingExpense, setEditingExpense] = useState<ExpenseRecord | null>(null)
  const [editExpenseTitle, setEditExpenseTitle] = useState("")
  const [editExpenseDate, setEditExpenseDate] = useState<string>(() => getLocalDate())
  const [editExpenseTime, setEditExpenseTime] = useState<string>(() => getLocalTime())
  const [editExpenseAmount, setEditExpenseAmount] = useState("")
  const [editExpenseCurrency, setEditExpenseCurrency] = useState("CNY")
  const [editExpenseCategory, setEditExpenseCategory] = useState<number | "none">("none")
  const [editExpenseNote, setEditExpenseNote] = useState("")
  const [editExistingReceipts, setEditExistingReceipts] = useState<string[]>([])
  const [editNewReceipts, setEditNewReceipts] = useState<File[]>([])

  const [showCategoryManager, setShowCategoryManager] = useState(false)
  const [categoryEdits, setCategoryEdits] = useState<CategoryEdits>({})
  const [newCategoryName, setNewCategoryName] = useState("")
  const [newCategoryColor, setNewCategoryColor] = useState(presetColors[0])
  const [categorySubmitting, setCategorySubmitting] = useState(false)
  const [deletingExpenseId, setDeletingExpenseId] = useState<number | null>(null)
  const [categorySavingId, setCategorySavingId] = useState<number | null>(null)
  const [categoryDeletingId, setCategoryDeletingId] = useState<number | null>(null)

  const categoryBusy = categorySubmitting || categorySavingId !== null || categoryDeletingId !== null
  const [updateSubmitting, setUpdateSubmitting] = useState(false)

  // 带货币筛选的开销列表
  const filteredExpenses = useMemo(() => {
    let result = expenses

    // 按属性筛选
    if (selectedCategoryId !== "all") {
      result = result.filter((expense) => expense.categoryId === selectedCategoryId)
    }

    // 按货币筛选
    if (currencyFilter !== "all") {
      result = result.filter((expense) => expense.currency === currencyFilter)
    }

    return result
  }, [expenses, selectedCategoryId, currencyFilter])

  // 当需要换算时，获取汇率
  useEffect(() => {
    if (targetCurrency === 'none' || filteredExpenses.length === 0) {
      setExchangeRates(new Map())
      return
    }

    const fetchRates = async () => {
      try {
        // 收集需要换算的货币对
        const uniqueCurrencies = Array.from(new Set(filteredExpenses.map(e => e.currency)))
        const pairs = uniqueCurrencies
          .filter(from => from !== targetCurrency)
          .map(from => ({ from, to: targetCurrency }))

        if (pairs.length === 0) {
          setExchangeRates(new Map())
          return
        }

        // 通过API批量获取汇率
        const ratesMap = new Map<string, number>()
        await Promise.all(
          pairs.map(async ({ from, to }) => {
            try {
              const response = await fetch(`/api/exchange-rates?from=${from}&to=${to}`)
              if (response.ok) {
                const data = await response.json()
                ratesMap.set(`${from}_${to}`, data.rate)
              } else {
                console.error(`获取 ${from} → ${to} 汇率失败`)
                ratesMap.set(`${from}_${to}`, 1)
              }
            } catch (error) {
              console.error(`获取 ${from} → ${to} 汇率出错:`, error)
              ratesMap.set(`${from}_${to}`, 1)
            }
          })
        )
        setExchangeRates(ratesMap)
      } catch (error) {
        console.error('获取汇率失败:', error)
        toast({
          title: "汇率获取失败",
          description: "无法获取最新汇率，请稍后重试",
          variant: "destructive"
        })
      }
    }

    void fetchRates()
  }, [targetCurrency, filteredExpenses, toast])

  // 计算总额显示
  const totalDisplay = useMemo(() => {
    if (filteredExpenses.length === 0) {
      return { text: formatCurrencyValue(0, "CNY"), multi: false }
    }

    // 如果需要换算
    if (targetCurrency !== 'none') {
      let total = 0
      filteredExpenses.forEach((expense) => {
        if (expense.currency === targetCurrency) {
          // 相同货币直接累加
          total += expense.amount
        } else {
          // 不同货币需要换算
          const rateKey = `${expense.currency}_${targetCurrency}`
          const rate = exchangeRates.get(rateKey) || 1
          total += expense.amount * rate
        }
      })
      return { text: formatCurrencyValue(total, targetCurrency), multi: false, converted: true }
    }

    // 不换算时的默认逻辑
    const uniqueCurrencies = Array.from(new Set(filteredExpenses.map((expense) => expense.currency)))
    if (uniqueCurrencies.length === 1) {
      const currency = uniqueCurrencies[0]
      const total = filteredExpenses.reduce((sum, expense) => sum + expense.amount, 0)
      return { text: formatCurrencyValue(total, currency), multi: false }
    }
    return { text: "多币种记录，合计仅供参考", multi: true }
  }, [filteredExpenses, targetCurrency, exchangeRates])

  useEffect(() => {
    if (!showCategoryManager) return

    const edits: CategoryEdits = {}
    categories.forEach((category) => {
      edits[category.id] = {
        name: category.name,
        colorHex: category.colorHex
      }
    })
    setCategoryEdits(edits)
  }, [showCategoryManager, categories])

  useEffect(() => {
    if (selectedCategoryId === "all") return
    const exists = categories.some((category) => category.id === selectedCategoryId)
    if (!exists) {
      setSelectedCategoryId("all")
    }
  }, [categories, selectedCategoryId])

  const loadCategories = useCallback(async () => {
    try {
      const response = await fetch("/api/expense-categories")
      if (!response.ok) throw new Error("Failed to fetch categories")
      const data = await response.json()
      setCategories(data)
    } catch (error) {
      console.error(error)
      toast({
        title: "获取分类失败",
        description: "无法加载开销分类信息",
        variant: "destructive"
      })
    }
  }, [toast])

  const loadExpenses = useCallback(async () => {
    try {
      const response = await fetch("/api/expenses")
      if (!response.ok) throw new Error("Failed to fetch expenses")
      const data = await response.json()
      setExpenses(
        (data as ExpenseRecord[]).map((item) => ({
          ...item,
          currency: item.currency || "CNY",
          receiptPaths: item.receiptPaths ?? []
        }))
      )
    } catch (error) {
      console.error(error)
      toast({
        title: "获取开销失败",
        description: "无法加载开销记录",
        variant: "destructive"
      })
    }
  }, [toast])

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      await Promise.all([loadCategories(), loadExpenses()])
    } finally {
      setLoading(false)
    }
  }, [loadCategories, loadExpenses])

  useEffect(() => {
    void loadData()
  }, [loadData])

  const resetNewExpenseForm = () => {
    setNewExpenseTitle("")
    setNewExpenseDate(getLocalDate())
    setNewExpenseTime(getLocalTime())
    setNewExpenseAmount("")
    setNewExpenseCategory("none")
    setNewExpenseNote("")
    setNewExpenseCurrency("CNY")
    setNewExpenseReceipts([])
  }

  const resetEditExpenseForm = () => {
    setEditingExpense(null)
    setEditExpenseTitle("")
    setEditExpenseDate(getLocalDate())
    setEditExpenseTime(getLocalTime())
    setEditExpenseAmount("")
    setEditExpenseCurrency("CNY")
    setEditExpenseCategory("none")
    setEditExpenseNote("")
    setEditExistingReceipts([])
    setEditNewReceipts([])
  }

  const startEditExpense = (expense: ExpenseRecord) => {
    setEditingExpense(expense)
    setEditExpenseTitle(expense.title)
    setEditExpenseDate(toInputDate(expense.occurredAt))
    setEditExpenseTime(toInputTime(expense.occurredAt))
    setEditExpenseAmount(expense.amount.toString())
    setEditExpenseCurrency(expense.currency || "CNY")
    setEditExpenseCategory(expense.categoryId ?? "none")
    setEditExpenseNote(expense.note || "")
    setEditExistingReceipts([...(expense.receiptPaths || [])])
    setEditNewReceipts([])
    setShowEditExpense(true)
  }

  const closeEditExpense = () => {
    setUpdateSubmitting(false)
    setShowEditExpense(false)
    resetEditExpenseForm()
  }

  const handleAddExpense = async () => {
    const title = newExpenseTitle.trim()
    if (!title) {
      toast({ title: "请填写事件", variant: "destructive" })
      return
    }

    if (!newExpenseDate) {
      toast({ title: "请选择日期", variant: "destructive" })
      return
    }

    const amountValue = Number(newExpenseAmount)
    if (Number.isNaN(amountValue)) {
      toast({ title: "请输入有效的金额", variant: "destructive" })
      return
    }

    const occurredAt = `${newExpenseDate}T${newExpenseTime || "00:00"}`

    setExpenseSubmitting(true)
    try {
      const formData = new FormData()
      formData.append("title", title)
      formData.append("occurredAt", occurredAt)
      formData.append("amount", String(amountValue))
      formData.append("currency", newExpenseCurrency)
      if (newExpenseNote.trim()) formData.append("note", newExpenseNote.trim())
      if (newExpenseCategory !== "none") formData.append("categoryId", String(newExpenseCategory))
      newExpenseReceipts.forEach((file) => formData.append("receipts", file))

      const response = await fetch("/api/expenses", {
        method: "POST",
        body: formData
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || "添加开销失败")
      }

      toast({ title: "已记录开销", description: "开销记录已保存" })
      setShowAddExpense(false)
      resetNewExpenseForm()
      await loadExpenses()
    } catch (error) {
      console.error(error)
      toast({
        title: "添加失败",
        description: error instanceof Error ? error.message : "无法添加开销",
        variant: "destructive"
      })
    } finally {
      setExpenseSubmitting(false)
    }
  }

  const handleUpdateExpense = async () => {
    if (!editingExpense) return

    const title = editExpenseTitle.trim()
    if (!title) {
      toast({ title: "请填写事件", variant: "destructive" })
      return
    }

    if (!editExpenseDate) {
      toast({ title: "请选择日期", variant: "destructive" })
      return
    }

    const amountValue = Number(editExpenseAmount)
    if (Number.isNaN(amountValue)) {
      toast({ title: "请输入有效的金额", variant: "destructive" })
      return
    }

    const occurredAt = `${editExpenseDate}T${editExpenseTime || "00:00"}`

    setUpdateSubmitting(true)
    try {
      const formData = new FormData()
      formData.append("title", title)
      formData.append("occurredAt", occurredAt)
      formData.append("amount", String(amountValue))
      formData.append("currency", editExpenseCurrency)
      formData.append("existingReceipts", JSON.stringify(editExistingReceipts))
      if (editExpenseNote.trim()) formData.append("note", editExpenseNote.trim())
      formData.append(
        "categoryId",
        editExpenseCategory === "none" ? "none" : String(editExpenseCategory)
      )
      editNewReceipts.forEach((file) => formData.append("receipts", file))

      const response = await fetch(`/api/expenses/${editingExpense.id}`, {
        method: "PUT",
        body: formData
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || "更新开销失败")
      }

      toast({ title: "开销已更新" })
      closeEditExpense()
      await loadExpenses()
    } catch (error) {
      console.error(error)
      toast({
        title: "更新失败",
        description: error instanceof Error ? error.message : "无法更新开销",
        variant: "destructive"
      })
    } finally {
      setUpdateSubmitting(false)
    }
  }

  const handleRemoveExistingReceipt = (path: string) => {
    setEditExistingReceipts((prev) => prev.filter((item) => item !== path))
  }

  const handleRemoveNewReceipt = (index: number) => {
    setEditNewReceipts((prev) => prev.filter((_, i) => i !== index))
  }

  const handleDeleteExpense = async (id: number) => {
    setDeletingExpenseId(id)
    try {
      const response = await fetch(`/api/expenses/${id}`, {
        method: "DELETE"
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || "删除开销失败")
      }

      toast({ title: "已删除", description: "开销记录已移除" })
      await loadExpenses()
    } catch (error) {
      console.error(error)
      toast({
        title: "删除失败",
        description: error instanceof Error ? error.message : "无法删除开销",
        variant: "destructive"
      })
    } finally {
      setDeletingExpenseId(null)
    }
  }

  const handleAddCategory = async () => {
    const name = newCategoryName.trim()
    if (!name) {
      toast({ title: "请填写属性名称", variant: "destructive" })
      return
    }

    setCategorySubmitting(true)
    try {
      const response = await fetch("/api/expense-categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          colorHex: newCategoryColor
        })
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || "添加属性失败")
      }

      toast({ title: "属性已创建" })
      setNewCategoryName("")
      setNewCategoryColor(presetColors[0])
      await loadCategories()
    } catch (error) {
      console.error(error)
      toast({
        title: "添加失败",
        description: error instanceof Error ? error.message : "无法添加属性",
        variant: "destructive"
      })
    } finally {
      setCategorySubmitting(false)
    }
  }

  const handleSaveCategory = async (id: number) => {
    const edits = categoryEdits[id]
    if (!edits) return

    const name = edits.name.trim()
    if (!name) {
      toast({ title: "属性名称不能为空", variant: "destructive" })
      return
    }

    setCategorySavingId(id)
    try {
      const response = await fetch(`/api/expense-categories/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          colorHex: edits.colorHex
        })
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || "更新属性失败")
      }

      toast({ title: "属性已更新" })
      await loadCategories()
    } catch (error) {
      console.error(error)
      toast({
        title: "更新失败",
        description: error instanceof Error ? error.message : "无法更新属性",
        variant: "destructive"
      })
    } finally {
      setCategorySavingId(null)
    }
  }

  const handleDeleteCategory = async (id: number, name: string) => {
    if (name === "未分类") {
      toast({ title: "系统分类不可删除", variant: "destructive" })
      return
    }

    setCategoryDeletingId(id)
    try {
      const response = await fetch(`/api/expense-categories/${id}`, {
        method: "DELETE"
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || "删除属性失败")
      }

      toast({ title: "属性已删除" })
      await Promise.all([loadCategories(), loadExpenses()])
    } catch (error) {
      console.error(error)
      toast({
        title: "删除失败",
        description: error instanceof Error ? error.message : "无法删除属性",
        variant: "destructive"
      })
    } finally {
      setCategoryDeletingId(null)
    }
  }

  const updateCategoryEdits = (id: number, updates: Partial<{ name: string; colorHex: string }>) => {
    setCategoryEdits((prev) => ({
      ...prev,
      [id]: {
        name: updates.name !== undefined ? updates.name : prev[id]?.name ?? "",
        colorHex: updates.colorHex !== undefined ? updates.colorHex : prev[id]?.colorHex ?? presetColors[0]
      }
    }))
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
              <PiggyBank className="h-7 w-7 text-emerald-600" />
              开销记录
            </h1>
            <p className="text-gray-600 mt-1">记录每一次投入，理解资源流向</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Link href="/past">
              <Button variant="outline" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />返回过去主页
              </Button>
            </Link>
            <Button
              variant={view === 'list' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setView('list')}
            >
              列表视图
            </Button>
            <Button
              variant={view === 'analytics' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setView('analytics')}
            >
              <BarChart3 className="h-4 w-4 mr-2" />
              分析视图
            </Button>
            <Button variant="outline" size="sm" onClick={() => setShowCategoryManager(true)}>
              <Palette className="h-4 w-4 mr-2" />管理属性
            </Button>
            <Button variant="outline" size="sm" onClick={() => setShowSmartUpload(true)}>
              <Scan className="h-4 w-4 mr-2" />智能票据录入
            </Button>
            <Button size="sm" onClick={() => setShowAddExpense(true)}>
              <Plus className="h-4 w-4 mr-2" />记录开销
            </Button>
          </div>
        </div>

        {view === 'list' && (
          <Card>
            <CardContent className="py-4 flex flex-wrap gap-4 items-center justify-between">
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2">
                  <Label htmlFor="category-filter" className="text-sm text-gray-600">
                    属性筛选
                  </Label>
                  <select
                    id="category-filter"
                    value={selectedCategoryId}
                    onChange={(event) => {
                      const value = event.target.value
                      if (value === "all") {
                        setSelectedCategoryId("all")
                      } else {
                        setSelectedCategoryId(Number(value))
                      }
                    }}
                    className="px-3 py-2 border rounded-md text-sm"
                  >
                    <option value="all">全部</option>
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <Label htmlFor="currency-filter" className="text-sm text-gray-600">
                    货币筛选
                  </Label>
                  <select
                    id="currency-filter"
                    value={currencyFilter}
                    onChange={(event) => setCurrencyFilter(event.target.value)}
                    className="px-3 py-2 border rounded-md text-sm"
                  >
                    <option value="all">全部货币</option>
                    {currencyOptions.map((option) => (
                      <option key={option.code} value={option.code}>
                        {option.code}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <Label htmlFor="target-currency" className="text-sm text-gray-600">
                    换算货币
                  </Label>
                  <select
                    id="target-currency"
                    value={targetCurrency}
                    onChange={(event) => setTargetCurrency(event.target.value)}
                    className="px-3 py-2 border rounded-md text-sm"
                  >
                    <option value="none">不换算</option>
                    {currencyOptions.map((option) => (
                      <option key={option.code} value={option.code}>
                        {option.code}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-500">
                  共 {filteredExpenses.length} 条记录，合计
                  <span className="text-base font-semibold text-gray-900 ml-1">
                    {totalDisplay.text}
                  </span>
                </div>
                {totalDisplay.multi && (
                  <p className="text-xs text-gray-400 mt-1">
                    包含不同币种的记录，建议按货币筛选查看具体合计。
                  </p>
                )}
                {targetCurrency !== 'none' && exchangeRates.size > 0 && (
                  <div className="text-xs text-gray-500 mt-2">
                    <p className="font-medium mb-1">当前汇率：</p>
                    {Array.from(exchangeRates.entries()).map(([key, rate]) => {
                      const [from, to] = key.split('_')
                      return (
                        <p key={key} className="text-gray-400">
                          1 {from} = {rate.toFixed(4)} {to}
                        </p>
                      )
                    })}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {view === 'list' ? (loading ? (
          <Card>
            <CardContent className="py-16 text-center text-gray-400 flex flex-col items-center gap-3">
              <Loader2 className="h-6 w-6 animate-spin" />
              正在加载开销记录...
            </CardContent>
          </Card>
        ) : filteredExpenses.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center text-gray-500">
              暂无开销记录。点击“记录开销”开始第一条记录。
            </CardContent>
          </Card>
        ) : (
          <div className="relative pl-6">
            <div className="absolute left-2 top-2 bottom-2 w-px bg-gray-200" aria-hidden />
            <div className="space-y-4">
              {filteredExpenses.map((expense) => {
                const category = expense.category

                // 计算换算后的金额
                let convertedAmount: string | null = null
                if (targetCurrency !== 'none' && expense.currency !== targetCurrency) {
                  const rateKey = `${expense.currency}_${targetCurrency}`
                  const rate = exchangeRates.get(rateKey) || 1
                  const converted = expense.amount * rate
                  convertedAmount = formatCurrencyValue(converted, targetCurrency)
                }

                return (
                  <div key={expense.id} className="relative">
                    <div className="absolute -left-[17px] top-6 flex h-4 w-4 items-center justify-center rounded-full border border-emerald-200 bg-white">
                      <div className="h-2 w-2 rounded-full bg-emerald-500" />
                    </div>
                    <Card className="border border-emerald-100 shadow-sm">
                      <CardHeader className="pb-2">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="flex items-center gap-2 text-sm text-emerald-700">
                            <Calendar className="h-4 w-4" />
                            <span>{formatDateTime(expense.occurredAt)}</span>
                          </div>
                          <div className="flex flex-col items-end gap-1">
                            <div className="text-lg font-semibold text-gray-900">
                              {formatCurrencyValue(expense.amount, expense.currency)}
                            </div>
                            {convertedAmount && (
                              <div className="text-sm text-gray-500">
                                ≈ {convertedAmount}
                              </div>
                            )}
                          </div>
                        </div>
                        <CardTitle className="text-xl text-gray-900 mt-2 flex items-center gap-3">
                          {expense.title}
                          {category && (
                            <span
                              className="text-xs font-medium px-3 py-1 rounded-full text-white"
                              style={{ backgroundColor: category.colorHex }}
                            >
                              <span className="flex items-center gap-1">
                                <Tag className="h-3 w-3" />
                                {category.name}
                              </span>
                            </span>
                          )}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3 text-sm text-gray-600">
                        {expense.note && (
                          <p className="leading-relaxed">{expense.note}</p>
                        )}
                        {expense.receiptPaths?.length ? (
                          <div className="space-y-2">
                            <h4 className="text-xs font-semibold text-gray-500">票据图片</h4>
                            <div className="flex flex-wrap gap-2">
                              {expense.receiptPaths.map((url) => (
                                <a
                                  key={url}
                                  href={url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="relative block w-24 h-24 rounded border border-gray-200 overflow-hidden"
                                  title="点击查看大图"
                                >
                                  <Image
                                    src={url}
                                    alt="receipt"
                                    fill
                                    sizes="96px"
                                    className="object-cover"
                                    unoptimized
                                  />
                                </a>
                              ))}
                            </div>
                          </div>
                        ) : null}
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => startEditExpense(expense)}
                            disabled={updateSubmitting}
                          >
                            <Edit2 className="h-4 w-4 mr-1" />
                            编辑
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => void handleDeleteExpense(expense.id)}
                            disabled={deletingExpenseId === expense.id}
                          >
                            {deletingExpenseId === expense.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <>
                                <Trash2 className="h-4 w-4 mr-1" />
                                删除
                              </>
                            )}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )
              })}
            </div>
          </div>
        )) : (
          loading ? (
            <Card>
              <CardContent className="py-16 text-center text-gray-400 flex flex-col items-center gap-3">
                <Loader2 className="h-6 w-6 animate-spin" />
                正在加载数据...
              </CardContent>
            </Card>
          ) : (
            <ExpenseAnalytics expenses={expenses} categories={categories} />
          )
        )}
      </div>

      {showSmartUpload && (
        <SmartReceiptUpload
          categories={categories}
          onComplete={() => {
            setShowSmartUpload(false)
            void loadExpenses()
          }}
          onCancel={() => setShowSmartUpload(false)}
        />
      )}

      {showAddExpense && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-lg shadow-lg">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Plus className="h-5 w-5" />
                记录新的开销
              </h2>
              <Button variant="ghost" size="sm" onClick={() => setShowAddExpense(false)} disabled={expenseSubmitting}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="expense-title">做了什么？</Label>
                <Input
                  id="expense-title"
                  placeholder="例如：和朋友聚餐、购买课程"
                  value={newExpenseTitle}
                  onChange={(event) => setNewExpenseTitle(event.target.value)}
                  autoFocus
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>发生日期</Label>
                  <DatePicker value={newExpenseDate} onChange={(value) => setNewExpenseDate(value || "") } />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="expense-time">具体时间</Label>
                  <Input
                    id="expense-time"
                    type="time"
                    value={newExpenseTime}
                    onChange={(event) => setNewExpenseTime(event.target.value)}
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="expense-amount">金额</Label>
                  <Input
                    id="expense-amount"
                    placeholder="请输入金额"
                    value={newExpenseAmount}
                    onChange={(event) => setNewExpenseAmount(event.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="expense-currency">货币</Label>
                  <select
                    id="expense-currency"
                    value={newExpenseCurrency}
                    onChange={(event) => setNewExpenseCurrency(event.target.value)}
                    className="w-full px-3 py-2 border rounded-md text-sm"
                  >
                    {currencyOptions.map((option) => (
                      <option key={option.code} value={option.code}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="expense-receipts">票据图片</Label>
                  <Input
                    id="expense-receipts"
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={(event) => {
                      const files = event.target.files
                      setNewExpenseReceipts(files ? Array.from(files) : [])
                      if (event.target) {
                        ;(event.target as HTMLInputElement).value = ''
                      }
                    }}
                  />
                  {newExpenseReceipts.length > 0 && (
                    <p className="text-xs text-gray-500">
                      已选择 {newExpenseReceipts.length} 个文件
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="expense-category">属性</Label>
                  <select
                    id="expense-category"
                    value={newExpenseCategory}
                    onChange={(event) => {
                      const value = event.target.value
                      if (value === "none") {
                        setNewExpenseCategory("none")
                      } else {
                        setNewExpenseCategory(Number(value))
                      }
                    }}
                    className="w-full px-3 py-2 border rounded-md text-sm"
                  >
                    <option value="none">未选择</option>
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="expense-note">备注</Label>
                <Textarea
                  id="expense-note"
                  placeholder="记录一些细节或感受..."
                  value={newExpenseNote}
                  onChange={(event) => setNewExpenseNote(event.target.value)}
                  className="min-h-[80px]"
                />
              </div>
            </div>
            <div className="px-6 py-4 border-t flex justify-end gap-3">
              <Button variant="outline" onClick={() => setShowAddExpense(false)} disabled={expenseSubmitting}>
                取消
              </Button>
              <Button onClick={() => void handleAddExpense()} disabled={expenseSubmitting}>
                {expenseSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    保存中...
                  </>
                ) : (
                  "保存开销"
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {showEditExpense && editingExpense && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-lg shadow-lg">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Edit2 className="h-5 w-5" />
                编辑开销
              </h2>
              <Button variant="ghost" size="sm" onClick={closeEditExpense} disabled={updateSubmitting}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="edit-expense-title">做了什么？</Label>
                <Input
                  id="edit-expense-title"
                  value={editExpenseTitle}
                  onChange={(event) => setEditExpenseTitle(event.target.value)}
                  autoFocus
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>发生日期</Label>
                  <DatePicker value={editExpenseDate} onChange={(value) => setEditExpenseDate(value || getLocalDate())} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-expense-time">具体时间</Label>
                  <Input
                    id="edit-expense-time"
                    type="time"
                    value={editExpenseTime}
                    onChange={(event) => setEditExpenseTime(event.target.value)}
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-expense-amount">金额</Label>
                  <Input
                    id="edit-expense-amount"
                    value={editExpenseAmount}
                    onChange={(event) => setEditExpenseAmount(event.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-expense-currency">货币</Label>
                  <select
                    id="edit-expense-currency"
                    value={editExpenseCurrency}
                    onChange={(event) => setEditExpenseCurrency(event.target.value)}
                    className="w-full px-3 py-2 border rounded-md text-sm"
                  >
                    {currencyOptions.map((option) => (
                      <option key={option.code} value={option.code}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-expense-category">属性</Label>
                  <select
                    id="edit-expense-category"
                    value={editExpenseCategory}
                    onChange={(event) => {
                      const value = event.target.value
                      if (value === "none") {
                        setEditExpenseCategory("none")
                      } else {
                        setEditExpenseCategory(Number(value))
                      }
                    }}
                    className="w-full px-3 py-2 border rounded-md text-sm"
                  >
                    <option value="none">未选择</option>
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-expense-note">备注</Label>
                <Textarea
                  id="edit-expense-note"
                  value={editExpenseNote}
                  onChange={(event) => setEditExpenseNote(event.target.value)}
                  className="min-h-[80px]"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-expense-receipts">新增票据</Label>
                <Input
                  id="edit-expense-receipts"
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(event) => {
                    const files = event.target.files
                    setEditNewReceipts(files ? Array.from(files) : [])
                    if (event.target) {
                      ;(event.target as HTMLInputElement).value = ''
                    }
                  }}
                />
                {editNewReceipts.length > 0 && (
                  <div className="space-y-1 text-xs text-gray-500">
                    {editNewReceipts.map((file, index) => (
                      <div key={`${file.name}-${index}`} className="flex items-center justify-between">
                        <span className="truncate mr-2">{file.name}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveNewReceipt(index)}
                          className="h-7 px-2"
                        >
                          移除
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              {editExistingReceipts.length > 0 && (
                <div className="space-y-2">
                  <Label>已上传票据</Label>
                  <div className="flex flex-wrap gap-2">
                    {editExistingReceipts.map((url) => (
                      <div key={url} className="relative w-24 h-24 rounded border border-gray-200 overflow-hidden">
                        <Image
                          src={url}
                          alt="receipt"
                          fill
                          sizes="96px"
                          className="object-cover"
                          unoptimized
                        />
                        <Button
                          variant="destructive"
                          size="icon"
                          onClick={() => handleRemoveExistingReceipt(url)}
                          className="absolute top-1 right-1 h-6 w-6"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="px-6 py-4 border-t flex justify-end gap-3">
              <Button variant="outline" onClick={closeEditExpense} disabled={updateSubmitting}>
                取消
              </Button>
              <Button onClick={() => void handleUpdateExpense()} disabled={updateSubmitting}>
                {updateSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    保存中...
                  </>
                ) : (
                  "保存修改"
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {showCategoryManager && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-3xl shadow-lg">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Palette className="h-5 w-5" />
                管理开销属性
              </h2>
              <Button variant="ghost" size="sm" onClick={() => setShowCategoryManager(false)} disabled={categoryBusy}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="px-6 py-5 space-y-5 max-h-[70vh] overflow-y-auto">
              <div className="space-y-2">
                <Label>新增属性</Label>
                <div className="flex flex-wrap gap-3 items-center">
                  <Input
                    placeholder="属性名称"
                    value={newCategoryName}
                    onChange={(event) => setNewCategoryName(event.target.value)}
                    className="w-40"
                  />
                  <input
                    type="color"
                    value={newCategoryColor}
                    onChange={(event) => setNewCategoryColor(event.target.value)}
                    className="h-10 w-14 rounded cursor-pointer border"
                    title="选择颜色"
                  />
                  <div className="flex gap-2">
                    {presetColors.map((color) => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => setNewCategoryColor(color)}
                        className="h-8 w-8 rounded-full border"
                        style={{ backgroundColor: color }}
                        aria-label={`选择颜色 ${color}`}
                      />
                    ))}
                  </div>
                  <Button size="sm" onClick={() => void handleAddCategory()} disabled={categorySubmitting}>
                    {categorySubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
              <Separator />
              <div className="space-y-4">
                {categories.map((category) => {
                  const edits = categoryEdits[category.id] ?? {
                    name: category.name,
                    colorHex: category.colorHex
                  }

                  return (
                    <Card key={category.id} className="border border-gray-200">
                      <CardContent className="py-4 grid gap-4 md:grid-cols-[1fr_auto] md:items-center">
                        <div className="space-y-3">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label>名称</Label>
                              <Input
                                value={edits.name}
                                onChange={(event) =>
                                  updateCategoryEdits(category.id, { name: event.target.value })
                                }
                                disabled={category.name === "未分类"}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>颜色</Label>
                              <div className="flex items-center gap-3">
                                <input
                                  type="color"
                                  value={edits.colorHex}
                                  onChange={(event) =>
                                    updateCategoryEdits(category.id, { colorHex: event.target.value })
                                  }
                                  className="h-10 w-14 rounded cursor-pointer border"
                                />
                                <div className="flex gap-2">
                                  {presetColors.map((color) => (
                                    <button
                                      key={color}
                                      type="button"
                                      onClick={() => updateCategoryEdits(category.id, { colorHex: color })}
                                      className={`h-8 w-8 rounded-full border ${
                                        edits.colorHex === color ? 'ring-2 ring-offset-1 ring-emerald-500' : ''
                                      }`}
                                      style={{ backgroundColor: color }}
                                      aria-label={`选择颜色 ${color}`}
                                    />
                                  ))}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-2 justify-end self-stretch md:self-center">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => void handleSaveCategory(category.id)}
                            disabled={categorySavingId === category.id}
                          >
                            {categorySavingId === category.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Edit2 className="h-4 w-4" />
                            )}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => void handleDeleteCategory(category.id, category.name)}
                            disabled={categoryDeletingId === category.id || category.name === "未分类"}
                          >
                            {categoryDeletingId === category.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            </div>
            <div className="px-6 py-4 border-t text-right">
              <Button variant="outline" onClick={() => setShowCategoryManager(false)} disabled={categoryBusy}>
                完成
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Expense Agent Panel */}
      <ExpenseAgentPanel onExpenseUpdated={loadExpenses} />
    </div>
  )
}
