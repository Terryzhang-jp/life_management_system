import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('photo') as File

    if (!file) {
      return NextResponse.json(
        { error: 'No file uploaded' },
        { status: 400 }
      )
    }

    // 验证文件类型
    if (!file.type.startsWith('image/')) {
      return NextResponse.json(
        { error: 'Only image files are allowed' },
        { status: 400 }
      )
    }

    // 验证文件大小 (500KB限制)
    if (file.size > 500 * 1024) {
      return NextResponse.json(
        { error: 'File size must be less than 500KB' },
        { status: 400 }
      )
    }

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // 生成文件名和路径
    const currentDate = new Date()
    const year = currentDate.getFullYear()
    const month = String(currentDate.getMonth() + 1).padStart(2, '0')
    const timestamp = Date.now()

    // 获取routineId和date（如果提供）
    const routineId = formData.get('routineId') as string
    const recordDate = formData.get('recordDate') as string

    const fileName = `${routineId || 'unknown'}_${recordDate || currentDate.toISOString().split('T')[0]}_${timestamp}.jpg`

    // 创建目录结构
    const uploadDir = path.join(process.cwd(), 'public', 'habit-photos', year.toString(), month)
    await mkdir(uploadDir, { recursive: true })

    // 保存文件
    const filePath = path.join(uploadDir, fileName)
    await writeFile(filePath, buffer)

    // 返回相对路径
    const relativePath = `habit-photos/${year}/${month}/${fileName}`

    return NextResponse.json({
      success: true,
      photoPath: relativePath,
      message: 'Photo uploaded successfully'
    })

  } catch (error) {
    console.error('Photo upload error:', error)
    return NextResponse.json(
      { error: 'Failed to upload photo' },
      { status: 500 }
    )
  }
}