"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowRight, Clock, BookOpen, History } from "lucide-react"
import Link from "next/link"
import { MemoriesGallery } from "@/components/memories-gallery"

export default function PastPage() {
  return (
    <div className="min-h-screen" style={{ backgroundColor: '#f5f5f5' }}>
      <div className="max-w-6xl mx-auto">
        {/* 头部 */}
        <div className="px-6 pt-6 pb-4">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">过去 · Past</h1>
          <p className="text-gray-600">回顾与复盘，从经验中汲取力量</p>
        </div>

        {/* 时态导航 */}
        <div className="flex justify-center gap-4 mb-6">
          <Button size="sm" className="bg-gray-500 hover:bg-gray-600 text-white">
            <History className="w-4 h-4 mr-2" />
            过去
          </Button>
          <Link href="/">
            <Button variant="outline" size="sm">
              <Clock className="w-4 h-4 mr-2" />
              现在
            </Button>
          </Link>
          <Link href="/future">
            <Button variant="outline" size="sm">
              未来
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>
        </div>

        {/* 内容区域 */}
        <div className="px-6">
          {/* 缩小的思考记录入口 */}
          <div className="mb-6">
            <Card className="max-w-md">
              <CardContent className="p-4">
                <h3 className="text-sm font-medium flex items-center mb-2">
                  <BookOpen className="w-4 h-4 mr-2" />
                  记忆与思考
                </h3>
                <Link href="/thoughts">
                  <Button variant="outline" size="sm" className="text-xs">
                    查看思考记录
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>

          {/* 主要功能：记忆相册 */}
          <MemoriesGallery />
        </div>
      </div>
    </div>
  )
}