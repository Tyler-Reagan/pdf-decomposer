// PROTOTYPE — throwaway. Variant A: per-page hover controls + header Save
// button + confirm modal. See useProtoPageEdits.ts / index.tsx for context.
import { useState } from "react";
import { RotateCcw, RotateCw, Trash2, Save } from "lucide-react";
import { Button } from "../../../components/Button";
import { ProtoThumb } from "./ProtoThumb";
import type { ProtoPageEdits } from "./useProtoPageEdits";

export const label = "A — Per-page hover buttons + modal confirm";

interface VariantProps {
  totalPages: number;
  edits: ProtoPageEdits;
  focusedIndex: number;
  onFocusPage: (position: number) => void;
}

export function VariantA({
  totalPages,
  edits,
  focusedIndex,
  onFocusPage,
}: VariantProps) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const rotatedCount = edits.pages.filter((p) => p.rotation !== 0).length;
  const deletedCount = totalPages - edits.pages.length;

  return (
    <div className="flex flex-col h-full">
      <div className="px-3 py-2 border-b border-bdr flex-shrink-0 flex items-center justify-between gap-2">
        <span className="text-ink-4 text-xs">
          Hover a page for rotate/delete · Save writes to the original file
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
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        <div className="grid gap-2" style={{ gridTemplateColumns: "repeat(4, 1fr)" }}>
          {edits.pages.map((p, i) => (
            <ProtoThumb
              key={p.pageId}
              pageIndex={p.originalIndex}
              rotation={p.rotation}
              isFocused={i === focusedIndex}
              onClick={() => onFocusPage(i)}
            >
              <div className="absolute inset-0 opacity-0 hover:opacity-100 transition-opacity bg-gradient-to-t from-black/50 via-transparent to-transparent flex items-end justify-center gap-1 pb-1.5">
                <button
                  title="Rotate left"
                  onClick={(e) => {
                    e.stopPropagation();
                    edits.rotatePage(p.pageId, -1);
                  }}
                  className="w-6 h-6 rounded-full bg-white/90 hover:bg-white flex items-center justify-center shadow"
                >
                  <RotateCcw size={12} strokeWidth={2} />
                </button>
                <button
                  title="Rotate right"
                  onClick={(e) => {
                    e.stopPropagation();
                    edits.rotatePage(p.pageId, 1);
                  }}
                  className="w-6 h-6 rounded-full bg-white/90 hover:bg-white flex items-center justify-center shadow"
                >
                  <RotateCw size={12} strokeWidth={2} />
                </button>
                <button
                  title="Delete page"
                  disabled={edits.pages.length <= 1}
                  onClick={(e) => {
                    e.stopPropagation();
                    edits.deletePage(p.pageId);
                  }}
                  className="w-6 h-6 rounded-full bg-white/90 hover:bg-white disabled:opacity-40 flex items-center justify-center shadow text-red-600"
                >
                  <Trash2 size={12} strokeWidth={2} />
                </button>
              </div>
            </ProtoThumb>
          ))}
        </div>
      </div>

      {confirmOpen && (
        <div className="absolute inset-0 z-50 bg-black/40 flex items-center justify-center">
          <div className="bg-surf-2 border border-bdr-hi rounded-xl shadow-2xl w-80 p-4">
            <h3 className="text-ink-1 font-semibold text-sm mb-1">
              Overwrite original file?
            </h3>
            <p className="text-ink-3 text-xs mb-4">
              {rotatedCount} page{rotatedCount === 1 ? "" : "s"} rotated,{" "}
              {deletedCount} page{deletedCount === 1 ? "" : "s"} deleted. This
              can't be undone once saved.
            </p>
            <div className="flex justify-end gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setConfirmOpen(false)}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  setConfirmOpen(false);
                  edits.save();
                }}
              >
                Overwrite
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
