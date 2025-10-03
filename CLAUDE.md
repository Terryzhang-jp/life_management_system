# Life Philosophy Frontend

## 项目概述
这是一个基于"过去-现在-未来"时态哲学的个人生活管理应用，使用 Next.js 14 + TypeScript + Tailwind CSS 构建。通过三个时态页面构建完整的生命管理体系：回顾过去的经验与成就、专注现在的行动与时间、规划未来的目标与愿景。系统已涵盖任务管理、思考记录、时间追踪，以及最新的完成时间线与开销票据管理等核心功能。

## 技术栈
- **框架**: Next.js 14.1.4 (App Router)
- **语言**: TypeScript 5.4.3
- **样式**: Tailwind CSS 3.4.1 + shadcn/ui 组件库
- **数据库**: Better-SQLite3 (本地存储)
- **状态管理**: React Hooks
- **图标**: Lucide React + Radix Icons

## 项目结构
```
frontend/
├── app/                    # Next.js App Router 路由
│   ├── api/               # API 路由
│   │   ├── data/         # 生活哲学数据 API
│   │   ├── tasks/        # 任务管理 API
│   │   ├── thoughts/     # 思考记录 API
│   │   ├── habits/       # 习惯追踪 API
│   │   ├── decisions/    # 每日决策 API
│   │   ├── memories/     # 记忆管理 API
│   │   ├── completed-tasks/ # 任务完成记录 API
│   │   ├── expenses/     # 开销记录 API（支持票据上传）
│   │   ├── expense-categories/ # 开销属性管理 API
│   │   ├── schedule/     # 日程安排 API
│   │   │   ├── week/route.ts      # 周日程查询
│   │   │   ├── day/route.ts       # 日日程查询
│   │   │   ├── blocks/route.ts    # 日程块CRUD
│   │   │   └── conflicts/route.ts # 时间冲突检测
│   │   ├── export/       # 数据导出 API
│   │   └── import/       # 数据导入 API
│   ├── past/             # 过去页面（回顾与复盘）
│   │   ├── completed/page.tsx  # 已完成任务时间线
│   │   ├── expenses/page.tsx   # 开销记录与票据管理
│   │   └── page.tsx
│   ├── future/           # 未来页面（愿景与规划）
│   │   └── page.tsx
│   ├── philosophy/       # 人生哲学页面
│   │   └── page.tsx
│   ├── tasks/            # 任务管理页面
│   │   └── page.tsx
│   ├── schedule/         # 日程安排页面
│   │   └── page.tsx
│   ├── thoughts/         # 思考记录页面
│   │   └── page.tsx
│   ├── layout.tsx        # 根布局（包含全局思考记录按钮）
│   ├── globals.css       # 全局样式
│   └── page.tsx          # 现在页面（主页）
├── components/            # React 组件
│   ├── ui/               # shadcn/ui 基础组件
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── input.tsx
│   │   ├── textarea.tsx
│   │   ├── badge.tsx
│   │   ├── label.tsx
│   │   ├── separator.tsx
│   │   ├── toast.tsx
│   │   ├── toaster.tsx
│   │   └── progress.tsx
│   ├── life-philosophy-app.tsx  # 人生哲学管理组件
│   ├── tasks-page.tsx           # 任务管理组件
│   ├── expenses-page.tsx        # 开销记录与票据组件
│   ├── present-page.tsx         # 现在页面组件（主页）
│   ├── analog-clock.tsx         # 模拟时钟和时间进度组件
│   ├── habit-tracker.tsx        # 习惯追踪主组件
│   ├── habit-heatmap.tsx        # GitHub风格习惯热力图
│   ├── habit-record-form.tsx    # 习惯打卡记录表单
│   ├── daily-decisions.tsx      # 每日三大决策组件
│   ├── decision-form.tsx        # 决策输入表单
│   ├── memories-gallery.tsx     # 记忆相册主组件（小红书风格瀑布流）
│   ├── memory-form.tsx          # 记忆添加/编辑表单
│   ├── memory-detail-view.tsx   # 记忆详情查看组件
│   ├── schedule/                # 日程安排组件目录
│   │   ├── task-pool.tsx        # 可拖拽任务池组件
│   │   ├── timeline-week-view.tsx # Google Calendar风格24小时时间轴
│   │   ├── time-setting-modal.tsx # 时间设置/编辑模态框
│   │   └── day-view.tsx         # 日视图详情组件
│   └── global-thought-bubble.tsx # 全局思考记录悬浮按钮
├── lib/                   # 工具库和业务逻辑
│   ├── utils.ts          # 通用工具函数
│   ├── storage.ts        # 本地存储管理
│   ├── db.ts            # 生活哲学数据库操作
│   ├── tasks-db.ts      # 任务数据库操作
│   ├── thoughts-db.ts   # 思考记录数据库操作
│   ├── habits-db.ts     # 习惯追踪数据库操作
│   ├── decisions-db.ts  # 每日决策数据库操作
│   ├── memories-db.ts   # 记忆管理数据库操作
│   ├── expenses-db.ts   # 开销与票据数据库操作
│   ├── schedule-db.ts   # 日程安排数据库操作
│   └── api.ts           # API 请求管理
├── hooks/                # 自定义 React Hooks
│   └── use-toast.ts     # Toast 通知 hook
├── data/                 # 数据库文件
│   ├── life.db          # 生活哲学数据库
│   ├── tasks.db         # 任务管理数据库
│   ├── thoughts.db      # 思考记录数据库
│   ├── habits.db        # 习惯追踪数据库
│   ├── decisions.db     # 每日决策数据库
│   ├── memories.db      # 记忆管理数据库
│   └── schedule.db      # 日程安排数据库
├── public/               # 静态资源
│   ├── my-past/         # 记忆照片存储目录
│   └── receipts/        # 开销票据图片存放目录
└── uploads/              # 上传文件目录
```

## 核心功能模块

### 1. 三时态页面系统

#### 页面架构
```
/ (现在·Present) → 主页，模拟时钟，有效时间管理
├── /past → 过去页面，经验回顾，思考记录历史
├── /future → 未来页面，目标规划，愿景管理
├── /philosophy → 人生哲学，价值观与核心理念
├── /tasks → 任务管理，三层级项目追踪
├── /schedule → 日程安排，精确时间管理与任务调度
└── /thoughts → 思考记录，灵感与感悟收集
```

#### 设计哲学
- **过去是现在的力量** - 从经验中汲取智慧
- **现在是唯一的真实** - 专注当下的行动
- **未来是现在的动力** - 让愿景拉动现在

### 2. 现在页面（主页）- 时间管理与行动中心

#### 页面布局
- **时钟与决策并列**: 左侧模拟时钟，右侧今日三大决策
- **习惯追踪独立**: 下方习惯完成情况热力图
- **快捷导航**: 底部功能模块快速入口

#### 模拟时钟组件
- **真实表盘**: SVG绘制的模拟时钟，带有时针、分针、秒针
- **时间刻度**: 清晰的12小时刻度和数字标识
- **实时更新**: 每秒精确更新指针位置

#### 有效时间追踪
- **作息管理**: 可配置起床时间（默认7:00）和睡觉时间（默认23:00）
- **进度可视化**: 进度条显示一天有效时间的使用情况
- **剩余时间**: 实时计算并显示剩余的有效工作时间
- **状态切换**: 工作时间显示进度，休息时间显示"休息时间 💤"

#### 今日三大决策系统
- **亚马逊理念**: 灵感来自贝佐斯"每天只需做出3个好决策"
- **决策记录**: 每天最多3个重要决策的记录和管理
- **弹窗输入**: 点击添加按钮弹出决策输入表单
- **实时管理**: 支持决策的添加、查看和删除
- **占位显示**: 空决策位置显示"待添加"提示

#### 习惯追踪系统
- **GitHub风格热力图**: 仿GitHub提交热力图的习惯完成可视化
- **21天视野**: 显示最近3周的习惯完成情况
- **二元状态**: 绿色=已完成，灰色=未记录
- **routine任务关联**: 自动获取任务管理中的routine类型任务
- **打卡记录**: 支持日期、描述、照片的完整记录功能
- **照片上传**: 500KB限制的照片上传和本地存储

#### 快捷导航
- 通过卡片式导航快速访问所有功能模块
- 时态导航：过去 ← 现在 → 未来的流畅切换

#### 主页网格布局现状与维护建议
- 现状：主页采用 `react-grid-layout`，`ModuleContainer` 的 `ResizeObserver` 会根据内容计算行高，并通过 `MODULE_MIN_ROWS` 控制每个模块的最小占用行数。`dailyReview`、`timeline` 等模块已调整为更合适的行数，可在收起后保持紧凑。
- 新增模块时：务必在 `present-page.tsx` 中为模块添加 `MODULE_MIN_ROWS` 配置，并在默认布局里引用该值，而不是写死常量。
- 组件实现：避免在模块内部使用 `h-full`、固定高度或不必要的 `min-h`。如需滚动，请用 `max-h` 配合 `overflow`，让容器高度仍由内容决定。
- 布局回收：`sanitizeLayouts` 会把旧缓存中的 `minH` 同步到最新配置，但若历史记录保留了较大的 `h`，可以在 UI 中手动拖拽一次或清除保存的布局后刷新。
- 回归测试：组件接入后用“收起/加载中/无数据”三种状态检查高度，再根据实际需要调整 `MODULE_MIN_ROWS`，避免出现“小内容大容器”的视觉问题。

### 3. 生活哲学管理

#### 数据结构
```typescript
interface LifeData {
  topLogic: string      // 顶层逻辑
  roles: string[]       // 角色定位
  behaviors: string[]   // 行为准则
  wants: string[]       // 想要的
  dontWants: string[]   // 不想要的
  qualities: string[]   // 品质特征
}
```

#### 功能特性
- 记录和编辑人生顶层逻辑思考
- 管理个人角色定位和身份认知
- 定义行为准则和价值观
- 明确想要和不想要的事物
- 培养和记录重要品质

### 4. 任务管理系统

#### 数据结构
```typescript
interface Task {
  id?: number
  type: 'routine' | 'long-term' | 'short-term'
  title: string
  description?: string      // 为什么要做这个事情？对你的好处是什么？
  priority?: number         // 重要度排名，1-5或999（无优先级）
  parentId?: number         // 父任务ID，用于建立层级关系
  level?: number            // 任务层级：0=主任务，1=子任务，2=子子任务
  deadline?: string         // 截止日期（仅子任务和子子任务）
  isUnclear?: boolean       // 是否标记为模糊
  unclearReason?: string    // 模糊原因注释
  hasUnclearChildren?: boolean  // 是否有模糊的子任务（用于向上传播显示）
  createdAt?: string
  updatedAt?: string
}

interface TasksData {
  routines: Task[]        // 日常习惯
  longTermTasks: Task[]   // 长期任务
  shortTermTasks: Task[]  // 短期任务
}
```

#### 三层任务分类
1. **日常习惯 (Routines)**
   - 终身性的习惯和实践
   - 如：读书、运动、冥想
   - 关注持续性和一致性

2. **长期任务 (Long-term Tasks)**
   - 持续几个月到几年的项目
   - 如：研究项目、技能学习
   - 关注进展和里程碑

3. **短期任务 (Short-term Tasks)**
   - 持续几小时到几天的任务
   - 如：workshop、会议、报告
   - 关注及时完成

#### 任务管理功能
- ✅ **CRUD 操作**: 创建、读取、更新、删除任务
- ✅ **编辑功能**: 实时编辑任务标题和动机描述
- ✅ **分类管理**: 三种类型任务分别管理
- ✅ **动机思考**: 描述字段引导思考"为什么做"和"好处是什么"
- ✅ **优先级系统**: 1-5级重要度排名或无优先级，支持按优先级排序
- ✅ **视觉标识**: 优先级徽章和颜色编码，前三优先级使用柔和颜色
- ✅ **模糊任务标记**: 支持标记任务为模糊状态，添加模糊原因注释
- ✅ **模糊状态传播**: 子任务模糊状态向上传播到父任务（仅传播一级）
- ✅ **双重模糊显示**: 区分任务本身模糊和有模糊子任务的状态
- ✅ **层级任务管理**: 支持主任务→子任务→子子任务的三层结构
- ✅ **展开式界面**: 三列横向布局展示层级关系和详细信息
- ✅ **子任务CRUD**: 完整的子任务和子子任务增删改查功能
- ✅ **截止日期管理**: 子任务和子子任务支持deadline设置、编辑和显示
- ✅ **中文支持**: 完整支持中文输入法
- ✅ **数据持久化**: SQLite 本地数据库存储
- ✅ **完成时间线集成**: 主/子/子子任务完成状态同步到 `/past/completed`
- ✅ **完成感悟记录**: 完成任务时可填写感悟并在时间线上查看

### 5. 过去页面扩展：时间线与开销票据

#### `/past/completed` 完成时间线
- 展示所有完成任务，包含类型、层级、完成时间、完成感悟
- 任务完成后自动刷新，子任务/子子任务也可直接切换完成状态
- 支持区分主任务、子任务、子子任务的层级标签

#### `/past/expenses` 开销记录
- 使用 `expenses-db` 管理金额、货币、属性、备注与票据路径
- 属性（分类）自定义名称、颜色，可增删改
- 票据上传保存在 `public/receipts`，列表中以缩略图展示并可点开查看大图
- 支持多货币记录，自动汇总同币种金额，多币种时给出提示
- 删除开销时同步清理票据文件
- 当前只允许通过前端选择图片；PDF 支持在评估中

### 6. 全局思考记录系统

#### 数据结构
```typescript
interface Thought {
  id?: number
  content: string      // 思考内容
  page?: string        // 记录时所在的页面
  createdAt?: string   // 创建时间
}
```

#### 功能特性
- **全局悬浮按钮**: 所有页面右下角都有💡按钮
- **快速记录**: 点击按钮弹出输入窗口，快速记录灵感
- **页面标记**: 自动记录思考时所在的页面位置
- **历史查看**: 专门的思考记录页面查看所有历史
- **编辑删除**: 支持对已记录的思考进行编辑或删除
- **轻量设计**: 简约的界面不干扰主要工作流程

### 6. 日程安排系统

#### 数据结构
```typescript
interface ScheduleBlock {
  id?: number
  type: 'task' | 'event'   // 日程类型：任务或临时事件
  title: string            // 展示标题
  taskId?: number | null   // 关联的任务ID（事件可为空）
  date: string            // 日期 (YYYY-MM-DD)
  startTime: string       // 开始时间 (HH:MM)
  endTime: string         // 结束时间 (HH:MM)
  comment?: string        // 备注信息
  status: 'scheduled' | 'in_progress' | 'partially_completed' | 'completed' | 'cancelled'
  taskTitle?: string | null       // 任务标题（冗余，事件可为空）
  parentTitle?: string | null     // 父任务标题
  grandparentTitle?: string | null // 祖父任务标题
  categoryId?: number | null
  categoryName?: string | null
  categoryColor?: string | null
  createdAt?: string
  updatedAt?: string
}

interface WeekSchedule {
  [date: string]: ScheduleBlock[]
}
```

#### 核心功能
- ✅ **Google Calendar风格界面**: 24小时时间轴 + 7天周视图
- ✅ **拖拽任务调度**: 从任务池拖拽子子任务到具体时间槽
- ✅ **智能任务池**: 只显示可调度的任务（子子任务和无子任务的子任务）
- ✅ **时间冲突检测**: 创建和编辑时自动检测时间冲突
- ✅ **任务时间编辑**: 完整的时间、日期、备注编辑功能
- ✅ **睡眠时间标记**: 23:00-07:00 灰色背景标识睡眠时间
- ✅ **状态管理**: 支持 scheduled/in_progress/completed/cancelled 状态
- ✅ **任务池自适应**: 根据展开内容智能调整高度

#### 界面设计
- **左侧任务池**: 可展开的任务树，支持拖拽操作
- **右侧时间轴**: Google Calendar风格的24小时 × 7天网格
- **任务块显示**: 根据时长自动调整高度，状态颜色编码
- **睡眠时间**: 灰色背景 + 💤 图标标识
- **拖拽反馈**: 实时显示拖拽状态和时间预览

#### 时间管理特性
- **24小时视图**: 完整显示全天时间安排
- **精确时间槽**: 每小时60px，支持分钟级精度
- **智能预填**: 拖拽到特定时间槽时自动预填时间
- **冲突处理**: 编辑时排除自身，避免误报冲突
- **快捷时长**: 30分钟、1小时、2小时、半天等快速选项

#### 交互流程
1. **创建日程**: 拖拽任务到时间槽 → 设置时间和备注 → 确认创建
2. **编辑日程**: 点击任务块编辑按钮 → 修改信息 → 确认更新
3. **状态管理**: 点击任务块 → 查看详情 → 更新状态
4. **任务池管理**: 展开/收起任务组 → 拖拽子任务

### 主要功能
1. **三时态页面系统**: 过去-现在-未来的完整生命管理体系
2. **时间管理中心**: 模拟时钟 + 有效时间追踪 + 作息管理
3. **日程安排系统**: Google Calendar风格 + 拖拽调度 + 24小时时间轴
4. **三重数据管理**: 生活哲学 + 任务管理 + 思考记录
5. **开销与票据记录**: `/past/expenses` 管理金额、货币、票据图片
6. **完成时间线**: `/past/completed` 展示历史完成记录与感悟
7. **本地存储**: 使用 localStorage 和 SQLite 双重存储
8. **数据导入/导出**: 支持 JSON 格式的数据导入导出
9. **API 架构**: RESTful API 设计，支持前后端分离
10. **响应式设计**: 适配不同屏幕尺寸
11. **流畅导航**: 时态页面间无缝切换 + 全局快捷入口
12. **全局组件**: 思考记录按钮全局可用

## API 路由

### 生活哲学 API
- `GET /api/data` - 获取生活哲学数据
- `POST /api/data` - 保存生活哲学数据
- `GET /api/export` - 导出数据为 JSON
- `POST /api/import` - 导入 JSON 数据

### 任务管理 API
- `GET /api/tasks` - 获取所有主任务 (level=0)
- `POST /api/tasks` - 创建新任务 (支持主任务和子任务)
- `PUT /api/tasks` - 更新任务
- `DELETE /api/tasks?id=<id>` - 删除任务 (级联删除子任务)
- `GET /api/tasks/subtasks?parentId=<id>&level=<level>` - 获取指定层级的子任务
- `GET /api/tasks/hierarchy?taskId=<id>` - 获取任务的完整层级结构
- `PUT /api/tasks/unclear` - 更新任务模糊状态并触发向上传播
- `GET /api/tasks/unclear?taskId=<id>` - 检查任务是否有模糊的子任务

### 思考记录 API
- `GET /api/thoughts` - 获取所有思考记录
- `POST /api/thoughts` - 创建新的思考记录
- `PUT /api/thoughts` - 更新思考记录内容
- `DELETE /api/thoughts?id=<id>` - 删除指定思考记录

### 习惯追踪 API
- `GET /api/habits/records` - 获取习惯记录
  - `?type=today` - 获取今日记录
  - `?startDate=<date>&endDate=<date>` - 获取指定日期范围记录
  - `?routineId=<id>` - 过滤指定习惯的记录
- `POST /api/habits/records` - 创建打卡记录
- `DELETE /api/habits/records?id=<id>` - 删除打卡记录
- `POST /api/habits/upload` - 上传习惯打卡照片

### 每日决策 API
- `GET /api/decisions` - 获取决策记录
  - `?type=today` - 获取今日决策
  - `?date=<date>` - 获取指定日期决策
- `POST /api/decisions` - 创建新决策（每天最多3个）
- `PUT /api/decisions` - 更新决策内容
- `DELETE /api/decisions?id=<id>` - 删除指定决策

### 记忆管理 API
- `GET /api/memories` - 获取记忆记录
  - `?type=all` - 获取所有记忆
  - `?type=pinned` - 获取置顶记忆
  - `?startDate=<date>&endDate=<date>` - 按日期范围查询
- `POST /api/memories` - 创建新记忆
- `PUT /api/memories` - 更新记忆内容
  - 支持 `action=toggle-pin` 切换置顶状态
- `DELETE /api/memories?id=<id>` - 删除记忆（包含照片文件清理）
- `POST /api/memories/upload` - 上传记忆照片
  - 支持多文件上传（最多10张）
  - 自动生成压缩版本
  - 按日期组织存储目录

### 日程安排 API
- `GET /api/schedule/week?start=<date>` - 获取周日程安排
- `GET /api/schedule/day?date=<date>` - 获取日日程安排
- `POST /api/schedule/blocks` - 创建日程块
  - 自动检测时间冲突
  - 支持任务关联和冗余字段存储
- `PUT /api/schedule/blocks?id=<id>` - 更新日程块
  - 支持时间、日期、备注、状态更新
  - 编辑时排除自身进行冲突检测
- `DELETE /api/schedule/blocks?id=<id>` - 删除日程块
- `GET /api/schedule/conflicts?date=<date>&start=<time>&end=<time>&excludeId=<id>` - 检测时间冲突
  - 支持排除指定ID（用于编辑时冲突检测）
- `GET /api/tasks/schedulable` - 获取可调度任务
  - 返回子子任务和无子任务的子任务
  - 过滤已完成任务

## 开发命令

```bash
# 安装依赖
npm install

# 开发模式 (默认端口 3000)
npm run dev

# 开发模式 (指定端口 3001)
npm run dev -- -p 3001

# 构建生产版本
npm run build

# 启动生产服务器
npm run start

# 代码检查
npm run lint
```

## 未决事项
- 票据 PDF 上传与预览支持仍在评估，当前仅前端限制为图片类型
- 需要设计开销票据的长期清理/归档策略

## 代码规范
- 使用 TypeScript 严格类型检查
- 组件使用函数式组件 + Hooks
- 使用 shadcn/ui 组件库保持 UI 一致性
- 使用 Tailwind CSS 处理样式
- 文件命名使用 kebab-case
- 组件命名使用 PascalCase

## Claude 开发执行流程

在使用 Claude Code 进行开发时，遵循以下系统化流程确保代码质量和项目结构的完整性：

### 1. 生成问题并获取上下文
- 明确当前任务需要了解的关键信息
- 生成3-5个核心问题
- 在代码库中搜索相关文件和实现
- 获取必要的上下文信息

### 2. 明确需求
- 清晰定义要实现的功能
- 确认用户的具体要求和期望
- 识别潜在的边界情况和限制
- 与用户确认理解是否正确

### 3. 查看文件结构
- 检查项目的目录组织
- 了解现有代码的架构模式
- 确保新代码符合现有结构
- 避免破坏项目的组织逻辑

### 4. 确定修改范围
- 明确需要修改哪些文件
- 评估改动对其他模块的影响
- 确保不破坏现有功能
- 保持代码的向后兼容性

### 5. 拆分可执行任务
- 将大任务分解为小步骤
- 确保每个步骤可独立完成
- 按逻辑顺序组织任务
- 使用 TodoWrite 工具跟踪进度

### 6. 明确每个任务
- 为每个任务写清晰的描述
- 确定任务的输入和输出
- 识别任务间的依赖关系
- 估计任务的复杂度

### 7. 执行
- 按计划顺序执行任务
- 每完成一个任务就标记为完成
- 遇到问题及时调整计划
- 保持代码风格一致性

### 8. 在终端运行测试
- 使用 `npm run dev` 启动开发服务器
- 在浏览器中验证功能
- 检查控制台是否有错误
- 确认所有功能正常工作

### 最佳实践
- **系统化思考**: 不要跳步骤，确保每一步都扎实完成
- **及时沟通**: 不确定时向用户询问，避免做错误假设
- **增量开发**: 小步快跑，每次改动后都验证
- **保持整洁**: 遵循项目的代码规范和组织结构

## 数据库设计

### 生活哲学数据库 (life.db)
```sql
CREATE TABLE life_data (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  top_logic TEXT DEFAULT '',
  roles TEXT DEFAULT '[]',           -- JSON 数组
  behaviors TEXT DEFAULT '[]',       -- JSON 数组
  wants TEXT DEFAULT '[]',           -- JSON 数组
  dont_wants TEXT DEFAULT '[]',      -- JSON 数组
  qualities TEXT DEFAULT '[]',       -- JSON 数组
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
)
```

### 任务管理数据库 (tasks.db)
```sql
CREATE TABLE tasks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  type TEXT NOT NULL,               -- 'routine' | 'long-term' | 'short-term'
  title TEXT NOT NULL,
  description TEXT,                 -- 为什么要做？好处是什么？
  priority INTEGER DEFAULT 999,    -- 重要度排名，1-5或999（无优先级）
  parent_id INTEGER,                -- 父任务ID，用于建立层级关系
  level INTEGER DEFAULT 0,          -- 任务层级：0=主任务，1=子任务，2=子子任务
  deadline DATE,                    -- 截止日期（仅子任务和子子任务）
  is_unclear BOOLEAN DEFAULT 0,     -- 是否标记为模糊
  unclear_reason TEXT,              -- 模糊原因注释
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (parent_id) REFERENCES tasks(id) ON DELETE CASCADE
)
```

### 思考记录数据库 (thoughts.db)
```sql
CREATE TABLE thoughts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  content TEXT NOT NULL,            -- 思考内容
  page TEXT,                        -- 记录时所在的页面路径
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
)
```

### 习惯追踪数据库 (habits.db)
```sql
CREATE TABLE habit_records (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  routine_id INTEGER NOT NULL,      -- 关联的routine任务ID
  record_date DATE NOT NULL,        -- 打卡日期 (YYYY-MM-DD)
  description TEXT,                 -- 打卡细节描述(可选)
  photo_path TEXT,                  -- 照片存储路径(可选)
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(routine_id, record_date)   -- 每个习惯每天只能打卡一次
)
```

### 每日决策数据库 (decisions.db)
```sql
CREATE TABLE daily_decisions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  decision TEXT NOT NULL,           -- 决策内容
  date DATE NOT NULL,               -- 决策日期 (YYYY-MM-DD)
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
)
```

### 记忆管理数据库 (memories.db)
```sql
CREATE TABLE memories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT,                      -- 记忆标题（可选）
  description TEXT,                 -- 记忆描述（可选）
  location TEXT,                    -- 地点（可选）
  datetime TEXT NOT NULL,           -- 记忆时间
  photos TEXT,                      -- JSON数组存储照片路径
  isPinned INTEGER DEFAULT 0,       -- 是否置顶
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL
)
```

### 日程安排数据库 (schedule.db)
```sql
CREATE TABLE schedule_blocks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  task_id INTEGER NOT NULL,            -- 关联的任务ID
  date DATE NOT NULL,                  -- 日期 (YYYY-MM-DD)
  start_time TIME NOT NULL,            -- 开始时间 (HH:MM)
  end_time TIME NOT NULL,              -- 结束时间 (HH:MM)
  comment TEXT,                        -- 备注信息
  status TEXT DEFAULT 'scheduled',     -- 状态：scheduled/in_progress/completed/cancelled

  -- 冗余字段用于性能优化
  task_title TEXT NOT NULL,            -- 任务标题
  parent_title TEXT,                   -- 父任务标题
  grandparent_title TEXT,              -- 祖父任务标题

  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,

  UNIQUE(task_id, date, start_time)    -- 防止同一任务在同一时间重复调度
)
```

## 注意事项
1. 所有组件都使用 "use client" 标记为客户端组件
2. 数据优先从 API 加载，失败则使用本地存储
3. 使用 toast 提供用户操作反馈
4. 导入导出功能支持 JSON 文件格式
5. SQLite 数据库文件存储在 `data/` 目录
6. 中文输入法兼容性已完全优化
7. 任务编辑功能支持实时更新
8. 全局思考记录按钮在 `layout.tsx` 中集成
9. 思考记录自动标记当前页面路径
10. 习惯打卡照片存储在本地 `uploads/habits/` 目录
11. 每个习惯每天只能打卡一次（数据库UNIQUE约束）
12. 每天最多只能添加3个决策（API层面限制）
13. 日程安排使用@dnd-kit实现拖拽功能，支持鼠标和触摸操作
14. 只有子子任务和无子任务的子任务可以被调度到日程中
15. 睡眠时间（23:00-07:00）标记为灰色，但仍允许安排任务

## 常见问题

- **Q: 数据存储在哪里？**
  A: 数据分别存储在三个 SQLite 数据库中：`data/life.db` (生活哲学)、`data/tasks.db` (任务管理) 和 `data/thoughts.db` (思考记录)

- **Q: 如何添加新的任务类型？**
  A: 修改 TaskType 类型定义，更新任务管理组件的分类逻辑

- **Q: 中文输入法不工作怎么办？**
  A: 已修复中文输入法问题，使用函数式状态更新确保兼容性

- **Q: 如何自定义 UI 组件？**
  A: 修改 components/ui 下的组件或使用 shadcn/ui CLI 添加新组件

- **Q: 数据库文件在哪里？**
  A: 在项目根目录的 `data/` 文件夹中，包含 `life.db`、`tasks.db` 和 `thoughts.db`

- **Q: 如何使用思考记录功能？**
  A: 点击任意页面右下角的💡按钮即可快速记录思考，所有记录保存在思考历史页面

## 最新更新

### 三时态页面系统重构 (2025-09-19)
基于"过去-现在-未来"哲学的全新架构设计：

#### 核心理念
- **设计哲学**: "一个人的过去、现在和未来是无法分开的"
- **时间连续性**: 过去→现在→未来的生命河流概念
- **专注现在**: 现在是唯一真实的时刻，成为默认主页

#### 页面重构
- **现在页面** → 新主页，模拟时钟 + 有效时间管理
- **过去页面** → 回顾复盘，思考记录历史入口
- **未来页面** → 愿景规划，目标管理入口
- **人生哲学** → 迁移到独立路径 `/philosophy`

#### 时间管理创新
- **模拟时钟**: SVG绘制的真实时钟表盘，实时指针动画
- **有效时间追踪**: 基于作息时间的一天进度管理
- **智能提醒**: 显示剩余有效工作时间和使用进度
- **作息配置**: 支持自定义起床/睡觉时间（默认7:00-23:00）

#### 技术实现
- React Hooks 状态管理，避免 SSR Hydration 错误
- SVG 图形绘制，精确的角度计算和指针渲染
- Progress 组件，可视化时间使用进度
- 响应式设计，适配不同设备屏幕

### 层级任务管理系统 (2025-09-19)
实现完整的三层任务管理架构：

#### 新增功能
- **三层任务结构**: 主任务 → 子任务 → 子子任务的完整层级体系
- **展开式界面**: 点击主任务展开三列布局，横向显示层级关系
- **子任务CRUD**: 完整的子任务和子子任务增删改查功能
- **智能交互**: 点击子任务自动加载对应的子子任务
- **数据关联**: 删除父任务时自动级联删除所有子任务

#### 界面设计
- **左列**: 主任务详细信息展示
- **中列**: 子任务列表 + 添加子任务功能
- **右列**: 子子任务列表 + 添加子子任务功能
- **响应式布局**: max-w-7xl × h-3/5 扁平化设计

#### 技术实现
- 数据库新增 `parent_id` 和 `level` 字段支持层级关系
- 新增专门的子任务 API 端点和层级查询功能
- 外键约束确保数据一致性 (ON DELETE CASCADE)
- 完整的状态管理和错误处理机制

### 优先级管理系统 (2025-09-19)
完整的任务优先级管理功能：

#### 基础功能
- **优先级选择**: 1-5级重要度或无优先级的清晰选择
  - 1 (最重要)、2 (重要)、3 (较重要)、4 (一般)、5 (较低)、无优先级
- **智能排序**: 所有层级任务按优先级自动排序（1→2→3→4→5→无优先级）
- **并列优先级**: 允许多个任务设置相同优先级，相同优先级按创建时间排序
- **视觉标识**: 优先级徽章显示数字排名
- **颜色编码**: 前三优先级使用渐进颜色系统
  - 优先级 1: 柔和红色（最重要）
  - 优先级 2: 柔和橙色
  - 优先级 3: 柔和黄色
  - 其他优先级: 蓝色/灰色

#### 技术实现
- 数据库新增 `priority` 字段，向后兼容
- API 完整支持优先级 CRUD 操作
- UI 组件使用下拉选择而非迷惑的数字输入
- 主任务、子任务、子子任务全部支持优先级排序
- 使用低饱和度、高透明度的柔和色彩设计

### 模糊任务标记系统 (2025-09-19)
智能的任务模糊状态管理和传播机制：

#### 核心功能
- **模糊标记**: 任务可标记为模糊状态并添加具体原因
- **原因注释**: 详细记录模糊原因（如"不知道定义"、"缺少资源"等）
- **向上传播**: 子任务模糊状态自动向上传播到父任务（仅传播一级）
- **状态区分**: 清晰区分任务本身模糊和有模糊子任务的状态

#### 视觉设计
- **🟠 橙色问号**: 任务本身标记为模糊（hover显示具体原因）
- **🟡 黄色问号**: 任务有模糊的子任务（hover显示通用提示）
- **问号按钮**: 点击可切换模糊状态或添加模糊原因
- **模糊表单**: 弹窗输入模糊原因，支持取消模糊标记

#### 传播逻辑
- **一级传播**: 子子任务模糊 → 子任务显示黄色问号；子任务模糊 → 主任务显示黄色问号
- **独立状态**: 每个任务的模糊状态和原因独立存储
- **多层处理**: 正确处理子任务和子子任务同时模糊但原因不同的情况
- **实时更新**: 模糊状态变更后立即更新相关任务的显示状态

#### 技术实现
- 数据库新增 `is_unclear` 和 `unclear_reason` 字段
- 专门的 `/api/tasks/unclear` API 端点处理模糊状态更新
- 递归SQL查询检查子任务模糊状态（限制为直接子任务，避免跨级传播）
- 前端实时计算和显示 `hasUnclearChildren` 状态
- 完整的模糊状态编辑UI和交互逻辑

### 截止日期管理系统 (2025-09-19)
为子任务系统增加时间管理能力的完整deadline功能：

#### 核心功能
- **选择性设置**: 仅子任务(level=1)和子子任务(level=2)支持deadline
- **主任务简洁**: 主任务(level=0)保持简洁，不设置deadline
- **默认状态**: 新建任务默认无deadline，可选择设置
- **灵活编辑**: 支持设置、修改、清除deadline

#### UI组件设计
- **DatePicker组件**: HTML5 date input + 清除按钮的组合
- **DateDisplay组件**: 智能的日期显示，支持相对时间
  - 今天显示："MM/DD (今天)"
  - 明天显示："MM/DD (明天)"
  - 近期显示："MM/DD (N天后)"
  - 过期显示："MM/DD (已过期)"
- **中文本地化**: 所有日期文本都进行中文优化

#### 用户体验
- **表单集成**: 编辑子任务时在优先级下方显示deadline选择
- **列表显示**: 任务列表用小字显示deadline，不干扰主要信息
- **保持排序**: 维持现有优先级排序，deadline作为附加信息显示
- **清晰标识**: 📅图标 + 相对时间文字的清晰展示方式

#### 技术实现
1. **数据库扩展**: 添加`deadline DATE`字段，完整向后兼容
2. **API支持**: 现有RESTful接口自动支持deadline字段
3. **组件复用**: 创建DatePicker和DateDisplay可复用组件
4. **表单集成**: SubTaskEditForm和SubSubTaskEditForm集成deadline字段
5. **状态管理**: React hooks管理deadline编辑状态
6. **列表显示**: 在任务列表中优雅显示deadline信息

#### 系统化开发
采用6步骤系统化实现方法：
1. ✅ 数据库schema扩展（backward compatible）
2. ✅ API接口确认和测试
3. ✅ 可复用UI组件开发
4. ✅ 子任务编辑表单集成
5. ✅ 子子任务编辑表单集成
6. ✅ 任务列表deadline显示

#### 代码组织
- `components/ui/date-picker.tsx` - DatePicker和DateDisplay组件
- `lib/tasks-db.ts` - 数据库字段扩展和操作
- `components/tasks-page.tsx` - 表单集成和列表显示
- `app/api/tasks/route.ts` - API接口（无需修改，自动支持）

#### 设计决策
- **主任务无deadline**: 保持主任务的简洁性和高层次定位
- **相对时间显示**: 比绝对日期更直观的时间感知
- **暂不过期提醒**: 专注功能完整性，后续可扩展提醒功能
- **小字显示**: 作为辅助信息，不干扰任务标题和描述

## 实际使用示例

### 层级任务结构演示
```
搞研究 (主任务, priority: 1)
├── 我自己的human behavior研究 (子任务, level: 1)
│   └── HMM in human behavior (子子任务, level: 2)
├── 和Marira的联合研究XAI (子任务, level: 1)
└── 我自己的XAI evaluation量化研究 (子任务, level: 1)

找工作 (主任务, priority: 2)
├── 准备简历 (子任务, level: 1)
│   ├── 整理项目经历 (子子任务, level: 2)
│   └── 技能总结 (子子任务, level: 2)
└── 投递申请 (子任务, level: 1)
```

### 使用流程
1. **创建主任务**: 在任务卡片中添加"搞研究"
2. **展开详情**: 点击主任务的展开图标
3. **添加子任务**: 在中列添加"我自己的research"、"联合研究"等
4. **细化子子任务**: 选择子任务后在右列添加具体执行项
5. **设置优先级**: 为每个层级的任务设置重要度排名
6. **管理层级**: 通过删除、编辑维护任务结构

### 全局思考记录系统 (2025-09-19)
轻量级的随时随地记录灵感和思考：

#### 核心功能
- **全局悬浮按钮**: 所有页面右下角固定显示💡按钮
- **快速输入弹窗**: 点击按钮弹出简约输入界面
- **页面标记**: 自动记录思考时所在的页面位置
- **历史管理**: 专门页面查看、编辑、删除历史记录

#### 界面设计
- **悬浮按钮**: 蓝色圆形按钮，右下角固定位置
- **输入弹窗**: 居中显示，半透明背景，简约设计
- **历史页面**: 卡片式布局，显示时间、页面、内容
- **编辑功能**: 在线编辑，即时保存

#### 技术实现
- 独立数据库 `thoughts.db` 存储思考记录
- RESTful API 支持完整 CRUD 操作
- GlobalThoughtBubble 组件在 `layout.tsx` 全局集成
- 使用 `usePathname` hook 自动获取当前页面路径

## 最新更新 - 决策生命周期管理系统 (2025-09-19)

### 习惯追踪系统
基于GitHub提交风格的习惯完成情况可视化：

#### 核心功能
- **GitHub风格热力图**: 仿GitHub贡献图的21天习惯追踪界面
- **routine任务关联**: 自动从任务管理系统获取routine类型任务作为习惯项目
- **二元状态可视化**: 绿色方块=已完成，灰色方块=未记录，今日显示蓝色边框
- **完整打卡系统**: 支持日期、描述、照片的习惯打卡记录

#### 技术实现
- **独立数据库**: 使用habits.db单独存储习惯记录，与任务系统解耦
- **照片上传**: 本地存储，500KB限制，按年月组织目录结构
- **数据关联**: 通过routineId关联任务，支持灵活的习惯管理
- **UNIQUE约束**: 每个习惯每天只能打卡一次，避免重复记录

#### 界面设计
- **紧凑布局**: 右上角小尺寸"打卡"按钮，不干扰主界面
- **弹窗表单**: 点击弹出完整的习惯记录表单
- **响应式网格**: 习惯名称 + 21天方格的清晰布局
- **时间轴标记**: 显示周标识，便于时间定位

### 每日三大决策生命周期管理系统
基于亚马逊创始人理念的完整决策生命周期管理：

#### 核心理念
- **贝佐斯哲学**: "每天只需做出3个好决策"的管理智慧
- **时间边界**: 凌晨12点作为决策周期的分水岭
- **状态流转**: pending → completed/delayed 的完整生命周期
- **无数据丢失**: 过期决策转移到延期区域而非删除

#### 决策状态系统
```
决策状态流转：
pending (待完成) → completed (已完成)
              ↓
           delayed (已延期) [自动转移]
```

#### 功能设计
- **占位显示**: 3个决策位置的清晰展示，未填写显示"待添加"
- **弹窗输入**: 点击添加按钮弹出简洁的决策输入界面
- **状态可视化**:
  - pending: 白色背景，✅完成按钮
  - completed: 绿色背景，删除线文字，🔄取消按钮
  - delayed: 橙色背景，显示延期天数
- **自动刷新**: 组件加载时自动检测并转移过期决策
- **延期管理**: 可折叠的延期决策区域，支持完成和删除

#### 技术架构
- **独立数据库**: decisions.db专门存储每日决策记录
- **状态字段**: status支持'pending'/'completed'/'delayed'三种状态
- **刷新日志**: decision_refresh_log表防止重复处理
- **API增强**: 支持状态更新、延期查询、自动刷新
- **智能限制**: 每天最多3个活跃决策（不包括delayed）

#### 用户体验
- **自动处理**: 过期pending决策自动转为delayed状态
- **Toast提醒**: 刷新时显示处理了多少个过期决策
- **延期计算**: 显示具体延期多少天
- **双重操作**: 延期决策支持完成和删除两种操作

### 主页布局重构
- **时钟与决策并列**: 上方左右布局，充分利用空间
- **习惯追踪独立**: 下方独立显示，专注习惯可视化
- **组件尺寸优化**: 时钟适中、决策紧凑、习惯半屏宽度

## 最新更新 - 记忆管理系统 (2025-09-20)

### 记忆相册功能（小红书风格）
基于小红书设计理念的记忆管理和展示系统：

#### 核心功能
- **瀑布流布局**: CSS columns实现的Pinterest/小红书风格瀑布流
- **照片管理**: 支持多照片上传、压缩存储、原图保留
- **详情查看**: 左图右文的详细展示界面，支持多图切换
- **编辑功能**: 完整的CRUD操作，支持置顶功能
- **文件清理**: 删除记忆时自动清理相关照片文件

#### 技术实现
- **双版本存储**: 原图 + 压缩版本，优化加载速度
- **按日期组织**: 照片按时间戳组织目录结构
- **自适应布局**: 根据照片比例自动调整显示
- **事件处理**: stopPropagation实现复杂交互逻辑

#### 界面设计
- **卡片式展示**: 圆角卡片、悬停阴影效果
- **用户信息栏**: 头像、日期、置顶标识
- **双重交互**: 点击卡片查看详情，点击编辑按钮编辑
- **模态窗口**: 全屏覆盖的详情和编辑界面

## 已完成功能总结 (2025-09-20)
✅ **三时态页面系统** - 过去-现在-未来的完整生命管理架构
✅ **时间管理中心** - 模拟时钟 + 有效时间追踪 + 作息管理
✅ **完整的层级任务管理系统**
✅ **智能优先级管理和排序**
✅ **模糊任务标记和向上传播机制**
✅ **子任务和子子任务的完整编辑功能**
✅ **直观的三列展开式界面设计**
✅ **全局思考记录功能**
✅ **强大的数据库设计和API架构**
✅ **截止日期管理系统** - 子任务和子子任务的完整deadline功能
✅ **习惯追踪系统** - GitHub风格热力图 + 完整打卡记录功能
✅ **每日三大决策系统** - 贝佐斯理念的决策管理功能
✅ **记忆相册系统** - 小红书风格瀑布流 + 完整照片管理功能
✅ **日程安排系统** - Google Calendar风格 + 拖拽调度 + 24小时时间轴

## 最新更新 - 日程安排系统 (2025-09-23)

### 完整日程管理功能
基于Google Calendar设计理念的现代化时间管理系统：

#### 核心功能
- ✅ **Google Calendar风格界面**: 24小时时间轴 + 7天周视图，专业且直观
- ✅ **@dnd-kit拖拽系统**: 支持鼠标和触摸拖拽，流畅的拖拽体验
- ✅ **智能任务池**: 只显示可调度任务（子子任务 + 无子任务的子任务）
- ✅ **完整编辑功能**: 时间、日期、备注的完整编辑，复用统一UI组件
- ✅ **智能冲突检测**: 创建和编辑时自动检测冲突，编辑时排除自身
- ✅ **睡眠时间标识**: 23:00-07:00 灰色背景 + 💤 图标标记
- ✅ **自适应任务池**: 根据展开内容智能调整高度（50vh-80vh）

#### 技术实现
- **完整API架构**: 7个专门端点支持CRUD、冲突检测、数据查询
- **独立数据库**: schedule.db专门存储，支持性能优化冗余字段
- **状态管理**: scheduled/in_progress/completed/cancelled 完整生命周期
- **拖拽配置**: MouseSensor + TouchSensor，精确的激活约束
- **UI组件复用**: TimeSettingModal支持create/edit双模式

#### 界面特色
- **24小时完整视图**: 从00:00到23:59，不遗漏任何时间段
- **任务块可视化**: 根据时长自动调整高度，状态颜色编码
- **拖拽反馈**: 实时显示时间预览，睡眠时间特殊提示
- **响应式设计**: 左右分栏，任务池自适应，时间轴固定

#### 用户体验
- **零学习成本**: Google Calendar风格，用户熟悉的交互模式
- **平滑动画**: 300ms过渡效果，高度变化流畅自然
- **智能预填**: 拖拽到具体时间槽自动预填开始和结束时间
- **错误处理**: 完整的toast提示，清晰的错误信息

## 后续优化建议

### 时态系统增强
1. **过去页面**: 添加已完成任务展示和成就统计
2. **未来页面**: 实现梦想清单和愿望板功能
3. **时间轴**: 连接三个时态的可视化时间线
4. **时态切换**: 添加滑动手势和转场动画

### 时间管理功能
5. **番茄工作法**: 集成专注时间管理
6. **时间统计**: 每日/周/月的时间使用分析
7. **作息优化**: 智能作息建议和睡眠追踪
8. **时间提醒**: 基于有效时间的智能提醒

### 任务系统增强
9. 添加任务完成状态和进度追踪
10. 实现任务提醒和通知功能
11. 添加任务标签和分类过滤
12. 支持任务依赖关系管理
13. 添加层级任务的时间估算和跟踪
14. 支持任务模板和批量创建功能
15. 实现子任务完成度统计和可视化
16. 添加任务拖拽排序和层级调整功能
17. 支持模糊任务的批量处理和过滤

### 系统功能
18. 添加数据分析和可视化面板
19. 优化移动端体验和触摸交互
20. 实现数据备份到云端功能
21. 实现离线优先的 PWA 支持
