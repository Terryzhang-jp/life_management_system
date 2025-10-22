/**
 * 为Quest系统创建示例数据
 * 运行: npx tsx scripts/seed-quest-data.ts
 */

const API_BASE = 'http://localhost:3001/api'

async function seedData() {
  console.log('🌱 开始创建示例数据...\n')

  // 1. 创建 Vision
  console.log('📍 Step 1: 创建 Vision')
  const visionRes = await fetch(`${API_BASE}/visions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: '成为全栈开发者',
      description: '掌握前端、后端、数据库的完整技能栈，能够独立构建完整的Web应用'
    })
  })
  const vision = await visionRes.json()
  console.log(`✅ Vision 创建成功: ${vision.title} (ID: ${vision.id})\n`)

  // 2. 创建 Quest
  console.log('🎯 Step 2: 创建 Quest')
  const questRes = await fetch(`${API_BASE}/quests`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      visionId: vision.id,
      type: 'main',
      title: '构建个人项目管理系统',
      why: '通过实际项目来学习和巩固全栈开发技能，同时解决自己的实际需求',
      status: 'active'
    })
  })
  const quest = await questRes.json()
  console.log(`✅ Quest 创建成功: ${quest.title} (ID: ${quest.id})\n`)

  // 3. 创建 Milestones
  console.log('🏁 Step 3: 创建 Milestones')

  // Milestone 1: 已完成
  const m1Res = await fetch(`${API_BASE}/milestones`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      questId: quest.id,
      title: '完成项目规划',
      completionCriteria: '完成需求分析文档、技术选型和数据库设计',
      why: '好的规划是成功的一半',
      status: 'completed'
    })
  })
  const m1 = await m1Res.json()
  console.log(`✅ Milestone 1 (已完成): ${m1.title} (ID: ${m1.id})`)

  // Milestone 2: 当前进行中
  const m2Res = await fetch(`${API_BASE}/milestones`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      questId: quest.id,
      title: '实现核心功能',
      completionCriteria: '完成用户认证、任务CRUD、数据可视化三大核心功能',
      why: '这些是系统最重要的基础功能',
      status: 'current'
    })
  })
  const m2 = await m2Res.json()
  console.log(`✅ Milestone 2 (进行中): ${m2.title} (ID: ${m2.id})`)

  // Milestone 3: 下一个
  const m3Res = await fetch(`${API_BASE}/milestones`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      questId: quest.id,
      title: '优化和部署',
      completionCriteria: '完成性能优化、部署到生产环境、编写使用文档',
      why: '让系统真正可用',
      status: 'next'
    })
  })
  const m3 = await m3Res.json()
  console.log(`✅ Milestone 3 (下一个): ${m3.title} (ID: ${m3.id})`)

  // Milestone 4: 未来计划
  const m4Res = await fetch(`${API_BASE}/milestones`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      questId: quest.id,
      title: '添加高级特性',
      completionCriteria: '添加实时协作、移动端适配、AI助手等高级功能',
      why: '提升用户体验和竞争力',
      status: 'future'
    })
  })
  const m4 = await m4Res.json()
  console.log(`✅ Milestone 4 (未来): ${m4.title} (ID: ${m4.id})\n`)

  // 4. 为 Milestone 1 创建 Checkpoints (已完成的)
  console.log('📋 Step 4: 为 Milestone 1 创建 Checkpoints (已完成)')
  const m1Checkpoints = [
    { title: '撰写需求分析文档', isCompleted: true },
    { title: '确定技术栈：Next.js + TypeScript + SQLite', isCompleted: true },
    { title: '设计数据库 schema', isCompleted: true },
    { title: '创建项目仓库并初始化', isCompleted: true }
  ]

  for (const cp of m1Checkpoints) {
    await fetch(`${API_BASE}/checkpoints`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        milestoneId: m1.id,
        ...cp
      })
    })
    console.log(`  ✅ ${cp.title}`)
  }

  // 5. 为 Milestone 2 创建 Checkpoints (部分完成)
  console.log('\n📋 Step 5: 为 Milestone 2 创建 Checkpoints (部分完成)')
  const m2Checkpoints = [
    { title: '实现用户注册和登录功能', isCompleted: true },
    { title: '创建任务管理API', isCompleted: true },
    { title: '实现任务列表前端界面', isCompleted: false },
    { title: '添加数据可视化图表', isCompleted: false },
    { title: '编写单元测试', isCompleted: false }
  ]

  for (const cp of m2Checkpoints) {
    await fetch(`${API_BASE}/checkpoints`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        milestoneId: m2.id,
        ...cp
      })
    })
    const status = cp.isCompleted ? '✅' : '⬜'
    console.log(`  ${status} ${cp.title}`)
  }

  // 6. 为 Milestone 3 创建 Checkpoints (未开始)
  console.log('\n📋 Step 6: 为 Milestone 3 创建 Checkpoints (未开始)')
  const m3Checkpoints = [
    { title: '代码性能分析和优化', isCompleted: false },
    { title: '配置生产环境服务器', isCompleted: false },
    { title: '设置CI/CD流程', isCompleted: false },
    { title: '编写用户使用文档', isCompleted: false }
  ]

  for (const cp of m3Checkpoints) {
    await fetch(`${API_BASE}/checkpoints`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        milestoneId: m3.id,
        ...cp
      })
    })
    console.log(`  ⬜ ${cp.title}`)
  }

  console.log('\n🎉 示例数据创建完成！')
  console.log('\n📊 数据统计:')
  console.log(`  - 1 个 Vision: ${vision.title}`)
  console.log(`  - 1 个 Quest: ${quest.title}`)
  console.log(`  - 4 个 Milestones (1已完成, 1进行中, 1下一个, 1未来)`)
  console.log(`  - ${m1Checkpoints.length + m2Checkpoints.length + m3Checkpoints.length} 个 Checkpoints`)
  console.log('\n🌐 访问: http://localhost:3001/quests')
  console.log(`📝 Quest详情: http://localhost:3001/quests/${quest.id}`)
}

// 运行
seedData().catch(console.error)
