'use client'

import { useManualMode } from '@/hooks/use-manual-mode'
import { Button } from '@/components/ui/button'
import { Lock, Unlock, Sparkles } from 'lucide-react'

/**
 * Manual Mode Toggle Component
 *
 * Displays a toggle button to unlock/lock manual Quest/Milestone/Checkpoint creation.
 * When locked (default), users are encouraged to use the AI Assistant.
 */
export function ManualModeToggle() {
  const { isUnlocked, isLoading, toggle } = useManualMode()

  if (isLoading) {
    return null
  }

  return (
    <div className="flex items-center gap-2">
      <Button
        onClick={toggle}
        variant={isUnlocked ? 'outline' : 'default'}
        size="sm"
        className="gap-2"
      >
        {isUnlocked ? (
          <>
            <Unlock className="h-4 w-4" />
            手动模式
          </>
        ) : (
          <>
            <Lock className="h-4 w-4" />
            解锁手动模式
          </>
        )}
      </Button>

      {!isUnlocked && (
        <div className="flex items-center gap-1.5 text-xs text-blue-600">
          <Sparkles className="h-3.5 w-3.5" />
          <span>建议使用 AI 协助创建 Quest</span>
        </div>
      )}
    </div>
  )
}
