"use client"

import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Clock, Rocket, Target, ListTodo, Flag } from "lucide-react"
import Link from "next/link"
import AspirationsCard from "@/components/aspirations-card"

export default function FuturePage() {
  return (
    <div className="min-h-screen p-6">
      <div className="max-w-4xl mx-auto">
        {/* 头部 */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">未来 · Future</h1>
          <p className="text-gray-600">愿景与规划，让未来拉动现在</p>
        </div>

        {/* 时态导航 */}
        <div className="flex justify-center gap-4 mb-8">
          <Link href="/past">
            <Button variant="outline" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              过去
            </Button>
          </Link>
          <Link href="/">
            <Button variant="outline" size="sm">
              <Clock className="w-4 h-4 mr-2" />
              现在
            </Button>
          </Link>
          <Button size="sm" className="bg-amber-500 hover:bg-amber-600 text-white">
            <Rocket className="w-4 h-4 mr-2" />
            未来
          </Button>
        </div>

        {/* 内容区域 */}
        <div className="space-y-6">
          {/* 心愿清单 - 主要内容 */}
          <AspirationsCard />

          {/* 快捷入口 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Quests & Milestones入口 */}
            <Card className="border-2 border-blue-200 bg-blue-50/30">
              <CardHeader>
                <h2 className="text-xl font-semibold flex items-center">
                  <Flag className="w-5 h-5 mr-2 text-blue-600" />
                  Quests & Milestones
                </h2>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 mb-4">
                  证据驱动的人生目标系统，规划你的Journey
                </p>
                <Link href="/quests">
                  <Button className="bg-blue-600 hover:bg-blue-700">
                    <Target className="w-4 h-4 mr-2" />
                    进入Quest系统
                  </Button>
                </Link>
              </CardContent>
            </Card>

            {/* 任务规划入口 */}
            <Card>
              <CardHeader>
                <h2 className="text-xl font-semibold flex items-center">
                  <Target className="w-5 h-5 mr-2" />
                  任务管理
                </h2>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 mb-4">
                  传统的层级任务管理系统
                </p>
                <Link href="/tasks">
                  <Button variant="outline">
                    <ListTodo className="w-4 h-4 mr-2" />
                    任务管理
                  </Button>
                </Link>
              </CardContent>
            </Card>

            {/* 人生哲学入口 */}
            <Card>
              <CardHeader>
                <h2 className="text-xl font-semibold flex items-center">
                  <Rocket className="w-5 h-5 mr-2" />
                  愿景与价值观
                </h2>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 mb-4">
                  定义你的人生方向和核心价值
                </p>
                <Link href="/philosophy">
                  <Button variant="outline">
                    查看人生哲学
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}