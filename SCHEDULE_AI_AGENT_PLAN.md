# Schedule AI Agent 实施计划

## 📋 项目概述

**目标**：在日程安排页面添加智能AI助手，支持多轮对话式日程规划

**核心能力**：
- 按需查询任务和日程数据（避免全上下文）
- 多轮交互式探索和规划
- 透明的思考过程展示
- Plan-Then-Execute执行模式
- 智能理解用户意图

---

## 🏗️ 文件架构

### 新增文件

```
frontend/
├── lib/schedule/
│   ├── tools.ts                     # Schedule工具定义（6个工具）
│   ├── system-prompt.ts             # Agent系统提示词
│   └── agent-types.ts               # TypeScript类型定义
│
├── app/api/schedule-assistant/
│   └── chat/
│       └── route.ts                 # Schedule Agent API路由
│
└── components/schedule/
    └── schedule-assistant-drawer.tsx  # 右侧抽屉式聊天UI
```

### 修改文件

```
frontend/
├── app/schedule/page.tsx            # 添加AI助手按钮和状态管理
├── lib/workspace/planner.ts         # 导出ExecutionPlan类型（复用）
└── lib/workspace/executor.ts        # 导出executePlan（复用）
```

---

## 🔧 工具定义（6个核心工具）

### 只读工具（探索阶段）

```typescript
1. query_schedule
   - 查询指定日期范围的日程安排
   - 支持按状态、任务ID、分类筛选
   - 返回：ScheduleBlock[]

2. query_tasks
   - 查询任务列表
   - 支持按类型、分类筛选
   - 返回：Task[]

3. query_schedulable_tasks
   - 查询可调度的任务（子子任务 + 无子任务的子任务）
   - 支持按父任务ID筛选
   - 返回：Task[]
```

### 写入工具（执行阶段）

```typescript
4. create_schedule_block
   - 创建一个日程块
   - 自动检测时间冲突
   - 返回：ScheduleBlock | Error

5. update_schedule_block
   - 更新日程块（时间、状态、备注等）
   - 支持移动到新日期
   - 返回：ScheduleBlock | Error

6. delete_schedule_block
   - 删除日程块
   - 返回：Success | Error
```

---

## 🔄 工作流程（3阶段）

### Phase 1: 探索对话（可多轮）

```
用户输入
  ↓
Agent思考："我需要了解..."
  ↓
调用只读工具（query_schedule, query_tasks等）
  ↓
返回分析和建议
  ↓
用户追问或调整
  ↓
[循环]
```

**技术实现**：
- 使用 `streamText` + `maxSteps: 10`
- 只注册只读工具
- SSE流式返回每一步

### Phase 2: Plan生成（用户确认触发）

```
Agent识别确认信号（"好的"、"确认"、"就这样"）
  ↓
调用 generatePlan()
  ↓
返回结构化ExecutionPlan
  ↓
前端显示蓝色Plan预览卡片
```

**技术实现**：
- 复用 `lib/workspace/planner.ts` 的 `generatePlan()`
- 添加schedule专用的system prompt
- 返回 `{type: 'plan', plan: ExecutionPlan}`

### Phase 3: 执行（用户点击确认）

```
前端发送 planToExecute
  ↓
调用 executePlan()
  ↓
顺序执行写入工具
  ↓
返回执行结果（成功/失败）
  ↓
前端显示绿色/红色反馈
```

**技术实现**：
- 复用 `lib/workspace/executor.ts` 的 `executePlan()`
- 注册写入工具到工具注册表
- 返回 `{type: 'execution_complete', success, summary, logs}`

---

## 📝 详细任务拆分

### Task 1: 工具层实现（lib/schedule/tools.ts）

**时间估计**: 2小时

**子任务**：
- [x] 1.1 定义TypeScript类型（ToolResult, ToolRegistry等）
- [ ] 1.2 实现 `query_schedule` 工具
  - 调用 `/api/schedule/week` 获取数据
  - 支持日期范围筛选
  - 支持状态、任务ID、分类筛选
- [ ] 1.3 实现 `query_tasks` 工具
  - 调用 `/api/tasks` 获取数据
  - 支持类型、分类筛选
- [ ] 1.4 实现 `query_schedulable_tasks` 工具
  - 调用 `/api/tasks/schedulable` 获取数据
  - 支持父任务ID筛选
- [ ] 1.5 实现 `create_schedule_block` 工具
  - 调用 `/api/schedule/blocks` POST
  - 内置冲突检测
  - 返回详细错误信息
- [ ] 1.6 实现 `update_schedule_block` 工具
  - 调用 `/api/schedule/blocks` PUT
  - 支持部分更新
- [ ] 1.7 实现 `delete_schedule_block` 工具
  - 调用 `/api/schedule/blocks` DELETE
- [ ] 1.8 导出工具注册表 `scheduleTools`

**文件内容示例**：
```typescript
// lib/schedule/tools.ts
import { tool } from 'ai'
import { z } from 'zod'

export const query_schedule = tool({
  description: '查询日程安排',
  parameters: z.object({
    startDate: z.string().describe('开始日期 YYYY-MM-DD'),
    endDate: z.string().describe('结束日期 YYYY-MM-DD'),
    status: z.array(z.string()).optional(),
    taskId: z.number().optional(),
    categoryId: z.number().optional()
  }),
  execute: async ({ startDate, endDate, status, taskId, categoryId }) => {
    // 实现...
  }
})

// 导出工具注册表
export const scheduleTools = {
  query_schedule,
  query_tasks,
  query_schedulable_tasks,
  create_schedule_block,
  update_schedule_block,
  delete_schedule_block
}
```

---

### Task 2: 系统提示词（lib/schedule/system-prompt.ts）

**时间估计**: 30分钟

**子任务**：
- [ ] 2.1 编写Agent角色定义
- [ ] 2.2 定义工作流程（探索→建议→确认→执行）
- [ ] 2.3 明确只读工具和写入工具的使用边界
- [ ] 2.4 添加示例对话（few-shot learning）
- [ ] 2.5 定义确认信号识别规则

**提示词结构**：
```markdown
# 角色
你是一个智能日程规划助手。

# 工作流程
1. 理解用户需求
2. 主动调用工具收集信息
3. 给出分析和建议
4. 支持多轮对话细化
5. 识别确认信号后生成执行计划

# 工具使用原则
- 探索阶段：只使用query_*工具
- 执行阶段：使用create/update/delete工具
- 永远不要直接执行写入操作，必须等待用户确认

# 确认信号
当用户说出以下词语时，表示确认执行：
- "好的"、"确认"、"就这样"、"开始安排"
- 此时应生成结构化计划

# 示例对话
[添加2-3个完整对话示例]
```

---

### Task 3: API路由实现（app/api/schedule-assistant/chat/route.ts）

**时间估计**: 2小时

**子任务**：
- [ ] 3.1 创建基础路由结构
- [ ] 3.2 实现Phase 1（探索对话）
  - 使用 `streamText` + `maxSteps: 10`
  - 注册只读工具
  - SSE流式返回
- [ ] 3.3 实现Phase 2（Plan生成）
  - 识别确认信号（可能需要工具调用或规则判断）
  - 调用 `generatePlan()`
  - 返回plan事件
- [ ] 3.4 实现Phase 3（Plan执行）
  - 接收 `planToExecute` 参数
  - 调用 `executePlan()`
  - 返回执行结果
- [ ] 3.5 添加错误处理和日志

**路由结构**：
```typescript
export async function POST(req: NextRequest) {
  const { message, messages, planToExecute } = await req.json()

  // 分支1: 执行Plan
  if (planToExecute) {
    return handlePlanExecution(planToExecute)
  }

  // 分支2: 探索对话
  return handleConversation(message, messages)
}
```

---

### Task 4: 前端UI实现（components/schedule/schedule-assistant-drawer.tsx）

**时间估计**: 2.5小时

**子任务**：
- [ ] 4.1 创建抽屉式组件结构
  - 右侧滑出，覆盖1/4屏幕宽度
  - 固定在最上层（z-index）
  - 打开/关闭动画
- [ ] 4.2 实现对话历史显示
  - 用户消息气泡（右侧）
  - Agent消息气泡（左侧）
  - 工具调用卡片（灰色小卡片）
  - 思考过程显示（斜体）
- [ ] 4.3 实现输入框和发送功能
  - Textarea + 发送按钮
  - Enter发送，Shift+Enter换行
  - Loading状态
- [ ] 4.4 集成Plan预览卡片
  - 复用 `PlanPreviewCard` 组件
  - 显示在对话流中
  - 确认/取消按钮
- [ ] 4.5 集成执行结果显示
  - 绿色成功卡片
  - 红色失败卡片
  - 3秒自动消失
- [ ] 4.6 实现SSE事件处理
  - `thinking` - 显示思考过程
  - `tool_call` - 显示工具调用
  - `tool_result` - 可选显示结果
  - `message` - 显示Agent回复
  - `plan` - 显示Plan预览
  - `execution_complete` - 显示执行结果

**组件API**：
```typescript
interface ScheduleAssistantDrawerProps {
  isOpen: boolean
  onClose: () => void
  onScheduleCreated: () => void  // 刷新日程视图
}
```

---

### Task 5: 集成到Schedule页面（app/schedule/page.tsx）

**时间估计**: 1小时

**子任务**：
- [ ] 5.1 添加AI助手按钮
  - 位置：右下角固定按钮（类似思考记录按钮）
  - 图标：🤖 或 ✨
  - 动画：吸引注意力的脉冲效果
- [ ] 5.2 添加状态管理
  - `assistantOpen` 控制抽屉开关
  - 对话历史本地存储（可选）
- [ ] 5.3 集成ScheduleAssistantDrawer组件
- [ ] 5.4 实现刷新回调
  - Plan执行成功后刷新日程视图
  - 调用 `fetchWeekSchedule()`

**按钮设计**：
```tsx
<button
  onClick={() => setAssistantOpen(true)}
  className="fixed bottom-6 right-6 z-40
             w-14 h-14 rounded-full
             bg-gradient-to-r from-blue-500 to-purple-600
             text-white shadow-lg
             hover:scale-110 transition-transform
             animate-pulse"
>
  ✨
</button>
```

---

### Task 6: 类型定义和工具导出（lib/schedule/agent-types.ts）

**时间估计**: 30分钟

**子任务**：
- [ ] 6.1 定义Schedule专用类型
  - `ScheduleQuery`
  - `ScheduleToolResult`
- [ ] 6.2 从workspace导出复用类型
  - `ExecutionPlan`
  - `ExecutionStep`
- [ ] 6.3 定义SSE事件类型
  - `ThinkingEvent`
  - `ToolCallEvent`
  - `MessageEvent`
  - `PlanEvent`
  - `ExecutionCompleteEvent`

---

### Task 7: 测试和优化

**时间估计**: 1.5小时

**子任务**：
- [ ] 7.1 端到端测试
  - 场景1: 探索式规划
  - 场景2: 快速执行
  - 场景3: 批量重排
  - 场景4: 分析总结
- [ ] 7.2 错误处理测试
  - 时间冲突
  - 无效任务ID
  - 网络错误
- [ ] 7.3 性能优化
  - 减少不必要的工具调用
  - 优化SSE流式传输
- [ ] 7.4 UI/UX调整
  - 动画流畅度
  - 文案优化
  - 颜色和间距

---

## 📊 总体时间估算

| 任务 | 时间 |
|------|------|
| Task 1: 工具层 | 2.0h |
| Task 2: 系统提示词 | 0.5h |
| Task 3: API路由 | 2.0h |
| Task 4: 前端UI | 2.5h |
| Task 5: 页面集成 | 1.0h |
| Task 6: 类型定义 | 0.5h |
| Task 7: 测试优化 | 1.5h |
| **总计** | **10.0h** |

**缓冲时间**: +2小时（处理未预见问题）

**最终估算**: 12小时（1.5个工作日）

---

## 🎯 实施顺序

### Phase 1: 基础设施（4小时）
```
Task 6 → Task 1 → Task 2
```
- 先定义类型
- 实现工具层
- 编写系统提示词

### Phase 2: 后端实现（2小时）
```
Task 3
```
- 实现API路由
- 集成工具和提示词

### Phase 3: 前端实现（4小时）
```
Task 4 → Task 5
```
- 开发抽屉UI
- 集成到Schedule页面

### Phase 4: 测试完善（2小时）
```
Task 7
```
- 端到端测试
- 优化体验

---

## ✅ 验收标准

### 功能验收

- [ ] 用户可以通过自然语言与Agent对话
- [ ] Agent能主动调用工具查询信息
- [ ] 支持多轮对话，能理解上下文
- [ ] Agent给出的建议合理且基于实际数据
- [ ] Plan预览清晰展示所有步骤
- [ ] Plan执行成功后日程视图自动刷新
- [ ] 错误处理友好，有清晰提示

### 性能验收

- [ ] 首次响应时间 < 3秒
- [ ] 工具调用延迟 < 1秒
- [ ] SSE流式传输流畅无卡顿
- [ ] 不会出现重复工具调用

### UX验收

- [ ] 思考过程对用户可见
- [ ] 工具调用有明确提示
- [ ] Plan预览卡片美观易读
- [ ] 执行结果反馈及时
- [ ] 动画流畅自然

---

## 🚀 后续优化方向

### V1.0（当前计划）
- 基础对话式规划
- 6个核心工具
- 单轮Plan执行

### V2.0（未来）
- 循环规划支持（"每周一都..."）
- 智能推荐空闲时间
- 任务优先级自动排序
- 历史习惯学习

### V3.0（愿景）
- 语音输入支持
- 移动端优化
- 与其他模块联动（任务、笔记）
- 长期目标自动分解到日程

---

## 📚 技术参考

### 依赖库
- Vercel AI SDK v5 - Agent框架
- Zod - Schema验证
- Better-SQLite3 - 数据库操作

### 复用组件
- `PlanPreviewCard` - Plan预览卡片
- `executePlan` - Plan执行引擎
- `generatePlan` - Plan生成器

### API端点
- `/api/schedule/week` - 查询周日程
- `/api/schedule/blocks` - CRUD日程块
- `/api/tasks` - 查询任务
- `/api/tasks/schedulable` - 查询可调度任务

---

## 🎬 开始实施

**准备工作**：
1. 确认系统设计
2. 创建功能分支 `feature/schedule-ai-agent`
3. 按照Task顺序逐步实施
4. 每完成一个Task提交一次代码

**沟通机制**：
- 遇到问题随时反馈
- 每个Task完成后演示验证
- 最终整体测试验收

---

**准备好了吗？让我们开始吧！** 🚀
