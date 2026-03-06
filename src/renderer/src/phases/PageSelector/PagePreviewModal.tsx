import { useEffect, useRef, memo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { PageGroup } from '../../types/pdf'

interface PagePreviewModalProps {
  pageIndices: number[]           // sorted list of pages to preview
  bitmaps: Map<number, ImageBitmap>
  errorPages: Set<number>
  groups: PageGroup[]
  onClose: () => void
  onRequestRender: (pageIndex: number) => void
}

export function PagePreviewModal({
  pageIndices,
  bitmaps,
  errorPages,
  groups,
  onClose,
  onRequestRender
}: PagePreviewModalProps) {
  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex flex-col"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.15 }}
      >
        {/* Backdrop */}
        <div
          className="absolute inset-0 bg-black/80 backdrop-blur-sm"
          onClick={onClose}
        />

        {/* Panel */}
        <motion.div
          className="relative z-10 flex flex-col bg-slate-900 border border-slate-700/60 rounded-2xl shadow-2xl mx-6 my-6 overflow-hidden"
          style={{ maxHeight: 'calc(100vh - 48px)' }}
          initial={{ scale: 0.96, y: 8 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.96, y: 8 }}
          transition={{ duration: 0.18 }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700/60 flex-shrink-0">
            <div>
              <h2 className="text-white font-semibold text-lg">Page Preview</h2>
              <p className="text-slate-500 text-sm">
                {pageIndices.length} page{pageIndices.length !== 1 ? 's' : ''} selected
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-slate-500 hover:text-white transition-colors p-1 rounded-lg hover:bg-slate-800"
              title="Close (Esc)"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          {/* Grid */}
          <div className="flex-1 overflow-y-auto p-6">
            <div
              className="grid gap-6"
              style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))' }}
            >
              {pageIndices.map((idx) => {
                const group = groups.find((g) => g.pageIndices.includes(idx))
                return (
                  <PreviewCard
                    key={idx}
                    pageIndex={idx}
                    bitmap={bitmaps.get(idx) ?? null}
                    hasError={errorPages.has(idx)}
                    group={group}
                    onVisible={() => onRequestRender(idx)}
                  />
                )
              })}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

interface PreviewCardProps {
  pageIndex: number
  bitmap: ImageBitmap | null
  hasError: boolean
  group: PageGroup | undefined
  onVisible: () => void
}

const PreviewCard = memo(function PreviewCard({ pageIndex, bitmap, hasError, group, onVisible }: PreviewCardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const cardRef = useRef<HTMLDivElement>(null)
  const requested = useRef(false)

  // Lazy-load: request render when card enters view
  useEffect(() => {
    if (!cardRef.current) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !requested.current) {
          requested.current = true
          onVisible()
        }
      },
      { threshold: 0.1, rootMargin: '100px' }
    )
    observer.observe(cardRef.current)
    return () => observer.disconnect()
  }, [onVisible])

  // Draw bitmap when it arrives
  useEffect(() => {
    if (!bitmap || !canvasRef.current) return
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    canvas.width = bitmap.width
    canvas.height = bitmap.height
    ctx.drawImage(bitmap, 0, 0)
  }, [bitmap])

  return (
    <div ref={cardRef} className="flex flex-col items-center gap-2">
      <div
        className="relative rounded-xl overflow-hidden bg-slate-800 shadow-lg w-full"
        style={{
          border: `2px solid ${group ? group.color + '80' : '#334155'}`,
          ...(group ? { borderLeftColor: group.color, borderLeftWidth: 4 } : {})
        }}
      >
        {/* Page content */}
        <div className="w-full flex items-center justify-center bg-slate-800" style={{ minHeight: 320 }}>
          {bitmap ? (
            <canvas
              ref={canvasRef}
              style={{ display: 'block', maxWidth: '100%', maxHeight: 480, width: 'auto', height: 'auto' }}
            />
          ) : hasError ? (
            <div className="flex flex-col items-center gap-3 py-12 opacity-50">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.5">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <span className="text-slate-500 text-xs">Failed to render</span>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3 py-12">
              <motion.div
                className="w-8 h-8 border-2 border-slate-600 border-t-indigo-500 rounded-full"
                animate={{ rotate: 360 }}
                transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
              />
              <span className="text-slate-600 text-xs">Rendering…</span>
            </div>
          )}
        </div>
      </div>

      {/* Label */}
      <div className="flex items-center gap-2">
        <span className="text-slate-400 text-sm font-medium">Page {pageIndex + 1}</span>
        {group && (
          <span
            className="text-xs px-2 py-0.5 rounded-full font-medium"
            style={{ backgroundColor: group.color + '25', color: group.color }}
          >
            {group.name}
          </span>
        )}
      </div>
    </div>
  )
})
