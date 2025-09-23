import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { Toaster } from "@/components/ui/toaster"
import GlobalThoughtBubble from "@/components/global-thought-bubble"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "人生顶层逻辑",
  description: "探索并记录你的人生哲学与核心价值观",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="zh-CN">
      <body className={inter.className}>
        {children}
        <GlobalThoughtBubble />
        <Toaster />
      </body>
    </html>
  )
}