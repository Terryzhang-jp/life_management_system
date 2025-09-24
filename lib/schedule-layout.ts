import { ScheduleBlock } from './schedule-db'

export interface BlockLayout {
  id: number
  column: number
  totalColumns: number
  left: number
  width: number
}

/**
 * Calculate layout for overlapping schedule blocks (Google Calendar style)
 */
export function calculateBlockLayouts(blocks: ScheduleBlock[]): Map<number, BlockLayout> {
  const layouts = new Map<number, BlockLayout>()

  if (blocks.length === 0) return layouts

  // Convert time strings to minutes for easier comparison
  const blocksWithMinutes = blocks.map(block => {
    const [startHour, startMin] = block.startTime.split(':').map(Number)
    const [endHour, endMin] = block.endTime.split(':').map(Number)
    return {
      ...block,
      startMinutes: startHour * 60 + startMin,
      endMinutes: endHour * 60 + endMin
    }
  })

  // Sort by start time, then by end time (longer events first)
  blocksWithMinutes.sort((a, b) => {
    if (a.startMinutes !== b.startMinutes) {
      return a.startMinutes - b.startMinutes
    }
    return b.endMinutes - a.endMinutes
  })

  // Find overlapping groups
  const groups: typeof blocksWithMinutes[][] = []

  for (const block of blocksWithMinutes) {
    let added = false

    // Try to add to an existing group
    for (const group of groups) {
      // Check if this block overlaps with any block in the group
      const overlaps = group.some(groupBlock =>
        block.startMinutes < groupBlock.endMinutes &&
        block.endMinutes > groupBlock.startMinutes
      )

      if (overlaps) {
        group.push(block)
        added = true
        break
      }
    }

    // Create a new group if no overlap found
    if (!added) {
      groups.push([block])
    }
  }

  // Merge groups that should be connected
  let merged = true
  while (merged) {
    merged = false
    for (let i = 0; i < groups.length - 1; i++) {
      for (let j = i + 1; j < groups.length; j++) {
        // Check if any block in group i overlaps with any in group j
        const groupsOverlap = groups[i].some(blockI =>
          groups[j].some(blockJ =>
            blockI.startMinutes < blockJ.endMinutes &&
            blockI.endMinutes > blockJ.startMinutes
          )
        )

        if (groupsOverlap) {
          // Merge group j into group i
          groups[i].push(...groups[j])
          groups.splice(j, 1)
          merged = true
          break
        }
      }
      if (merged) break
    }
  }

  // Process each group
  for (const group of groups) {
    // Sort group by start time
    group.sort((a, b) => a.startMinutes - b.startMinutes)

    // Assign columns to each block in the group
    const columns: typeof group[] = []

    for (const block of group) {
      // Find the first available column
      let column = 0
      let placed = false

      while (!placed) {
        // Check if this column is available
        if (!columns[column]) {
          columns[column] = []
        }

        // Check if block conflicts with any existing blocks in this column
        const hasConflict = columns[column].some(existingBlock =>
          block.startMinutes < existingBlock.endMinutes &&
          block.endMinutes > existingBlock.startMinutes
        )

        if (!hasConflict) {
          columns[column].push(block)
          placed = true
        } else {
          column++
        }
      }

      // Store the column assignment
      const totalColumns = columns.filter(col => col && col.length > 0).length
      layouts.set(block.id!, {
        id: block.id!,
        column,
        totalColumns,
        left: (column / totalColumns) * 100,
        width: (1 / totalColumns) * 100
      })
    }

    // Update all blocks in the group with the final column count
    const finalColumnCount = columns.filter(col => col && col.length > 0).length
    for (const block of group) {
      const layout = layouts.get(block.id!)!
      layout.totalColumns = finalColumnCount
      layout.left = (layout.column / finalColumnCount) * 100
      layout.width = (1 / finalColumnCount) * 100
    }
  }

  return layouts
}

/**
 * Calculate vertical position and height for a block
 */
export function calculateBlockVerticalLayout(
  block: ScheduleBlock,
  pixelsPerMinute: number = 1
): { top: number; height: number } {
  const [startHour, startMin] = block.startTime.split(':').map(Number)
  const [endHour, endMin] = block.endTime.split(':').map(Number)

  const startMinutes = startHour * 60 + startMin
  const endMinutes = endHour * 60 + endMin
  const duration = endMinutes - startMinutes

  return {
    top: startMinutes * pixelsPerMinute,
    height: Math.max(duration * pixelsPerMinute, 20) // Minimum height reduced to 20px for very small blocks
  }
}