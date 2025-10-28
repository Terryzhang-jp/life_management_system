/**
 * Vision Tools - 图像分析工具集
 *
 * 使用 Gemini Vision API 分析图片内容
 * 用于票据识别、OCR 文本提取等场景
 */

import { tool } from '@langchain/core/tools'
import { z } from 'zod'
import { ChatGoogleGenerativeAI } from '@langchain/google-genai'
import { HumanMessage } from '@langchain/core/messages'

/**
 * Vision 工具 - 分析图片内容
 * 用于票据识别、OCR 等场景
 */
export const analyzeImageTool = tool(
  async ({ imageBase64, mimeType, prompt }) => {
    try {
      const model = new ChatGoogleGenerativeAI({
        modelName: 'gemini-2.0-flash-exp',
        temperature: 0.1,
        apiKey: process.env.GOOGLE_GENAI_API_KEY || process.env.GEMINI_API_KEY
      })

      const message = new HumanMessage({
        content: [
          { type: 'text', text: prompt },
          {
            type: 'image_url',
            image_url: `data:${mimeType};base64,${imageBase64}`
          }
        ]
      })

      const response = await model.invoke([message])
      return response.content as string
    } catch (error: any) {
      return JSON.stringify({ success: false, error: error.message })
    }
  },
  {
    name: 'analyze_image',
    description: '使用 Vision API 分析图片内容，提取结构化信息。常用于票据识别、OCR 文本提取等场景。',
    schema: z.object({
      imageBase64: z.string().describe('图片的 Base64 编码字符串'),
      mimeType: z.string().describe('图片 MIME 类型，如 image/jpeg, image/png'),
      prompt: z.string().describe('分析提示词，描述希望提取的信息')
    })
  }
)

import type { DynamicStructuredTool } from '@langchain/core/tools'
import type { ToolMetadata } from '../types'

/**
 * 获取所有 Vision 工具及其元数据
 */
export function getVisionTools(): Array<{
  tool: DynamicStructuredTool
  metadata: Omit<ToolMetadata, 'category'>
}> {
  return [
    {
      tool: analyzeImageTool,
      metadata: {
        displayName: '分析图片内容',
        description: '使用 Vision API 分析图片内容，提取结构化信息（常用于票据识别、OCR 等）',
        readonly: true,
        version: '1.0.0',
      },
    },
  ]
}
