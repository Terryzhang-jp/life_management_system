"use client"

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { FileText, CheckCircle2 } from 'lucide-react'
import DailyReviewDialog from './daily-review-dialog'

export default function DailyReviewButton() {
  const [isCompleted, setIsCompleted] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(true)

  // 获取今天的日期（YYYY-MM-DD）
  const getTodayDate = () => {
    const today = new Date()
    return today.toISOString().split('T')[0]
  }

  // 检查今日是否已完成回顾
  const checkTodayReview = async () => {
    try {
      setLoading(true)
      const date = getTodayDate()
      const response = await fetch(`/api/daily-review?date=${date}`)

      if (response.ok) {
        const data = await response.json()
        if (data.exists && data.review) {
          setIsCompleted(data.review.status === 'completed')
        } else {
          setIsCompleted(false)
        }
      }
    } catch (error) {
      console.error('Error checking today review:', error)
    } finally {
      setLoading(false)
    }
  }

  // 组件挂载时检查
  useEffect(() => {
    checkTodayReview()
  }, [])

  // 对话框关闭后刷新状态
  const handleDialogClose = () => {
    setIsOpen(false)
    checkTodayReview()
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
            ? 'bg-gray-900 text-white hover:bg-gray-800'
            : 'bg-white text-gray-900 hover:bg-gray-50'
          }
        `}
      >
        {isCompleted ? (
          <>
            <CheckCircle2 className="w-4 h-4 mr-2" />
            今日回顾
          </>
        ) : (
          <>
            <FileText className="w-4 h-4 mr-2" />
            今日回顾
          </>
        )}
      </Button>

      <DailyReviewDialog
        isOpen={isOpen}
        onClose={handleDialogClose}
        date={getTodayDate()}
      />
    </>
  )
}