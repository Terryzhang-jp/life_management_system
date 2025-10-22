"use client"

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { AlertCircle, CheckCircle2 } from 'lucide-react'
import { DailyLifeLog, CompletenessCheck } from '@/lib/daily-life-log-db'

interface DataReviewProps {
  extractedData: Partial<DailyLifeLog>
  completeness: CompletenessCheck
  onConfirm: (data: Partial<DailyLifeLog>) => void
  onBack: () => void
  loading?: boolean
}

export default function DataReview({
  extractedData,
  completeness,
  onConfirm,
  onBack,
  loading = false
}: DataReviewProps) {
  // 可编辑的数据状态
  const [formData, setFormData] = useState<Partial<DailyLifeLog>>(extractedData)

  // 当 extractedData 更新时，同步到 formData
  useEffect(() => {
    setFormData(extractedData)
  }, [extractedData])

  const handleChange = (field: keyof DailyLifeLog, value: string | null) => {
    setFormData(prev => ({
      ...prev,
      [field]: value || null
    }))
  }

  const handleSubmit = () => {
    onConfirm(formData)
  }

  // 检查字段是否缺失
  const isMissing = (field: string) => {
    return completeness.missingFields.includes(field)
  }

  // 获取输入框样式
  const getInputClassName = (field: string) => {
    return isMissing(field)
      ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
      : ''
  }

  return (
    <div className="space-y-6">
      {/* 完整性状态 */}
      <div className={`p-4 rounded-lg border ${
        completeness.isComplete
          ? 'bg-green-50 border-green-200'
          : 'bg-orange-50 border-orange-200'
      }`}>
        <div className="flex items-start gap-3">
          {completeness.isComplete ? (
            <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-orange-600 mt-0.5 flex-shrink-0" />
          )}
          <div className="flex-1">
            <h3 className={`font-medium ${
              completeness.isComplete ? 'text-green-900' : 'text-orange-900'
            }`}>
              {completeness.isComplete ? '✓ 信息完整' : '⚠️ 缺少必填信息'}
            </h3>
            {!completeness.isComplete && (
              <ul className="mt-2 space-y-1 text-sm text-orange-800">
                {completeness.missingFields.map((field, index) => (
                  <li key={index}>• {field}</li>
                ))}
              </ul>
            )}
            {completeness.warnings.length > 0 && (
              <ul className="mt-2 space-y-1 text-sm text-gray-600">
                {completeness.warnings.map((warning, index) => (
                  <li key={index}>💡 {warning}</li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      {/* 表单区域 */}
      <div className="space-y-6">
        {/* 作息时间 */}
        <div className="space-y-4">
          <h4 className="font-medium text-gray-900 flex items-center gap-2">
            ⏰ 作息时间
            {(isMissing('起床时间') || isMissing('计划睡觉时间')) && (
              <span className="text-xs text-red-600">*必填</span>
            )}
          </h4>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="wakeTime">起床时间</Label>
              <Input
                id="wakeTime"
                type="time"
                value={formData.wakeTime || ''}
                onChange={(e) => handleChange('wakeTime', e.target.value)}
                className={getInputClassName('起床时间')}
              />
            </div>
            <div>
              <Label htmlFor="plannedSleepTime">计划睡觉时间</Label>
              <Input
                id="plannedSleepTime"
                type="time"
                value={formData.plannedSleepTime || ''}
                onChange={(e) => handleChange('plannedSleepTime', e.target.value)}
                className={getInputClassName('计划睡觉时间')}
              />
            </div>
          </div>
        </div>

        {/* 三餐 */}
        <div className="space-y-4">
          <h4 className="font-medium text-gray-900 flex items-center gap-2">
            🍽️ 三餐记录
            {isMissing('至少一顿饭的记录') && (
              <span className="text-xs text-red-600">*至少填一顿</span>
            )}
          </h4>
          <div className="space-y-3">
            <div>
              <Label htmlFor="breakfast">早餐</Label>
              <Input
                id="breakfast"
                value={formData.breakfastDescription || ''}
                onChange={(e) => handleChange('breakfastDescription', e.target.value)}
                placeholder="例如：燕麦粥和鸡蛋"
                className={getInputClassName('至少一顿饭的记录')}
              />
            </div>
            <div>
              <Label htmlFor="lunch">午餐</Label>
              <Input
                id="lunch"
                value={formData.lunchDescription || ''}
                onChange={(e) => handleChange('lunchDescription', e.target.value)}
                placeholder="例如：外卖的麻辣烫"
                className={getInputClassName('至少一顿饭的记录')}
              />
            </div>
            <div>
              <Label htmlFor="dinner">晚餐</Label>
              <Input
                id="dinner"
                value={formData.dinnerDescription || ''}
                onChange={(e) => handleChange('dinnerDescription', e.target.value)}
                placeholder="例如：自己做的番茄炒蛋"
                className={getInputClassName('至少一顿饭的记录')}
              />
            </div>
          </div>
        </div>

        {/* 时段活动 */}
        <div className="space-y-4">
          <h4 className="font-medium text-gray-900 flex items-center gap-2">
            📅 时段活动
            {isMissing('至少一个时段的活动') && (
              <span className="text-xs text-red-600">*至少填一个时段</span>
            )}
          </h4>

          {/* 上午 */}
          <div className="p-4 bg-gray-50 rounded-lg space-y-3">
            <h5 className="text-sm font-medium text-gray-700">🌅 上午</h5>
            <div>
              <Label htmlFor="morningActivity">活动</Label>
              <Textarea
                id="morningActivity"
                value={formData.morningActivity || ''}
                onChange={(e) => handleChange('morningActivity', e.target.value)}
                placeholder="上午做了什么？"
                className={`min-h-[60px] ${getInputClassName('至少一个时段的活动')}`}
              />
            </div>
            <div>
              <Label htmlFor="morningMood">心情</Label>
              <Input
                id="morningMood"
                value={formData.morningMood || ''}
                onChange={(e) => handleChange('morningMood', e.target.value)}
                placeholder="例如：8分，很专注"
              />
            </div>
          </div>

          {/* 下午 */}
          <div className="p-4 bg-gray-50 rounded-lg space-y-3">
            <h5 className="text-sm font-medium text-gray-700">☀️ 下午</h5>
            <div>
              <Label htmlFor="afternoonActivity">活动</Label>
              <Textarea
                id="afternoonActivity"
                value={formData.afternoonActivity || ''}
                onChange={(e) => handleChange('afternoonActivity', e.target.value)}
                placeholder="下午做了什么？"
                className={`min-h-[60px] ${getInputClassName('至少一个时段的活动')}`}
              />
            </div>
            <div>
              <Label htmlFor="afternoonMood">心情</Label>
              <Input
                id="afternoonMood"
                value={formData.afternoonMood || ''}
                onChange={(e) => handleChange('afternoonMood', e.target.value)}
                placeholder="例如：6分，有点疲惫"
              />
            </div>
          </div>

          {/* 晚上 */}
          <div className="p-4 bg-gray-50 rounded-lg space-y-3">
            <h5 className="text-sm font-medium text-gray-700">🌆 晚上</h5>
            <div>
              <Label htmlFor="eveningActivity">活动</Label>
              <Textarea
                id="eveningActivity"
                value={formData.eveningActivity || ''}
                onChange={(e) => handleChange('eveningActivity', e.target.value)}
                placeholder="晚上做了什么？"
                className={`min-h-[60px] ${getInputClassName('至少一个时段的活动')}`}
              />
            </div>
            <div>
              <Label htmlFor="eveningMood">心情</Label>
              <Input
                id="eveningMood"
                value={formData.eveningMood || ''}
                onChange={(e) => handleChange('eveningMood', e.target.value)}
                placeholder="例如：9分，很舒畅"
              />
            </div>
          </div>

          {/* 深夜（可选） */}
          <div className="p-4 bg-gray-50 rounded-lg space-y-3">
            <h5 className="text-sm font-medium text-gray-700">🌙 深夜（可选）</h5>
            <div>
              <Label htmlFor="nightActivity">活动</Label>
              <Textarea
                id="nightActivity"
                value={formData.nightActivity || ''}
                onChange={(e) => handleChange('nightActivity', e.target.value)}
                placeholder="深夜做了什么？（如果有）"
                className="min-h-[60px]"
              />
            </div>
            <div>
              <Label htmlFor="nightMood">心情</Label>
              <Input
                id="nightMood"
                value={formData.nightMood || ''}
                onChange={(e) => handleChange('nightMood', e.target.value)}
                placeholder="例如：7分，平静"
              />
            </div>
          </div>
        </div>

        {/* 思考记录（可选） */}
        <div className="space-y-4">
          <h4 className="font-medium text-gray-900">💭 思考记录（可选）</h4>
          <div className="space-y-3">
            <div>
              <Label htmlFor="confusions">困惑</Label>
              <Textarea
                id="confusions"
                value={formData.confusions || ''}
                onChange={(e) => handleChange('confusions', e.target.value)}
                placeholder="今天有什么困惑的事情？"
                className="min-h-[60px]"
              />
            </div>
            <div>
              <Label htmlFor="thoughts">想法</Label>
              <Textarea
                id="thoughts"
                value={formData.thoughts || ''}
                onChange={(e) => handleChange('thoughts', e.target.value)}
                placeholder="今天有什么想法？"
                className="min-h-[60px]"
              />
            </div>
            <div>
              <Label htmlFor="insights">启发</Label>
              <Textarea
                id="insights"
                value={formData.insights || ''}
                onChange={(e) => handleChange('insights', e.target.value)}
                placeholder="今天有什么启发或收获？"
                className="min-h-[60px]"
              />
            </div>
          </div>
        </div>
      </div>

      {/* 操作按钮 */}
      <div className="flex gap-3 pt-4 border-t">
        <Button
          variant="outline"
          onClick={onBack}
          disabled={loading}
          className="flex-1"
        >
          返回修改
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={loading}
          className="flex-1"
        >
          {loading ? '保存中...' : completeness.isComplete ? '确认保存' : '暂时保存'}
        </Button>
      </div>

      {!completeness.isComplete && (
        <p className="text-xs text-center text-gray-500">
          💡 可以先保存草稿，稍后补充完整信息
        </p>
      )}
    </div>
  )
}
