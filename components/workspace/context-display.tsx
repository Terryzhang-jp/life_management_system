"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ChevronDown, ChevronUp, Loader2 } from "lucide-react"

interface ContextDisplayProps {
  markdown?: string
  loading?: boolean
}

export default function ContextDisplay({ markdown, loading }: ContextDisplayProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  if (loading) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle className="text-sm">上下文数据</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
            <span className="ml-2 text-sm text-gray-500">加载中...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!markdown) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle className="text-sm">上下文数据</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500">暂无数据</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="flex-shrink-0">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm">上下文数据</CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="h-7 w-7 p-0"
          >
            {isExpanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>
        </div>
      </CardHeader>

      {isExpanded && (
        <CardContent className="flex-1 overflow-y-auto">
          <div className="prose prose-sm max-w-none">
            <pre className="whitespace-pre-wrap text-xs bg-gray-50 p-4 rounded">
              {markdown}
            </pre>
          </div>
        </CardContent>
      )}
    </Card>
  )
}
