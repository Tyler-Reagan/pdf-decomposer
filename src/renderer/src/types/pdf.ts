export type AppPhase =
  | 'drop'
  | 'selecting'
  | 'configuring'
  | 'processing'
  | 'complete'
  | 'error'

export interface LoadedPdf {
  filePath: string
  fileName: string
  totalPages: number
  fileSizeBytes: number
}

export interface PageGroup {
  id: string
  name: string
  color: string
  pageIndices: number[] // 0-based, may be non-contiguous
}

export interface OutputFile {
  groupId: string
  outputFileName: string
  outputFilePath: string
}

export const GROUP_COLORS = [
  '#6366f1', // indigo
  '#f59e0b', // amber
  '#10b981', // emerald
  '#ef4444', // red
  '#8b5cf6', // violet
  '#f97316', // orange
  '#06b6d4', // cyan
  '#ec4899'  // pink
] as const

/** Convert 0-based page indices to display range string e.g. "1–3, 5, 8–10" */
export function indicesToRangeString(indices: number[]): string {
  if (indices.length === 0) return ''
  const sorted = [...indices].sort((a, b) => a - b)
  const ranges: string[] = []
  let start = sorted[0]
  let end = sorted[0]

  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] === end + 1) {
      end = sorted[i]
    } else {
      ranges.push(start === end ? `${start + 1}` : `${start + 1}–${end + 1}`)
      start = sorted[i]
      end = sorted[i]
    }
  }
  ranges.push(start === end ? `${start + 1}` : `${start + 1}–${end + 1}`)
  return ranges.join(', ')
}

/** Parse range string to 0-based indices. Returns null on parse error. */
export function rangeStringToIndices(input: string, totalPages: number): number[] | null {
  if (!input.trim()) return []
  const parts = input.split(',').map((s) => s.trim())
  const indices: number[] = []

  for (const part of parts) {
    const dashMatch = part.match(/^(\d+)\s*[–\-]\s*(\d+)$/)
    if (dashMatch) {
      const from = parseInt(dashMatch[1]) - 1
      const to = parseInt(dashMatch[2]) - 1
      if (from < 0 || to >= totalPages || from > to) return null
      for (let i = from; i <= to; i++) indices.push(i)
    } else {
      const single = parseInt(part)
      if (isNaN(single) || single < 1 || single > totalPages) return null
      indices.push(single - 1)
    }
  }
  return [...new Set(indices)].sort((a, b) => a - b)
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
