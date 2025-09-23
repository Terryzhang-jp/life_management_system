import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'
import sharp from 'sharp'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const datetime = formData.get('datetime') as string

    if (!datetime) {
      return NextResponse.json(
        { error: 'Datetime is required' },
        { status: 400 }
      )
    }

    // 获取所有上传的文件
    const files = formData.getAll('photos') as File[]

    if (files.length === 0) {
      return NextResponse.json(
        { error: 'No files uploaded' },
        { status: 400 }
      )
    }

    // 验证文件数量限制
    if (files.length > 10) {
      return NextResponse.json(
        { error: 'Maximum 10 photos allowed' },
        { status: 400 }
      )
    }

    const uploadedPhotos: string[] = []

    // 创建以时间戳为名的文件夹
    const folderName = new Date(datetime).toISOString().replace(/[:.]/g, '-').split('T')[0] + '_' +
                      new Date(datetime).toISOString().replace(/[:.]/g, '-').split('T')[1].substring(0, 8)

    const uploadDir = path.join(process.cwd(), 'public', 'my-past', folderName)
    await mkdir(uploadDir, { recursive: true })

    // 创建压缩图片文件夹
    const compressedDir = path.join(uploadDir, 'compressed')
    await mkdir(compressedDir, { recursive: true })

    // 处理每个文件
    for (let i = 0; i < files.length; i++) {
      const file = files[i]

      // 验证文件类型
      if (!file.type.startsWith('image/')) {
        return NextResponse.json(
          { error: `File ${i + 1} is not an image` },
          { status: 400 }
        )
      }

      // 验证文件大小 (5MB限制)
      if (file.size > 5 * 1024 * 1024) {
        return NextResponse.json(
          { error: `File ${i + 1} size must be less than 5MB` },
          { status: 400 }
        )
      }

      const bytes = await file.arrayBuffer()
      const buffer = Buffer.from(bytes)

      // 生成文件名
      const timestamp = Date.now()
      const fileName = `photo_${i + 1}_${timestamp}.jpg`
      const filePath = path.join(uploadDir, fileName)
      const compressedFilePath = path.join(compressedDir, fileName)

      try {
        // 保存原图
        await writeFile(filePath, buffer)

        // 创建压缩版本
        await sharp(buffer)
          .resize(1200, 1200, {
            fit: 'inside',
            withoutEnlargement: true
          })
          .jpeg({
            quality: 80,
            progressive: true
          })
          .toFile(compressedFilePath)

        // 存储压缩版本的相对路径
        const relativePath = `/my-past/${folderName}/compressed/${fileName}`
        uploadedPhotos.push(relativePath)

      } catch (error) {
        console.error(`Error processing file ${i + 1}:`, error)
        return NextResponse.json(
          { error: `Failed to process file ${i + 1}` },
          { status: 500 }
        )
      }
    }

    return NextResponse.json({
      success: true,
      photos: uploadedPhotos,
      folderName,
      message: `Successfully uploaded ${uploadedPhotos.length} photos`
    })

  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json(
      { error: 'Failed to upload photos' },
      { status: 500 }
    )
  }
}