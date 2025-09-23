"use client"

import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Clock, ArrowLeft, ArrowRight, Home, BookOpen, ListTodo, Lightbulb, Calendar } from "lucide-react"
import Link from "next/link"
import AnalogClock from "@/components/analog-clock"
import { HabitTracker } from "@/components/habit-tracker"
import { DailyDecisions } from "@/components/daily-decisions"
import { ThoughtsAndConcerns } from "@/components/thoughts-and-concerns"

export default function PresentPage() {

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-4xl mx-auto">
        {/* 头部导航 */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">现在 · Present</h1>
          <p className="text-gray-600">专注当下，这是唯一真实的时刻</p>
        </div>

        {/* 时态导航 */}
        <div className="flex justify-center gap-4 mb-4">
          <Link href="/past">
            <Button variant="outline" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              过去
            </Button>
          </Link>
          <Button size="sm" className="bg-blue-500 hover:bg-blue-600 text-white">
            <Clock className="w-4 h-4 mr-2" />
            现在
          </Button>
          <Link href="/future">
            <Button variant="outline" size="sm">
              未来
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>
        </div>

        {/* Memento Mori 提醒 */}
        <div className="text-center mb-8">
          <p className="text-gray-500 text-sm italic font-light">
            Memento Mori — 记住你终将死去
          </p>
        </div>

        {/* 主要功能区域 - 2x2网格布局 */}
        <div className="mb-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 左上：模拟时钟 */}
          <div>
            <AnalogClock wakeUpHour={7} sleepHour={23} />
          </div>

          {/* 右上：今日决策 */}
          <div>
            <DailyDecisions />
          </div>

          {/* 左下：习惯追踪 */}
          <div>
            <HabitTracker />
          </div>

          {/* 右下：最近在思考或纠结 */}
          <div>
            <ThoughtsAndConcerns />
          </div>
        </div>

        {/* 快捷导航 */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Link href="/schedule">
            <Card className="p-4 hover:shadow-md transition-shadow cursor-pointer border-blue-200 bg-blue-50">
              <div className="flex flex-col items-center">
                <Calendar className="w-6 h-6 mb-2 text-blue-600" />
                <span className="text-sm text-blue-700 font-medium">日程安排</span>
              </div>
            </Card>
          </Link>
          <Link href="/tasks">
            <Card className="p-4 hover:shadow-md transition-shadow cursor-pointer">
              <div className="flex flex-col items-center">
                <ListTodo className="w-6 h-6 mb-2 text-gray-600" />
                <span className="text-sm text-gray-700">任务管理</span>
              </div>
            </Card>
          </Link>
          <Link href="/philosophy">
            <Card className="p-4 hover:shadow-md transition-shadow cursor-pointer">
              <div className="flex flex-col items-center">
                <Home className="w-6 h-6 mb-2 text-gray-600" />
                <span className="text-sm text-gray-700">人生哲学</span>
              </div>
            </Card>
          </Link>
          <Link href="/thoughts">
            <Card className="p-4 hover:shadow-md transition-shadow cursor-pointer">
              <div className="flex flex-col items-center">
                <Lightbulb className="w-6 h-6 mb-2 text-gray-600" />
                <span className="text-sm text-gray-700">思考记录</span>
              </div>
            </Card>
          </Link>
          <Link href="/past">
            <Card className="p-4 hover:shadow-md transition-shadow cursor-pointer">
              <div className="flex flex-col items-center">
                <BookOpen className="w-6 h-6 mb-2 text-gray-600" />
                <span className="text-sm text-gray-700">回顾过去</span>
              </div>
            </Card>
          </Link>
        </div>
      </div>
    </div>
  )
}