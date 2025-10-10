"use client"

import { useMemo, useState, useEffect } from "react"
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid } from 'recharts'
import { TrendingUp, Calendar } from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"

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
}

interface ExpenseAnalyticsProps {
  expenses: ExpenseRecord[]
  categories: ExpenseCategory[]
}

type TimeRange = 'week' | 'month' | 'year' | 'custom'

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

export default function ExpenseAnalytics({ expenses, categories }: ExpenseAnalyticsProps) {
  const { toast } = useToast()
  const [timeRange, setTimeRange] = useState<TimeRange>('month')
  const [customStartDate, setCustomStartDate] = useState('')
  const [customEndDate, setCustomEndDate] = useState('')
  const [targetCurrency, setTargetCurrency] = useState<string>('none')
  const [exchangeRates, setExchangeRates] = useState<Map<string, number>>(new Map())

  // 计算时间范围
  const { startDate, endDate } = useMemo(() => {
    const now = new Date()
    let start: Date, end: Date = now

    switch (timeRange) {
      case 'week':
        start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        break
      case 'month':
        start = new Date(now.getFullYear(), now.getMonth(), 1)
        break
      case 'year':
        start = new Date(now.getFullYear(), 0, 1)
        break
      case 'custom':
        start = customStartDate ? new Date(customStartDate) : new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
        end = customEndDate ? new Date(customEndDate) : now
        break
      default:
        start = new Date(now.getFullYear(), now.getMonth(), 1)
    }

    return {
      startDate: start.toLocaleDateString('sv-SE'),
      endDate: end.toLocaleDateString('sv-SE')
    }
  }, [timeRange, customStartDate, customEndDate])

  // 过滤时间范围内的开销
  const filteredExpenses = useMemo(() => {
    return expenses.filter(expense => {
      const date = new Date(expense.occurredAt).toLocaleDateString('sv-SE')
      return date >= startDate && date <= endDate
    })
  }, [expenses, startDate, endDate])

  // 获取汇率
  useEffect(() => {
    if (targetCurrency === 'none' || filteredExpenses.length === 0) {
      setExchangeRates(new Map())
      return
    }

    const fetchRates = async () => {
      try {
        const uniqueCurrencies = Array.from(new Set(filteredExpenses.map(e => e.currency)))
        const pairs = uniqueCurrencies.filter(from => from !== targetCurrency)

        if (pairs.length === 0) {
          setExchangeRates(new Map())
          return
        }

        const ratesMap = new Map<string, number>()
        await Promise.all(
          pairs.map(async (from) => {
            try {
              const response = await fetch(`/api/exchange-rates?from=${from}&to=${targetCurrency}`)
              if (response.ok) {
                const data = await response.json()
                ratesMap.set(`${from}_${targetCurrency}`, data.rate)
              } else {
                ratesMap.set(`${from}_${targetCurrency}`, 1)
              }
            } catch (error) {
              console.error(`获取 ${from} → ${targetCurrency} 汇率出错:`, error)
              ratesMap.set(`${from}_${targetCurrency}`, 1)
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

  // 换算金额的辅助函数
  const convertAmount = (amount: number, fromCurrency: string): number => {
    if (targetCurrency === 'none' || fromCurrency === targetCurrency) {
      return amount
    }
    const rateKey = `${fromCurrency}_${targetCurrency}`
    const rate = exchangeRates.get(rateKey) || 1
    return amount * rate
  }

  // 计算类别占比数据（饼图）
  const categoryData = useMemo(() => {
    const aggregated: Record<string, number> = {}

    filteredExpenses.forEach(expense => {
      const categoryName = expense.category?.name || "未分类"
      const convertedAmount = convertAmount(expense.amount, expense.currency)
      aggregated[categoryName] = (aggregated[categoryName] || 0) + convertedAmount
    })

    return Object.entries(aggregated).map(([name, value]) => {
      const category = categories.find(c => c.name === name)
      return {
        name,
        value: Number(value.toFixed(2)),
        color: category?.colorHex || "#6b7280"
      }
    }).sort((a, b) => b.value - a.value)
  }, [filteredExpenses, categories, targetCurrency, exchangeRates])

  // 计算时间序列数据（折线图）
  const trendData = useMemo(() => {
    const grouped: Record<string, number> = {}

    filteredExpenses.forEach(expense => {
      const date = new Date(expense.occurredAt).toLocaleDateString('sv-SE')
      const convertedAmount = convertAmount(expense.amount, expense.currency)
      grouped[date] = (grouped[date] || 0) + convertedAmount
    })

    return Object.entries(grouped)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, amount]) => ({
        date: date.slice(5), // MM-DD
        amount: Number(amount.toFixed(2))
      }))
  }, [filteredExpenses, targetCurrency, exchangeRates])

  // 计算总金额
  const totalAmount = useMemo(() => {
    return filteredExpenses.reduce((sum, expense) => {
      return sum + convertAmount(expense.amount, expense.currency)
    }, 0)
  }, [filteredExpenses, targetCurrency, exchangeRates])

  // 检查是否为多币种
  const currencies = useMemo(() => {
    return Array.from(new Set(filteredExpenses.map(e => e.currency)))
  }, [filteredExpenses])

  const isMultiCurrency = currencies.length > 1
  const displayCurrency = targetCurrency !== 'none' ? targetCurrency : (currencies[0] || 'CNY')

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <TrendingUp className="h-6 w-6 text-emerald-600" />
          财务分析
        </h2>
      </div>

      <Card>
        <CardContent className="py-4">
          <div className="flex flex-wrap gap-4 items-end">
            <div className="flex items-center gap-2">
              <Label className="text-sm text-gray-600">时间范围</Label>
              <div className="flex gap-2">
                <Button
                  variant={timeRange === 'week' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setTimeRange('week')}
                >
                  本周
                </Button>
                <Button
                  variant={timeRange === 'month' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setTimeRange('month')}
                >
                  本月
                </Button>
                <Button
                  variant={timeRange === 'year' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setTimeRange('year')}
                >
                  本年
                </Button>
                <Button
                  variant={timeRange === 'custom' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setTimeRange('custom')}
                >
                  自定义
                </Button>
              </div>
            </div>

            {timeRange === 'custom' && (
              <div className="flex items-center gap-2">
                <Input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="w-40"
                />
                <span className="text-gray-500">-</span>
                <Input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="w-40"
                />
              </div>
            )}

            <div className="flex items-center gap-2">
              <Label className="text-sm text-gray-600">换算货币</Label>
              <select
                value={targetCurrency}
                onChange={(e) => setTargetCurrency(e.target.value)}
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

          <div className="mt-4 flex items-center justify-between">
            <div>
              <div className="text-sm text-gray-500">
                {startDate} 至 {endDate}，共 {filteredExpenses.length} 条记录
              </div>
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
            <div className="text-right">
              <div className="text-sm text-gray-500">总计</div>
              <div className="text-2xl font-bold text-gray-900">
                {formatCurrencyValue(totalAmount, displayCurrency)}
              </div>
              {isMultiCurrency && targetCurrency === 'none' && (
                <div className="text-xs text-gray-400 mt-1">
                  包含多种货币，合计仅供参考
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {filteredExpenses.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center text-gray-500">
            该时间范围内暂无开销记录
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">类别占比</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={categoryData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label
                  >
                    {categoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => `¥${value}`} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">开销趋势</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip formatter={(value) => `¥${value}`} />
                  <Line
                    type="monotone"
                    dataKey="amount"
                    stroke="#10b981"
                    strokeWidth={2}
                    dot={{ fill: '#10b981' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
