"use client"

import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Clock, Rocket, Target, ListTodo } from "lucide-react"
import Link from "next/link"

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
          {/* 任务规划入口 */}
          <Card>
            <CardHeader>
              <h2 className="text-xl font-semibold flex items-center">
                <Target className="w-5 h-5 mr-2" />
                目标与规划
              </h2>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-4">
                管理你的长期目标和未来规划
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

          {/* 占位内容 */}
          <Card>
            <CardContent className="py-12 text-center text-gray-500">
              <Target className="w-12 h-12 mx-auto mb-4 text-gray-400" />
              <p>梦想清单和愿望板</p>
              <p className="text-sm mt-2">即将推出</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}