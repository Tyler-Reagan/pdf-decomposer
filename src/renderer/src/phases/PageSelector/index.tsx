import { useEffect, useRef, useState, useCallback } from 'react'
import { usePdfStore } from '../../store/usePdfStore'
import { usePdfWorker } from './usePdfWorker'
import { PageThumbnail } from './PageThumbnail'
import { GroupPanel } from './GroupPanel'
import { FloatingActionBar } from './FloatingActionBar'
import { PagePreviewModal } from './PagePreviewModal'
import { Button } from '../../components/Button'

const CARD_WIDTH = 138
const THUMB_W = 120
const THUMB_H = 160

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
          observerRef.current?.observe(el)
        } else {
          const old = cardRefs.current.get(pageIndex)
          if (old) observerRef.current?.unobserve(old)
          cardRefs.current.delete(pageIndex)
          stableCardRefCallbacks.current.delete(pageIndex)
        }
      })
    }
    return stableCardRefCallbacks.current.get(pageIndex)!
  }, [])

  const observerRef = useRef<IntersectionObserver | null>(null)
  const renderRequestedRef = useRef<Set<number>>(new Set())

  const { initWorker, renderPage } = usePdfWorker({
    onReady: () => setInitialized(true),
    onPageRendered: (pageIndex, bitmap, renderType) => {
      if (renderType === 'preview') {
        setPreviewBitmaps((prev) => new Map(prev).set(pageIndex, bitmap))
      } else {
        setThumbBitmaps((prev) => new Map(prev).set(pageIndex, bitmap))
      }
    },
    onPageError: (pageIndex, renderType) => {
      if (renderType === 'thumb') {
        setErrorPages((prev) => new Set(prev).add(pageIndex))
      }
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

  // Set up IntersectionObserver rooted at the scroll container so it fires
  // correctly as the user scrolls within the overflow div (not just the viewport)
  useEffect(() => {
    if (!initialized || !scrollContainerRef.current) return

    observerRef.current = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const el = entry.target as HTMLDivElement
          const idx = parseInt(el.dataset.pageIndex ?? '-1')
          if (idx < 0) continue
          if (entry.isIntersecting && !renderRequestedRef.current.has(idx)) {
            renderRequestedRef.current.add(idx)
            renderPage(idx, 'thumb', { targetWidth: THUMB_W, targetHeight: THUMB_H })
          }
        }
      },
      {
        root: scrollContainerRef.current,   // ← key fix: observe within the div
        threshold: 0.1,
        rootMargin: '200px'
      }
    )

    for (const [, el] of cardRefs.current) observerRef.current.observe(el)
    return () => observerRef.current?.disconnect()
  }, [initialized, renderPage])

  // Preview: request high-res renders for selected pages
  const handleOpenPreview = useCallback(() => {
    setShowPreview(true)
  }, [])

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

  const totalPages = loadedPdf.totalPages
  const sortedSelected = [...selectedPageIndices].sort((a, b) => a - b)

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
          onMouseMove={handleGridMouseMove}
          onMouseUp={handleGridMouseUp}
          onMouseLeave={handleGridMouseUp}
        >
          <div
            className="grid gap-4 p-6"
            style={{ gridTemplateColumns: `repeat(auto-fill, minmax(${CARD_WIDTH}px, 1fr))` }}
          >
            {Array.from({ length: totalPages }, (_, i) => (
              <PageThumbnail
                key={i}
                pageIndex={i}
                bitmap={thumbBitmaps.get(i) ?? null}
                hasError={errorPages.has(i)}
                group={groups.find((g) => g.pageIndices.includes(i))}
                isSelected={selectedPageIndices.has(i)}
                onMouseDown={handleMouseDown}
                onMouseEnter={handleMouseEnter}
                observerRef={getCardRef(i)}
              />
            ))}
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
          groups={groups}
          onClose={() => setShowPreview(false)}
          onRequestRender={handlePreviewRender}
        />
      )}
    </div>
  )
}
