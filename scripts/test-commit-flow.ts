/**
 * Daily Commit 系统完整测试
 *
 * 测试流程：
 * 1. 创建测试 Commit
 * 2. 触发 AI 评估
 * 3. 查看进度更新
 * 4. 验证历史记录
 *
 * 运行: npx tsx scripts/test-commit-flow.ts
 */

const API_BASE = 'http://localhost:3001/api'

async function testCommitFlow() {
  console.log('🧪 开始测试 Daily Commit 系统\n')

  try {
    // 1. 获取现有的 Quest
    console.log('📋 Step 1: 获取现有 Quest...')
    const questsRes = await fetch(`${API_BASE}/quests`)
    if (!questsRes.ok) throw new Error('Failed to fetch quests')

    const quests = await questsRes.json()
    if (quests.length === 0) {
      console.log('❌ 没有找到 Quest，请先使用 seed-quest-data.ts 创建测试数据')
      return
    }

    const quest = quests[0]
    console.log(`✅ 找到 Quest: "${quest.title}" (ID: ${quest.id})\n`)

    // 2. 获取该 Quest 的 Current Milestone
    console.log('📋 Step 2: 获取 Current Milestone...')
    const milestonesRes = await fetch(`${API_BASE}/milestones?questId=${quest.id}`)
    if (!milestonesRes.ok) throw new Error('Failed to fetch milestones')

    const milestones = await milestonesRes.json()
    const currentMilestone = milestones.find((m: any) => m.status === 'current')

    if (!currentMilestone) {
      console.log('❌ 没有找到 Current Milestone')
      return
    }

    console.log(`✅ Current Milestone: "${currentMilestone.title}" (ID: ${currentMilestone.id})\n`)

    // 3. 创建测试 Commit
    console.log('📋 Step 3: 创建测试 Commit...')
    const commitData = {
      questId: quest.id,
      milestoneId: currentMilestone.id,
      commitDate: new Date().toISOString().split('T')[0],
      content: `# 今日进度 (${new Date().toLocaleDateString()})

## 完成的工作
- 完成了用户认证模块的开发
- 实现了 JWT token 验证
- 添加了登录/注册接口
- 编写了相关的单元测试

## 遇到的问题
- CORS 配置花了一些时间调试
- 数据库连接池配置需要优化

## 明天计划
- 开始任务管理 API 的开发
- 完善错误处理机制`,
      attachments: JSON.stringify([
        'https://github.com/example/commit/abc123',
        '/path/to/screenshot.png'
      ])
    }

    const commitRes = await fetch(`${API_BASE}/quest-commits`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(commitData)
    })

    if (!commitRes.ok) throw new Error('Failed to create commit')

    const commitResult = await commitRes.json()
    const commit = commitResult.commit

    console.log(`✅ Commit 已创建 (ID: ${commit.id})`)
    console.log(`   日期: ${commit.commitDate}`)
    console.log(`   内容预览: ${commit.content.substring(0, 50)}...\n`)

    // 4. 触发 AI 评估
    console.log('📋 Step 4: 触发 AI 评估...')
    console.log('⏳ AI 正在评估进度（这可能需要几秒钟）...\n')

    const assessRes = await fetch(`${API_BASE}/ai-assess-commit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        commitId: commit.id
      })
    })

    if (!assessRes.ok) {
      const error = await assessRes.json()
      console.log('⚠️  AI 评估失败:', error.error)
      console.log('   可能原因: OpenAI API Key 未配置或额度不足')
      console.log('   系统其他功能仍然正常工作\n')
    } else {
      const assessResult = await assessRes.json()

      console.log('✅ AI 评估完成!')
      console.log(`   评估了 ${assessResult.assessments?.length || 0} 个 Checkpoints`)
      console.log(`   更新了 ${assessResult.progressUpdates?.length || 0} 个进度`)

      if (assessResult.progressUpdates && assessResult.progressUpdates.length > 0) {
        console.log('\n📊 进度更新详情:')
        assessResult.progressUpdates.forEach((update: any) => {
          console.log(`   - ${update.checkpointTitle}`)
          console.log(`     ${update.previousProgress}% → ${update.newProgress}% (+${update.newProgress - update.previousProgress}%)`)
        })
      }
      console.log()
    }

    // 5. 查看 Commit 历史
    console.log('📋 Step 5: 查看 Commit 历史...')
    const historyRes = await fetch(`${API_BASE}/quest-commits?questId=${quest.id}&limit=5`)
    if (!historyRes.ok) throw new Error('Failed to fetch commit history')

    const historyResult = await historyRes.json()
    const commits = historyResult.commits || []

    console.log(`✅ 找到 ${commits.length} 条 Commit 记录`)
    commits.forEach((c: any, index: number) => {
      const preview = c.content.split('\n')[0].substring(0, 50)
      console.log(`   ${index + 1}. ${c.commitDate} - ${preview}...`)
    })

    console.log('\n🎉 测试完成！')
    console.log('\n💡 下一步：')
    console.log('   1. 访问 http://localhost:3001/quests')
    console.log('   2. 点击进入 Quest 详情页')
    console.log('   3. 查看 Daily Commit Form 和 Commit History')
    console.log('   4. 在左侧面板可以看到最近的提交记录')
    console.log('   5. 在右侧可以提交新的进度')

  } catch (error: any) {
    console.error('\n❌ 测试失败:', error.message)
    console.error('详细错误:', error)
  }
}

// 运行测试
testCommitFlow()
