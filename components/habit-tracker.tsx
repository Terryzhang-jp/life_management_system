"use client"

import { useState } from "react"
import { HabitHeatmap } from "./habit-heatmap"
import { HabitRecordForm } from "./habit-record-form"
import { Button } from "@/components/ui/button"
import { Plus, X } from "lucide-react"

interface HabitTrackerProps {
  className?: string
}

export function HabitTracker({ className }: HabitTrackerProps) {
  const [refreshKey, setRefreshKey] = useState(0)
  const [showForm, setShowForm] = useState(false)

  // 当新记录添加时刷新数据
  const handleRecordAdded = () => {
    setRefreshKey(prev => prev + 1) // 触发热力图刷新
    setShowForm(false) // 关闭弹框
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* 热力图 */}
      <div className="relative">
        <HabitHeatmap key={refreshKey} />

        {/* 添加打卡按钮 - 放在热力图右上角 */}
        <div className="absolute top-4 right-4">
          <Button
            onClick={() => setShowForm(true)}
            size="sm"
            variant="outline"
            className="flex items-center gap-1 text-xs"
          >
            <Plus className="h-3 w-3" />
            打卡
          </Button>
        </div>
      </div>

      {/* 弹框表单 */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4 relative">
            {/* 关闭按钮 */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowForm(false)}
              className="absolute top-2 right-2 h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
            </Button>

            {/* 表单标题 */}
            <h3 className="text-lg font-semibold mb-4">提交打卡记录</h3>

            {/* 表单内容 */}
            <HabitRecordForm
              onRecordAdded={handleRecordAdded}
              className="border-0 shadow-none p-0"
            />
          </div>
        </div>
      )}
    </div>
  )
}