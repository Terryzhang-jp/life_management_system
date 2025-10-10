"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"

interface AnalogClockProps {
  wakeUpHour?: number  // 起床时间（24小时制）
  sleepHour?: number   // 睡觉时间（24小时制）
}

export default function AnalogClock({ wakeUpHour = 7, sleepHour = 23 }: AnalogClockProps) {
  const [time, setTime] = useState<Date | null>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    setTime(new Date())

    const timer = setInterval(() => {
      setTime(new Date())
    }, 1000)

    return () => clearInterval(timer)
  }, [])

  // 计算有效时间和进度
  const calculateDayProgress = (currentTime: Date) => {
    const hours = currentTime.getHours()
    const minutes = currentTime.getMinutes()
    const seconds = currentTime.getSeconds()

    // 当前时间转换为分钟
    const currentMinutes = hours * 60 + minutes + seconds / 60

    // 有效时间范围（起床到睡觉）
    const effectiveStartMinutes = wakeUpHour * 60
    const effectiveEndMinutes = sleepHour * 60
    const totalEffectiveMinutes = effectiveEndMinutes - effectiveStartMinutes

    // 如果当前时间在有效范围内
    if (currentMinutes >= effectiveStartMinutes && currentMinutes <= effectiveEndMinutes) {
      const elapsedMinutes = currentMinutes - effectiveStartMinutes
      const remainingMinutes = effectiveEndMinutes - currentMinutes
      const progress = (elapsedMinutes / totalEffectiveMinutes) * 100

      return {
        isActive: true,
        progress,
        remainingHours: Math.floor(remainingMinutes / 60),
        remainingMinutes: Math.floor(remainingMinutes % 60),
        totalHours: Math.floor(totalEffectiveMinutes / 60)
      }
    }

    // 如果不在有效时间内
    return {
      isActive: false,
      progress: 0,
      remainingHours: 0,
      remainingMinutes: 0,
      totalHours: Math.floor(totalEffectiveMinutes / 60)
    }
  }

  // 计算周进度
  const calculateWeekProgress = (currentTime: Date) => {
    // 获取当前是周几 (0=周日, 1=周一, ..., 6=周六)
    const dayOfWeek = currentTime.getDay()
    // 转换为周一开始 (0=周一, 1=周二, ..., 6=周日)
    const dayIndex = dayOfWeek === 0 ? 6 : dayOfWeek - 1

    // 当前时间在一天中的进度（0-1）
    const hours = currentTime.getHours()
    const minutes = currentTime.getMinutes()
    const seconds = currentTime.getSeconds()
    const dayProgress = (hours * 3600 + minutes * 60 + seconds) / 86400

    // 周进度：已完成的天数 + 当前天的进度
    const weekProgress = ((dayIndex + dayProgress) / 7) * 100

    // 计算剩余时间
    const totalSecondsInWeek = 7 * 24 * 3600
    const elapsedSeconds = dayIndex * 24 * 3600 + hours * 3600 + minutes * 60 + seconds
    const remainingSeconds = totalSecondsInWeek - elapsedSeconds
    const remainingDays = Math.floor(remainingSeconds / 86400)
    const remainingHours = Math.floor((remainingSeconds % 86400) / 3600)

    // 获取周几的中文名称
    const weekDays = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']
    const currentDayName = weekDays[dayIndex]

    return {
      progress: weekProgress,
      currentDay: dayIndex + 1, // 1-7
      currentDayName,
      remainingDays,
      remainingHours
    }
  }

  const renderClock = () => {
    if (!time) return null

    const hours = time.getHours()
    const minutes = time.getMinutes()
    const seconds = time.getSeconds()

    // 计算指针角度
    const secondAngle = (seconds / 60) * 360 - 90
    const minuteAngle = ((minutes + seconds / 60) / 60) * 360 - 90
    const hourAngle = ((hours % 12 + minutes / 60) / 12) * 360 - 90

    return (
      <svg width="200" height="200" viewBox="0 0 200 200">
        {/* 时钟外圈 */}
        <circle
          cx="100"
          cy="100"
          r="95"
          fill="white"
          stroke="#e5e7eb"
          strokeWidth="2"
        />

        {/* 时钟刻度 */}
        {[...Array(12)].map((_, i) => {
          const angle = (i * 30) - 90
          const x1 = 100 + 85 * Math.cos(angle * Math.PI / 180)
          const y1 = 100 + 85 * Math.sin(angle * Math.PI / 180)
          const x2 = 100 + 75 * Math.cos(angle * Math.PI / 180)
          const y2 = 100 + 75 * Math.sin(angle * Math.PI / 180)

          return (
            <line
              key={i}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke="#9ca3af"
              strokeWidth="2"
            />
          )
        })}

        {/* 数字 */}
        {[12, 3, 6, 9].map((num, i) => {
          const angles = [-90, 0, 90, 180]
          const x = 100 + 65 * Math.cos(angles[i] * Math.PI / 180)
          const y = 100 + 65 * Math.sin(angles[i] * Math.PI / 180) + 6

          return (
            <text
              key={num}
              x={x}
              y={y}
              textAnchor="middle"
              className="text-sm fill-gray-600 font-medium"
            >
              {num}
            </text>
          )
        })}

        {/* 时针 */}
        <line
          x1="100"
          y1="100"
          x2={100 + 45 * Math.cos(hourAngle * Math.PI / 180)}
          y2={100 + 45 * Math.sin(hourAngle * Math.PI / 180)}
          stroke="#1f2937"
          strokeWidth="4"
          strokeLinecap="round"
        />

        {/* 分针 */}
        <line
          x1="100"
          y1="100"
          x2={100 + 60 * Math.cos(minuteAngle * Math.PI / 180)}
          y2={100 + 60 * Math.sin(minuteAngle * Math.PI / 180)}
          stroke="#4b5563"
          strokeWidth="3"
          strokeLinecap="round"
        />

        {/* 秒针 */}
        <line
          x1="100"
          y1="100"
          x2={100 + 70 * Math.cos(secondAngle * Math.PI / 180)}
          y2={100 + 70 * Math.sin(secondAngle * Math.PI / 180)}
          stroke="#3b82f6"
          strokeWidth="1"
          strokeLinecap="round"
        />

        {/* 中心点 */}
        <circle
          cx="100"
          cy="100"
          r="4"
          fill="#3b82f6"
        />
      </svg>
    )
  }

  const dayProgress = time ? calculateDayProgress(time) : null
  const weekProgress = time ? calculateWeekProgress(time) : null

  return (
    <Card className="p-6 bg-gradient-to-br from-white to-gray-50">
      <div className="flex flex-col items-center space-y-6">
        {/* 模拟时钟 */}
        <div className="relative">
          {mounted ? renderClock() : (
            <div className="w-[200px] h-[200px] flex items-center justify-center">
              <span className="text-gray-400">加载中...</span>
            </div>
          )}
        </div>

        {/* 数字时间 */}
        <div className="text-3xl font-extralight tracking-wider text-gray-800">
          {mounted && time ? time.toLocaleTimeString('zh-CN') : '--:--:--'}
        </div>

        {/* 日期 */}
        <div className="text-xs text-gray-400 tracking-wide">
          {mounted && time ? time.toLocaleDateString('zh-CN', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            weekday: 'long'
          }) : ''}
        </div>

        {/* 分隔线 */}
        <div className="w-full border-t border-gray-100"></div>

        {/* 今日进度 */}
        {mounted && dayProgress && (
          <div className="w-full space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-gray-500">TODAY</span>
              {dayProgress.isActive ? (
                <span className="text-xs font-mono text-blue-500">
                  {dayProgress.remainingHours}h {dayProgress.remainingMinutes}m
                </span>
              ) : (
                <span className="text-xs text-gray-400">💤 休息中</span>
              )}
            </div>

            <div className="relative">
              <Progress
                value={dayProgress.progress}
                className="h-1.5 bg-gray-100"
              />
              <div className="flex justify-between mt-1.5 text-[10px] text-gray-400">
                <span>{wakeUpHour}:00</span>
                <span>{dayProgress.progress.toFixed(0)}%</span>
                <span>{sleepHour}:00</span>
              </div>
            </div>
          </div>
        )}

        {/* 本周进度 */}
        {mounted && weekProgress && (
          <div className="w-full space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-gray-500">THIS WEEK</span>
              <span className="text-xs font-mono text-purple-500">
                {weekProgress.remainingDays}d {weekProgress.remainingHours}h
              </span>
            </div>

            <div className="relative">
              <Progress
                value={weekProgress.progress}
                className="h-1.5 bg-gray-100"
              />
              <div className="flex justify-between mt-1.5 text-[10px] text-gray-400">
                <span>周一</span>
                <span className="font-medium text-purple-500">{weekProgress.currentDayName}</span>
                <span>{weekProgress.progress.toFixed(0)}%</span>
                <span>周日</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </Card>
  )
}