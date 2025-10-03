import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical } from 'lucide-react'
import { cn } from '@/lib/utils'

interface SortableTaskItemProps {
  id: string | number
  children: React.ReactNode
  hideHandle?: boolean
}

export function SortableTaskItem({ id, children, hideHandle = false }: SortableTaskItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div ref={setNodeRef} style={style} className="relative group">
      <div
        className={cn(
          'absolute left-1 top-1/2 -translate-y-1/2 cursor-grab active:cursor-grabbing z-10 opacity-0 group-hover:opacity-100 transition-opacity',
          hideHandle && 'hidden'
        )}
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4 text-gray-400 hover:text-gray-600" />
      </div>
      <div className={cn('pl-6', hideHandle && 'pl-0')}>
        {children}
      </div>
    </div>
  )
}
