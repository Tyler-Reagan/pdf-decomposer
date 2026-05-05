import { useEffect, useRef, memo } from "react";
import { motion } from "framer-motion";
import type { PageGroup } from "../../types/pdf";

interface PageThumbnailProps {
  pageIndex: number;
  bitmap: ImageBitmap | null;
  hasError: boolean;
  group: PageGroup | undefined;
  isSelected: boolean;
  onMouseDown: (e: React.MouseEvent, index: number) => void;
  onMouseEnter: (e: React.MouseEvent, index: number) => void;
  onNativePreview: (pageIndex: number) => void;
  cardRef: (el: HTMLDivElement | null) => void;
  cardHeight: number;
}

export const PageThumbnail = memo(function PageThumbnail({
  pageIndex,
  bitmap,
  hasError,
  group,
  isSelected,
  onMouseDown,
  onMouseEnter,
  onNativePreview,
  cardRef,
  cardHeight,
}: PageThumbnailProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!bitmap || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    ctx.drawImage(bitmap, 0, 0);
  }, [bitmap]);

  const borderWidth = isSelected || group ? 2 : 1;

  return (
    <div
      ref={cardRef}
      data-page-index={pageIndex}
      onMouseDown={(e) => onMouseDown(e, pageIndex)}
      onMouseEnter={(e) => onMouseEnter(e, pageIndex)}
      className="relative select-none cursor-pointer"
      style={{ height: cardHeight, userSelect: "none" }}
    >
      <motion.div
        className="relative rounded-lg overflow-hidden bg-surf-1 flex flex-col h-full"
        style={{
          border: `${borderWidth}px solid ${isSelected ? "var(--acc)" : group ? group.color + "80" : "var(--bdr)"}`,
          boxShadow: isSelected
            ? "0 0 0 2px color-mix(in oklch, var(--acc) 35%, transparent), 0 4px 12px rgba(0,0,0,0.3)"
            : group
              ? `0 0 0 1px ${group.color}30`
              : "0 2px 8px rgba(0,0,0,0.2)",
        }}
        animate={{ scale: isSelected ? 1.03 : 1 }}
        transition={{ duration: 0.1 }}
      >
        {group && (
          <div
            className="absolute left-0 top-0 bottom-0 w-1 z-10"
            style={{ backgroundColor: group.color }}
          />
        )}

        {isSelected && (
          <div className="absolute inset-0 bg-acc/12 z-10 pointer-events-none" />
        )}

        {isSelected && (
          <div className="absolute top-1.5 right-1.5 z-20 w-5 h-5 rounded-full bg-acc flex items-center justify-center shadow">
            <svg width="11" height="9" viewBox="0 0 11 9" fill="none">
              <path
                d="M1 4L4 7L10 1"
                stroke="white"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        )}

        <div className="flex-1 flex items-center justify-center bg-surf-1 overflow-hidden min-h-0">
          {bitmap ? (
            <canvas
              ref={canvasRef}
              style={{
                display: "block",
                maxWidth: "100%",
                maxHeight: "100%",
                width: "auto",
                height: "auto",
              }}
            />
          ) : hasError ? (
            <button
              className="flex flex-col items-center justify-center gap-2 w-full h-full group/native"
              title="Open in native viewer"
              onMouseDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                onNativePreview(pageIndex);
              }}
            >
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="var(--ink-3)"
                strokeWidth="1.5"
                className="opacity-50 group-hover/native:opacity-80 transition-opacity"
              >
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <span className="text-ink-3 text-[10px] opacity-50">
                Failed to render
              </span>
              <span className="text-acc text-[10px] font-medium opacity-0 group-hover/native:opacity-100 transition-opacity">
                Open in viewer
              </span>
            </button>
          ) : (
            <div className="flex flex-col items-center justify-center gap-2 w-full h-full">
              <div className="w-8 h-10 rounded-sm bg-ctrl animate-pulse" />
              <div className="w-6 h-1 rounded bg-ctrl animate-pulse" />
            </div>
          )}
        </div>

        <div className="bg-surf-2/80 text-center py-1 flex-shrink-0">
          <span className="text-ink-3 text-[11px] font-medium">
            {pageIndex + 1}
          </span>
        </div>
      </motion.div>
    </div>
  );
});
