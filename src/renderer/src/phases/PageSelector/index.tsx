import { useRef, useState, useCallback, useEffect } from "react";
import { useShallow } from "zustand/shallow";
import { usePdfStore } from "../../store/usePdfStore";
import { PageNode } from "./PageNode";
import { GroupPanel } from "./GroupPanel";
import { FloatingActionBar } from "./FloatingActionBar";
import { PageEditToolbar } from "./PageEditToolbar";
import { PageContextMenu } from "./PageContextMenu";
import { SaveConfirmModal } from "./SaveConfirmModal";
import { SaveGatePopover } from "./SaveGatePopover";
import { Button } from "../../components/Button";
import { PdfPreview } from "../../components/PdfPreview";
import { useSplitPaneResize } from "../../lib/useSplitPaneResize";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { SavePdfParams } from "../../../../shared/types";

const NODE_GRID_FLEX_DEFAULT = 0.35;
const NODE_GRID_FLEX_MIN = 0.08;
const NODE_GRID_FLEX_MAX = 1.4;
const GRID_COLS = 4;

export function PageSelector() {
  const {
    loadedPdf,
    pages,
    undoStack,
    redoStack,
    rotatePage,
    deletePage,
    undo,
    redo,
    commitSave,
    selectedPageIndices,
    setSelectedPageIndices,
    clearSelection,
    groups,
    setPhase,
  } = usePdfStore(
    useShallow((s) => ({
      loadedPdf: s.loadedPdf,
      pages: s.pages,
      undoStack: s.undoStack,
      redoStack: s.redoStack,
      rotatePage: s.rotatePage,
      deletePage: s.deletePage,
      undo: s.undo,
      redo: s.redo,
      commitSave: s.commitSave,
      selectedPageIndices: s.selectedPageIndices,
      setSelectedPageIndices: s.setSelectedPageIndices,
      clearSelection: s.clearSelection,
      groups: s.groups,
      setPhase: s.setPhase,
    })),
  );

  const [webviewPage, setWebviewPage] = useState(0);
  const [nodeGridFlex, setNodeGridFlex] = useState(NODE_GRID_FLEX_DEFAULT);
  const [isLassoing, setIsLassoing] = useState(false);
  const [contextMenu, setContextMenu] = useState<{
    pageId: string;
    x: number;
    y: number;
  } | null>(null);
  const [confirmSaveOpen, setConfirmSaveOpen] = useState(false);
  const [showSaveGate, setShowSaveGate] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [lasso, setLasso] = useState<{
    x: number;
    y: number;
    w: number;
    h: number;
  } | null>(null);
  const lassoOriginRef = useRef<{ x: number; y: number } | null>(null);
  const isDraggingLasso = useRef(false);

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const nodeRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  // Mirrors webviewPage for synchronous arrow-key cursor math (see below).
  const cursorRef = useRef(0);
  const webviewPanelRef = useRef<HTMLDivElement>(null);
  const nodeGridPanelRef = useRef<HTMLDivElement>(null);
  const autoScrollRafRef = useRef<number | null>(null);
  const mousePositionRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const stableNodeRefCallbacks = useRef<
    Map<number, (el: HTMLDivElement | null) => void>
  >(new Map());
  const getNodeRef = useCallback((pageIndex: number) => {
    if (!stableNodeRefCallbacks.current.has(pageIndex)) {
      stableNodeRefCallbacks.current.set(
        pageIndex,
        (el: HTMLDivElement | null) => {
          if (el) nodeRefs.current.set(pageIndex, el);
          else {
            nodeRefs.current.delete(pageIndex);
            stableNodeRefCallbacks.current.delete(pageIndex);
          }
        },
      );
    }
    return stableNodeRefCallbacks.current.get(pageIndex)!;
  }, []);

  const handleDividerMouseDown = useSplitPaneResize({
    leftRef: webviewPanelRef,
    rightRef: nodeGridPanelRef,
    minLeft: 180,
    minRight: 160,
    flexMin: NODE_GRID_FLEX_MIN,
    flexMax: NODE_GRID_FLEX_MAX,
    setFlex: setNodeGridFlex,
  });

  const webviewNavTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const navigateWebview = useCallback((pageIndex: number) => {
    if (webviewNavTimer.current) clearTimeout(webviewNavTimer.current);
    webviewNavTimer.current = setTimeout(() => setWebviewPage(pageIndex), 120);
  }, []);

  useEffect(
    () => () => {
      if (webviewNavTimer.current) clearTimeout(webviewNavTimer.current);
      if (autoScrollRafRef.current !== null)
        cancelAnimationFrame(autoScrollRafRef.current);
    },
    [],
  );

  const lastClickIndexRef = useRef<number | null>(null);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent, pageIndex: number) => {
      e.preventDefault();

      if (e.shiftKey && lastClickIndexRef.current !== null) {
        const from = Math.min(lastClickIndexRef.current, pageIndex);
        const to = Math.max(lastClickIndexRef.current, pageIndex);
        const range = new Set(selectedPageIndices);
        for (let i = from; i <= to; i++) range.add(i);
        setSelectedPageIndices(range);
        navigateWebview(pageIndex);
        return;
      }

      if (e.ctrlKey || e.metaKey) {
        const next = new Set(selectedPageIndices);
        if (next.has(pageIndex)) next.delete(pageIndex);
        else next.add(pageIndex);
        setSelectedPageIndices(next);
        lastClickIndexRef.current = pageIndex;
        navigateWebview(pageIndex);
        return;
      }

      const el = scrollContainerRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      lassoOriginRef.current = {
        x: e.clientX - rect.left + el.scrollLeft,
        y: e.clientY - rect.top + el.scrollTop,
      };
      isDraggingLasso.current = false;
      setIsLassoing(true);

      if (selectedPageIndices.has(pageIndex)) {
        const next = new Set(selectedPageIndices);
        next.delete(pageIndex);
        setSelectedPageIndices(next);
        lastClickIndexRef.current = null;
      } else {
        setSelectedPageIndices(new Set([pageIndex]));
        lastClickIndexRef.current = pageIndex;
      }
      navigateWebview(pageIndex);
    },
    [selectedPageIndices, setSelectedPageIndices, navigateWebview],
  );

  const handleMouseEnter = useCallback(
    (_e: React.MouseEvent, _pageIndex: number) => {},
    [],
  );

  const applyLasso = useCallback(
    (clientX: number, clientY: number) => {
      if (!lassoOriginRef.current) return;
      const el = scrollContainerRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const curX = clientX - rect.left + el.scrollLeft;
      const curY = clientY - rect.top + el.scrollTop;
      const ox = lassoOriginRef.current.x;
      const oy = lassoOriginRef.current.y;

      if (
        !isDraggingLasso.current &&
        (Math.abs(curX - ox) > 4 || Math.abs(curY - oy) > 4)
      ) {
        isDraggingLasso.current = true;
      }

      if (isDraggingLasso.current) {
        const x = Math.min(ox, curX);
        const y = Math.min(oy, curY);
        const w = Math.abs(curX - ox);
        const h = Math.abs(curY - oy);
        setLasso({ x, y, w, h });

        const selected = new Set<number>();
        for (const [idx, nodeEl] of nodeRefs.current) {
          const cr = nodeEl.getBoundingClientRect();
          const cardL = cr.left - rect.left + el.scrollLeft;
          const cardT = cr.top - rect.top + el.scrollTop;
          if (
            cardL < x + w &&
            cardL + cr.width > x &&
            cardT < y + h &&
            cardT + cr.height > y
          ) {
            selected.add(idx);
          }
        }
        setSelectedPageIndices(selected);
      }
    },
    [setLasso, setSelectedPageIndices],
  );

  const stopAutoScroll = useCallback(() => {
    if (autoScrollRafRef.current !== null) {
      cancelAnimationFrame(autoScrollRafRef.current);
      autoScrollRafRef.current = null;
    }
  }, []);

  const startAutoScroll = useCallback(() => {
    if (autoScrollRafRef.current !== null) return;
    const ZONE = 96;
    const MAX_SPEED = 14;

    const tick = () => {
      const el = scrollContainerRef.current;
      if (!el || !isDraggingLasso.current) {
        autoScrollRafRef.current = null;
        return;
      }
      const rect = el.getBoundingClientRect();
      const { y: clientY } = mousePositionRef.current;
      const distBottom = rect.bottom - clientY;
      const distTop = clientY - rect.top;

      let delta = 0;
      if (distBottom < ZONE && distBottom >= 0)
        delta = Math.round(MAX_SPEED * (1 - distBottom / ZONE));
      else if (distTop < ZONE && distTop >= 0)
        delta = -Math.round(MAX_SPEED * (1 - distTop / ZONE));

      if (delta !== 0) {
        el.scrollTop += delta;
        applyLasso(mousePositionRef.current.x, mousePositionRef.current.y);
        autoScrollRafRef.current = requestAnimationFrame(tick);
      } else {
        autoScrollRafRef.current = null;
      }
    };
    autoScrollRafRef.current = requestAnimationFrame(tick);
  }, [applyLasso]);

  const handleGridMouseMove = useCallback(
    (e: React.MouseEvent) => {
      mousePositionRef.current = { x: e.clientX, y: e.clientY };
      if (!lassoOriginRef.current) return;
      applyLasso(e.clientX, e.clientY);
      if (isDraggingLasso.current) startAutoScroll();
    },
    [applyLasso, startAutoScroll],
  );

  const handleGridMouseUp = useCallback(() => {
    stopAutoScroll();
    lassoOriginRef.current = null;
    isDraggingLasso.current = false;
    setIsLassoing(false);
    setLasso(null);
  }, [stopAutoScroll]);

  const canContinue =
    groups.length > 0 && groups.some((g) => g.pageIndices.length > 0);

  // Hooks must always run; bail out after they're declared.
  const totalPages = pages.length;

  // undoStack is pushed on every rotate/delete and cleared on load/commitSave,
  // so its length already *is* "edits pending since the last save" — no need
  // to separately compare page counts or scan rotations. A rotate immediately
  // followed by its inverse will still read as dirty until saved/undone; that's
  // intentional (fail toward "ask to save" rather than get stuck un-dirty).
  const dirty = undoStack.length > 0;
  const canUndo = undoStack.length > 0;
  const canRedo = redoStack.length > 0;
  const rotatedCount = pages.filter((p) => p.rotation !== 0).length;
  const deletedCount = (loadedPdf?.totalPages ?? 0) - pages.length;

  const rotateSelection = useCallback(
    (direction: "cw" | "ccw") => {
      for (const position of selectedPageIndices) {
        const pageId = pages[position]?.pageId;
        if (pageId) rotatePage(pageId, direction);
      }
    },
    [selectedPageIndices, pages, rotatePage],
  );

  const deleteSelection = useCallback(() => {
    const pageIds = [...selectedPageIndices]
      .map((position) => pages[position]?.pageId)
      .filter((id): id is string => Boolean(id));
    for (const pageId of pageIds) deletePage(pageId);
    clearSelection();
  }, [selectedPageIndices, pages, deletePage, clearSelection]);

  const canDeleteSelection = pages.length - selectedPageIndices.size >= 1;

  const runSave = useCallback(async () => {
    if (!loadedPdf) return;
    setSaving(true);
    setSaveError(null);
    const params: SavePdfParams = {
      sourcePath: loadedPdf.filePath,
      pages: pages.map((p) => ({
        originalIndex: p.originalIndex,
        rotationDelta: p.rotation,
      })),
    };
    const result = await window.electronAPI.savePdf(params);
    setSaving(false);
    if (result.success) {
      commitSave();
      setSavedFlash(true);
      setTimeout(() => setSavedFlash(false), 1600);
    } else {
      setSaveError(result.error ?? "Failed to save the PDF.");
    }
  }, [loadedPdf, pages, commitSave]);

  const handleSaveClick = useCallback(() => {
    setShowSaveGate(false);
    setConfirmSaveOpen(true);
  }, []);

  const handleConfirmSave = useCallback(() => {
    setConfirmSaveOpen(false);
    void runSave();
  }, [runSave]);

  // Once deletions are pending, arrow-key/webview navigation must operate on
  // current position (this array has no gaps) rather than the original page
  // count — otherwise arrow-keying across a deleted-but-unsaved page leaves
  // focus with nothing to land on. Clamp the cursor back in bounds whenever
  // a delete shrinks the array out from under it.
  useEffect(() => {
    if (webviewPage > pages.length - 1) {
      setWebviewPage(Math.max(0, pages.length - 1));
    }
  }, [pages.length, webviewPage]);

  // Keep the synchronous cursor in step with mouse/lasso-driven page changes.
  useEffect(() => {
    cursorRef.current = webviewPage;
  }, [webviewPage]);

  // Arrow-key navigation across the page grid. Plain arrows move the cursor
  // and select that single page (driving the preview); Shift+arrow extends
  // the selection from the last anchor, mirroring shift-click. The cursor is
  // mirrored into a ref and advanced synchronously so held/repeating keys
  // chain correctly instead of stalling on the React render cycle.
  useEffect(() => {
    const handler = (e: KeyboardEvent): void => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      )
        return;

      const cur = cursorRef.current;
      let next = cur;
      switch (e.key) {
        case "ArrowRight":
          next = Math.min(cur + 1, totalPages - 1);
          break;
        case "ArrowLeft":
          next = Math.max(cur - 1, 0);
          break;
        case "ArrowDown":
          next = Math.min(cur + GRID_COLS, totalPages - 1);
          break;
        case "ArrowUp":
          next = Math.max(cur - GRID_COLS, 0);
          break;
        default:
          return;
      }
      e.preventDefault();
      cursorRef.current = next;

      if (e.shiftKey && lastClickIndexRef.current !== null) {
        const from = Math.min(lastClickIndexRef.current, next);
        const to = Math.max(lastClickIndexRef.current, next);
        const range = new Set<number>();
        for (let i = from; i <= to; i++) range.add(i);
        setSelectedPageIndices(range);
      } else {
        setSelectedPageIndices(new Set([next]));
        lastClickIndexRef.current = next;
      }
      setWebviewPage(next);
      nodeRefs.current.get(next)?.scrollIntoView({ block: "nearest" });
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [totalPages, setSelectedPageIndices]);

  if (!loadedPdf) return null;

  return (
    <div className="flex flex-col h-full bg-surf-2 select-none">
      {/* Header */}
      <div className="flex items-center px-6 py-4 border-b border-bdr-hi flex-shrink-0 gap-4">
        <button
          onClick={() => {
            clearSelection();
            setPhase("drop");
          }}
          className="text-ink-3 hover:text-ink-2 transition-colors cursor-pointer"
          title="Back"
        >
          <ChevronLeft size={20} strokeWidth={2} />
        </button>

        <div className="flex-1 min-w-0">
          <h1 className="text-ink-1 font-semibold text-lg truncate">
            {loadedPdf.fileName}
          </h1>
          <p className="text-ink-3 text-sm">{totalPages} pages</p>
        </div>

        <div className="flex items-center gap-3 flex-shrink-0 relative">
          {selectedPageIndices.size > 0 && (
            <span className="text-ink-3 text-sm">
              {selectedPageIndices.size} selected
            </span>
          )}
          <Button
            variant="primary"
            // Never natively `disabled` while dirty — a disabled element
            // suppresses click/hover entirely, and the gate popover (#8)
            // needs both to fire. Disable natively only for the unrelated
            // "no groups assigned yet" case.
            disabled={!dirty && !canContinue}
            onClick={() => {
              if (dirty) {
                setShowSaveGate((v) => !v);
                return;
              }
              if (canContinue) setPhase("configuring");
            }}
            onMouseEnter={() => {
              if (dirty) setShowSaveGate(true);
            }}
            onMouseLeave={() => setShowSaveGate(false)}
            style={dirty ? { opacity: 0.4, cursor: "not-allowed" } : undefined}
            data-tour="configure-output-btn"
          >
            Configure Output
            <ChevronRight size={16} strokeWidth={2} />
          </Button>
          {showSaveGate && dirty && (
            <SaveGatePopover onSaveClick={handleSaveClick} />
          )}
        </div>
      </div>

      {saveError && (
        <div className="px-6 py-2 bg-red-500/10 border-b border-red-500/20 text-red-500 text-xs flex items-center justify-between flex-shrink-0">
          <span>{saveError}</span>
          <button
            onClick={() => setSaveError(null)}
            className="text-red-500 hover:text-red-400 cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Content row */}
      <div className="flex flex-1 min-h-0">
        {/* Webview */}
        <div
          ref={webviewPanelRef}
          className="flex flex-col min-w-0 min-h-0 border-r border-bdr-hi"
          style={{ flex: 1 }}
        >
          <div className="px-4 py-2 border-b border-bdr flex-shrink-0 flex items-center justify-between">
            <span className="text-ink-4 text-xs">PDF Preview</span>
            <span className="text-ink-3 text-xs tabular-nums">
              Page {webviewPage + 1}
              <span className="text-ink-4"> / {totalPages}</span>
            </span>
          </div>
          <div className="flex-1 relative overflow-hidden min-h-0 bg-surf-1">
            {/* No CSS transition on this wrapper on purpose: PdfPreview
                measures its box via getBoundingClientRect on mount (forced
                by the key below), which would otherwise fire mid-transition
                and size itself for a not-yet-rotated box. The key forces a
                remount on rotation change so the measurement re-fires
                against the final rotated angle instead of stretching or
                clipping the bitmap it already had for the previous
                orientation. */}
            <div
              className="w-full h-full"
              style={{
                transform: `rotate(${pages[webviewPage]?.rotation ?? 0}deg)`,
              }}
            >
              <PdfPreview
                key={`${webviewPage}-${pages[webviewPage]?.rotation ?? 0}`}
                pageIndex={pages[webviewPage]?.originalIndex ?? webviewPage}
              />
            </div>
          </div>
        </div>

        {/* Resize handle */}
        <div
          className="w-1 flex-shrink-0 bg-bdr/40 hover:bg-acc/50 active:bg-acc/70 cursor-col-resize transition-colors"
          onMouseDown={handleDividerMouseDown}
        />

        {/* Node grid */}
        <div
          ref={nodeGridPanelRef}
          className="flex flex-col min-h-0 relative"
          style={{ flex: nodeGridFlex, minWidth: 0 }}
        >
          <PageEditToolbar
            hasSelection={selectedPageIndices.size > 0}
            canDeleteSelection={canDeleteSelection}
            canUndo={canUndo}
            canRedo={canRedo}
            dirty={dirty}
            saving={saving}
            savedFlash={savedFlash}
            onRotateSelection={rotateSelection}
            onDeleteSelection={deleteSelection}
            onUndo={undo}
            onRedo={redo}
            onSaveClick={handleSaveClick}
          />

          <div
            ref={scrollContainerRef}
            data-tour="page-grid"
            className="flex-1 overflow-y-auto relative"
            onMouseMove={handleGridMouseMove}
            onMouseUp={handleGridMouseUp}
            onMouseLeave={handleGridMouseUp}
          >
            <div
              className={`grid gap-2 p-3 ${selectedPageIndices.size > 0 ? "pb-52" : ""}`}
              style={{ gridTemplateColumns: `repeat(${GRID_COLS}, 1fr)` }}
            >
              {pages.map((page, position) => (
                <PageNode
                  key={page.pageId}
                  position={position}
                  pageIndex={page.originalIndex}
                  rotation={page.rotation}
                  group={groups.find((g) => g.pageIndices.includes(position))}
                  isSelected={selectedPageIndices.has(position)}
                  isFocused={position === webviewPage}
                  onMouseDown={handleMouseDown}
                  onMouseEnter={handleMouseEnter}
                  onContextMenu={(e, pos) =>
                    setContextMenu({
                      pageId: pages[pos].pageId,
                      x: e.clientX,
                      y: e.clientY,
                    })
                  }
                  nodeRef={getNodeRef(position)}
                />
              ))}
            </div>

            {lasso && (
              <div
                className="absolute pointer-events-none border border-acc bg-acc/10 z-20"
                style={{
                  left: lasso.x,
                  top: lasso.y,
                  width: lasso.w,
                  height: lasso.h,
                }}
              />
            )}
          </div>

          <FloatingActionBar
            visible={selectedPageIndices.size > 0 && !isLassoing}
          />

          {contextMenu && (
            <PageContextMenu
              x={contextMenu.x}
              y={contextMenu.y}
              canDelete={pages.length > 1}
              onRotate={(direction) =>
                rotatePage(contextMenu.pageId, direction)
              }
              onDelete={() => deletePage(contextMenu.pageId)}
              onClose={() => setContextMenu(null)}
            />
          )}

          {confirmSaveOpen && (
            <SaveConfirmModal
              rotatedCount={rotatedCount}
              deletedCount={deletedCount}
              onCancel={() => setConfirmSaveOpen(false)}
              onConfirm={handleConfirmSave}
            />
          )}
        </div>

        {/* Group panel */}
        <div
          data-tour="group-panel"
          className="w-72 flex-shrink-0 border-l border-bdr-hi bg-surf-2/80"
        >
          <GroupPanel />
        </div>
      </div>
    </div>
  );
}
