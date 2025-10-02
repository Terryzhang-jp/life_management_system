# 每日回顾功能 - 配置说明

## ✅ 功能已完成

每日回顾功能已成功集成到项目中！该功能使用 AI (Gemini 2.0 Flash Exp) 分析你的每日回顾，提取心情、事件和评价。

---

## 🔑 配置 API Key

### 步骤 1: 获取 Gemini API Key

1. 访问：https://aistudio.google.com/app/apikey
2. 登录你的 Google 账号
3. 点击 "Create API Key" 创建新的 API Key
4. 复制生成的 API Key

### 步骤 2: 创建配置文件

在项目根目录 `/Users/yichuanzhang/Desktop/life_management/frontend/` 下创建 `.env.local` 文件：

```bash
cd /Users/yichuanzhang/Desktop/life_management/frontend/
cp .env.local.example .env.local
```

### 步骤 3: 填入 API Key

编辑 `.env.local` 文件，将你的 API Key 填入：

```bash
# 将 your_gemini_api_key_here 替换为你的实际 API Key
GEMINI_API_KEY=你的实际API_KEY
```

### 步骤 4: 重启开发服务器

```bash
# 停止当前运行的服务器 (Ctrl+C)
# 然后重新启动
npm run dev
```

---

## 📝 如何使用

### 1. 进入现在页面
- 访问主页 `http://localhost:3001/`（或你配置的端口）

### 2. 点击"今日回顾"按钮
- 位于页面右上角
- 未完成时显示灰色 📝
- 已完成时显示绿色 ✅

### 3. 使用流程

**第一步：输入今日回顾**
```
输入框示例：
"今天完成了三个任务，感觉还不错，但下午开会有点焦虑..."
```

**第二步：查看 AI 分析**
- AI 自动分析你的心情（类型 + 评分）
- 提取今天发生的关键事件

**第三步：评价事件**
```
用自然语言描述你的感受：
"完成任务很有成就感，会议让我感觉有点压力，身体累是正常的..."
```

**第四步：查看最终结果**
- AI 为每个事件标注：正面/中性/负面
- 生成简洁的今日总结

### 4. 重新编辑
- 如果想修改，点击"删除并重新编辑"按钮
- 当天只能有一条回顾记录

---

## 🗂️ 数据存储

所有回顾数据存储在本地数据库：
```
/Users/yichuanzhang/Desktop/life_management/frontend/data/daily_reviews.db
```

数据结构：
- 日期、原始输入、AI 分析结果
- 心情评分、事件列表、事件评价
- 完全本地存储，隐私安全

---

## 🔧 技术细节

### 文件结构
```
frontend/
├── lib/
│   └── daily-reviews-db.ts        # 数据库管理
├── app/api/daily-review/
│   ├── route.ts                   # 基础 CRUD API
│   ├── analyze/route.ts           # 第一次 AI 分析
│   └── finalize/route.ts          # 第二次 AI 解析
├── components/daily-review/
│   ├── daily-review-button.tsx    # 入口按钮
│   ├── daily-review-dialog.tsx    # 主对话框
│   ├── review-step1.tsx           # 初始输入
│   ├── review-step2.tsx           # AI 分析展示
│   └── review-result.tsx          # 最终结果
└── .env.local                     # API Key 配置（需要创建）
```

### AI 分析流程
1. **第一次调用 Gemini API**: 分析心情 + 提取事件
2. **第二次调用 Gemini API**: 解析用户评价 + 生成总结

---

## ⚠️ 注意事项

1. **API Key 安全**
   - `.env.local` 文件已被 `.gitignore` 忽略
   - 不会被提交到 git 仓库
   - 保持 API Key 私密性

2. **API 调用限制**
   - Gemini 2.0 Flash Exp 有免费额度
   - 每天写一次回顾，月度调用约 60 次
   - 注意监控 API 使用量

3. **数据隐私**
   - 回顾内容会发送到 Gemini API
   - Google 可能用于服务改进
   - 敏感内容请谨慎输入

4. **错误处理**
   - 如果 AI 分析失败，可以重试
   - 检查 API Key 是否正确配置
   - 检查网络连接是否正常

---

## 🐛 故障排查

### 问题 1: "GEMINI_API_KEY is not configured"
**原因**: 环境变量未配置
**解决**:
1. 确保 `.env.local` 文件存在
2. 确保 API Key 填写正确
3. 重启开发服务器

### 问题 2: "AI 返回的格式不正确"
**原因**: Gemini API 返回了非 JSON 格式
**解决**:
1. 检查 API Key 是否有效
2. 重试操作
3. 查看浏览器 Console 的详细错误

### 问题 3: 按钮点击无响应
**原因**: 前端加载问题
**解决**:
1. 刷新页面
2. 清除浏览器缓存
3. 检查浏览器 Console 错误

---

## 📞 需要帮助？

如果遇到问题：
1. 检查浏览器 Console 错误信息
2. 检查终端 (npm run dev) 的服务器日志
3. 确认 API Key 配置正确

---

**祝你使用愉快！每天花 5 分钟回顾，让 AI 帮你发现生活模式！**