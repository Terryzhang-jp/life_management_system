import { NextRequest, NextResponse } from 'next/server'
import memoriesDbManager from '@/lib/memories-db'
import { unlink, rmdir } from 'fs/promises'
import path from 'path'
import { existsSync } from 'fs'

// GET - 获取记忆记录
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') // 'all' | 'pinned'
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    if (type === 'pinned') {
      // 获取置顶记忆
      const memories = memoriesDbManager.getPinnedMemories()
      return NextResponse.json(memories)
    }

    if (startDate && endDate) {
      // 按日期范围查询
      const memories = memoriesDbManager.getMemoriesByDateRange(startDate, endDate)
      return NextResponse.json(memories)
    }

    // 默认获取所有记忆
    const memories = memoriesDbManager.getAllMemories()
    return NextResponse.json(memories)

  } catch (error) {
    console.error('Failed to get memories:', error)
    return NextResponse.json(
      { error: 'Failed to get memories' },
      { status: 500 }
    )
  }
}

// POST - 创建新记忆
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { title, description, location, datetime, photos, isPinned } = body

    // 验证必需字段
    if (!datetime) {
      return NextResponse.json(
        { error: 'Datetime is required' },
        { status: 400 }
      )
    }

    // 验证datetime格式
    const dateTime = new Date(datetime)
    if (isNaN(dateTime.getTime())) {
      return NextResponse.json(
        { error: 'Invalid datetime format' },
        { status: 400 }
      )
    }

    // 验证photos数组
    if (photos && !Array.isArray(photos)) {
      return NextResponse.json(
        { error: 'Photos must be an array' },
        { status: 400 }
      )
    }

    const memoryId = memoriesDbManager.addMemory({
      title: title?.trim() || '',
      description: description?.trim() || '',
      location: location?.trim() || '',
      datetime: dateTime.toISOString(),
      photos: photos || [],
      isPinned: Boolean(isPinned)
    })

    return NextResponse.json({
      success: true,
      id: memoryId,
      message: 'Memory created successfully'
    })

  } catch (error) {
    console.error('Failed to create memory:', error)
    return NextResponse.json(
      { error: 'Failed to create memory' },
      { status: 500 }
    )
  }
}

// PUT - 更新记忆
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, title, description, location, datetime, photos, isPinned, action } = body

    if (!id) {
      return NextResponse.json(
        { error: 'Memory ID is required' },
        { status: 400 }
      )
    }

    if (isNaN(parseInt(id))) {
      return NextResponse.json(
        { error: 'Memory ID must be a valid number' },
        { status: 400 }
      )
    }

    // 检查记忆是否存在
    const existingMemory = memoriesDbManager.getMemory(parseInt(id))
    if (!existingMemory) {
      return NextResponse.json(
        { error: 'Memory not found' },
        { status: 404 }
      )
    }

    // 特殊操作：切换置顶状态
    if (action === 'toggle-pin') {
      memoriesDbManager.togglePin(parseInt(id))
      return NextResponse.json({
        success: true,
        message: 'Pin status toggled successfully'
      })
    }

    // 准备更新数据
    const updateData: any = {}

    if (title !== undefined) updateData.title = title?.trim()
    if (description !== undefined) updateData.description = description?.trim()
    if (location !== undefined) updateData.location = location?.trim()
    if (datetime !== undefined) {
      const dateTime = new Date(datetime)
      if (isNaN(dateTime.getTime())) {
        return NextResponse.json(
          { error: 'Invalid datetime format' },
          { status: 400 }
        )
      }
      updateData.datetime = dateTime.toISOString()
    }
    if (photos !== undefined) {
      if (!Array.isArray(photos)) {
        return NextResponse.json(
          { error: 'Photos must be an array' },
          { status: 400 }
        )
      }
      updateData.photos = photos
    }
    if (isPinned !== undefined) updateData.isPinned = Boolean(isPinned)

    memoriesDbManager.updateMemory(parseInt(id), updateData)

    return NextResponse.json({
      success: true,
      message: 'Memory updated successfully'
    })

  } catch (error) {
    console.error('Failed to update memory:', error)
    return NextResponse.json(
      { error: 'Failed to update memory' },
      { status: 500 }
    )
  }
}

// DELETE - 删除记忆
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { error: 'Memory ID is required' },
        { status: 400 }
      )
    }

    if (isNaN(parseInt(id))) {
      return NextResponse.json(
        { error: 'Memory ID must be a valid number' },
        { status: 400 }
      )
    }

    // 检查记忆是否存在
    const existingMemory = memoriesDbManager.getMemory(parseInt(id))
    if (!existingMemory) {
      return NextResponse.json(
        { error: 'Memory not found' },
        { status: 404 }
      )
    }

    // 删除相关的照片文件
    if (existingMemory.photos && existingMemory.photos.length > 0) {
      for (const photoPath of existingMemory.photos) {
        try {
          // photoPath 格式: /my-past/folderName/compressed/fileName
          const fullPath = path.join(process.cwd(), 'public', photoPath)

          if (existsSync(fullPath)) {
            await unlink(fullPath)
            console.log(`Deleted photo: ${fullPath}`)
          }

          // 也删除原图（如果存在）
          const originalPath = fullPath.replace('/compressed/', '/')
          if (existsSync(originalPath)) {
            await unlink(originalPath)
            console.log(`Deleted original photo: ${originalPath}`)
          }
        } catch (error) {
          console.error(`Failed to delete photo ${photoPath}:`, error)
          // 继续删除其他照片，不中断流程
        }
      }

      // 尝试删除照片所在的文件夹（如果为空）
      try {
        const photoDir = path.dirname(path.join(process.cwd(), 'public', existingMemory.photos[0]))
        const compressedDir = photoDir
        const parentDir = path.dirname(compressedDir)

        // 删除 compressed 文件夹（如果为空）
        if (existsSync(compressedDir)) {
          await rmdir(compressedDir).catch(() => {
            // 文件夹不为空，忽略错误
          })
        }

        // 删除父文件夹（如果为空）
        if (existsSync(parentDir)) {
          await rmdir(parentDir).catch(() => {
            // 文件夹不为空，忽略错误
          })
        }
      } catch (error) {
        // 删除文件夹失败不影响主流程
        console.error('Failed to delete empty directories:', error)
      }
    }

    // 删除数据库记录
    memoriesDbManager.deleteMemory(parseInt(id))

    return NextResponse.json({
      success: true,
      message: 'Memory and associated photos deleted successfully'
    })

  } catch (error) {
    console.error('Failed to delete memory:', error)
    return NextResponse.json(
      { error: 'Failed to delete memory' },
      { status: 500 }
    )
  }
}