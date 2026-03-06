import { useEffect, useRef, memo } from 'react'
import { motion } from 'framer-motion'
import type { PageGroup } from '../../types/pdf'

interface PageThumbnailProps {
  pageIndex: number
  bitmap: ImageBitmap | null
  hasError: boolean
  group: PageGroup | undefined
  isSelected: boolean
  onMouseDown: (e: React.MouseEvent, index: number) => void
  onMouseEnter: (e: React.MouseEvent, index: number) => void
  observerRef: (el: HTMLDivElement | null) => void
}

export const PageThumbnail = memo(function PageThumbnail({
  pageIndex,
  bitmap,
  hasError,
  group,
  isSelected,
  onMouseDown,
  onMouseEnter,
  observerRef
}: PageThumbnailProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (!bitmap || !canvasRef.current) return
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    canvas.width = bitmap.width
    canvas.height = bitmap.height
    ctx.drawImage(bitmap, 0, 0)
  }, [bitmap])

  const borderWidth = isSelected || group ? 2 : 1

  return (
    <div
      ref={observerRef}
      data-page-index={pageIndex}
      onMouseDown={(e) => onMouseDown(e, pageIndex)}
      onMouseEnter={(e) => onMouseEnter(e, pageIndex)}
      className="relative select-none cursor-pointer"
      style={{ userSelect: 'none' }}
    >
      <motion.div
        className="relative rounded-lg overflow-hidden bg-slate-800"
        style={{
          border: `${borderWidth}px solid ${isSelected ? '#6366f1' : group ? group.color + '80' : '#334155'}`,
          boxShadow: isSelected
            ? '0 0 0 2px rgba(99,102,241,0.4), 0 4px 12px rgba(0,0,0,0.4)'
            : group
            ? `0 0 0 1px ${group.color}30`
            : '0 2px 8px rgba(0,0,0,0.3)'
        }}
        animate={{
          scale: isSelected ? 1.03 : 1
        }}
        transition={{ duration: 0.1 }}
      >
        {/* Group color stripe */}
        {group && (
          <div
            className="absolute left-0 top-0 bottom-0 w-1 z-10"
            style={{ backgroundColor: group.color }}
          />
        )}

        {/* Selected overlay */}
        {isSelected && (
          <div className="absolute inset-0 bg-indigo-500/15 z-10 pointer-events-none" />
        )}

        {/* Checkmark */}
        {isSelected && (
          <div className="absolute top-1.5 right-1.5 z-20 w-5 h-5 rounded-full bg-indigo-500 flex items-center justify-center shadow">
            <svg width="11" height="9" viewBox="0 0 11 9" fill="none">
              <path d="M1 4L4 7L10 1" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        )}

        {/* Canvas or placeholder — fixed container, canvas fills it naturally */}
        <div className="w-[120px] h-[160px] flex items-center justify-center bg-slate-800">
          {bitmap ? (
            <canvas
              ref={canvasRef}
              style={{
                display: 'block',
                maxWidth: '100%',
                maxHeight: '100%',
                width: 'auto',
                height: 'auto'
              }}
            />
          ) : hasError ? (
            <div className="flex flex-col items-center justify-center gap-2 w-full h-full opacity-50">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.5">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <span className="text-slate-500 text-[10px]">Failed</span>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center gap-2 w-full h-full">
              <div className="w-8 h-10 rounded-sm bg-slate-700 animate-pulse" />
              <div className="w-6 h-1 rounded bg-slate-700 animate-pulse" />
            </div>
          )}
        </div>

        {/* Page number */}
        <div className="absolute bottom-0 left-0 right-0 bg-slate-900/80 text-center py-1">
          <span className="text-slate-400 text-[11px] font-medium">{pageIndex + 1}</span>
        </div>
      </motion.div>
    </div>
  )
})
