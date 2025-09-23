import { ArrowLeft, CheckCircle2, Clock, History } from "lucide-react"
import Link from "next/link"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import completedTasksDbManager, { CompletedTask } from "@/lib/completed-tasks-db"

const formatDate = (dateString?: string) => {
  if (!dateString) return ""
  const date = new Date(dateString)
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(date)
}

export default async function CompletedTasksTimelinePage() {
  const completedTasks = await completedTasksDbManager.getCompletedTasks()

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-6 py-10">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
              <CheckCircle2 className="h-7 w-7 text-green-600" />
              已完成任务时间线
            </h1>
            <p className="text-gray-600 mt-1">沿着时间线回顾每一次完成的任务与心得</p>
          </div>
          <div className="flex gap-2">
            <Link href="/tasks">
              <Button variant="outline" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />返回任务管理
              </Button>
            </Link>
            <Link href="/past">
              <Button variant="outline" size="sm">
                <History className="h-4 w-4 mr-2" />返回过去主页
              </Button>
            </Link>
          </div>
        </div>

        {completedTasks.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center text-gray-500">
              尚未有完成任务的记录，继续加油！
            </CardContent>
          </Card>
        ) : (
          <div className="relative pl-6">
            <div className="absolute left-2 top-1 bottom-1 w-px bg-gray-200" aria-hidden />
            <div className="space-y-6">
              {completedTasks.map((task: CompletedTask) => (
                <div key={task.id} className="relative">
                  <div className="absolute -left-[17px] top-6 flex h-4 w-4 items-center justify-center rounded-full border border-green-200 bg-white">
                    <div className="h-2 w-2 rounded-full bg-green-500" />
                  </div>
                  <Card className="border border-green-100 shadow-sm">
                    <CardHeader className="pb-2">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-2 text-sm text-green-700">
                          <Clock className="h-4 w-4" />
                          <span>{formatDate(task.completedAt)}</span>
                        </div>
                        <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600">
                          {task.taskType === "routine"
                            ? "日常习惯"
                            : task.taskType === "long-term"
                            ? "长期任务"
                            : task.taskType === "short-term"
                            ? "短期任务"
                            : "任务"}
                        </span>
                      </div>
                      <CardTitle className="text-xl text-gray-900 mt-2">{task.taskTitle}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3 text-sm text-gray-600">
                      <div className="flex flex-wrap gap-4 text-xs text-gray-500">
                        <span>任务层级：{task.taskLevel === 0 ? "主任务" : task.taskLevel === 1 ? "子任务" : "子子任务"}</span>
                        {task.parentTaskId && <span>父任务 ID：{task.parentTaskId}</span>}
                        {task.grandparentTaskId && <span>祖父任务 ID：{task.grandparentTaskId}</span>}
                      </div>
                      <Separator />
                      <div>
                        <h3 className="text-sm font-medium text-gray-700 mb-1">完成感悟</h3>
                        <p className="leading-relaxed text-gray-600">
                          {task.completionComment || "没有填写感悟，但这次完成同样值得记录。"}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
