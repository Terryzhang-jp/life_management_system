"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Plus, X, Download, Upload, Save, Loader2, ListTodo, Lightbulb } from "lucide-react"
import { storage } from "@/lib/storage"
import { apiManager } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"
import Link from "next/link"

interface LifeData {
  topLogic: string
  roles: string[]
  behaviors: string[]
  wants: string[]
  dontWants: string[]
  qualities: string[]
}

export default function LifePhilosophyApp() {
  const { toast } = useToast()
  const [data, setData] = useState<LifeData>({
    topLogic: "",
    roles: [],
    behaviors: [],
    wants: [],
    dontWants: [],
    qualities: [],
  })

  const [isLoading, setIsLoading] = useState({
    save: false,
    export: false,
    import: false
  })

  // 加载数据
  useEffect(() => {
    const loadData = async () => {
      // 先尝试从 API 加载
      const apiData = await apiManager.loadData()
      if (apiData) {
        setData(apiData)
      } else {
        // 如果 API 失败，从 localStorage 加载
        const localData = storage.load()
        if (localData) {
          setData(localData)
        }
      }
    }

    loadData()
  }, [])

  // 自动保存到 localStorage
  useEffect(() => {
    const timer = setTimeout(() => {
      storage.save(data)
    }, 1000)

    return () => clearTimeout(timer)
  }, [data])

  const [newInputs, setNewInputs] = useState({
    role: "",
    behavior: "",
    want: "",
    dontWant: "",
    quality: "",
  })

  const addItem = (category: keyof Omit<LifeData, "topLogic">, value: string) => {
    if (value.trim()) {
      setData((prev) => ({
        ...prev,
        [category]: [...prev[category], value.trim()],
      }))
      setNewInputs((prev) => ({ ...prev, [category === "roles" ? "role" : category === "behaviors" ? "behavior" : category === "wants" ? "want" : category === "dontWants" ? "dontWant" : "quality"]: "" }))
    }
  }

  const removeItem = (category: keyof Omit<LifeData, "topLogic">, index: number) => {
    setData((prev) => ({
      ...prev,
      [category]: prev[category].filter((_, i) => i !== index),
    }))
  }

  const handleExport = async () => {
    setIsLoading(prev => ({ ...prev, export: true }))
    try {
      await apiManager.exportData()
      toast({
        title: "导出成功",
        description: "数据已成功导出到文件",
      })
    } catch (error) {
      toast({
        title: "导出失败",
        description: "导出数据时出现错误，请稍后重试",
        variant: "destructive",
      })
    } finally {
      setIsLoading(prev => ({ ...prev, export: false }))
    }
  }

  const handleImport = async () => {
    setIsLoading(prev => ({ ...prev, import: true }))
    try {
      const importedData = await apiManager.importData()
      if (importedData) {
        setData(importedData)
        toast({
          title: "导入成功",
          description: "数据已成功导入并保存",
        })
      }
    } catch (error) {
      toast({
        title: "导入失败",
        description: "导入数据时出现错误，请检查文件格式",
        variant: "destructive",
      })
    } finally {
      setIsLoading(prev => ({ ...prev, import: false }))
    }
  }

  const handleSave = async () => {
    setIsLoading(prev => ({ ...prev, save: true }))
    try {
      // 立即保存到 localStorage
      storage.save(data)

      // 保存到数据库
      const success = await apiManager.saveData(data)
      if (success) {
        toast({
          title: "保存成功",
          description: "数据已成功保存到数据库",
        })
      } else {
        throw new Error('Database save failed')
      }
    } catch (error) {
      toast({
        title: "保存失败",
        description: "保存数据时出现错误，请稍后重试",
        variant: "destructive",
      })
    } finally {
      setIsLoading(prev => ({ ...prev, save: false }))
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-4xl mx-auto py-10 px-4">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold tracking-tight mb-2">人生顶层逻辑</h1>
          <p className="text-muted-foreground mb-6">探索并记录你的人生哲学与核心价值观</p>

          {/* 导航按钮 */}
          <div className="mb-4 flex gap-2">
            <Link href="/">
              <Button variant="outline" size="sm">
                返回主页
              </Button>
            </Link>
            <Link href="/tasks">
              <Button variant="outline" size="sm">
                <ListTodo className="w-4 h-4 mr-2" />
                任务管理
              </Button>
            </Link>
            <Link href="/thoughts">
              <Button variant="outline" size="sm">
                <Lightbulb className="w-4 h-4 mr-2" />
                思考记录
              </Button>
            </Link>
          </div>

          {/* 操作按钮 */}
          <div className="flex justify-center gap-2">
            <Button
              onClick={handleSave}
              variant="outline"
              size="sm"
              disabled={isLoading.save}
            >
              {isLoading.save ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              保存
            </Button>
            <Button
              onClick={handleExport}
              variant="outline"
              size="sm"
              disabled={isLoading.export}
            >
              {isLoading.export ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Download className="w-4 h-4 mr-2" />
              )}
              导出
            </Button>
            <Button
              onClick={handleImport}
              variant="outline"
              size="sm"
              disabled={isLoading.import}
            >
              {isLoading.import ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Upload className="w-4 h-4 mr-2" />
              )}
              导入
            </Button>
          </div>
        </div>

        <div className="space-y-8">
          {/* 1. 顶层逻辑 */}
          <Card>
            <CardHeader>
              <CardTitle>你觉得人生的顶层逻辑是什么？</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder="在这里分享你对人生顶层逻辑的理解..."
                value={data.topLogic}
                onChange={(e) => setData((prev) => ({ ...prev, topLogic: e.target.value }))}
                className="min-h-[120px] resize-none"
              />
            </CardContent>
          </Card>

          {/* 2. 角色定义 */}
          <Card>
            <CardHeader>
              <CardTitle>你觉得自己的角色分别是什么？</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex gap-2">
                  <Input
                    placeholder="添加一个角色"
                    value={newInputs.role}
                    onChange={(e) => setNewInputs((prev) => ({ ...prev, role: e.target.value }))}
                  />
                  <Button
                    onClick={() => addItem("roles", newInputs.role)}
                    size="icon"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                {data.roles.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {data.roles.map((role, index) => (
                      <Badge key={index} variant="outline" className="py-1 px-3">
                        {role}
                        <button
                          onClick={() => removeItem("roles", index)}
                          className="ml-2 hover:text-destructive"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* 3. 行为定义 */}
          <Card>
            <CardHeader>
              <CardTitle>你觉得自己应该做哪些事情？</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex gap-2">
                  <Input
                    placeholder="添加一个行为"
                    value={newInputs.behavior}
                    onChange={(e) => setNewInputs((prev) => ({ ...prev, behavior: e.target.value }))}
                  />
                  <Button
                    onClick={() => addItem("behaviors", newInputs.behavior)}
                    size="icon"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                {data.behaviors.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {data.behaviors.map((behavior, index) => (
                      <Badge key={index} variant="outline" className="py-1 px-3">
                        {behavior}
                        <button
                          onClick={() => removeItem("behaviors", index)}
                          className="ml-2 hover:text-destructive"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* 4. 想要的和不想要的 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>想要的</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <Label>想要的</Label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="添加想要的"
                      value={newInputs.want}
                      onChange={(e) => setNewInputs((prev) => ({ ...prev, want: e.target.value }))}
                    />
                    <Button
                      onClick={() => addItem("wants", newInputs.want)}
                      size="icon"
                      variant="outline"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  {data.wants.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {data.wants.map((want, index) => (
                        <Badge key={index} variant="outline" className="py-1 px-3">
                          {want}
                          <button
                            onClick={() => removeItem("wants", index)}
                            className="ml-2 hover:text-destructive"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>不想要的</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <Label>不想要的</Label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="添加不想要的"
                      value={newInputs.dontWant}
                      onChange={(e) => setNewInputs((prev) => ({ ...prev, dontWant: e.target.value }))}
                    />
                    <Button
                      onClick={() => addItem("dontWants", newInputs.dontWant)}
                      size="icon"
                      variant="outline"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  {data.dontWants.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {data.dontWants.map((dontWant, index) => (
                        <Badge key={index} variant="outline" className="py-1 px-3">
                          {dontWant}
                          <button
                            onClick={() => removeItem("dontWants", index)}
                            className="ml-2 hover:text-destructive"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 5. 品质 */}
          <Card>
            <CardHeader>
              <CardTitle>你觉得自己应该有哪些品质？</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex gap-2">
                  <Input
                    placeholder="添加一个重要品质"
                    value={newInputs.quality}
                    onChange={(e) => setNewInputs((prev) => ({ ...prev, quality: e.target.value }))}
                  />
                  <Button
                    onClick={() => addItem("qualities", newInputs.quality)}
                    size="icon"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                {data.qualities.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {data.qualities.map((quality, index) => (
                      <Badge key={index} variant="outline" className="py-1 px-3">
                        {quality}
                        <button
                          onClick={() => removeItem("qualities", index)}
                          className="ml-2 hover:text-destructive"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Footer */}
          <div className="text-center py-8">
            <Separator className="mb-6" />
            <p className="text-muted-foreground">持续思考，持续成长</p>
          </div>
        </div>
      </div>
    </div>
  )
}