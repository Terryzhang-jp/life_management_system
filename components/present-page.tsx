"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import Link from "next/link"
import { Responsive, WidthProvider, Layout, Layouts } from "react-grid-layout"
import "react-grid-layout/css/styles.css"
import "react-resizable/css/styles.css"
import { Card } from "@/components/ui/card"
import { type LucideIcon, Clock, ArrowLeft, ArrowRight, Home, BookOpen, ListTodo, Lightbulb, Calendar, GripVertical, Brain, MessageSquare } from "lucide-react"
import AnalogClock from "@/components/analog-clock"
import { HabitTracker } from "@/components/habit-tracker"
import { DailyDecisions } from "@/components/daily-decisions"
import { ThoughtsAndConcerns } from "@/components/thoughts-and-concerns"
import { TodayTimeline } from "@/components/schedule/today-timeline"
import { PastIncompleteList } from "@/components/schedule/past-incomplete-list"
import { TodayScheduleSummary } from "@/components/present/today-schedule-summary"
import DailyReviewButton from "@/components/daily-review/daily-review-button"
import MinimalCalendar from "@/components/minimal-calendar"
import DailyReviewQuick from "@/components/daily-review-quick"

const ResponsiveGridLayout = WidthProvider(Responsive)

const BREAKPOINTS = { lg: 1280, md: 1024, sm: 768, xs: 576, xxs: 0 }
const COLS = { lg: 12, md: 10, sm: 6, xs: 4, xxs: 1 }
const ROW_HEIGHT = 40
const GRID_MARGIN: [number, number] = [24, 24]
const DEFAULT_MIN_ROWS = 6
const LAYOUT_STORAGE_KEY = "present-grid-layouts-v1"
const TIMELINE_NAVIGATION: Array<{ href: string; label: string; icon: LucideIcon; isCurrent?: boolean }> = [
  { href: "/past", label: "过去", icon: ArrowLeft },
  { href: "/", label: "现在", icon: Clock, isCurrent: true },
  { href: "/future", label: "未来", icon: ArrowRight }
]

type ModuleKey = "clock" | "decisions" | "habits" | "thoughts" | "todaySummary" | "timeline" | "pastIncomplete" | "calendar" | "dailyReview"

const MODULE_MIN_ROWS: Record<ModuleKey, number> = {
  clock: DEFAULT_MIN_ROWS,
  decisions: DEFAULT_MIN_ROWS,
  habits: DEFAULT_MIN_ROWS,
  thoughts: DEFAULT_MIN_ROWS,
  todaySummary: DEFAULT_MIN_ROWS,
  timeline: 3,
  pastIncomplete: DEFAULT_MIN_ROWS,
  calendar: DEFAULT_MIN_ROWS,
  dailyReview: 2
}

interface ModuleConfig {
  id: ModuleKey
  label: string
  render: () => JSX.Element
}

const MODULES: ModuleConfig[] = [
  {
    id: "clock",
    label: "模拟时钟",
    render: () => <AnalogClock wakeUpHour={7} sleepHour={23} />
  },
  {
    id: "decisions",
    label: "今日决策",
    render: () => <DailyDecisions />
  },
  {
    id: "dailyReview",
    label: "每日速填",
    render: () => <DailyReviewQuick />
  },
  {
    id: "calendar",
    label: "本月日历",
    render: () => <MinimalCalendar />
  },
  {
    id: "habits",
    label: "习惯追踪",
    render: () => <HabitTracker />
  },
  {
    id: "thoughts",
    label: "思考与困惑",
    render: () => <ThoughtsAndConcerns />
  },
  {
    id: "todaySummary",
    label: "今日统计",
    render: () => <TodayScheduleSummary />
  },
  {
    id: "timeline",
    label: "今日时间线",
    render: () => <TodayTimeline />
  },
  {
    id: "pastIncomplete",
    label: "过去未完成",
    render: () => <PastIncompleteList />
  }
]

const DEFAULT_LAYOUTS: Layouts = {
  lg: [
    { i: "clock", x: 0, y: 0, w: 3, h: 10, minW: 3, minH: MODULE_MIN_ROWS.clock },
    { i: "decisions", x: 3, y: 0, w: 3, h: 8, minW: 3, minH: MODULE_MIN_ROWS.decisions },
    { i: "dailyReview", x: 6, y: 0, w: 6, h: 8, minW: 4, minH: MODULE_MIN_ROWS.dailyReview },
    { i: "calendar", x: 0, y: 10, w: 4, h: 10, minW: 3, minH: MODULE_MIN_ROWS.calendar },
    { i: "habits", x: 4, y: 10, w: 4, h: 12, minW: 3, minH: MODULE_MIN_ROWS.habits },
    { i: "thoughts", x: 8, y: 10, w: 4, h: 10, minW: 3, minH: MODULE_MIN_ROWS.thoughts },
    { i: "pastIncomplete", x: 0, y: 22, w: 6, h: 10, minW: 3, minH: MODULE_MIN_ROWS.pastIncomplete },
    { i: "todaySummary", x: 6, y: 22, w: 6, h: 8, minW: 3, minH: MODULE_MIN_ROWS.todaySummary },
    { i: "timeline", x: 0, y: 32, w: 12, h: 14, minW: 4, minH: MODULE_MIN_ROWS.timeline }
  ],
  md: [
    { i: "clock", x: 0, y: 0, w: 5, h: 10, minW: 4, minH: MODULE_MIN_ROWS.clock },
    { i: "decisions", x: 5, y: 0, w: 5, h: 8, minW: 4, minH: MODULE_MIN_ROWS.decisions },
    { i: "dailyReview", x: 0, y: 10, w: 10, h: 8, minW: 6, minH: MODULE_MIN_ROWS.dailyReview },
    { i: "calendar", x: 0, y: 18, w: 5, h: 10, minW: 4, minH: MODULE_MIN_ROWS.calendar },
    { i: "habits", x: 5, y: 18, w: 5, h: 12, minW: 4, minH: MODULE_MIN_ROWS.habits },
    { i: "thoughts", x: 0, y: 30, w: 10, h: 10, minW: 5, minH: MODULE_MIN_ROWS.thoughts },
    { i: "pastIncomplete", x: 0, y: 40, w: 10, h: 10, minW: 5, minH: MODULE_MIN_ROWS.pastIncomplete },
    { i: "todaySummary", x: 0, y: 50, w: 10, h: 8, minW: 5, minH: MODULE_MIN_ROWS.todaySummary },
    { i: "timeline", x: 0, y: 58, w: 10, h: 14, minW: 6, minH: MODULE_MIN_ROWS.timeline }
  ],
  sm: [
    { i: "clock", x: 0, y: 0, w: 6, h: 10, minW: 6, minH: MODULE_MIN_ROWS.clock },
    { i: "decisions", x: 0, y: 10, w: 6, h: 8, minW: 6, minH: MODULE_MIN_ROWS.decisions },
    { i: "dailyReview", x: 0, y: 18, w: 6, h: 8, minW: 6, minH: MODULE_MIN_ROWS.dailyReview },
    { i: "calendar", x: 0, y: 26, w: 6, h: 10, minW: 6, minH: MODULE_MIN_ROWS.calendar },
    { i: "habits", x: 0, y: 36, w: 6, h: 12, minW: 6, minH: MODULE_MIN_ROWS.habits },
    { i: "thoughts", x: 0, y: 48, w: 6, h: 10, minW: 6, minH: MODULE_MIN_ROWS.thoughts },
    { i: "pastIncomplete", x: 0, y: 58, w: 6, h: 10, minW: 6, minH: MODULE_MIN_ROWS.pastIncomplete },
    { i: "todaySummary", x: 0, y: 68, w: 6, h: 8, minW: 6, minH: MODULE_MIN_ROWS.todaySummary },
    { i: "timeline", x: 0, y: 76, w: 6, h: 14, minW: 6, minH: MODULE_MIN_ROWS.timeline }
  ],
  xs: [
    { i: "clock", x: 0, y: 0, w: 4, h: 10, minW: 4, minH: MODULE_MIN_ROWS.clock },
    { i: "decisions", x: 0, y: 10, w: 4, h: 8, minW: 4, minH: MODULE_MIN_ROWS.decisions },
    { i: "dailyReview", x: 0, y: 18, w: 4, h: 8, minW: 4, minH: MODULE_MIN_ROWS.dailyReview },
    { i: "calendar", x: 0, y: 26, w: 4, h: 10, minW: 4, minH: MODULE_MIN_ROWS.calendar },
    { i: "habits", x: 0, y: 36, w: 4, h: 12, minW: 4, minH: MODULE_MIN_ROWS.habits },
    { i: "thoughts", x: 0, y: 48, w: 4, h: 10, minW: 4, minH: MODULE_MIN_ROWS.thoughts },
    { i: "pastIncomplete", x: 0, y: 58, w: 4, h: 10, minW: 4, minH: MODULE_MIN_ROWS.pastIncomplete },
    { i: "todaySummary", x: 0, y: 68, w: 4, h: 8, minW: 4, minH: MODULE_MIN_ROWS.todaySummary },
    { i: "timeline", x: 0, y: 76, w: 4, h: 14, minW: 4, minH: MODULE_MIN_ROWS.timeline }
  ],
  xxs: [
    { i: "clock", x: 0, y: 0, w: 1, h: 10, minW: 1, minH: MODULE_MIN_ROWS.clock },
    { i: "decisions", x: 0, y: 10, w: 1, h: 8, minW: 1, minH: MODULE_MIN_ROWS.decisions },
    { i: "dailyReview", x: 0, y: 18, w: 1, h: 8, minW: 1, minH: MODULE_MIN_ROWS.dailyReview },
    { i: "calendar", x: 0, y: 26, w: 1, h: 10, minW: 1, minH: MODULE_MIN_ROWS.calendar },
    { i: "habits", x: 0, y: 36, w: 1, h: 12, minW: 1, minH: MODULE_MIN_ROWS.habits },
    { i: "thoughts", x: 0, y: 48, w: 1, h: 10, minW: 1, minH: MODULE_MIN_ROWS.thoughts },
    { i: "pastIncomplete", x: 0, y: 58, w: 1, h: 10, minW: 1, minH: MODULE_MIN_ROWS.pastIncomplete },
    { i: "todaySummary", x: 0, y: 68, w: 1, h: 8, minW: 1, minH: MODULE_MIN_ROWS.todaySummary },
    { i: "timeline", x: 0, y: 76, w: 1, h: 14, minW: 1, minH: MODULE_MIN_ROWS.timeline }
  ]
}

const MODULE_IDS = MODULES.map(module => module.id)

function sanitizeLayouts(layouts: Layouts | undefined): Layouts {
  if (!layouts) return DEFAULT_LAYOUTS

  const moduleSet = new Set(MODULE_IDS)
  const sanitized: Layouts = {}

  Object.entries(DEFAULT_LAYOUTS).forEach(([breakpoint, defaultLayout]) => {
    const defaultLookup = Object.fromEntries(defaultLayout.map(item => [item.i, item]))
    const storedLayout = layouts[breakpoint] ?? []

    const filtered = storedLayout.filter(item => moduleSet.has(item.i as ModuleKey))
    const normalized = filtered.map(item => {
      const defaults = defaultLookup[item.i]
      if (!defaults) return item
      return {
        ...item,
        minW: defaults.minW,
        minH: defaults.minH
      }
    })

    const seen = new Set(normalized.map(item => item.i as ModuleKey))

    const merged = [...normalized]
    MODULE_IDS.forEach(moduleId => {
      if (!seen.has(moduleId) && defaultLookup[moduleId]) {
        merged.push(defaultLookup[moduleId])
      }
    })

    sanitized[breakpoint] = merged
  })

  return sanitized
}

interface ModuleContainerProps {
  id: ModuleKey
  label: string
  children: JSX.Element
  onHeightChange: (id: ModuleKey, height: number) => void
}

function ModuleContainer({ id, label, children, onHeightChange }: ModuleContainerProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const contentRef = useRef<HTMLDivElement | null>(null)
  const heightRef = useRef(0)

  useEffect(() => {
    const node = contentRef.current ?? containerRef.current
    if (!node) return

    const observer = new ResizeObserver(entries => {
      const entry = entries[0]
      if (!entry) return

      const nextHeight = entry.contentRect.height
      if (Math.abs(nextHeight - heightRef.current) < 4) return
      heightRef.current = nextHeight
      onHeightChange(id, nextHeight)
    })

    observer.observe(node)
    return () => observer.disconnect()
  }, [id, onHeightChange])

  return (
    <div ref={containerRef} className="relative h-full">
      <button
        type="button"
        className="module-drag-handle absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2 rounded-full border border-gray-200 bg-white px-2 py-1 text-gray-400 shadow-sm hover:text-gray-600 focus:outline-none cursor-grab active:cursor-grabbing z-20"
        aria-label={`拖拽${label}`}
      >
        <GripVertical className="h-3.5 w-3.5" />
      </button>
      <div ref={contentRef}>
        {children}
      </div>
    </div>
  )
}

export default function PresentPage() {
  const [layouts, setLayouts] = useState<Layouts>(DEFAULT_LAYOUTS)
  const [mounted, setMounted] = useState(false)
  const lastKnownRows = useRef<Partial<Record<ModuleKey, number>>>({})

  useEffect(() => {
    if (typeof window === "undefined") return

    const loadLayouts = async () => {
      try {
        // 优先从数据库加载
        const response = await fetch('/api/preferences?key=' + LAYOUT_STORAGE_KEY)
        if (response.ok) {
          const data = await response.json()
          const parsed = data.value as Layouts
          setLayouts(sanitizeLayouts(parsed))
          // 同步到 localStorage 作为缓存
          window.localStorage.setItem(LAYOUT_STORAGE_KEY, JSON.stringify(parsed))
        } else {
          // 数据库没有，尝试从 localStorage 恢复
          const stored = window.localStorage.getItem(LAYOUT_STORAGE_KEY)
          if (stored) {
            const parsed = JSON.parse(stored) as Layouts
            setLayouts(sanitizeLayouts(parsed))
            // 保存到数据库
            await fetch('/api/preferences', {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ key: LAYOUT_STORAGE_KEY, value: parsed })
            })
          }
        }
      } catch (error) {
        console.error("Failed to load saved Present layouts", error)
        // 失败时尝试 localStorage
        try {
          const stored = window.localStorage.getItem(LAYOUT_STORAGE_KEY)
          if (stored) {
            const parsed = JSON.parse(stored) as Layouts
            setLayouts(sanitizeLayouts(parsed))
          }
        } catch (e) {
          console.error("Failed to load from localStorage", e)
        }
      }

      setMounted(true)
    }

    loadLayouts()
  }, [])

  useEffect(() => {
    if (!mounted || typeof window === "undefined") return

    const saveLayouts = async () => {
      try {
        // 保存到 localStorage（即时缓存）
        window.localStorage.setItem(LAYOUT_STORAGE_KEY, JSON.stringify(layouts))

        // 保存到数据库（持久化）
        await fetch('/api/preferences', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ key: LAYOUT_STORAGE_KEY, value: layouts })
        })
      } catch (error) {
        console.error("Failed to persist Present layouts", error)
      }
    }

    saveLayouts()
  }, [layouts, mounted])

  const handleHeightChange = useCallback((moduleId: ModuleKey, height: number) => {
    const minRows = MODULE_MIN_ROWS[moduleId] ?? DEFAULT_MIN_ROWS
    const rows = Math.max(
      minRows,
      Math.ceil((height + GRID_MARGIN[1]) / (ROW_HEIGHT + GRID_MARGIN[1]))
    )

    if (lastKnownRows.current[moduleId] === rows) return
    lastKnownRows.current[moduleId] = rows

    setLayouts(prevLayouts => {
      let layoutChanged = false
      const nextLayouts: Layouts = {}

      Object.keys(prevLayouts).forEach(breakpoint => {
        const layout = prevLayouts[breakpoint] ?? []
        if (layout.length === 0) {
          nextLayouts[breakpoint] = layout
          return
        }

        let updated = false
        const adjustedLayout = layout.map(item => {
          if (item.i !== moduleId) return item
          if (item.h === rows) return item
          updated = true
          return { ...item, h: rows }
        })

        nextLayouts[breakpoint] = updated ? adjustedLayout : layout
        layoutChanged = layoutChanged || updated
      })

      return layoutChanged ? nextLayouts : prevLayouts
    })
  }, [])

  const handleLayoutChange = useCallback((_: Layout[], allLayouts: Layouts) => {
    setLayouts(allLayouts)
  }, [])

  const handleBreakpointChange = useCallback(() => {
    lastKnownRows.current = {}
  }, [])

  const grid = (
    <ResponsiveGridLayout
      className="present-grid"
      layouts={layouts}
      breakpoints={BREAKPOINTS}
      cols={COLS}
      margin={GRID_MARGIN}
      rowHeight={ROW_HEIGHT}
      compactType="vertical"
      draggableHandle=".module-drag-handle"
      onLayoutChange={handleLayoutChange}
      onBreakpointChange={handleBreakpointChange}
      useCSSTransforms
      preventCollision={false}
    >
      {MODULES.map(module => (
        <div key={module.id} className="h-full">
          <ModuleContainer
            id={module.id}
            label={module.label}
            onHeightChange={handleHeightChange}
          >
            {module.render()}
          </ModuleContainer>
        </div>
      ))}
    </ResponsiveGridLayout>
  )

  const fallbackGrid = (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
      {MODULES.map(module => (
        <div key={module.id} className="relative">
          <ModuleContainer
            id={module.id}
            label={module.label}
            onHeightChange={handleHeightChange}
          >
            {module.render()}
          </ModuleContainer>
        </div>
      ))}
    </div>
  )

  return (
    <div className="min-h-screen px-6 pt-6 pb-6 bg-gradient-to-br from-gray-500 via-gray-400 to-gray-300">
      <div className="mx-auto w-full max-w-none">
        {/* 头部导航 */}
        <div className="mb-8 flex items-start justify-between">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">现在 · Present</h1>
            <p className="text-gray-600">专注当下，这是唯一真实的时刻</p>
          </div>
          <DailyReviewButton />
        </div>

        {/* 时态导航 */}
        <div className="mb-6 flex justify-center gap-3">
          {TIMELINE_NAVIGATION.map(item => {
            const Icon = item.icon
            const content = (
              <span className="flex items-center gap-2">
                <Icon className="h-4 w-4" />
                <span className="text-sm font-medium tracking-wide">{item.label}</span>
              </span>
            )

            if (item.isCurrent) {
              return (
                <div
                  key={item.label}
                  className="rounded-full bg-gradient-to-r from-blue-500 to-blue-600 px-6 py-2 text-white shadow-lg shadow-blue-900/30"
                >
                  {content}
                </div>
              )
            }

            return (
              <Link
                key={item.label}
                href={item.href}
                className="rounded-full border border-white/30 bg-white/10 px-6 py-2 text-white shadow-sm backdrop-blur transition hover:bg-white/20"
              >
                {content}
              </Link>
            )
          })}
        </div>

        {/* Memento Mori 提醒 */}
        <div className="text-center mb-8">
          <p className="text-white text-2xl italic font-semibold tracking-wide drop-shadow-sm">
            Memento Mori — 记住你终将死去
          </p>
        </div>

        {/* 主要功能区域 */}
        <div className="mb-10">
          {mounted ? grid : fallbackGrid}
        </div>

        {/* 快捷导航 */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          <Link href="/whiteboard">
            <Card className="p-4 hover:shadow-md transition-shadow cursor-pointer border-green-200 bg-green-50">
              <div className="flex flex-col items-center">
                <MessageSquare className="w-6 h-6 mb-2 text-green-600" />
                <span className="text-sm text-green-700 font-medium">思维整理</span>
              </div>
            </Card>
          </Link>
          <Link href="/schedule">
            <Card className="p-4 hover:shadow-md transition-shadow cursor-pointer border-blue-200 bg-blue-50">
              <div className="flex flex-col items-center">
                <Calendar className="w-6 h-6 mb-2 text-blue-600" />
                <span className="text-sm text-blue-700 font-medium">日程安排</span>
              </div>
            </Card>
          </Link>
          <Link href="/mental-models">
            <Card className="p-4 hover:shadow-md transition-shadow cursor-pointer border-purple-200 bg-purple-50">
              <div className="flex flex-col items-center">
                <Brain className="w-6 h-6 mb-2 text-purple-600" />
                <span className="text-sm text-purple-700 font-medium">心智模型</span>
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
