"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { ChevronDown, ChevronUp, Lightbulb } from "lucide-react"

/**
 * 自适应问题组件
 * 根据Milestone Creator API返回的问题类型，动态渲染不同的UI
 */

interface QuestionData {
  main: string
  type: 'single_choice' | 'multiple_choice' | 'text' | 'date' | 'duration'
  options?: string[]
}

interface SidebarData {
  observation: string
  examples?: string[]
  suggestions?: string | string[]  // 可以是字符串或数组
}

interface AdaptiveQuestionProps {
  question: QuestionData
  sidebar?: SidebarData
  onAnswer: (answer: string | string[]) => void
  isLoading?: boolean
  questionNumber?: number
  totalQuestions?: number
}

export function AdaptiveQuestion({
  question,
  sidebar,
  onAnswer,
  isLoading = false,
  questionNumber,
  totalQuestions
}: AdaptiveQuestionProps) {
  // UI状态
  const [sidebarExpanded, setSidebarExpanded] = useState(true)

  // 输入状态
  const [selectedOption, setSelectedOption] = useState<string>("")
  const [selectedOptions, setSelectedOptions] = useState<Set<string>>(new Set())
  const [textInput, setTextInput] = useState("")
  const [dateInput, setDateInput] = useState("")
  const [durationValue, setDurationValue] = useState("")
  const [durationUnit, setDurationUnit] = useState<'days' | 'weeks' | 'months'>('days')

  const handleSubmit = () => {
    let answer: string | string[] = ""

    switch (question.type) {
      case 'single_choice':
        answer = selectedOption
        break
      case 'multiple_choice':
        answer = Array.from(selectedOptions)
        break
      case 'text':
        answer = textInput
        break
      case 'date':
        answer = dateInput
        break
      case 'duration':
        answer = `${durationValue} ${durationUnit}`
        break
    }

    if (!answer || (Array.isArray(answer) && answer.length === 0)) {
      return // 不允许空答案
    }

    onAnswer(answer)
  }

  const toggleMultipleChoice = (option: string) => {
    const newSelected = new Set(selectedOptions)
    if (newSelected.has(option)) {
      newSelected.delete(option)
    } else {
      newSelected.add(option)
    }
    setSelectedOptions(newSelected)
  }

  return (
    <div className="space-y-6">
      {/* 进度指示器 */}
      {questionNumber !== undefined && totalQuestions !== undefined && (
        <div className="flex items-center gap-3">
          <div className="flex-1 h-1 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-600 transition-all duration-500"
              style={{ width: `${(questionNumber / totalQuestions) * 100}%` }}
            />
          </div>
          <span className="text-xs text-gray-500 font-medium">
            {questionNumber} / {totalQuestions}
          </span>
        </div>
      )}

      {/* 主问题 */}
      <div>
        <h3 className="text-2xl font-semibold text-gray-900 mb-6 leading-tight">
          {question.main}
        </h3>

        {/* 根据类型渲染不同的输入UI */}
        <div className="space-y-4">
          {/* 单选 */}
          {question.type === 'single_choice' && question.options && (
            <div className="space-y-3">
              {question.options.map((option, index) => (
                <button
                  key={index}
                  onClick={() => setSelectedOption(option)}
                  className={`w-full text-left px-6 py-4 rounded-lg border-2 transition-all ${
                    selectedOption === option
                      ? 'border-blue-600 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300 bg-white'
                  }`}
                >
                  <span className={`font-medium ${
                    selectedOption === option ? 'text-blue-900' : 'text-gray-900'
                  }`}>
                    {option}
                  </span>
                </button>
              ))}
            </div>
          )}

          {/* 多选 */}
          {question.type === 'multiple_choice' && question.options && (
            <div className="space-y-3">
              {question.options.map((option, index) => (
                <button
                  key={index}
                  onClick={() => toggleMultipleChoice(option)}
                  className={`w-full text-left px-6 py-4 rounded-lg border-2 transition-all flex items-center gap-3 ${
                    selectedOptions.has(option)
                      ? 'border-blue-600 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300 bg-white'
                  }`}
                >
                  <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                    selectedOptions.has(option)
                      ? 'border-blue-600 bg-blue-600'
                      : 'border-gray-300'
                  }`}>
                    {selectedOptions.has(option) && (
                      <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"/>
                      </svg>
                    )}
                  </div>
                  <span className={`font-medium ${
                    selectedOptions.has(option) ? 'text-blue-900' : 'text-gray-900'
                  }`}>
                    {option}
                  </span>
                </button>
              ))}
            </div>
          )}

          {/* 文本输入 */}
          {question.type === 'text' && (
            <Textarea
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              placeholder="请输入您的回答..."
              className="min-h-[120px] text-base"
              autoFocus
            />
          )}

          {/* 日期输入 */}
          {question.type === 'date' && (
            <Input
              type="date"
              value={dateInput}
              onChange={(e) => setDateInput(e.target.value)}
              className="text-base"
            />
          )}

          {/* 时长输入 */}
          {question.type === 'duration' && (
            <div className="flex gap-3">
              <Input
                type="number"
                value={durationValue}
                onChange={(e) => setDurationValue(e.target.value)}
                placeholder="数量"
                className="flex-1 text-base"
                min="1"
              />
              <select
                value={durationUnit}
                onChange={(e) => setDurationUnit(e.target.value as any)}
                className="px-4 py-2 border border-gray-300 rounded-md text-base bg-white"
              >
                <option value="days">天</option>
                <option value="weeks">周</option>
                <option value="months">月</option>
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Sidebar - AI观察 */}
      {sidebar && (
        <div className="border-l-4 border-amber-400 bg-amber-50 p-6 rounded-r-lg">
          <button
            onClick={() => setSidebarExpanded(!sidebarExpanded)}
            className="flex items-center gap-2 text-amber-900 font-medium mb-3 hover:text-amber-700 transition-colors"
          >
            <Lightbulb className="w-5 h-5" />
            <span>AI 观察</span>
            {sidebarExpanded ? (
              <ChevronUp className="w-4 h-4 ml-auto" />
            ) : (
              <ChevronDown className="w-4 h-4 ml-auto" />
            )}
          </button>

          {sidebarExpanded && (
            <div className="space-y-4 text-sm">
              <p className="text-amber-800 leading-relaxed">{sidebar.observation}</p>

              {sidebar.examples && sidebar.examples.length > 0 && (
                <div>
                  <p className="font-medium text-amber-900 mb-2">示例：</p>
                  <ul className="list-disc list-inside space-y-1 text-amber-800">
                    {sidebar.examples.map((example, index) => (
                      <li key={index}>{example}</li>
                    ))}
                  </ul>
                </div>
              )}

              {sidebar.suggestions && (
                <div>
                  <p className="font-medium text-amber-900 mb-2">建议：</p>
                  {typeof sidebar.suggestions === 'string' ? (
                    <p className="text-amber-800">{sidebar.suggestions}</p>
                  ) : (
                    <ul className="list-disc list-inside space-y-1 text-amber-800">
                      {sidebar.suggestions.map((suggestion, index) => (
                        <li key={index}>{suggestion}</li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* 提交按钮 */}
      <div className="flex justify-end pt-4">
        <Button
          onClick={handleSubmit}
          disabled={isLoading || (
            (question.type === 'single_choice' && !selectedOption) ||
            (question.type === 'multiple_choice' && selectedOptions.size === 0) ||
            (question.type === 'text' && !textInput.trim()) ||
            (question.type === 'date' && !dateInput) ||
            (question.type === 'duration' && !durationValue)
          )}
          className="bg-blue-600 hover:bg-blue-700 px-8"
        >
          {isLoading ? '处理中...' : '下一步'}
        </Button>
      </div>
    </div>
  )
}
