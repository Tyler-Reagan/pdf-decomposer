import { useCallback, useEffect, useRef, useSyncExternalStore } from "react";
import { usePdfRender } from "../lib/PdfRenderProvider";

// Inline PDF preview pane. Renders a single page to a canvas via the shared
// pdfjs worker (replacing the old main-process WebContentsView overlay). The
// bitmap is rendered at the container's pixel size so it stays crisp, and
// re-requested when the page changes or the pane is resized.
export function PdfPreview({ pageIndex }: { pageIndex: number }) {
  const store = usePdfRender();
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const lastReqRef = useRef<{ page: number; w: number; h: number } | null>(
    null,
  );

  const subscribe = useCallback(
    (cb: () => void) => store.subscribePreview(cb),
    [store],
  );
  const bitmap = useSyncExternalStore(
    subscribe,
    useCallback(() => store.getPreview(pageIndex), [store, pageIndex]),
  );
  const hasError = useSyncExternalStore(
    subscribe,
    useCallback(() => store.getPreviewError(pageIndex), [store, pageIndex]),
  );

  // Request on mount / page change, and (debounced) on resize. Skip duplicate
  // requests for the same page+size so a resize drag doesn't spam the worker.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const request = (): void => {
      const r = el.getBoundingClientRect();
      const w = Math.round(r.width);
      const h = Math.round(r.height);
      if (w <= 0 || h <= 0) return;
      const last = lastReqRef.current;
      if (last && last.page === pageIndex && last.w === w && last.h === h)
        return;
      lastReqRef.current = { page: pageIndex, w, h };
      store.requestPreview(pageIndex, w, h);
    };

    request();

    let timer: ReturnType<typeof setTimeout> | undefined;
    const ro = new ResizeObserver(() => {
      clearTimeout(timer);
      timer = setTimeout(request, 120);
    });
    ro.observe(el);

    return () => {
      clearTimeout(timer);
      ro.disconnect();
    };
  }, [store, pageIndex]);

  // Paint the bitmap whenever it arrives.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !bitmap) return;
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    canvas.getContext("2d")?.drawImage(bitmap, 0, 0);
  }, [bitmap]);

  return (
    <div
      ref={containerRef}
      className="w-full h-full flex items-center justify-center overflow-hidden p-2"
    >
      {bitmap ? (
        <canvas
          ref={canvasRef}
          className="max-w-full max-h-full"
          style={{ width: "auto", height: "auto" }}
        />
      ) : hasError ? (
        <div className="text-ink-4 text-sm">Failed to render page</div>
      ) : (
        <div className="w-10 h-10 border-2 border-bdr border-t-acc rounded-full animate-spin" />
      )}
    </div>
  );
}
