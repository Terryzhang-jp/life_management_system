"use client"

import { Card } from "@/components/ui/card"
import { User, Bot } from "lucide-react"
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

interface MessageItemProps {
  role: 'user' | 'assistant'
  content: string
}

export default function MessageItem({ role, content }: MessageItemProps) {
  const isUser = role === 'user'

  return (
    <div className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}>
      {!isUser && (
        <div className="flex-shrink-0">
          <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center">
            <Bot className="w-5 h-5 text-white" />
          </div>
        </div>
      )}

      <Card className={`max-w-[80%] p-4 break-words ${isUser ? 'bg-blue-50 border-blue-200' : 'bg-gray-50'}`}>
        <div className="prose prose-sm max-w-none text-gray-800 overflow-hidden">
          {isUser ? (
            // 用户消息：简单换行处理
            content.split('\n').map((line, index) => (
              <p key={index} className="mb-2 last:mb-0">
                {line}
              </p>
            ))
          ) : (
            // AI消息：Markdown渲染
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                p: ({node, ...props}) => <p className="mb-3 last:mb-0 leading-relaxed" {...props} />,
                ul: ({node, ...props}) => <ul className="mb-3 ml-4 list-disc space-y-1" {...props} />,
                ol: ({node, ...props}) => <ol className="mb-3 ml-4 list-decimal space-y-1" {...props} />,
                li: ({node, ...props}) => <li className="leading-relaxed" {...props} />,
                strong: ({node, ...props}) => <strong className="font-bold text-gray-900" {...props} />,
                em: ({node, ...props}) => <em className="italic" {...props} />,
                h1: ({node, ...props}) => <h1 className="text-xl font-bold mb-3 mt-4 first:mt-0" {...props} />,
                h2: ({node, ...props}) => <h2 className="text-lg font-bold mb-2 mt-3 first:mt-0" {...props} />,
                h3: ({node, ...props}) => <h3 className="text-base font-bold mb-2 mt-2 first:mt-0" {...props} />,
                code: ({node, ...props}: any) =>
                  props.inline ? (
                    <code className="bg-gray-200 px-1.5 py-0.5 rounded text-sm font-mono" {...props} />
                  ) : (
                    <code className="block bg-gray-200 p-3 rounded text-sm font-mono overflow-x-auto my-2" {...props} />
                  ),
                blockquote: ({node, ...props}) => (
                  <blockquote className="border-l-4 border-blue-500 pl-4 italic my-3 text-gray-700" {...props} />
                ),
              }}
            >
              {content}
            </ReactMarkdown>
          )}
        </div>
      </Card>

      {isUser && (
        <div className="flex-shrink-0">
          <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center">
            <User className="w-5 h-5 text-gray-600" />
          </div>
        </div>
      )}
    </div>
  )
}
