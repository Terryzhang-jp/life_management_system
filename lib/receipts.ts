import { mkdir, stat, writeFile, unlink } from 'fs/promises'
import path from 'path'
import { randomUUID } from 'crypto'

export const RECEIPTS_SUBDIR = 'receipts'

const getReceiptsDir = async () => {
  const dir = path.join(process.cwd(), 'public', RECEIPTS_SUBDIR)
  try {
    await stat(dir)
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      await mkdir(dir, { recursive: true })
    } else {
      throw error
    }
  }
  return dir
}

export type ReceiptBlob = { blob: Blob; name?: string }

const normalisePath = (relativePath: string) => {
  if (!relativePath) return ''
  return relativePath.startsWith('/') ? relativePath.replace(/^\//, '') : relativePath
}

export const saveReceiptBlobs = async (files: ReceiptBlob[]) => {
  if (!files.length) return []
  const receiptDir = await getReceiptsDir()
  const savedPaths: string[] = []

  for (const { blob, name } of files) {
    const arrayBuffer = await blob.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    const extSource = name && name.includes('.') ? name.split('.').pop()?.toLowerCase() : undefined
    const extension = extSource || 'bin'
    const filename = `${randomUUID()}.${extension}`
    const filepath = path.join(receiptDir, filename)
    await writeFile(filepath, buffer)
    savedPaths.push(`/${RECEIPTS_SUBDIR}/${filename}`)
  }

  return savedPaths
}

export const deleteReceiptPaths = async (paths: string[]) => {
  await Promise.all(
    paths.map(async (relativePath) => {
      const normalized = normalisePath(relativePath)
      if (!normalized.startsWith(`${RECEIPTS_SUBDIR}/`)) return
      const filePath = path.join(process.cwd(), 'public', normalized)
      try {
        await unlink(filePath)
      } catch (error: any) {
        if (error.code !== 'ENOENT') {
          console.error('Failed to delete receipt file:', filePath, error)
        }
      }
    })
  )
}
