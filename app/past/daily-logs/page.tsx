"use client"

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowLeft, CalendarDays, Sparkles, Plus, Play } from 'lucide-react'
import CalendarView from '@/components/daily-life-log/calendar-view'
import DailyLogDialog from '@/components/daily-life-log/daily-log-dialog'
import { DailyLifeLog } from '@/lib/daily-life-log-db'
import { useToast } from '@/hooks/use-toast'

export default function DailyLogsPage() {
  const { toast } = useToast()

  const [logs, setLogs] = useState<DailyLifeLog[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [currentMonth, setCurrentMonth] = useState(new Date())

  const fetchLogsForMonth = async (month: Date) => {
    try {
      setLoading(true)

      const year = month.getFullYear()
      const monthNum = month.getMonth() + 1
      const lastDay = new Date(year, monthNum, 0)

      const startDate = `${year}-${String(monthNum).padStart(2, '0')}-01`
      const endDate = `${year}-${String(monthNum).padStart(2, '0')}-${String(lastDay.getDate()).padStart(2, '0')}`

      const response = await fetch(`/api/daily-life-log?startDate=${startDate}&endDate=${endDate}`)

      if (response.ok) {
        const data = await response.json()

        if (data.logs && Array.isArray(data.logs)) {
          setLogs(data.logs)
        } else if (Array.isArray(data)) {
          setLogs(data)
        } else {
          setLogs([])
        }
      } else {
        console.error('Failed to fetch logs')
        setLogs([])
      }
    } catch (error) {
      console.error('Error fetching logs:', error)
      toast({
        title: '加载失败',
        description: '无法加载记录，请重试',
        variant: 'destructive'
      })
      setLogs([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchLogsForMonth(currentMonth)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentMonth])

  const handleDateClick = (date: string) => {
    setSelectedDate(date)
  }

  const handleDialogClose = () => {
    setSelectedDate(null)
    fetchLogsForMonth(currentMonth)
  }

  const handleMonthChange = (newMonth: Date) => {
    setCurrentMonth(newMonth)
  }

  const handleStartToday = () => {
    const today = new Date()
    const dateStr = [
      today.getFullYear(),
      String(today.getMonth() + 1).padStart(2, '0'),
      String(today.getDate()).padStart(2, '0')
    ].join('-')

    setSelectedDate(dateStr)
  }

  const selectedLog = useMemo(() => {
    if (!selectedDate) return null
    return logs.find(log => log.date === selectedDate) || null
  }, [logs, selectedDate])

  const completedCount = useMemo(
    () => logs.filter(log => log.status === 'completed').length,
    [logs]
  )
  const draftCount = useMemo(
    () => logs.filter(log => log.status === 'draft').length,
    [logs]
  )

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#faf7f0] via-[#f2f5f9] to-[#eef0f4]">
      <div className="max-w-6xl mx-auto px-6 py-10">
        <div className="flex items-center justify-between mb-6">
          <Link href="/past">
            <Button variant="ghost" size="sm" className="gap-2 rounded-full bg-white/70 hover:bg-white">
              <ArrowLeft className="w-4 h-4" />
              返回过去
            </Button>
          </Link>

          <div className="flex items-center gap-2 rounded-full bg-white/50 px-2 py-1 shadow-sm">
            <Link href="/past">
              <Button variant="ghost" size="sm" className="rounded-full bg-gray-900 text-white hover:bg-gray-800">
                过去
              </Button>
            </Link>
            <Link href="/">
              <Button variant="ghost" size="sm" className="rounded-full text-gray-500 hover:text-gray-900 hover:bg-white">
                现在
              </Button>
            </Link>
            <Link href="/future">
              <Button variant="ghost" size="sm" className="rounded-full text-gray-500 hover:text-gray-900 hover:bg-white">
                未来
              </Button>
            </Link>
          </div>
        </div>

        <section className="rounded-3xl bg-white/70 backdrop-blur-xl shadow-lg border border-white/60 px-8 py-10">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-8">
            <div>
              <div className="flex items-center gap-3 text-xs font-medium text-gray-500 uppercase tracking-[0.4em] mb-3">
                <CalendarDays className="w-4 h-4" />
                Daily Stories
              </div>
              <h1 className="text-4xl md:text-5xl font-semibold text-gray-900 leading-tight mb-4">
                回顾你的每日故事
              </h1>
              <p className="text-gray-600 text-base md:text-lg leading-relaxed max-w-xl">
                每一天都是珍贵的章节。把细碎的片段串联成生活的时间轴，在忙碌中保持温度与方向。
              </p>
            </div>

            <div className="flex flex-col gap-3 min-w-[220px]">
              <Button
                size="lg"
                className="h-12 rounded-full bg-gradient-to-r from-[#4f46e5] to-[#7c3aed]"
                onClick={handleStartToday}
              >
                <Plus className="w-4 h-4 mr-2" />
                记录今天
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="h-12 rounded-full border-2 border-white hover:bg-white/80"
              >
                <Sparkles className="w-4 h-4 mr-2 text-[#7c3aed]" />
                AI 小结
              </Button>
            </div>
          </div>
        </section>

        {loading && (
          <div className="text-center py-20 text-gray-500">
            正在唤起记忆...
          </div>
        )}

        {!loading && (
          <>
            <div className="grid lg:grid-cols-[3fr,2fr] gap-8 mt-10 items-start">
              <div className="rounded-3xl bg-white shadow-sm border border-white/80 p-8">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900">我的月历</h2>
                    <p className="text-sm text-gray-500 mt-1">
                      点击某一天，补充或回顾那天的生活细节
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="rounded-full bg-gray-100 hover:bg-gray-200"
                    onClick={() => setCurrentMonth(new Date())}
                  >
                    回到今天
                  </Button>
                </div>
                <CalendarView
                  logs={logs}
                  currentMonth={currentMonth}
                  onMonthChange={handleMonthChange}
                  onDateClick={handleDateClick}
                />
              </div>

              <div className="space-y-6">
                <div className="grid grid-cols-3 gap-4">
                  <div className="rounded-2xl bg-gradient-to-br from-[#34d399]/20 to-[#10b981]/10 border border-white/70 p-5">
                    <div className="text-sm text-gray-600">已完成</div>
                    <div className="text-3xl font-semibold text-gray-900 mt-2">{completedCount}</div>
                    <p className="text-xs text-gray-500 mt-3">完整记录的日子</p>
                  </div>
                  <div className="rounded-2xl bg-gradient-to-br from-[#fbbf24]/20 to-[#f59e0b]/10 border border-white/70 p-5">
                    <div className="text-sm text-gray-600">进行中</div>
                    <div className="text-3xl font-semibold text-gray-900 mt-2">{draftCount}</div>
                    <p className="text-xs text-gray-500 mt-3">等待补充的片段</p>
                  </div>
                  <div className="rounded-2xl bg-gradient-to-br from-[#c084fc]/20 to-[#a855f7]/10 border border-white/70 p-5">
                    <div className="text-sm text-gray-600">总记录</div>
                    <div className="text-3xl font-semibold text-gray-900 mt-2">{logs.length}</div>
                    <p className="text-xs text-gray-500 mt-3">属于你的生活章节</p>
                  </div>
                </div>

                <div className="rounded-3xl bg-white shadow-sm border border-white/70 p-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-900">生活亮点速览</h3>
                    {selectedDate && (
                      <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {selectedDate}
                      </span>
                    )}
                  </div>

                  {selectedDate && !selectedLog && (
                    <div className="py-12 text-center text-gray-500">
                      暂无记录，点击“记录今天”开始补充吧。
                    </div>
                  )}

                  {!selectedDate && (
                    <div className="py-12 text-center text-gray-500">
                      选择一个日期，看看那一天的故事。
                    </div>
                  )}

                  {selectedLog && (
                    <div className="mt-6 space-y-4">
                      <div className="rounded-2xl bg-gradient-to-r from-[#f5f3ff] to-[#ede9fe] p-5">
                        <div className="flex items-center gap-3">
                          <Sparkles className="w-5 h-5 text-[#7c3aed]" />
                          <span className="text-sm font-medium text-[#5b21b6]">AI 提示</span>
                        </div>
                        {selectedLog.thoughts ? (
                          <p className="text-gray-700 text-sm leading-relaxed mt-3">
                            {selectedLog.thoughts}
                          </p>
                        ) : (
                          <p className="text-gray-500 text-sm leading-relaxed mt-3">
                            还没有感想记录，可以补充一段新的心得。
                          </p>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
                          <div className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                            三餐
                          </div>
                          <ul className="mt-3 space-y-1 text-sm text-gray-700">
                            <li>{selectedLog.breakfastDescription || '早餐：未记录'}</li>
                            <li>{selectedLog.lunchDescription || '午餐：未记录'}</li>
                            <li>{selectedLog.dinnerDescription || '晚餐：未记录'}</li>
                          </ul>
                        </div>
                        <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
                          <div className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                            活动 & 心情
                          </div>
                          <ul className="mt-3 space-y-1 text-sm text-gray-700">
                            <li>
                              上午：{selectedLog.morningActivity || '未记录'} / {selectedLog.morningMood || '心情未知'}
                            </li>
                            <li>
                              下午：{selectedLog.afternoonActivity || '未记录'} / {selectedLog.afternoonMood || '心情未知'}
                            </li>
                            <li>
                              晚间：{selectedLog.eveningActivity || '未记录'} / {selectedLog.eveningMood || '心情未知'}
                            </li>
                          </ul>
                        </div>
                      </div>

                      <div className="text-right">
                        <Button
                          variant="ghost"
                          className="rounded-full text-[#7c3aed] hover:bg-[#ede9fe]"
                          onClick={() => setSelectedDate(selectedLog.date)}
                        >
                          <Play className="w-4 h-4 mr-2" />
                          继续补充
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <section className="mt-12 rounded-3xl bg-white/70 border border-white/70 shadow-sm p-8">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">最近的灵感拾集</h3>
              {logs.length === 0 && (
                <div className="py-12 text-center text-gray-500">
                  这个月还没有记录，不如就从今天开始？
                </div>
              )}
              {logs.length > 0 && (
                <div className="flex gap-4 overflow-x-auto pb-2">
                  {logs.slice(0, 6).map(log => (
                    <div
                      key={log.date}
                      className="min-w-[180px] rounded-2xl border border-white bg-gradient-to-br from-[#f9fafb] to-[#eef2ff] p-4 shadow-sm"
                    >
                      <div className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {log.date}
                      </div>
                      <div className="mt-3 text-sm font-medium text-gray-900">
                        {log.morningActivity || log.afternoonActivity || log.eveningActivity || '等待被讲述的故事'}
                      </div>
                      <p className="mt-2 text-xs text-gray-500 min-h-[48px] overflow-hidden text-ellipsis">
                        {log.thoughts || log.insights || '补充一些心情或感悟，让记忆更完整。'}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </div>

      {selectedDate && (
        <DailyLogDialog
          isOpen={true}
          onClose={handleDialogClose}
          date={selectedDate}
        />
      )}
    </div>
  )
}
