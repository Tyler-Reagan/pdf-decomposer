import { useRef, useState, useCallback, useEffect } from 'react'
import { usePdfStore } from '../../store/usePdfStore'
import { PageNode } from './PageNode'
import { GroupPanel } from './GroupPanel'
import { FloatingActionBar } from './FloatingActionBar'
import { Button } from '../../components/Button'

// nodeGridFlex is the flex value of the node grid relative to the webview's flex: 1.
// e.g. 0.35 → nodeGrid gets 26% of shared space, webview gets 74%.
const NODE_GRID_FLEX_DEFAULT = 0.35
const NODE_GRID_FLEX_MIN = 0.08   // very narrow nodes, large preview
const NODE_GRID_FLEX_MAX = 1.4    // wide nodes, narrow preview

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

  const [webviewPage, setWebviewPage] = useState(0)
  const [nodeGridFlex, setNodeGridFlex] = useState(NODE_GRID_FLEX_DEFAULT)

  const [lasso, setLasso] = useState<{ x: number; y: number; w: number; h: number } | null>(null)
  const lassoOriginRef = useRef<{ x: number; y: number } | null>(null)
  const isDraggingLasso = useRef(false)

  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const nodeRefs = useRef<Map<number, HTMLDivElement>>(new Map())
  const webviewPanelRef = useRef<HTMLDivElement>(null)
  const nodeGridPanelRef = useRef<HTMLDivElement>(null)

  const stableNodeRefCallbacks = useRef<Map<number, (el: HTMLDivElement | null) => void>>(new Map())
  const getNodeRef = useCallback((pageIndex: number) => {
    if (!stableNodeRefCallbacks.current.has(pageIndex)) {
      stableNodeRefCallbacks.current.set(pageIndex, (el: HTMLDivElement | null) => {
        if (el) nodeRefs.current.set(pageIndex, el)
        else {
          nodeRefs.current.delete(pageIndex)
          stableNodeRefCallbacks.current.delete(pageIndex)
        }
      })
    }
    return stableNodeRefCallbacks.current.get(pageIndex)!
  }, [])

  // Resize: measure the two panels, recompute their flex ratio from the new widths.
  // Dragging right → webview grows (nodeGridFlex shrinks).
  // Dragging left  → node grid grows (nodeGridFlex increases).
  const handleDividerMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    const wvEl = webviewPanelRef.current
    const ngEl = nodeGridPanelRef.current
    if (!wvEl || !ngEl) return

    const startX = e.clientX
    const startWebviewW = wvEl.getBoundingClientRect().width
    const startNodeW = ngEl.getBoundingClientRect().width

    const onMove = (ev: MouseEvent): void => {
      const delta = ev.clientX - startX
      const newWebviewW = Math.max(180, startWebviewW + delta)
      const newNodeW = Math.max(160, startNodeW - delta)
      setNodeGridFlex(
        Math.max(NODE_GRID_FLEX_MIN, Math.min(NODE_GRID_FLEX_MAX, newNodeW / newWebviewW))
      )
    }
    const onUp = (): void => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }, [])

  // Debounced webview navigation
  const webviewNavTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const navigateWebview = useCallback((pageIndex: number) => {
    if (webviewNavTimer.current) clearTimeout(webviewNavTimer.current)
    webviewNavTimer.current = setTimeout(() => setWebviewPage(pageIndex), 120)
  }, [])

  useEffect(() => () => {
    if (webviewNavTimer.current) clearTimeout(webviewNavTimer.current)
  }, [])

  const lastClickIndexRef = useRef<number | null>(null)

  const handleMouseDown = useCallback(
    (e: React.MouseEvent, pageIndex: number) => {
      e.preventDefault()

      if (e.shiftKey && lastClickIndexRef.current !== null) {
        const from = Math.min(lastClickIndexRef.current, pageIndex)
        const to = Math.max(lastClickIndexRef.current, pageIndex)
        const range = new Set(selectedPageIndices)
        for (let i = from; i <= to; i++) range.add(i)
        setSelectedPageIndices(range)
        navigateWebview(pageIndex)
        return
      }

      if (e.ctrlKey || e.metaKey) {
        const next = new Set(selectedPageIndices)
        if (next.has(pageIndex)) next.delete(pageIndex)
        else next.add(pageIndex)
        setSelectedPageIndices(next)
        lastClickIndexRef.current = pageIndex
        navigateWebview(pageIndex)
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
      navigateWebview(pageIndex)
    },
    [selectedPageIndices, setSelectedPageIndices, navigateWebview]
  )

  const handleMouseEnter = useCallback((_e: React.MouseEvent, _pageIndex: number) => {}, [])

  const handleGridMouseMove = useCallback(
    (e: React.MouseEvent) => {
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
        for (const [idx, nodeEl] of nodeRefs.current) {
          const cr = nodeEl.getBoundingClientRect()
          const cardL = cr.left - rect.left + el.scrollLeft
          const cardT = cr.top - rect.top + el.scrollTop
          if (cardL < x + w && cardL + cr.width > x && cardT < y + h && cardT + cr.height > y) {
            selected.add(idx)
          }
        }
        setSelectedPageIndices(selected)
      }
    },
    [setSelectedPageIndices]
  )

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
  // FitH fits the page to the panel's width — content always fills horizontally
  // regardless of panel size, and you see more pages as the panel gets taller.
  const webviewSrc = `file://${loadedPdf.filePath.replace(/\\/g, '/')}#page=${webviewPage + 1}&view=FitH`

  return (
    <div className="flex flex-col h-full bg-slate-900 select-none">

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="flex items-center px-6 py-4 border-b border-slate-700/60 flex-shrink-0 gap-4">
        <button
          onClick={() => { clearSelection(); setPhase('drop') }}
          className="text-slate-500 hover:text-slate-300 transition-colors"
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

        <div className="flex items-center gap-3 flex-shrink-0">
          {selectedPageIndices.size > 0 && (
            <span className="text-slate-500 text-sm">{selectedPageIndices.size} selected</span>
          )}
          <Button variant="primary" disabled={!canContinue} onClick={() => setPhase('configuring')}>
            Configure Output
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </Button>
        </div>
      </div>

      {/* ── Content row ──────────────────────────────────────────────────── */}
      <div className="flex flex-1 min-h-0">

        {/* ── Webview (flex-1, always fills remaining space) ───────────── */}
        <div
          ref={webviewPanelRef}
          className="flex flex-col min-w-0 min-h-0 border-r border-slate-700/60"
          style={{ flex: 1 }}
        >
          <div className="px-4 py-2 border-b border-slate-800/60 flex-shrink-0 flex items-center justify-between">
            <span className="text-slate-600 text-xs">PDF Preview</span>
            <span className="text-slate-500 text-xs tabular-nums">
              Page {webviewPage + 1}
              <span className="text-slate-700"> / {totalPages}</span>
            </span>
          </div>
          {/* Relative container bounds the webview — absolute fill prevents flex sizing bugs */}
          <div className="flex-1 relative overflow-hidden min-h-0">
            <webview
              src={webviewSrc}
              style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
            />
          </div>
        </div>

        {/* ── Resize handle ───────────────────────────────────────────── */}
        <div
          className="w-1 flex-shrink-0 bg-slate-700/40 hover:bg-indigo-500/50 active:bg-indigo-500/70 cursor-col-resize transition-colors"
          onMouseDown={handleDividerMouseDown}
        />

        {/* ── Node grid (flex-ratio, scales with divider) ──────────────── */}
        <div
          ref={nodeGridPanelRef}
          className="flex flex-col min-h-0 relative"
          style={{ flex: nodeGridFlex, minWidth: 0 }}
        >
          <div className="px-3 py-2 text-slate-600 text-xs border-b border-slate-800/60 flex-shrink-0">
            Click · Shift · Ctrl · Drag to lasso
          </div>

          <div
            ref={scrollContainerRef}
            className="flex-1 overflow-y-auto relative"
            onMouseMove={handleGridMouseMove}
            onMouseUp={handleGridMouseUp}
            onMouseLeave={handleGridMouseUp}
          >
            <div
              className="grid gap-2 p-3"
              style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}
            >
              {Array.from({ length: totalPages }, (_, i) => (
                <PageNode
                  key={i}
                  pageIndex={i}
                  group={groups.find((g) => g.pageIndices.includes(i))}
                  isSelected={selectedPageIndices.has(i)}
                  isFocused={i === webviewPage}
                  onMouseDown={handleMouseDown}
                  onMouseEnter={handleMouseEnter}
                  nodeRef={getNodeRef(i)}
                />
              ))}
            </div>

            {lasso && (
              <div
                className="absolute pointer-events-none border border-indigo-400 bg-indigo-500/10 z-20"
                style={{ left: lasso.x, top: lasso.y, width: lasso.w, height: lasso.h }}
              />
            )}
          </div>

          <FloatingActionBar
            visible={selectedPageIndices.size > 0}
            onAddGroup={handleAddGroupWithSelection}
          />
        </div>

        {/* ── Group panel ─────────────────────────────────────────────── */}
        <div className="w-72 flex-shrink-0 border-l border-slate-700/60 bg-slate-900/80">
          <GroupPanel />
        </div>
      </div>
    </div>
  )
}
