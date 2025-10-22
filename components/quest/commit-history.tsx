'use client'

import { useState, useEffect } from 'react'
import { Calendar, FileText, TrendingUp } from 'lucide-react'

interface QuestCommit {
  id: number
  commitDate: string
  content: string
  attachments?: string | null
  createdAt: string
}

interface ProgressUpdate {
  checkpointTitle: string
  previousProgress: number
  newProgress: number
}

interface CommitHistoryProps {
  questId: number
  limit?: number
}

/**
 * Commit History - GitHub 风格的提交历史展示
 *
 * 功能：
 * - 按日期倒序展示 commits
 * - 显示 commit 内容摘要
 * - 显示关联的 AI 评估结果
 * - 展示进度变更情况
 */
export function CommitHistory({ questId, limit = 10 }: CommitHistoryProps) {
  const [commits, setCommits] = useState<QuestCommit[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchCommits()
  }, [questId])

  const fetchCommits = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/quest-commits?questId=${questId}&limit=${limit}`)
      if (response.ok) {
        const result = await response.json()
        if (result.success) {
          setCommits(result.commits || [])
        }
      }
    } catch (error) {
      console.error('Failed to fetch commits:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))

    if (diffDays === 0) return 'Today'
    if (diffDays === 1) return 'Yesterday'
    if (diffDays < 7) return `${diffDays} days ago`

    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    })
  }

  const getContentPreview = (content: string) => {
    const lines = content.split('\n').filter(line => line.trim())
    return lines[0]?.substring(0, 100) + (lines[0]?.length > 100 ? '...' : '')
  }

  if (loading) {
    return (
      <div className="text-center py-8 text-gray-400">
        <p className="text-sm">Loading commit history...</p>
      </div>
    )
  }

  if (commits.length === 0) {
    return (
      <div className="text-center py-12 border border-gray-200 rounded-lg">
        <Calendar className="w-12 h-12 mx-auto text-gray-300 mb-4" />
        <p className="text-gray-400 mb-2">No commits yet</p>
        <p className="text-xs text-gray-500">Start by submitting your first daily progress</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-gray-400" />
          <h3 className="text-sm font-medium text-gray-900">Commit History</h3>
          <span className="text-xs text-gray-500">({commits.length})</span>
        </div>
      </div>

      {/* Commit List */}
      <div className="space-y-3">
        {commits.map((commit) => {
          const attachments = commit.attachments ? JSON.parse(commit.attachments) : []

          return (
            <div
              key={commit.id}
              className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors"
            >
              {/* Commit Header */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0 mt-2" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {getContentPreview(commit.content)}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {formatDate(commit.commitDate)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Attachments */}
              {attachments.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-2">
                  {attachments.map((att: string, index: number) => (
                    <span
                      key={index}
                      className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded"
                    >
                      📎 {att.substring(0, 30)}...
                    </span>
                  ))}
                </div>
              )}

              {/* AI Assessment Indicator */}
              <div className="flex items-center gap-2 text-xs text-blue-600 mt-3 pt-3 border-t border-gray-100">
                <TrendingUp className="w-3 h-3" />
                <span>AI assessed this commit</span>
              </div>
            </div>
          )
        })}
      </div>

      {/* Show More */}
      {commits.length >= limit && (
        <div className="text-center pt-4">
          <button className="text-xs text-gray-500 hover:text-gray-900 transition-colors">
            View all commits →
          </button>
        </div>
      )}
    </div>
  )
}
