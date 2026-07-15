// PROTOTYPE — throwaway. Variant C: always-visible mini toolbar rail above
// the grid (acts on selection) + right-click context menu for single-page
// quick actions + a heavier, most-explicit Save confirm modal. See
// useProtoPageEdits.ts / index.tsx for context.
import { useEffect, useState } from "react";
import { RotateCcw, RotateCw, Trash2, Save, AlertTriangle } from "lucide-react";
import { Button } from "../../../components/Button";
import { ProtoThumb } from "./ProtoThumb";
import type { ProtoPageEdits } from "./useProtoPageEdits";

export const label = "C — Toolbar rail + context menu + heavy confirm";

interface VariantProps {
  totalPages: number;
  edits: ProtoPageEdits;
  focusedIndex: number;
  onFocusPage: (position: number) => void;
}

export function VariantC({
  totalPages,
  edits,
  focusedIndex,
  onFocusPage,
}: VariantProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [menu, setMenu] = useState<{ pageId: string; x: number; y: number } | null>(null);

  useEffect(() => {
    const close = () => setMenu(null);
    window.addEventListener("click", close);
    return () => window.removeEventListener("click", close);
  }, []);

  // Mirrors the real grid's click convention (PageSelector's
  // handleMouseDown): plain click replaces the selection with just this
  // page (or deselects it if it was the only thing selected); Ctrl/Cmd
  // toggles membership without disturbing the rest.
  const handleThumbClick = (
    e: React.MouseEvent,
    pageId: string,
    position: number,
  ) => {
    onFocusPage(position);
    if (e.ctrlKey || e.metaKey) {
      setSelected((prev) => {
        const next = new Set(prev);
        if (next.has(pageId)) next.delete(pageId);
        else next.add(pageId);
        return next;
      });
    } else if (selected.has(pageId)) {
      setSelected((prev) => {
        const next = new Set(prev);
        next.delete(pageId);
        return next;
      });
    } else {
      setSelected(new Set([pageId]));
    }
  };

  const rotatedCount = edits.pages.filter((p) => p.rotation !== 0).length;
  const deletedCount = totalPages - edits.pages.length;

  return (
    <div className="flex flex-col h-full relative">
      <div className="px-2.5 py-1.5 border-b border-bdr flex-shrink-0 flex items-center gap-1 bg-surf-3/40">
        <button
          disabled={selected.size === 0}
          onClick={() => edits.rotateMany([...selected], -1)}
          title="Rotate selection left"
          className="w-7 h-7 rounded-md hover:bg-ctrl disabled:opacity-30 flex items-center justify-center text-ink-2"
        >
          <RotateCcw size={13} strokeWidth={2} />
        </button>
        <button
          disabled={selected.size === 0}
          onClick={() => edits.rotateMany([...selected], 1)}
          title="Rotate selection right"
          className="w-7 h-7 rounded-md hover:bg-ctrl disabled:opacity-30 flex items-center justify-center text-ink-2"
        >
          <RotateCw size={13} strokeWidth={2} />
        </button>
        <button
          disabled={selected.size === 0 || edits.pages.length - selected.size < 1}
          onClick={() => {
            edits.deleteMany([...selected]);
            setSelected(new Set());
          }}
          title="Delete selection"
          className="w-7 h-7 rounded-md hover:bg-ctrl disabled:opacity-30 flex items-center justify-center text-red-500"
        >
          <Trash2 size={13} strokeWidth={2} />
        </button>
        <div className="w-px h-4 bg-bdr mx-1" />
        <button
          onClick={edits.undo}
          disabled={!edits.canUndo}
          className="text-ink-3 hover:text-ink-1 disabled:opacity-30 text-[11px] px-2"
        >
          Undo
        </button>
        <button
          onClick={edits.redo}
          disabled={!edits.canRedo}
          className="text-ink-3 hover:text-ink-1 disabled:opacity-30 text-[11px] px-2"
        >
          Redo
        </button>
        <span className="text-ink-4 text-[10px] flex-1 text-right pr-1">
          right-click a page for quick actions
        </span>
        <Button
          size="sm"
          variant={edits.dirty ? "primary" : "secondary"}
          disabled={!edits.dirty || edits.saving}
          onClick={() => setConfirmOpen(true)}
        >
          <Save size={12} strokeWidth={2} />
          {edits.saving ? "Saving…" : edits.savedFlash ? "Saved" : "Save"}
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        <div className="grid gap-2" style={{ gridTemplateColumns: "repeat(4, 1fr)" }}>
          {edits.pages.map((p, i) => (
            <ProtoThumb
              key={p.pageId}
              pageIndex={p.originalIndex}
              rotation={p.rotation}
              isFocused={i === focusedIndex}
              onClick={(e) => handleThumbClick(e, p.pageId, i)}
              className={selected.has(p.pageId) ? "ring-2 ring-acc cursor-pointer" : "cursor-pointer"}
            >
              <div
                onContextMenu={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onFocusPage(i);
                  setMenu({ pageId: p.pageId, x: e.clientX, y: e.clientY });
                }}
                className="absolute inset-0"
              />
              {selected.has(p.pageId) && (
                <div className="absolute inset-0 bg-acc/12 pointer-events-none" />
              )}
            </ProtoThumb>
          ))}
        </div>
      </div>

      {menu && (
        <div
          className="fixed z-50 bg-surf-2 border border-bdr-hi rounded-lg shadow-2xl py-1 w-40"
          style={{ left: menu.x, top: menu.y }}
        >
          <button
            onClick={() => {
              edits.rotatePage(menu.pageId, -1);
              setMenu(null);
            }}
            className="w-full text-left px-3 py-1.5 text-xs text-ink-2 hover:bg-ctrl flex items-center gap-2"
          >
            <RotateCcw size={12} strokeWidth={2} /> Rotate left
          </button>
          <button
            onClick={() => {
              edits.rotatePage(menu.pageId, 1);
              setMenu(null);
            }}
            className="w-full text-left px-3 py-1.5 text-xs text-ink-2 hover:bg-ctrl flex items-center gap-2"
          >
            <RotateCw size={12} strokeWidth={2} /> Rotate right
          </button>
          <button
            disabled={edits.pages.length <= 1}
            onClick={() => {
              edits.deletePage(menu.pageId);
              setMenu(null);
            }}
            className="w-full text-left px-3 py-1.5 text-xs text-red-500 hover:bg-ctrl disabled:opacity-30 flex items-center gap-2"
          >
            <Trash2 size={12} strokeWidth={2} /> Delete page
          </button>
        </div>
      )}

      {confirmOpen && (
        <div className="absolute inset-0 z-50 bg-black/50 flex items-center justify-center">
          <div className="bg-surf-2 border border-bdr-hi rounded-xl shadow-2xl w-96 p-5">
            <div className="flex items-start gap-3 mb-3">
              <div className="w-9 h-9 rounded-full bg-red-500/15 flex items-center justify-center flex-shrink-0">
                <AlertTriangle size={16} strokeWidth={2} className="text-red-500" />
              </div>
              <div>
                <h3 className="text-ink-1 font-semibold text-sm">
                  This will permanently overwrite the original file
                </h3>
                <p className="text-ink-3 text-xs mt-1">
                  {rotatedCount} rotation{rotatedCount === 1 ? "" : "s"},{" "}
                  {deletedCount} deletion{deletedCount === 1 ? "" : "s"}. There
                  is no backup — this cannot be undone once saved.
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="secondary" size="sm" onClick={() => setConfirmOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={() => {
                  setConfirmOpen(false);
                  edits.save();
                }}
              >
                Overwrite original file
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
