"use client"

import { DailyLifeLog } from '@/lib/daily-life-log-db'
import { Button } from '@/components/ui/button'
import { Clock, Sun, CloudSun, Moon, Utensils, Heart, Lightbulb, HelpCircle, Brain } from 'lucide-react'

interface LogDisplayProps {
  log: DailyLifeLog
  onClose: () => void
  onEdit?: () => void
}

export default function LogDisplay({ log, onClose, onEdit }: LogDisplayProps) {
  // 格式化时间显示
  const formatTime = (time: string | null) => {
    if (!time) return '未记录'
    return time
  }

  // 判断是否有内容
  const hasContent = (content: string | null | undefined) => {
    return content && content.trim().length > 0
  }

  return (
    <div className="space-y-6">
      {/* 头部状态 */}
      <div className={`p-4 rounded-lg ${
        log.status === 'completed'
          ? 'bg-green-50 border border-green-200'
          : 'bg-yellow-50 border border-yellow-200'
      }`}>
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-medium text-gray-900">
              {log.status === 'completed' ? '✓ 记录完成' : '📝 草稿状态'}
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              日期：{log.date}
            </p>
          </div>
          {onEdit && (
            <Button variant="outline" size="sm" onClick={onEdit}>
              编辑
            </Button>
          )}
        </div>
      </div>

      {/* 作息时间 */}
      <div className="p-4 bg-blue-50 rounded-lg">
        <div className="flex items-center gap-2 mb-3">
          <Clock className="w-5 h-5 text-blue-600" />
          <h4 className="font-medium text-blue-900">作息时间</h4>
        </div>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-600">起床时间：</span>
            <span className="font-medium text-gray-900">{formatTime(log.wakeTime)}</span>
          </div>
          <div>
            <span className="text-gray-600">计划睡觉：</span>
            <span className="font-medium text-gray-900">{formatTime(log.plannedSleepTime)}</span>
          </div>
        </div>
      </div>

      {/* 三餐记录 */}
      {(hasContent(log.breakfastDescription) || hasContent(log.lunchDescription) || hasContent(log.dinnerDescription)) && (
        <div className="p-4 bg-orange-50 rounded-lg">
          <div className="flex items-center gap-2 mb-3">
            <Utensils className="w-5 h-5 text-orange-600" />
            <h4 className="font-medium text-orange-900">三餐记录</h4>
          </div>
          <div className="space-y-2 text-sm">
            {hasContent(log.breakfastDescription) && (
              <div>
                <span className="text-gray-600">🌅 早餐：</span>
                <span className="text-gray-900">{log.breakfastDescription}</span>
              </div>
            )}
            {hasContent(log.lunchDescription) && (
              <div>
                <span className="text-gray-600">☀️ 午餐：</span>
                <span className="text-gray-900">{log.lunchDescription}</span>
              </div>
            )}
            {hasContent(log.dinnerDescription) && (
              <div>
                <span className="text-gray-600">🌆 晚餐：</span>
                <span className="text-gray-900">{log.dinnerDescription}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 时段活动 */}
      <div className="space-y-3">
        <h4 className="font-medium text-gray-900 flex items-center gap-2">
          <Heart className="w-5 h-5 text-gray-600" />
          时段活动与心情
        </h4>

        {/* 上午 */}
        {(hasContent(log.morningActivity) || hasContent(log.morningMood)) && (
          <div className="p-4 bg-gradient-to-r from-yellow-50 to-amber-50 rounded-lg border border-yellow-100">
            <div className="flex items-start gap-3">
              <Sun className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1 space-y-1">
                <h5 className="font-medium text-gray-900">上午</h5>
                {hasContent(log.morningActivity) && (
                  <p className="text-sm text-gray-700">{log.morningActivity}</p>
                )}
                {hasContent(log.morningMood) && (
                  <p className="text-xs text-gray-600">心情：{log.morningMood}</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* 下午 */}
        {(hasContent(log.afternoonActivity) || hasContent(log.afternoonMood)) && (
          <div className="p-4 bg-gradient-to-r from-orange-50 to-amber-50 rounded-lg border border-orange-100">
            <div className="flex items-start gap-3">
              <CloudSun className="w-5 h-5 text-orange-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1 space-y-1">
                <h5 className="font-medium text-gray-900">下午</h5>
                {hasContent(log.afternoonActivity) && (
                  <p className="text-sm text-gray-700">{log.afternoonActivity}</p>
                )}
                {hasContent(log.afternoonMood) && (
                  <p className="text-xs text-gray-600">心情：{log.afternoonMood}</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* 晚上 */}
        {(hasContent(log.eveningActivity) || hasContent(log.eveningMood)) && (
          <div className="p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg border border-purple-100">
            <div className="flex items-start gap-3">
              <Moon className="w-5 h-5 text-purple-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1 space-y-1">
                <h5 className="font-medium text-gray-900">晚上</h5>
                {hasContent(log.eveningActivity) && (
                  <p className="text-sm text-gray-700">{log.eveningActivity}</p>
                )}
                {hasContent(log.eveningMood) && (
                  <p className="text-xs text-gray-600">心情：{log.eveningMood}</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* 深夜 */}
        {(hasContent(log.nightActivity) || hasContent(log.nightMood)) && (
          <div className="p-4 bg-gradient-to-r from-indigo-50 to-blue-50 rounded-lg border border-indigo-100">
            <div className="flex items-start gap-3">
              <Moon className="w-5 h-5 text-indigo-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1 space-y-1">
                <h5 className="font-medium text-gray-900">深夜</h5>
                {hasContent(log.nightActivity) && (
                  <p className="text-sm text-gray-700">{log.nightActivity}</p>
                )}
                {hasContent(log.nightMood) && (
                  <p className="text-xs text-gray-600">心情：{log.nightMood}</p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 思考记录 */}
      {(hasContent(log.confusions) || hasContent(log.thoughts) || hasContent(log.insights)) && (
        <div className="space-y-3">
          <h4 className="font-medium text-gray-900 flex items-center gap-2">
            <Brain className="w-5 h-5 text-gray-600" />
            思考记录
          </h4>

          {hasContent(log.confusions) && (
            <div className="p-4 bg-red-50 rounded-lg border border-red-100">
              <div className="flex items-start gap-3">
                <HelpCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <h5 className="font-medium text-red-900 mb-1">困惑</h5>
                  <p className="text-sm text-gray-700">{log.confusions}</p>
                </div>
              </div>
            </div>
          )}

          {hasContent(log.thoughts) && (
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-100">
              <div className="flex items-start gap-3">
                <Brain className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <h5 className="font-medium text-blue-900 mb-1">想法</h5>
                  <p className="text-sm text-gray-700">{log.thoughts}</p>
                </div>
              </div>
            </div>
          )}

          {hasContent(log.insights) && (
            <div className="p-4 bg-green-50 rounded-lg border border-green-100">
              <div className="flex items-start gap-3">
                <Lightbulb className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <h5 className="font-medium text-green-900 mb-1">启发</h5>
                  <p className="text-sm text-gray-700">{log.insights}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 关闭按钮 */}
      <Button onClick={onClose} className="w-full" size="lg">
        关闭
      </Button>
    </div>
  )
}
