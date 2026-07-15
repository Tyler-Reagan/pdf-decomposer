// PROTOTYPE — throwaway. Variant B: no per-page controls at all — a
// multi-select + floating bottom toolbar (mirrors the real FloatingActionBar
// pattern used for grouping today), with an inline Save confirm strip
// instead of a modal. See useProtoPageEdits.ts / index.tsx for context.
import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { RotateCcw, RotateCw, Trash2, X } from "lucide-react";
import { ProtoThumb } from "./ProtoThumb";
import type { ProtoPageEdits } from "./useProtoPageEdits";

export const label = "B — Floating bulk toolbar + inline confirm";

interface VariantProps {
  totalPages: number;
  edits: ProtoPageEdits;
  focusedIndex: number;
  onFocusPage: (position: number) => void;
}

export function VariantB({ edits, focusedIndex, onFocusPage }: VariantProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirming, setConfirming] = useState(false);

  // Mirrors the real grid's click convention: plain click replaces the
  // selection with just this page (or deselects it if it was the only
  // thing selected); Ctrl/Cmd toggles membership without disturbing the
  // rest — Variant B leans on multi-select more than A/C, so getting this
  // right matters most here.
  const handleThumbClick = (e: React.MouseEvent, pageId: string, position: number) => {
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

  return (
    <div className="flex flex-col h-full relative">
      <div className="px-3 py-2 border-b border-bdr flex-shrink-0 flex items-center justify-between">
        <span className="text-ink-4 text-xs">
          Click to select pages · use the toolbar below to rotate/delete
        </span>
        <div className="flex items-center gap-2">
          <button
            onClick={edits.undo}
            disabled={!edits.canUndo}
            className="text-ink-3 hover:text-ink-1 disabled:opacity-30 text-xs px-2 py-1"
          >
            Undo
          </button>
          <button
            onClick={edits.redo}
            disabled={!edits.canRedo}
            className="text-ink-3 hover:text-ink-1 disabled:opacity-30 text-xs px-2 py-1"
          >
            Redo
          </button>
        </div>
      </div>

      <div className={`flex-1 overflow-y-auto p-3 ${edits.dirty || selected.size > 0 ? "pb-24" : ""}`}>
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
              {selected.has(p.pageId) && (
                <div className="absolute inset-0 bg-acc/12 pointer-events-none" />
              )}
            </ProtoThumb>
          ))}
        </div>
      </div>

      <AnimatePresence>
        {(selected.size > 0 || edits.dirty) && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            transition={{ duration: 0.15 }}
            className="absolute bottom-3 left-3 right-3 z-30"
          >
            <div className="bg-surf-2/90 backdrop-blur-md border border-bdr-hi rounded-xl shadow-2xl overflow-hidden">
              {confirming ? (
                <div className="px-3 py-2.5 flex items-center justify-between gap-3">
                  <span className="text-ink-2 text-xs">
                    Overwrite the original file with these changes? Can't be
                    undone.
                  </span>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => setConfirming(false)}
                      className="text-ink-3 hover:text-ink-1 text-xs px-2 py-1"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => {
                        setConfirming(false);
                        edits.save();
                      }}
                      className="bg-acc hover:bg-acc-hi text-white text-xs font-medium px-3 py-1.5 rounded-lg"
                    >
                      Overwrite
                    </button>
                  </div>
                </div>
              ) : (
                <div className="px-2 py-2 flex items-center gap-1.5">
                  <div className="flex items-center gap-1.5 flex-1">
                    <span className="text-ink-2 text-xs font-medium px-1.5">
                      {selected.size > 0
                        ? `${selected.size} selected`
                        : "No selection"}
                    </span>
                    <button
                      disabled={selected.size === 0}
                      onClick={() => edits.rotateMany([...selected], -1)}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg hover:bg-ctrl disabled:opacity-30 transition-colors text-[11px] font-medium text-ink-2"
                    >
                      <RotateCcw size={11} strokeWidth={2} />
                      Rotate
                    </button>
                    <button
                      disabled={selected.size === 0}
                      onClick={() => edits.rotateMany([...selected], 1)}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg hover:bg-ctrl disabled:opacity-30 transition-colors text-[11px] font-medium text-ink-2"
                    >
                      <RotateCw size={11} strokeWidth={2} />
                      Rotate
                    </button>
                    <button
                      disabled={selected.size === 0 || edits.pages.length - selected.size < 1}
                      onClick={() => {
                        edits.deleteMany([...selected]);
                        setSelected(new Set());
                      }}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg hover:bg-ctrl disabled:opacity-30 transition-colors text-[11px] font-medium text-red-500"
                    >
                      <Trash2 size={11} strokeWidth={2} />
                      Delete
                    </button>
                  </div>
                  {selected.size > 0 && (
                    <button
                      onClick={() => setSelected(new Set())}
                      className="text-ink-4 hover:text-ink-2"
                    >
                      <X size={13} strokeWidth={2} />
                    </button>
                  )}
                  {edits.dirty && (
                    <button
                      onClick={() => setConfirming(true)}
                      disabled={edits.saving}
                      className="bg-acc hover:bg-acc-hi text-white text-[11px] font-medium px-3 py-1.5 rounded-lg flex-shrink-0"
                    >
                      {edits.saving ? "Saving…" : edits.savedFlash ? "Saved" : "Save"}
                    </button>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
