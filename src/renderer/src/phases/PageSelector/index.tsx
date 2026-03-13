import { useEffect, useRef, useState, useCallback } from 'react'
import { usePdfStore } from '../../store/usePdfStore'
import { usePdfWorker } from './usePdfWorker'
import { PageThumbnail } from './PageThumbnail'
import { GroupPanel } from './GroupPanel'
import { FloatingActionBar } from './FloatingActionBar'
import { PagePreviewModal } from './PagePreviewModal'
import { Button } from '../../components/Button'

// Virtual scroll / window constants
const COLS = 3
const ROWS_PER_WINDOW = 2
const PAGES_PER_WINDOW = COLS * ROWS_PER_WINDOW  // 6
const THUMB_W = 200
const THUMB_H = 267  // ~3:4 ratio
const CARD_H = 300   // fixed card height for predictable row math
const GAP = 16
const ROW_HEIGHT = CARD_H + GAP
const PADDING_V = 24

export function PageSelector() {
  const {
    loadedPdf,
    selectedPageIndices,
    setSelectedPageIndices,
    clearSelection,
    groups,
    addGroup,
    assignPagesToGroup,
    setPhase
  } = usePdfStore()

  const [thumbBitmaps, setThumbBitmaps] = useState<Map<number, ImageBitmap>>(new Map())
  const [previewBitmaps, setPreviewBitmaps] = useState<Map<number, ImageBitmap>>(new Map())
  const [errorPages, setErrorPages] = useState<Set<number>>(new Set())
  const [initialized, setInitialized] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const [windowStart, setWindowStart] = useState(0)

  // Lasso state — coords in scroll-content space
  const [lasso, setLasso] = useState<{ x: number; y: number; w: number; h: number } | null>(null)
  const lassoOriginRef = useRef<{ x: number; y: number } | null>(null)
  const isDraggingLasso = useRef(false)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const cardRefs = useRef<Map<number, HTMLDivElement>>(new Map())

  // Stable ref callbacks — one per page index, created once, no ref churn on re-render
  const stableCardRefCallbacks = useRef<Map<number, (el: HTMLDivElement | null) => void>>(new Map())
  const getCardRef = useCallback((pageIndex: number) => {
    if (!stableCardRefCallbacks.current.has(pageIndex)) {
      stableCardRefCallbacks.current.set(pageIndex, (el: HTMLDivElement | null) => {
        if (el) {
          cardRefs.current.set(pageIndex, el)
        } else {
          cardRefs.current.delete(pageIndex)
          stableCardRefCallbacks.current.delete(pageIndex)
        }
      })
    }
    return stableCardRefCallbacks.current.get(pageIndex)!
  }, [])

  const totalPages = loadedPdf?.totalPages ?? 0

  // Window pages — always snapped to row boundaries
  const windowPages = Array.from(
    { length: Math.min(PAGES_PER_WINDOW, totalPages - windowStart) },
    (_, i) => windowStart + i
  )

  // Sync currentWindowRef so onPageRendered can discard out-of-window bitmaps
  const currentWindowRef = useRef<Set<number>>(new Set())
  currentWindowRef.current = new Set(windowPages)

  const { initWorker, renderPage } = usePdfWorker({
    onReady: () => setInitialized(true),
    onPageRendered: (pageIndex, bitmap, renderType) => {
      if (renderType === 'thumb') {
        if (!currentWindowRef.current.has(pageIndex)) {
          bitmap.close()
          return
        }
        setThumbBitmaps((prev) => {
          prev.get(pageIndex)?.close()
          return new Map(prev).set(pageIndex, bitmap)
        })
      } else {
        setPreviewBitmaps((prev) => {
          prev.get(pageIndex)?.close()
          return new Map(prev).set(pageIndex, bitmap)
        })
      }
    },
    onPageError: (pageIndex, renderType) => {
      if (renderType === 'thumb' && !currentWindowRef.current.has(pageIndex)) return
      setErrorPages((prev) => new Set(prev).add(pageIndex))
    }
  })

  // Initialize worker
  useEffect(() => {
    if (!loadedPdf) return
    let cancelled = false
    window.electronAPI.readPdfFile(loadedPdf.filePath).then((buffer) => {
      if (cancelled) return
      const ab = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength) as ArrayBuffer
      initWorker(ab)
    })
    return () => { cancelled = true }
  }, [loadedPdf, initWorker])

  // Window change: evict bitmaps for departing pages, request renders for arriving pages
  const prevWindowPagesRef = useRef<Set<number>>(new Set())
  useEffect(() => {
    if (!initialized) return

    const newWindow = new Set(windowPages)
    const entering = windowPages.filter((i) => !prevWindowPagesRef.current.has(i))
    const leaving = [...prevWindowPagesRef.current].filter((i) => !newWindow.has(i))

    if (leaving.length > 0) {
      setThumbBitmaps((prev) => {
        const next = new Map(prev)
        for (const i of leaving) {
          next.get(i)?.close()
          next.delete(i)
        }
        return next
      })
      // Clear error state so evicted pages can retry when they re-enter the window
      setErrorPages((prev) => {
        const next = new Set(prev)
        for (const i of leaving) next.delete(i)
        return next
      })
    }

    for (const i of entering) {
      renderPage(i, 'thumb', { targetWidth: THUMB_W, targetHeight: THUMB_H })
    }

    prevWindowPagesRef.current = newWindow
  }, [initialized, windowStart]) // eslint-disable-line react-hooks/exhaustive-deps

  // Close all bitmaps on unmount
  useEffect(() => {
    return () => {
      setThumbBitmaps((prev) => { prev.forEach((b) => b.close()); return new Map() })
      setPreviewBitmaps((prev) => { prev.forEach((b) => b.close()); return new Map() })
    }
  }, [])

  // Scroll → advance window, snapped to row boundaries
  const handleScroll = useCallback(() => {
    const el = scrollContainerRef.current
    if (!el) return
    const totalRows = Math.ceil(totalPages / COLS)
    const virtualH = PADDING_V * 2 + totalRows * ROW_HEIGHT - GAP
    const maxRow = Math.max(0, totalRows - ROWS_PER_WINDOW)

    // Snap to last window when scrolled near the bottom
    if (el.scrollTop + el.clientHeight >= virtualH - GAP) {
      setWindowStart(maxRow * COLS)
      return
    }

    const firstRow = Math.max(0, Math.floor((el.scrollTop - PADDING_V) / ROW_HEIGHT))
    setWindowStart(Math.min(firstRow, maxRow) * COLS)
  }, [totalPages])

  // Preview: request high-res renders for selected pages
  const handleOpenPreview = useCallback(() => { setShowPreview(true) }, [])
  const handlePreviewRender = useCallback((pageIndex: number) => {
    renderPage(pageIndex, 'preview', { fixedScale: 1.5 })
  }, [renderPage])

  // Selection logic
  const lastClickIndexRef = useRef<number | null>(null)

  const handleMouseDown = useCallback((e: React.MouseEvent, pageIndex: number) => {
    e.preventDefault()

    if (e.shiftKey && lastClickIndexRef.current !== null) {
      const from = Math.min(lastClickIndexRef.current, pageIndex)
      const to = Math.max(lastClickIndexRef.current, pageIndex)
      const range = new Set(selectedPageIndices)
      for (let i = from; i <= to; i++) range.add(i)
      setSelectedPageIndices(range)
      return
    }

    if (e.ctrlKey || e.metaKey) {
      const next = new Set(selectedPageIndices)
      if (next.has(pageIndex)) next.delete(pageIndex)
      else next.add(pageIndex)
      setSelectedPageIndices(next)
      lastClickIndexRef.current = pageIndex
      return
    }

    const el = scrollContainerRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    lassoOriginRef.current = {
      x: e.clientX - rect.left + el.scrollLeft,
      y: e.clientY - rect.top + el.scrollTop
    }
    isDraggingLasso.current = false

    if (selectedPageIndices.has(pageIndex)) {
      const next = new Set(selectedPageIndices)
      next.delete(pageIndex)
      setSelectedPageIndices(next)
      lastClickIndexRef.current = null
    } else {
      setSelectedPageIndices(new Set([pageIndex]))
      lastClickIndexRef.current = pageIndex
    }
  }, [selectedPageIndices, setSelectedPageIndices])

  const handleMouseEnter = useCallback((_e: React.MouseEvent, _pageIndex: number) => {}, [])

  const handleGridMouseMove = useCallback((e: React.MouseEvent) => {
    if (!lassoOriginRef.current) return
    const el = scrollContainerRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const curX = e.clientX - rect.left + el.scrollLeft
    const curY = e.clientY - rect.top + el.scrollTop
    const ox = lassoOriginRef.current.x
    const oy = lassoOriginRef.current.y

    if (!isDraggingLasso.current && (Math.abs(curX - ox) > 4 || Math.abs(curY - oy) > 4)) {
      isDraggingLasso.current = true
    }

    if (isDraggingLasso.current) {
      const x = Math.min(ox, curX)
      const y = Math.min(oy, curY)
      const w = Math.abs(curX - ox)
      const h = Math.abs(curY - oy)
      setLasso({ x, y, w, h })

      const selected = new Set<number>()
      for (const [idx, cardEl] of cardRefs.current) {
        const cr = cardEl.getBoundingClientRect()
        const cardL = cr.left - rect.left + el.scrollLeft
        const cardT = cr.top - rect.top + el.scrollTop
        if (cardL < x + w && cardL + cr.width > x && cardT < y + h && cardT + cr.height > y) {
          selected.add(idx)
        }
      }
      setSelectedPageIndices(selected)
    }
  }, [setSelectedPageIndices])

  const handleGridMouseUp = useCallback(() => {
    lassoOriginRef.current = null
    isDraggingLasso.current = false
    setLasso(null)
  }, [])

  const handleAddGroupWithSelection = useCallback(() => {
    const group = addGroup()
    assignPagesToGroup(group.id, [...selectedPageIndices])
    clearSelection()
  }, [addGroup, assignPagesToGroup, selectedPageIndices, clearSelection])

  const canContinue = groups.length > 0 && groups.some((g) => g.pageIndices.length > 0)

  if (!loadedPdf) return null

  const sortedSelected = [...selectedPageIndices].sort((a, b) => a - b)

  const totalRows = Math.ceil(totalPages / COLS)
  const totalVirtualHeight = PADDING_V * 2 + totalRows * ROW_HEIGHT - GAP
  const windowOffsetY = PADDING_V + (windowStart / COLS) * ROW_HEIGHT

  return (
    <div className="flex h-full bg-slate-900 select-none">
      {/* Left: Page grid column */}
      <div className="flex-1 flex flex-col min-w-0 relative">
        {/* Header */}
        <div className="flex items-center px-6 py-4 border-b border-slate-700/60 flex-shrink-0">
          <button
            onClick={() => { clearSelection(); setPhase('drop') }}
            className="text-slate-500 hover:text-slate-300 transition-colors mr-4"
            title="Back"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-white font-semibold text-lg truncate">{loadedPdf.fileName}</h1>
            <p className="text-slate-500 text-sm">{totalPages} pages</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-slate-500 text-sm">
              {selectedPageIndices.size > 0 && `${selectedPageIndices.size} selected`}
            </span>
            <Button
              variant="primary"
              disabled={!canContinue}
              onClick={() => setPhase('configuring')}
            >
              Configure Output
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </Button>
          </div>
        </div>

        {/* Keyboard hint */}
        <div className="px-6 py-2 text-slate-600 text-xs border-b border-slate-800/60 flex-shrink-0">
          Click to select · Shift+click to extend · Ctrl+click to toggle · Drag to lasso
        </div>

        {/* Scrollable grid */}
        <div
          ref={scrollContainerRef}
          className="relative flex-1 overflow-y-auto"
          onScroll={handleScroll}
          onMouseMove={handleGridMouseMove}
          onMouseUp={handleGridMouseUp}
          onMouseLeave={handleGridMouseUp}
        >
          {/* Virtual height spacer — gives the scrollbar the correct proportion */}
          <div style={{ height: totalVirtualHeight, position: 'relative' }}>
            {/* Sliding window grid — absolutely positioned at the window's row offset */}
            <div
              className="absolute left-0 right-0 grid gap-4 px-6"
              style={{
                top: windowOffsetY,
                gridTemplateColumns: `repeat(${COLS}, 1fr)`
              }}
            >
              {windowPages.map((pageIndex) => (
                <PageThumbnail
                  key={pageIndex}
                  pageIndex={pageIndex}
                  bitmap={thumbBitmaps.get(pageIndex) ?? null}
                  hasError={errorPages.has(pageIndex)}
                  group={groups.find((g) => g.pageIndices.includes(pageIndex))}
                  isSelected={selectedPageIndices.has(pageIndex)}
                  onMouseDown={handleMouseDown}
                  onMouseEnter={handleMouseEnter}
                  cardRef={getCardRef(pageIndex)}
                  cardHeight={CARD_H}
                />
              ))}
            </div>
          </div>

          {/* Lasso */}
          {lasso && (
            <div
              className="absolute pointer-events-none border border-indigo-400 bg-indigo-500/10 z-20"
              style={{ left: lasso.x, top: lasso.y, width: lasso.w, height: lasso.h }}
            />
          )}
        </div>

        {/* Floating action bar — anchored to left panel, not scroll container */}
        <FloatingActionBar
          visible={selectedPageIndices.size > 0}
          onAddGroup={handleAddGroupWithSelection}
          onPreview={handleOpenPreview}
        />
      </div>

      {/* Right: Group panel */}
      <div className="w-72 flex-shrink-0 border-l border-slate-700/60 bg-slate-900/80">
        <GroupPanel />
      </div>

      {/* Preview modal */}
      {showPreview && (
        <PagePreviewModal
          pageIndices={sortedSelected}
          bitmaps={previewBitmaps}
          errorPages={errorPages}
          groups={groups}
          onClose={() => setShowPreview(false)}
          onRequestRender={handlePreviewRender}
        />
      )}
    </div>
  )
}
