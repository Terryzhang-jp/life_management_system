/**
 * 思考记录迁移到Keep系统
 *
 * 功能：
 * 1. 读取所有现有的思考记录
 * 2. 创建"记录思考"标签
 * 3. 将每条思考记录转换为Keep笔记
 * 4. 保留原始创建时间
 */

const Database = require('better-sqlite3')
const path = require('path')

// 数据库路径
const thoughtsDbPath = path.join(__dirname, '..', 'data', 'thoughts.db')
const keepDbPath = path.join(__dirname, '..', 'data', 'keep.db')

// 打开数据库连接
const thoughtsDb = new Database(thoughtsDbPath, { readonly: true })
const keepDb = new Database(keepDbPath)

console.log('=== 开始迁移思考记录到Keep系统 ===\n')

try {
  // 1. 读取所有思考记录
  console.log('📖 步骤 1/4: 读取所有思考记录...')
  const thoughts = thoughtsDb.prepare('SELECT * FROM thoughts ORDER BY created_at ASC').all()
  console.log(`   找到 ${thoughts.length} 条思考记录\n`)

  if (thoughts.length === 0) {
    console.log('⚠️  没有需要迁移的思考记录')
    process.exit(0)
  }

  // 2. 创建"记录思考"标签
  console.log('🏷️  步骤 2/4: 创建"记录思考"标签...')

  // 检查标签是否已存在
  let label = keepDb.prepare('SELECT * FROM keep_labels WHERE name = ?').get('记录思考')

  if (label) {
    console.log(`   标签已存在 (ID: ${label.id})`)
  } else {
    const labelResult = keepDb.prepare(`
      INSERT INTO keep_labels (name, color)
      VALUES (?, ?)
    `).run('记录思考', '#fef3c7')  // 柔和的黄色

    label = {
      id: labelResult.lastInsertRowid,
      name: '记录思考',
      color: '#fef3c7'
    }
    console.log(`   标签创建成功 (ID: ${label.id})`)
  }
  console.log('')

  // 3. 迁移每条思考记录
  console.log('📝 步骤 3/4: 开始迁移思考记录到Keep...')

  let successCount = 0
  let failCount = 0

  for (const thought of thoughts) {
    try {
      // 创建Keep笔记（标题留空，内容为思考内容）
      const noteResult = keepDb.prepare(`
        INSERT INTO keep_notes (
          title,
          content,
          note_type,
          checklist_items,
          color,
          is_pinned,
          created_at,
          updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        null,                    // title: 留空
        thought.content,         // content: 思考内容
        'text',                  // note_type: 文本类型
        null,                    // checklist_items: 无
        '#ffffff',               // color: 白色
        0,                       // is_pinned: 不置顶
        thought.created_at,      // created_at: 保留原始时间
        thought.created_at       // updated_at: 使用原始时间
      )

      const noteId = noteResult.lastInsertRowid

      // 关联标签
      keepDb.prepare(`
        INSERT INTO keep_note_labels (note_id, label_id)
        VALUES (?, ?)
      `).run(noteId, label.id)

      successCount++
      console.log(`   ✅ [${successCount}/${thoughts.length}] 迁移成功 (ID: ${thought.id} -> ${noteId})`)

      // 显示内容预览
      const preview = thought.content.substring(0, 50).replace(/\n/g, ' ')
      console.log(`      "${preview}${thought.content.length > 50 ? '...' : ''}"`)
      console.log(`      时间: ${thought.created_at}`)

    } catch (error) {
      failCount++
      console.error(`   ❌ [${successCount + failCount}/${thoughts.length}] 迁移失败 (ID: ${thought.id})`)
      console.error(`      错误: ${error.message}`)
    }
  }

  console.log('')
  console.log('=== 迁移完成 ===')
  console.log(`✅ 成功: ${successCount} 条`)
  console.log(`❌ 失败: ${failCount} 条`)
  console.log(`📊 总计: ${thoughts.length} 条`)
  console.log('')
  console.log('💡 提示: 思考记录原始数据仍保留在thoughts.db中')
  console.log('   如需删除原数据，请手动操作')

} catch (error) {
  console.error('\n❌ 迁移过程中发生错误:')
  console.error(error)
  process.exit(1)
} finally {
  // 关闭数据库连接
  thoughtsDb.close()
  keepDb.close()
}
