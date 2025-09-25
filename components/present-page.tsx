"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import {
  DndContext,
  PointerSensor,
  TouchSensor,
  closestCenter,
  DragEndEvent,
  useSensor,
  useSensors
} from "@dnd-kit/core"
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  useSortable
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Clock, ArrowLeft, ArrowRight, Home, BookOpen, ListTodo, Lightbulb, Calendar, GripVertical } from "lucide-react"
import AnalogClock from "@/components/analog-clock"
import { HabitTracker } from "@/components/habit-tracker"
import { DailyDecisions } from "@/components/daily-decisions"
import { ThoughtsAndConcerns } from "@/components/thoughts-and-concerns"
import { TodayTimeline } from "@/components/schedule/today-timeline"
import { cn } from "@/lib/utils"

type ModuleKey = "clock" | "decisions" | "habits" | "thoughts" | "timeline"

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
    id: "timeline",
    label: "今日时间线",
    render: () => <TodayTimeline />
  }
]

function SortableModule({
  id,
  label,
  children
}: {
  id: ModuleKey
  label: string
  children: JSX.Element
}) {
  const {
    attributes,
    isDragging,
    listeners,
    setNodeRef,
    transform,
    transition
  } = useSortable({ id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "relative",
        isDragging && "z-30"
      )}
    >
      <button
        {...attributes}
        {...listeners}
        type="button"
        className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2 rounded-full border border-gray-200 bg-white px-2 py-1 text-gray-400 shadow-sm hover:text-gray-600 focus:outline-none cursor-grab active:cursor-grabbing z-20"
        aria-label={`拖拽${label}`}
      >
        <GripVertical className="h-3.5 w-3.5" />
      </button>
      <div
        className={cn(
          "transition-all",
          isDragging ? "scale-[1.01] shadow-lg" : "shadow-sm"
        )}
      >
        {children}
      </div>
    </div>
  )
}

export default function PresentPage() {
  const [moduleOrder, setModuleOrder] = useState<ModuleKey[]>(
    MODULES.map(module => module.id)
  )

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 }
    }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 150, tolerance: 8 }
    })
  )

  const moduleLookup = useMemo(() => {
    return MODULES.reduce((acc, module) => {
      acc[module.id] = module
      return acc
    }, {} as Record<ModuleKey, ModuleConfig>)
  }, [])

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return

    setModuleOrder(items => {
      const oldIndex = items.indexOf(active.id as ModuleKey)
      const newIndex = items.indexOf(over.id as ModuleKey)
      if (oldIndex === -1 || newIndex === -1) return items
      return arrayMove(items, oldIndex, newIndex)
    })
  }

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

        {/* 主要功能区域 */}
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={moduleOrder} strategy={rectSortingStrategy}>
            <div className="mb-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
              {moduleOrder.map(moduleId => {
                const moduleConfig = moduleLookup[moduleId]
                return (
                  <SortableModule key={moduleConfig.id} id={moduleConfig.id} label={moduleConfig.label}>
                    {moduleConfig.render()}
                  </SortableModule>
                )
              })}
            </div>
          </SortableContext>
        </DndContext>

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
