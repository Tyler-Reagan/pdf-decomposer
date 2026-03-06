import { useEffect, useRef, useState, useCallback } from 'react'
import { usePdfStore } from '../../store/usePdfStore'
import { usePdfWorker } from './usePdfWorker'
import { PageThumbnail } from './PageThumbnail'
import { GroupPanel } from './GroupPanel'
import { FloatingActionBar } from './FloatingActionBar'
import { Button } from '../../components/Button'

const THUMB_SCALE = 0.22 // Approximate scale for ~120px wide thumbnails
const CARD_WIDTH = 138  // px including padding
const CARD_HEIGHT = 196

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

  const [bitmaps, setBitmaps] = useState<Map<number, ImageBitmap>>(new Map())
  const [initialized, setInitialized] = useState(false)

  // Lasso state
  const [lasso, setLasso] = useState<{ x: number; y: number; w: number; h: number } | null>(null)
  const lassoOriginRef = useRef<{ x: number; y: number } | null>(null)
  const isDraggingLasso = useRef(false)
  const gridRef = useRef<HTMLDivElement>(null)
  const cardRefs = useRef<Map<number, HTMLDivElement>>(new Map())

  // IntersectionObserver for lazy loading
  const observerRef = useRef<IntersectionObserver | null>(null)
  const visiblePagesRef = useRef<Set<number>>(new Set())
  const renderRequestedRef = useRef<Set<number>>(new Set())

  const { initWorker, renderPage } = usePdfWorker({
    onReady: (_pageCount) => {
      setInitialized(true)
    },
    onPageRendered: (pageIndex, bitmap) => {
      setBitmaps((prev) => {
        const next = new Map(prev)
        next.set(pageIndex, bitmap)
        return next
      })
    }
  })

  // Initialize worker with PDF data
  useEffect(() => {
    if (!loadedPdf) return
    let cancelled = false

    window.electronAPI.readPdfFile(loadedPdf.filePath).then((buffer) => {
      if (cancelled) return
      // Convert Buffer to ArrayBuffer for transfer
      const ab = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength) as ArrayBuffer
      initWorker(ab)
    })

    return () => { cancelled = true }
  }, [loadedPdf, initWorker])

  // Set up IntersectionObserver
  useEffect(() => {
    if (!initialized) return

    observerRef.current = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const el = entry.target as HTMLDivElement
          const idx = parseInt(el.dataset.pageIndex ?? '-1')
          if (idx < 0) continue

          if (entry.isIntersecting) {
            visiblePagesRef.current.add(idx)
            if (!renderRequestedRef.current.has(idx)) {
              renderRequestedRef.current.add(idx)
              renderPage(idx, THUMB_SCALE)
            }
          } else {
            visiblePagesRef.current.delete(idx)
          }
        }
      },
      { threshold: 0.1, rootMargin: '200px' }
    )

    // Observe existing cards
    for (const [, el] of cardRefs.current) {
      observerRef.current.observe(el)
    }

    return () => observerRef.current?.disconnect()
  }, [initialized, renderPage])

  const setCardRef = useCallback((pageIndex: number) => (el: HTMLDivElement | null) => {
    if (el) {
      cardRefs.current.set(pageIndex, el)
      observerRef.current?.observe(el)
    } else {
      const old = cardRefs.current.get(pageIndex)
      if (old) observerRef.current?.unobserve(old)
      cardRefs.current.delete(pageIndex)
    }
  }, [])

  // Selection logic
  const lastClickIndexRef = useRef<number | null>(null)

  const handleMouseDown = useCallback((e: React.MouseEvent, pageIndex: number) => {
    e.preventDefault()

    if (e.shiftKey && lastClickIndexRef.current !== null) {
      // Extend range
      const from = Math.min(lastClickIndexRef.current, pageIndex)
      const to = Math.max(lastClickIndexRef.current, pageIndex)
      const range = new Set(selectedPageIndices)
      for (let i = from; i <= to; i++) range.add(i)
      setSelectedPageIndices(range)
      return
    }

    if (e.ctrlKey || e.metaKey) {
      // Toggle individual
      const next = new Set(selectedPageIndices)
      if (next.has(pageIndex)) next.delete(pageIndex)
      else next.add(pageIndex)
      setSelectedPageIndices(next)
      lastClickIndexRef.current = pageIndex
      return
    }

    // Start lasso or single click
    const grid = gridRef.current
    if (!grid) return
    const rect = grid.getBoundingClientRect()
    lassoOriginRef.current = { x: e.clientX - rect.left, y: e.clientY - rect.top }
    isDraggingLasso.current = false

    // Single click: select/deselect
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

  const handleMouseEnter = useCallback((e: React.MouseEvent, _pageIndex: number) => {
    // If mouse button is down (lasso), handled by mousemove on grid
    void e
    void _pageIndex
  }, [])

  const handleGridMouseMove = useCallback((e: React.MouseEvent) => {
    if (!lassoOriginRef.current) return
    const grid = gridRef.current
    if (!grid) return
    const rect = grid.getBoundingClientRect()

    const curX = e.clientX - rect.left
    const curY = e.clientY - rect.top
    const ox = lassoOriginRef.current.x
    const oy = lassoOriginRef.current.y

    const dx = curX - ox
    const dy = curY - oy

    if (!isDraggingLasso.current && (Math.abs(dx) > 4 || Math.abs(dy) > 4)) {
      isDraggingLasso.current = true
    }

    if (isDraggingLasso.current) {
      const x = Math.min(ox, curX)
      const y = Math.min(oy, curY)
      const w = Math.abs(dx)
      const h = Math.abs(dy)
      setLasso({ x, y, w, h })

      // Test intersection with each card
      const lassoRect = { left: x + rect.left, top: y + rect.top, right: x + w + rect.left, bottom: y + h + rect.top }
      const selected = new Set<number>()
      for (const [idx, el] of cardRefs.current) {
        const cr = el.getBoundingClientRect()
        if (
          cr.left < lassoRect.right &&
          cr.right > lassoRect.left &&
          cr.top < lassoRect.bottom &&
          cr.bottom > lassoRect.top
        ) {
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

  return (
    <div className="flex h-full bg-slate-900 select-none">
      {/* Left: Page grid */}
      <div className="flex-1 flex flex-col min-w-0">
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
        <div className="flex items-center gap-4 px-6 py-2 text-slate-600 text-xs border-b border-slate-800/60 flex-shrink-0">
          <span>Click to select · Shift+click to extend · Ctrl+click to toggle · Drag to lasso</span>
        </div>

        {/* Grid + lasso container */}
        <div className="relative flex-1 overflow-y-auto" ref={gridRef}
          onMouseMove={handleGridMouseMove}
          onMouseUp={handleGridMouseUp}
          onMouseLeave={handleGridMouseUp}
        >
          <div
            className="grid gap-4 p-6"
            style={{
              gridTemplateColumns: `repeat(auto-fill, minmax(${CARD_WIDTH}px, 1fr))`
            }}
          >
            {Array.from({ length: totalPages }, (_, i) => {
              const bitmap = bitmaps.get(i) ?? null
              const group = groups.find((g) => g.pageIndices.includes(i))
              const isSelected = selectedPageIndices.has(i)

              return (
                <PageThumbnail
                  key={i}
                  pageIndex={i}
                  bitmap={bitmap}
                  group={group}
                  isSelected={isSelected}
                  onMouseDown={handleMouseDown}
                  onMouseEnter={handleMouseEnter}
                  observerRef={setCardRef(i)}
                />
              )
            })}
          </div>

          {/* Lasso rectangle */}
          {lasso && (
            <div
              className="absolute pointer-events-none border border-indigo-400 bg-indigo-500/10 z-20"
              style={{
                left: lasso.x,
                top: lasso.y,
                width: lasso.w,
                height: lasso.h
              }}
            />
          )}

          {/* Floating action bar */}
          <FloatingActionBar
            visible={selectedPageIndices.size > 0}
            onAddGroup={handleAddGroupWithSelection}
          />
        </div>
      </div>

      {/* Right: Group panel */}
      <div className="w-72 flex-shrink-0 border-l border-slate-700/60 bg-slate-900/80">
        <GroupPanel />
      </div>
    </div>
  )
}
