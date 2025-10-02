"use client"

import { useState, useEffect } from 'react'

interface MonthStatus {
  [date: string]: {
    hasSchedule: boolean
    hasReview: boolean
  }
}

export default function MinimalCalendar() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [monthStatus, setMonthStatus] = useState<MonthStatus>({})

  // 更新当前日期（每分钟检查一次，防止跨天问题）
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentDate(new Date())
    }, 60000) // 每分钟更新一次

    return () => clearInterval(timer)
  }, [])

  // 获取月度状态数据
  useEffect(() => {
    const fetchMonthStatus = async () => {
      const year = currentDate.getFullYear()
      const month = currentDate.getMonth() + 1 // getMonth() 返回 0-11

      try {
        const response = await fetch(`/api/calendar/month-status?year=${year}&month=${month}`)
        if (response.ok) {
          const data = await response.json()
          setMonthStatus(data)
        }
      } catch (error) {
        console.error('Failed to fetch month status:', error)
      }
    }

    fetchMonthStatus()
  }, [currentDate.getFullYear(), currentDate.getMonth()])

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()
  const today = currentDate.getDate()

  // 获取月份第一天和最后一天
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)

  // 获取第一天是星期几（0=周日，1=周一...）
  const firstDayOfWeek = firstDay.getDay()
  // 获取这个月有多少天
  const daysInMonth = lastDay.getDate()

  // 生成日历数组
  const calendarDays: (number | null)[] = []

  // 前面填充空白（从周一开始，所以周日是6）
  const startPadding = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1
  for (let i = 0; i < startPadding; i++) {
    calendarDays.push(null)
  }

  // 填充实际日期
  for (let day = 1; day <= daysInMonth; day++) {
    calendarDays.push(day)
  }

  // 月份名称
  const monthNames = ['一月', '二月', '三月', '四月', '五月', '六月',
                      '七月', '八月', '九月', '十月', '十一月', '十二月']

  return (
    <div className="h-full bg-white border border-gray-200 flex flex-col">
      {/* 月份标题 */}
      <div className="border-b border-gray-200 py-4 px-4">
        <h3 className="text-center text-xl font-light tracking-wide text-gray-900">
          {year}年 {monthNames[month]}
        </h3>
      </div>

      {/* 日历主体 */}
      <div className="flex-1 p-4 flex flex-col">
        {/* 星期标题 */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {['一', '二', '三', '四', '五', '六', '日'].map((day, index) => (
            <div
              key={index}
              className="text-center text-xs uppercase tracking-wider text-gray-400 py-2 font-light"
            >
              {day}
            </div>
          ))}
        </div>

        {/* 日期网格 */}
        <div className="grid grid-cols-7 gap-1 flex-1">
          {calendarDays.map((day, index) => {
            const isToday = day === today
            const isEmpty = day === null

            // 获取这一天的状态
            let dateStatus = { hasSchedule: false, hasReview: false }
            if (day) {
              const dateStr = `${year}-${(month + 1).toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`
              dateStatus = monthStatus[dateStr] || dateStatus
            }

            return (
              <div
                key={index}
                className={`
                  flex flex-col items-center justify-center aspect-square relative
                  ${isEmpty ? '' : 'cursor-pointer'}
                  ${isToday
                    ? 'bg-gray-900 text-white'
                    : isEmpty
                    ? ''
                    : 'hover:bg-gray-100 transition-colors'
                  }
                `}
              >
                {day && (
                  <>
                    <span className={`
                      text-sm font-light
                      ${isToday ? 'font-normal' : 'text-gray-700'}
                    `}>
                      {day}
                    </span>

                    {/* 红点和黄点 */}
                    {(dateStatus.hasSchedule || dateStatus.hasReview) && (
                      <div className="flex gap-0.5 mt-0.5">
                        {/* 红点：有日程计划 */}
                        {dateStatus.hasSchedule && (
                          <div
                            className="w-1.5 h-1.5 rounded-full bg-red-500"
                            title="有日程安排"
                          />
                        )}
                        {/* 黄点：已完成回顾 */}
                        {dateStatus.hasReview && (
                          <div
                            className="w-1.5 h-1.5 rounded-full bg-yellow-500"
                            title="已完成回顾"
                          />
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}