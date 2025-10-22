"use client"

import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { DailyLifeLog } from '@/lib/daily-life-log-db'

interface CalendarViewProps {
  logs: DailyLifeLog[]
  currentMonth: Date
  onMonthChange: (date: Date) => void
  onDateClick: (date: string) => void
}

export default function CalendarView({
  logs,
  currentMonth,
  onMonthChange,
  onDateClick
}: CalendarViewProps) {

  // 创建日期→状态的映射
  const logStatusMap = new Map<string, 'completed' | 'draft'>()
  logs.forEach(log => {
    logStatusMap.set(log.date, log.status as 'completed' | 'draft')
  })

  // 获取当前月份信息
  const year = currentMonth.getFullYear()
  const month = currentMonth.getMonth() // 0-11

  // 获取当前月的第一天和最后一天
  const firstDayOfMonth = new Date(year, month, 1)
  const lastDayOfMonth = new Date(year, month + 1, 0)

  // 第一天是星期几 (0=周日, 1=周一, ..., 6=周六)
  const firstDayWeekday = firstDayOfMonth.getDay()

  // 当前月有多少天
  const daysInMonth = lastDayOfMonth.getDate()

  // 月份名称
  const monthNames = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月']

  // 切换到上个月
  const handlePrevMonth = () => {
    const newDate = new Date(year, month - 1, 1)
    onMonthChange(newDate)
  }

  // 切换到下个月
  const handleNextMonth = () => {
    const newDate = new Date(year, month + 1, 1)
    onMonthChange(newDate)
  }

  // 生成日历天数数组
  const calendarDays: (number | null)[] = []

  // 添加空白占位（第一天之前的空格）
  for (let i = 0; i < firstDayWeekday; i++) {
    calendarDays.push(null)
  }

  // 添加实际日期
  for (let day = 1; day <= daysInMonth; day++) {
    calendarDays.push(day)
  }

  // 获取日期的状态
  const getDateStatus = (day: number): 'completed' | 'draft' | 'empty' => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    return logStatusMap.get(dateStr) || 'empty'
  }

  // 处理日期点击
  const handleDayClick = (day: number) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    onDateClick(dateStr)
  }

  // 检查是否是今天
  const isToday = (day: number): boolean => {
    const today = new Date()
    return (
      day === today.getDate() &&
      month === today.getMonth() &&
      year === today.getFullYear()
    )
  }

  return (
    <div className="w-full">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={handlePrevMonth}
            className="rounded-full bg-gray-100 hover:bg-gray-200"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <div className="px-4 py-2 rounded-full bg-gray-900 text-white text-sm font-medium tracking-wide shadow-sm">
            {year}年 {monthNames[month]}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleNextMonth}
            className="rounded-full bg-gray-100 hover:bg-gray-200"
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-2 mb-3 text-sm font-medium text-gray-500">
        {['日', '一', '二', '三', '四', '五', '六'].map((day) => (
          <div
            key={day}
            className="text-center py-2 uppercase tracking-widest text-xs text-gray-500"
          >
            {day}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-2">
        {calendarDays.map((day, index) => {
          if (day === null) {
            return <div key={`empty-${index}`} className="aspect-square rounded-2xl bg-transparent" />
          }

          const status = getDateStatus(day)
          const today = isToday(day)

          const baseClasses =
            'aspect-square rounded-2xl flex flex-col items-center justify-center gap-2 transition-all border border-transparent shadow-sm'
          const statusClasses: Record<'completed' | 'draft' | 'empty', string> = {
            completed: 'bg-gradient-to-br from-[#ecfdf5] to-[#dcfce7] text-emerald-700 shadow-[0_6px_18px_rgba(16,185,129,0.15)]',
            draft: 'bg-gradient-to-br from-[#fef3c7] to-[#fde68a] text-amber-700 shadow-[0_6px_18px_rgba(251,191,36,0.18)]',
            empty: 'bg-white text-gray-600 hover:shadow-[0_12px_32px_rgba(15,23,42,0.08)]'
          }

          const todayClasses = today
            ? 'ring-2 ring-offset-2 ring-[#7c3aed] ring-offset-white'
            : ''

          return (
            <button
              key={day}
              onClick={() => handleDayClick(day)}
              className={`${baseClasses} ${statusClasses[status]} ${todayClasses} hover:-translate-y-0.5`}
            >
              <span className="text-lg font-semibold">
                {day}
              </span>
              <div className="text-[11px] font-medium uppercase tracking-widest">
                {status === 'completed' && 'COMPLETED'}
                {status === 'draft' && 'DRAFT'}
                {status === 'empty' && (today ? 'TODAY' : '---')}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
