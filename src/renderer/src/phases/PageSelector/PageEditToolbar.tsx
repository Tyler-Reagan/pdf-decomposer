import { RotateCcw, RotateCw, Trash2, Save } from "lucide-react";
import { Button } from "../../components/Button";

interface PageEditToolbarProps {
  hasSelection: boolean;
  canDeleteSelection: boolean;
  canUndo: boolean;
  canRedo: boolean;
  dirty: boolean;
  saving: boolean;
  savedFlash: boolean;
  onRotateSelection: (direction: "cw" | "ccw") => void;
  onDeleteSelection: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onSaveClick: () => void;
}

export function PageEditToolbar({
  hasSelection,
  canDeleteSelection,
  canUndo,
  canRedo,
  dirty,
  saving,
  savedFlash,
  onRotateSelection,
  onDeleteSelection,
  onUndo,
  onRedo,
  onSaveClick,
}: PageEditToolbarProps) {
  return (
    <div className="px-2.5 py-1.5 border-b border-bdr flex-shrink-0 flex items-center gap-1 bg-surf-3/40">
      <button
        disabled={!hasSelection}
        onClick={() => onRotateSelection("ccw")}
        title="Rotate selection left"
        className="w-7 h-7 rounded-md hover:bg-ctrl disabled:opacity-30 flex items-center justify-center text-ink-2 cursor-pointer disabled:cursor-not-allowed"
      >
        <RotateCcw size={13} strokeWidth={2} />
      </button>
      <button
        disabled={!hasSelection}
        onClick={() => onRotateSelection("cw")}
        title="Rotate selection right"
        className="w-7 h-7 rounded-md hover:bg-ctrl disabled:opacity-30 flex items-center justify-center text-ink-2 cursor-pointer disabled:cursor-not-allowed"
      >
        <RotateCw size={13} strokeWidth={2} />
      </button>
      <button
        disabled={!hasSelection || !canDeleteSelection}
        onClick={onDeleteSelection}
        title="Delete selection"
        className="w-7 h-7 rounded-md hover:bg-ctrl disabled:opacity-30 flex items-center justify-center text-red-500 cursor-pointer disabled:cursor-not-allowed"
      >
        <Trash2 size={13} strokeWidth={2} />
      </button>

      <div className="w-px h-4 bg-bdr mx-1" />

      <button
        onClick={onUndo}
        disabled={!canUndo}
        className="text-ink-3 hover:text-ink-1 disabled:opacity-30 text-[11px] px-2 cursor-pointer disabled:cursor-not-allowed"
      >
        Undo
      </button>
      <button
        onClick={onRedo}
        disabled={!canRedo}
        className="text-ink-3 hover:text-ink-1 disabled:opacity-30 text-[11px] px-2 cursor-pointer disabled:cursor-not-allowed"
      >
        Redo
      </button>

      <Button
        size="sm"
        variant={dirty ? "primary" : "secondary"}
        disabled={!dirty || saving}
        onClick={onSaveClick}
      >
        <Save size={12} strokeWidth={2} />
        {saving ? "Saving…" : savedFlash ? "Saved" : "Save"}
      </Button>
    </div>
  );
}
