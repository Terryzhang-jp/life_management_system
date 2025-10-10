"use client"

import { useState, useCallback, useEffect } from "react"
import { X, Loader2, Upload, Check, AlertCircle, Edit2, Trash2, Scan } from "lucide-react"
import Image from "next/image"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { useToast } from "@/hooks/use-toast"

interface ExpenseCategory {
  id: number
  name: string
  colorHex: string
}

interface ParsedExpense {
  imageFile: File
  imagePreview: string
  geminiParsed: {
    date: string
    title: string
    amount: number
    currency: string
    suggestedCategory: string
  } | null
  userConfirmed: {
    date: string
    title: string
    amount: number
    currency: string
    categoryId: number | null
    note: string
  }
  status: 'pending' | 'processing' | 'done' | 'failed' | 'confirmed'
}

interface SmartReceiptUploadProps {
  categories: ExpenseCategory[]
  onComplete: () => void
  onCancel: () => void
}

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

const getLocalDate = () => {
  const now = new Date()
  return now.toLocaleDateString('sv-SE')
}

export default function SmartReceiptUpload({ categories, onComplete, onCancel }: SmartReceiptUploadProps) {
  const { toast } = useToast()
  const [parsedExpenses, setParsedExpenses] = useState<ParsedExpense[]>([])
  const [processing, setProcessing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editingIndex, setEditingIndex] = useState<number | null>(null)

  const confirmedCount = parsedExpenses.filter(item => item.status === 'confirmed').length
  const totalCount = parsedExpenses.length

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (!files || files.length === 0) return

    const fileArray = Array.from(files)
    setProcessing(true)

    // 初始化所有图片项
    const initialItems: ParsedExpense[] = fileArray.map(file => ({
      imageFile: file,
      imagePreview: URL.createObjectURL(file),
      geminiParsed: null,
      userConfirmed: {
        date: getLocalDate(),
        title: '',
        amount: 0,
        currency: 'CNY',
        categoryId: null,
        note: ''
      },
      status: 'pending'
    }))

    setParsedExpenses(initialItems)

    // 串行处理每张图片
    for (let i = 0; i < fileArray.length; i++) {
      const file = fileArray[i]

      // 更新状态为处理中
      setParsedExpenses(prev => {
        const updated = [...prev]
        updated[i] = { ...updated[i], status: 'processing' }
        return updated
      })

      try {
        // 使用Gemini Vision API直接识别图片
        const formData = new FormData()
        formData.append('image', file)
        formData.append('categories', JSON.stringify(categories.map(c => c.name)))

        const response = await fetch('/api/expenses/parse-receipt', {
          method: 'POST',
          body: formData
        })

        const result = await response.json()

        if (!result.success) {
          setParsedExpenses(prev => {
            const updated = [...prev]
            updated[i] = { ...updated[i], status: 'failed' }
            return updated
          })
          toast({
            title: `图片 ${i + 1} 识别失败`,
            description: result.error || 'AI识别票据失败，请手动输入',
            variant: 'destructive'
          })
          continue
        }

        // 解析成功，填充数据
        const parsed = result.data
        const suggestedCat = categories.find(c => c.name === parsed.suggestedCategory)

        setParsedExpenses(prev => {
          const updated = [...prev]
          updated[i] = {
            ...updated[i],
            geminiParsed: parsed,
            userConfirmed: {
              date: parsed.date || getLocalDate(),
              title: parsed.title || '',
              amount: parsed.amount || 0,
              currency: parsed.currency || 'CNY',
              categoryId: suggestedCat?.id || null,
              note: ''
            },
            status: 'done'
          }
          return updated
        })

      } catch (error) {
        console.error(`处理图片 ${i + 1} 失败:`, error)
        setParsedExpenses(prev => {
          const updated = [...prev]
          updated[i] = { ...updated[i], status: 'failed' }
          return updated
        })
      }
    }

    setProcessing(false)
    toast({
      title: '处理完成',
      description: `成功处理 ${fileArray.length} 张图片，请确认信息后保存`
    })
  }

  const handleConfirm = (index: number) => {
    setParsedExpenses(prev => {
      const updated = [...prev]
      updated[index] = { ...updated[index], status: 'confirmed' }
      return updated
    })
    setEditingIndex(null)
  }

  const handleDelete = (index: number) => {
    setParsedExpenses(prev => prev.filter((_, i) => i !== index))
  }

  const handleBatchSave = async () => {
    const confirmedItems = parsedExpenses.filter(item => item.status === 'confirmed')

    if (confirmedItems.length === 0) {
      toast({
        title: '无可保存记录',
        description: '请至少确认一条记录后再保存',
        variant: 'destructive'
      })
      return
    }

    setSaving(true)
    let successCount = 0

    for (const item of confirmedItems) {
      try {
        const formData = new FormData()
        formData.append('title', item.userConfirmed.title)
        formData.append('occurredAt', `${item.userConfirmed.date}T12:00`)
        formData.append('amount', String(item.userConfirmed.amount))
        formData.append('currency', item.userConfirmed.currency)
        if (item.userConfirmed.categoryId) {
          formData.append('categoryId', String(item.userConfirmed.categoryId))
        }
        if (item.userConfirmed.note) {
          formData.append('note', item.userConfirmed.note)
        }
        formData.append('receipts', item.imageFile)

        const response = await fetch('/api/expenses', {
          method: 'POST',
          body: formData
        })

        if (response.ok) {
          successCount++
        }
      } catch (error) {
        console.error('保存失败', error)
      }
    }

    setSaving(false)
    toast({
      title: `成功保存 ${successCount} 条记录`,
      description: `${confirmedItems.length - successCount} 条失败`
    })

    if (successCount > 0) {
      onComplete()
    }
  }

  const updateUserConfirmed = (index: number, updates: Partial<ParsedExpense['userConfirmed']>) => {
    setParsedExpenses(prev => {
      const updated = [...prev]
      updated[index] = {
        ...updated[index],
        userConfirmed: {
          ...updated[index].userConfirmed,
          ...updates
        }
      }
      return updated
    })
  }

  const getStatusDisplay = (item: ParsedExpense) => {
    switch (item.status) {
      case 'pending':
        return { icon: <Loader2 className="h-4 w-4 animate-spin" />, text: '等待处理', color: 'text-gray-500' }
      case 'processing':
        return { icon: <Loader2 className="h-4 w-4 animate-spin" />, text: 'AI识别中...', color: 'text-blue-600' }
      case 'done':
        return { icon: <AlertCircle className="h-4 w-4" />, text: '待确认', color: 'text-orange-600' }
      case 'failed':
        return { icon: <AlertCircle className="h-4 w-4" />, text: '识别失败', color: 'text-red-600' }
      case 'confirmed':
        return { icon: <Check className="h-4 w-4" />, text: '已确认', color: 'text-green-600' }
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-lg w-full max-w-4xl shadow-lg my-8">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Scan className="h-5 w-5" />
            智能票据录入
          </h2>
          <Button variant="ghost" size="sm" onClick={onCancel} disabled={processing || saving}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="px-6 py-5 space-y-4">
          {parsedExpenses.length === 0 ? (
            <div className="space-y-4">
              <Label htmlFor="receipt-files" className="block text-center">
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 hover:border-emerald-500 cursor-pointer transition-colors">
                  <Upload className="h-12 w-12 mx-auto text-gray-400" />
                  <p className="mt-2 text-sm text-gray-600">点击选择票据图片（可多选）</p>
                  <p className="mt-1 text-xs text-gray-500">支持JPG、PNG等图片格式</p>
                </div>
              </Label>
              <input
                id="receipt-files"
                type="file"
                accept="image/*"
                multiple
                onChange={handleFileSelect}
                className="hidden"
              />
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="text-sm text-gray-600">
                  总进度：<span className="font-semibold">{confirmedCount}/{totalCount}</span> 已确认
                </div>
                <Progress value={(confirmedCount / totalCount) * 100} className="w-48" />
              </div>

              <div className="space-y-4 max-h-[60vh] overflow-y-auto">
                {parsedExpenses.map((item, index) => {
                  const statusDisplay = getStatusDisplay(item)
                  const isEditing = editingIndex === index

                  return (
                    <Card key={index} className="border border-gray-200 p-4">
                      <div className="flex gap-4">
                        <div className="relative w-32 h-32 flex-shrink-0 rounded border border-gray-200 overflow-hidden">
                          <Image
                            src={item.imagePreview}
                            alt={`票据 ${index + 1}`}
                            fill
                            className="object-cover"
                            unoptimized
                          />
                        </div>

                        <div className="flex-1 space-y-3">
                          <div className="flex items-center justify-between">
                            <div className={`flex items-center gap-2 text-sm font-medium ${statusDisplay.color}`}>
                              {statusDisplay.icon}
                              {statusDisplay.text}
                            </div>
                            <div className="flex gap-2">
                              {(item.status === 'done' || item.status === 'confirmed') && !isEditing && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setEditingIndex(index)}
                                >
                                  <Edit2 className="h-3 w-3 mr-1" />
                                  编辑
                                </Button>
                              )}
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleDelete(index)}
                                disabled={processing}
                              >
                                <Trash2 className="h-3 w-3 mr-1" />
                                删除
                              </Button>
                            </div>
                          </div>

                          {(item.status === 'done' || item.status === 'confirmed' || item.status === 'failed') && (
                            <div className="space-y-2">
                              {isEditing ? (
                                <>
                                  <div className="grid grid-cols-2 gap-2">
                                    <div>
                                      <Label className="text-xs">日期</Label>
                                      <Input
                                        type="date"
                                        value={item.userConfirmed.date}
                                        onChange={(e) => updateUserConfirmed(index, { date: e.target.value })}
                                        className="text-sm"
                                      />
                                    </div>
                                    <div>
                                      <Label className="text-xs">标题</Label>
                                      <Input
                                        value={item.userConfirmed.title}
                                        onChange={(e) => updateUserConfirmed(index, { title: e.target.value })}
                                        className="text-sm"
                                      />
                                    </div>
                                  </div>
                                  <div className="grid grid-cols-3 gap-2">
                                    <div>
                                      <Label className="text-xs">金额</Label>
                                      <Input
                                        type="number"
                                        value={item.userConfirmed.amount}
                                        onChange={(e) => updateUserConfirmed(index, { amount: Number(e.target.value) })}
                                        className="text-sm"
                                      />
                                    </div>
                                    <div>
                                      <Label className="text-xs">货币</Label>
                                      <select
                                        value={item.userConfirmed.currency}
                                        onChange={(e) => updateUserConfirmed(index, { currency: e.target.value })}
                                        className="w-full px-2 py-1 border rounded-md text-sm"
                                      >
                                        {currencyOptions.map((option) => (
                                          <option key={option.code} value={option.code}>
                                            {option.code}
                                          </option>
                                        ))}
                                      </select>
                                    </div>
                                    <div>
                                      <Label className="text-xs">分类</Label>
                                      <select
                                        value={item.userConfirmed.categoryId || 'none'}
                                        onChange={(e) => {
                                          const value = e.target.value
                                          updateUserConfirmed(index, {
                                            categoryId: value === 'none' ? null : Number(value)
                                          })
                                        }}
                                        className="w-full px-2 py-1 border rounded-md text-sm"
                                      >
                                        <option value="none">未选择</option>
                                        {categories.map((cat) => (
                                          <option key={cat.id} value={cat.id}>
                                            {cat.name}
                                          </option>
                                        ))}
                                      </select>
                                    </div>
                                  </div>
                                  <div>
                                    <Label className="text-xs">备注</Label>
                                    <Textarea
                                      value={item.userConfirmed.note}
                                      onChange={(e) => updateUserConfirmed(index, { note: e.target.value })}
                                      className="text-sm min-h-[60px]"
                                      placeholder="记录一些细节..."
                                    />
                                  </div>
                                  <div className="flex gap-2">
                                    <Button
                                      size="sm"
                                      onClick={() => handleConfirm(index)}
                                    >
                                      确认
                                    </Button>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => setEditingIndex(null)}
                                    >
                                      取消
                                    </Button>
                                  </div>
                                </>
                              ) : (
                                <>
                                  <div className="text-sm grid grid-cols-2 gap-2">
                                    <div>
                                      <span className="text-gray-500">日期：</span>
                                      <span className="font-medium">{item.userConfirmed.date}</span>
                                    </div>
                                    <div>
                                      <span className="text-gray-500">标题：</span>
                                      <span className="font-medium">{item.userConfirmed.title}</span>
                                    </div>
                                    <div>
                                      <span className="text-gray-500">金额：</span>
                                      <span className="font-medium">{item.userConfirmed.amount} {item.userConfirmed.currency}</span>
                                    </div>
                                    <div>
                                      <span className="text-gray-500">分类：</span>
                                      <span className="font-medium">
                                        {categories.find(c => c.id === item.userConfirmed.categoryId)?.name || '未选择'}
                                      </span>
                                    </div>
                                  </div>
                                  {item.status === 'done' && (
                                    <Button
                                      size="sm"
                                      className="w-full"
                                      onClick={() => handleConfirm(index)}
                                    >
                                      确认信息无误
                                    </Button>
                                  )}
                                </>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </Card>
                  )
                })}
              </div>
            </>
          )}
        </div>

        {parsedExpenses.length > 0 && (
          <div className="px-6 py-4 border-t flex justify-between">
            <Button
              variant="outline"
              onClick={onCancel}
              disabled={processing || saving}
            >
              取消
            </Button>
            <Button
              onClick={handleBatchSave}
              disabled={processing || saving || confirmedCount === 0}
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  保存中...
                </>
              ) : (
                `批量保存 (${confirmedCount}条)`
              )}
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
