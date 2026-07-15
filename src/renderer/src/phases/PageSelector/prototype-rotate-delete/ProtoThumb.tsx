// PROTOTYPE — throwaway. Real pdfjs thumbnail rendering (via the existing
// PdfRenderProvider) so the variants are judged against real page content,
// not placeholder boxes. Skips PageNode's viewport virtualization since
// prototype/demo PDFs are small.
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useSyncExternalStore } from "react";
import { usePdfRender } from "../../../lib/PdfRenderProvider";

interface ProtoThumbProps {
  pageIndex: number;
  rotation: number;
  isFocused?: boolean;
  children?: ReactNode; // control overlay, variant-specific
  onClick?: (e: React.MouseEvent) => void;
  className?: string;
}

export function ProtoThumb({
  pageIndex,
  rotation,
  isFocused,
  children,
  onClick,
  className,
}: ProtoThumbProps) {
  const store = usePdfRender();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const [boxSize, setBoxSize] = useState({ w: 0, h: 0 });

  const bitmap = useSyncExternalStore(
    useCallback((cb) => store.subscribeThumb(pageIndex, cb), [store, pageIndex]),
    useCallback(() => store.getThumb(pageIndex), [store, pageIndex]),
  );

  useEffect(() => {
    store.setThumbVisible(pageIndex, true);
    store.requestThumb(pageIndex);
    return () => store.setThumbVisible(pageIndex, false);
  }, [pageIndex, store]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !bitmap) return;
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    canvas.getContext("2d")?.drawImage(bitmap, 0, 0);
  }, [bitmap]);

  // Measure the card's content box (unrotated) so rotated content can be
  // scaled to fit within it instead of clipping — this box's own size never
  // changes with rotation, only what's painted inside it does.
  useLayoutEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setBoxSize({ w: width, h: height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Contain-fit the bitmap within the box at its *current* orientation
  // (dimensions swap for a 90/270 rotation), so a landscape-after-rotation
  // page scales down and letterboxes instead of overflowing/clipping —
  // matches how Preview/Acrobat handle a rotated page.
  let displayW = 0;
  let displayH = 0;
  if (bitmap && boxSize.w > 0 && boxSize.h > 0) {
    const rotated = rotation === 90 || rotation === 270;
    const contentW = rotated ? bitmap.height : bitmap.width;
    const contentH = rotated ? bitmap.width : bitmap.height;
    const scale = Math.min(boxSize.w / contentW, boxSize.h / contentH);
    displayW = bitmap.width * scale;
    displayH = bitmap.height * scale;
  }

  return (
    <div
      onClick={onClick}
      className={`relative rounded-md overflow-hidden bg-surf-1 flex flex-col ${className ?? ""}`}
      style={{
        aspectRatio: "3 / 4",
        border: isFocused
          ? "2px solid var(--acc-hi)"
          : "1px solid var(--bdr)",
      }}
    >
      <div
        ref={boxRef}
        className="flex-1 min-h-0 flex items-center justify-center overflow-hidden bg-surf-1"
      >
        {bitmap ? (
          <canvas
            ref={canvasRef}
            className="transition-transform duration-200"
            style={{
              width: displayW || "auto",
              height: displayH || "auto",
              display: "block",
              transform: `rotate(${rotation}deg)`,
            }}
          />
        ) : (
          <div className="w-2/3 h-3/4 rounded-sm bg-ctrl/40 animate-pulse" />
        )}
      </div>
      <div className="bg-surf-2/70 text-center py-0.5 flex-shrink-0">
        <span className="text-ink-3 text-[9px] font-medium">{pageIndex + 1}</span>
      </div>
      {children}
    </div>
  );
}
