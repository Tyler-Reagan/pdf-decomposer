import {
  memo,
  useCallback,
  useEffect,
  useRef,
  useSyncExternalStore,
} from "react";
import { motion } from "framer-motion";
import { AlertCircle } from "lucide-react";
import type { PageGroup } from "../../types/pdf";
import { useInViewport } from "../../lib/useInViewport";
import { usePdfRender } from "../../lib/PdfRenderProvider";

interface PageNodeProps {
  pageIndex: number;
  group: PageGroup | undefined;
  isSelected: boolean;
  isFocused: boolean;
  onMouseDown: (e: React.MouseEvent, index: number) => void;
  onMouseEnter: (e: React.MouseEvent, index: number) => void;
  nodeRef: (el: HTMLDivElement | null) => void;
}

export const PageNode = memo(function PageNode({
  pageIndex,
  group,
  isSelected,
  isFocused,
  onMouseDown,
  onMouseEnter,
  nodeRef,
}: PageNodeProps) {
  const store = usePdfRender();
  const cardRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Merge the parent's geometry ref (used by the lasso) with our own, which
  // the viewport observer needs.
  const setRefs = useCallback(
    (el: HTMLDivElement | null) => {
      cardRef.current = el;
      nodeRef(el);
    },
    [nodeRef],
  );

  // Prefetch slightly before the card scrolls in; flag visibility so the
  // provider's LRU never evicts an on-screen thumbnail.
  const inView = useInViewport(cardRef, { rootMargin: "200px" });

  const bitmap = useSyncExternalStore(
    useCallback(
      (cb) => store.subscribeThumb(pageIndex, cb),
      [store, pageIndex],
    ),
    useCallback(() => store.getThumb(pageIndex), [store, pageIndex]),
  );
  const hasError = useSyncExternalStore(
    useCallback(
      (cb) => store.subscribeThumb(pageIndex, cb),
      [store, pageIndex],
    ),
    useCallback(() => store.getThumbError(pageIndex), [store, pageIndex]),
  );

  useEffect(() => {
    store.setThumbVisible(pageIndex, inView);
    if (inView) store.requestThumb(pageIndex);
    return () => store.setThumbVisible(pageIndex, false);
  }, [inView, pageIndex, store]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !bitmap) return;
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    canvas.getContext("2d")?.drawImage(bitmap, 0, 0);
  }, [bitmap]);

  const borderColor = isSelected
    ? "var(--acc)"
    : isFocused
      ? "var(--acc-hi)"
      : group
        ? group.color + "80"
        : "var(--bdr)";

  const borderWidth = isSelected || group || isFocused ? 2 : 1;

  return (
    <div
      ref={setRefs}
      data-page-index={pageIndex}
      onMouseDown={(e) => onMouseDown(e, pageIndex)}
      onMouseEnter={(e) => onMouseEnter(e, pageIndex)}
      className="relative select-none cursor-pointer"
      style={{ aspectRatio: "3 / 4", userSelect: "none" }}
    >
      <motion.div
        className="relative rounded-md overflow-hidden bg-surf-1 flex flex-col h-full"
        style={{
          border: `${borderWidth}px solid ${borderColor}`,
          boxShadow: isSelected
            ? "0 0 0 2px color-mix(in oklch, var(--acc) 35%, transparent)"
            : isFocused
              ? "0 0 0 1px color-mix(in oklch, var(--acc-hi) 25%, transparent)"
              : group
                ? `0 0 0 1px ${group.color}30`
                : "none",
        }}
        animate={{ scale: isSelected ? 1.04 : 1 }}
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
          <div className="absolute top-1 right-1 z-20 w-4 h-4 rounded-full bg-acc flex items-center justify-center shadow">
            <svg width="8" height="7" viewBox="0 0 11 9" fill="none">
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

        {/* Rendered page content (lazy) */}
        <div className="flex-1 min-h-0 flex items-center justify-center overflow-hidden bg-surf-1">
          {bitmap ? (
            <canvas
              ref={canvasRef}
              className="max-w-full max-h-full"
              style={{ width: "auto", height: "auto", display: "block" }}
            />
          ) : hasError ? (
            <AlertCircle
              size={20}
              strokeWidth={1.5}
              color="var(--ink-4)"
              className="opacity-50"
            />
          ) : (
            <div className="w-2/3 h-3/4 rounded-sm bg-ctrl/40 animate-pulse" />
          )}
        </div>

        <div className="bg-surf-2/70 text-center py-0.5 flex-shrink-0">
          <span className="text-ink-3 text-[9px] font-medium">
            {pageIndex + 1}
          </span>
        </div>
      </motion.div>
    </div>
  );
});
