import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('image') as File
    const modelId = formData.get('modelId') as string

    if (!file) {
      return NextResponse.json(
        { error: 'No file uploaded' },
        { status: 400 }
      )
    }

    // 验证文件类型
    if (!file.type.startsWith('image/')) {
      return NextResponse.json(
        { error: 'File must be an image' },
        { status: 400 }
      )
    }

    // 验证文件大小 (5MB限制)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'File size must be less than 5MB' },
        { status: 400 }
      )
    }

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // 创建存储目录
    const uploadDir = path.join(process.cwd(), 'public', 'mental-models')
    await mkdir(uploadDir, { recursive: true })

    // 如果有modelId，创建子目录
    let targetDir = uploadDir
    if (modelId) {
      targetDir = path.join(uploadDir, modelId)
      await mkdir(targetDir, { recursive: true })
    }

    // 生成唯一文件名
    const timestamp = Date.now()
    const ext = path.extname(file.name) || '.jpg'
    const fileName = `image_${timestamp}${ext}`
    const filePath = path.join(targetDir, fileName)

    try {
      // 保存文件
      await writeFile(filePath, buffer)

      // 返回相对路径
      const relativePath = modelId
        ? `/mental-models/${modelId}/${fileName}`
        : `/mental-models/${fileName}`

      return NextResponse.json({
        success: true,
        url: relativePath,
        fileName,
        message: 'Image uploaded successfully'
      })

    } catch (error) {
      console.error('Error saving file:', error)
      return NextResponse.json(
        { error: 'Failed to save file' },
        { status: 500 }
      )
    }

  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json(
      { error: 'Failed to upload image' },
      { status: 500 }
    )
  }
}
