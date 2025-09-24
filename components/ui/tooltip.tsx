import React, { useState } from 'react'
import { cn } from '@/lib/utils'

interface TooltipProps {
  content: string
  children: React.ReactNode
  className?: string
  delay?: number
}

export function Tooltip({ content, children, className, delay = 500 }: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [timeoutId, setTimeoutId] = useState<NodeJS.Timeout | null>(null)

  const showTooltip = () => {
    const id = setTimeout(() => {
      setIsVisible(true)
    }, delay)
    setTimeoutId(id)
  }

  const hideTooltip = () => {
    if (timeoutId) {
      clearTimeout(timeoutId)
      setTimeoutId(null)
    }
    setIsVisible(false)
  }

  return (
    <div
      className="relative w-full"
      onMouseEnter={showTooltip}
      onMouseLeave={hideTooltip}
    >
      {children}
      {isVisible && content && (
        <div
          className={cn(
            'absolute z-50 px-2 py-1 text-xs text-white bg-gray-900 rounded shadow-lg whitespace-nowrap max-w-xs',
            'bottom-full left-1/2 transform -translate-x-1/2 mb-1',
            'animate-in fade-in-0 zoom-in-95 duration-150',
            className
          )}
        >
          {content}
          {/* Arrow */}
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-2 border-transparent border-t-gray-900" />
        </div>
      )}
    </div>
  )
}