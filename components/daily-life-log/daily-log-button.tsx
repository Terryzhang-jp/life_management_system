"use client"

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Mic, CheckCircle2 } from 'lucide-react'
import DailyLogDialog from './daily-log-dialog'

export default function DailyLogButton() {
  const [isCompleted, setIsCompleted] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(true)

  // 获取今天的日期（YYYY-MM-DD）
  const getTodayDate = () => {
    const today = new Date()
    return today.toISOString().split('T')[0]
  }

  // 检查今日是否已完成记录
  const checkTodayLog = async () => {
    try {
      setLoading(true)
      const date = getTodayDate()
      const response = await fetch(`/api/daily-life-log?date=${date}`)

      if (response.ok) {
        const data = await response.json()
        if (data.exists && data.log) {
          setIsCompleted(data.log.status === 'completed')
        } else {
          setIsCompleted(false)
        }
      }
    } catch (error) {
      console.error('Error checking today log:', error)
    } finally {
      setLoading(false)
    }
  }

  // 组件挂载时检查
  useEffect(() => {
    checkTodayLog()
  }, [])

  // 对话框关闭后刷新状态
  const handleDialogClose = () => {
    setIsOpen(false)
    checkTodayLog()
  }

  if (loading) {
    return null
  }

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsOpen(true)}
        className={`
          border border-gray-300 hover:border-gray-900 transition-all
          ${isCompleted
            ? 'bg-green-600 text-white hover:bg-green-700 border-green-600'
            : 'bg-white text-gray-900 hover:bg-gray-50'
          }
        `}
      >
        {isCompleted ? (
          <>
            <CheckCircle2 className="w-4 h-4 mr-2" />
            今日生活记录
          </>
        ) : (
          <>
            <Mic className="w-4 h-4 mr-2" />
            今日生活记录
          </>
        )}
      </Button>

      <DailyLogDialog
        isOpen={isOpen}
        onClose={handleDialogClose}
        date={getTodayDate()}
      />
    </>
  )
}
