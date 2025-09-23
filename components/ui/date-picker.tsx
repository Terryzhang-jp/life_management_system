"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { X } from "lucide-react"
import { cn } from "@/lib/utils"

interface DatePickerProps {
  value?: string
  onChange: (date: string | undefined) => void
  placeholder?: string
  className?: string
}

export function DatePicker({ value, onChange, placeholder = "选择日期", className }: DatePickerProps) {
  const formatDisplayDate = (dateString?: string) => {
    if (!dateString) return ""
    const date = new Date(dateString)
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    })
  }

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newDate = e.target.value || undefined
    onChange(newDate)
  }

  const handleClear = () => {
    onChange(undefined)
  }

  return (
    <div className={cn("flex items-center space-x-2", className)}>
      <Input
        type="date"
        value={value || ""}
        onChange={handleDateChange}
        className="flex-1"
        placeholder={placeholder}
      />
      {value && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleClear}
          className="h-8 w-8 p-0"
          title="清除日期"
        >
          <X className="h-3 w-3" />
        </Button>
      )}
    </div>
  )
}

// 用于显示日期的只读组件
export function DateDisplay({ date, className }: { date?: string; className?: string }) {
  if (!date) return null

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const today = new Date()
    const diffTime = date.getTime() - today.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    const formattedDate = date.toLocaleDateString('zh-CN', {
      month: '2-digit',
      day: '2-digit'
    })

    if (diffDays < 0) {
      return `${formattedDate} (已过期)`
    } else if (diffDays === 0) {
      return `${formattedDate} (今天)`
    } else if (diffDays === 1) {
      return `${formattedDate} (明天)`
    } else if (diffDays <= 7) {
      return `${formattedDate} (${diffDays}天后)`
    } else {
      return formattedDate
    }
  }

  return (
    <span className={cn("text-xs text-gray-500", className)}>
      📅 {formatDate(date)}
    </span>
  )
}