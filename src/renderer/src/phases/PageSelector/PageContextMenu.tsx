import { useEffect } from "react";
import { RotateCcw, RotateCw, Trash2 } from "lucide-react";

interface PageContextMenuProps {
  x: number;
  y: number;
  canDelete: boolean;
  onRotate: (direction: "cw" | "ccw") => void;
  onDelete: () => void;
  onClose: () => void;
}

export function PageContextMenu({
  x,
  y,
  canDelete,
  onRotate,
  onDelete,
  onClose,
}: PageContextMenuProps) {
  useEffect(() => {
    window.addEventListener("click", onClose);
    return () => window.removeEventListener("click", onClose);
  }, [onClose]);

  return (
    <div
      className="fixed z-50 bg-surf-2 border border-bdr-hi rounded-lg shadow-2xl py-1 w-40"
      style={{ left: x, top: y }}
    >
      <button
        onClick={() => {
          onRotate("ccw");
          onClose();
        }}
        className="w-full text-left px-3 py-1.5 text-xs text-ink-2 hover:bg-ctrl flex items-center gap-2 cursor-pointer"
      >
        <RotateCcw size={12} strokeWidth={2} /> Rotate left
      </button>
      <button
        onClick={() => {
          onRotate("cw");
          onClose();
        }}
        className="w-full text-left px-3 py-1.5 text-xs text-ink-2 hover:bg-ctrl flex items-center gap-2 cursor-pointer"
      >
        <RotateCw size={12} strokeWidth={2} /> Rotate right
      </button>
      <button
        disabled={!canDelete}
        onClick={() => {
          onDelete();
          onClose();
        }}
        className="w-full text-left px-3 py-1.5 text-xs text-red-500 hover:bg-ctrl disabled:opacity-30 flex items-center gap-2 cursor-pointer disabled:cursor-not-allowed"
      >
        <Trash2 size={12} strokeWidth={2} /> Delete page
      </button>
    </div>
  );
}
