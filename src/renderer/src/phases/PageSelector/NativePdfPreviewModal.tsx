import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface NativePdfPreviewModalProps {
  filePath: string
  initialPage: number  // 0-indexed
  totalPages: number
  onClose: () => void
}

export function NativePdfPreviewModal({
  filePath,
  initialPage,
  totalPages,
  onClose
}: NativePdfPreviewModalProps) {
  // 1-indexed to match the PDF #page= hash convention
  const [currentPage, setCurrentPage] = useState(initialPage + 1)
  const [loading, setLoading] = useState(true)
  const webviewRef = useRef<HTMLElement>(null)

  // file:// URL — replace Windows backslashes, append page hash
  const src = `file://${filePath.replace(/\\/g, '/')}#page=${currentPage}`

  // Keyboard navigation
  useEffect(() => {
    const handler = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') { onClose(); return }
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp' || e.key === 'PageUp') {
        e.preventDefault()
        setCurrentPage((p) => Math.max(1, p - 1))
      }
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown' || e.key === 'PageDown') {
        e.preventDefault()
        setCurrentPage((p) => Math.min(totalPages, p + 1))
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose, totalPages])

  // Track webview load state — re-registers whenever src changes
  useEffect(() => {
    setLoading(true)
    const el = webviewRef.current as (HTMLElement & { addEventListener: HTMLElement['addEventListener'] }) | null
    if (!el) return
    const onFinish = (): void => setLoading(false)
    el.addEventListener('did-finish-load', onFinish as EventListener)
    return () => el.removeEventListener('did-finish-load', onFinish as EventListener)
  }, [src])

  const goTo = (page: number): void => setCurrentPage(Math.max(1, Math.min(totalPages, page)))

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
        <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />

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
            <div className="flex items-center gap-5">
              <div>
                <h2 className="text-white font-semibold text-lg">Native Preview</h2>
                <p className="text-slate-500 text-sm">Rendered by Chromium's PDF engine</p>
              </div>

              {/* Page navigation */}
              <div className="flex items-center gap-1 border border-slate-700 rounded-lg px-1">
                <button
                  onClick={() => goTo(currentPage - 1)}
                  disabled={currentPage <= 1}
                  className="p-1.5 rounded text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  title="Previous page (←)"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="15 18 9 12 15 6" />
                  </svg>
                </button>
                <span className="text-slate-300 text-sm font-medium tabular-nums px-1 select-none">
                  {currentPage} <span className="text-slate-600">/</span> {totalPages}
                </span>
                <button
                  onClick={() => goTo(currentPage + 1)}
                  disabled={currentPage >= totalPages}
                  className="p-1.5 rounded text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  title="Next page (→)"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </button>
              </div>

              <span className="text-slate-600 text-xs">← → to navigate · Esc to close</span>
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

          {/* Webview body */}
          <div className="relative flex-1 min-h-0 bg-slate-800">
            {loading && (
              <div className="absolute inset-0 flex items-center justify-center z-10 bg-slate-900">
                <div className="flex flex-col items-center gap-3">
                  <motion.div
                    className="w-8 h-8 border-2 border-slate-600 border-t-indigo-500 rounded-full"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
                  />
                  <span className="text-slate-500 text-sm">Loading page {currentPage}…</span>
                </div>
              </div>
            )}
            <webview
              ref={webviewRef}
              src={src}
              style={{ width: '100%', height: '100%', display: 'block' }}
            />
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
