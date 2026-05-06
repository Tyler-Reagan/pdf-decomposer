import { useEffect, useRef, type RefObject } from "react";

let viewIdCounter = 0;
const nextViewId = (): string => `pdf-view-${++viewIdCounter}`;

interface UsePdfViewerOptions {
  containerRef: RefObject<HTMLElement | null>;
  filePath: string;
  page: number; // 1-indexed
  view?: "FitH" | "Fit";
  enabled?: boolean;
}

// Drives a main-process WebContentsView positioned at the bounds of
// `containerRef`. The container is just a placeholder <div> in the React
// tree — the actual PDF surface is composited on top of the BrowserWindow
// by Electron. ResizeObserver + window resize keep the view's bounds in
// sync with the React layout; getBoundingClientRect already accounts for
// the host window's content-area origin, which matches WebContentsView's
// coordinate system.
export function usePdfViewer({
  containerRef,
  filePath,
  page,
  view = "FitH",
  enabled = true,
}: UsePdfViewerOptions): void {
  const viewIdRef = useRef<string | null>(null);
  const lastBoundsRef = useRef<{
    x: number;
    y: number;
    width: number;
    height: number;
  } | null>(null);
  const lastFilePathRef = useRef<string | null>(null);

  // Stable refs for create-time values so the create effect can run once
  // per mount without being invalidated by page/view churn.
  const filePathRef = useRef(filePath);
  const pageRef = useRef(page);
  const viewModeRef = useRef(view);
  filePathRef.current = filePath;
  pageRef.current = page;
  viewModeRef.current = view;

  // Lifecycle: create on mount, destroy on unmount.
  useEffect(() => {
    if (!enabled) return;
    const viewId = nextViewId();
    viewIdRef.current = viewId;
    lastFilePathRef.current = filePathRef.current;

    window.electronAPI.pdfViewer.create({
      viewId,
      filePath: filePathRef.current,
      page: pageRef.current,
      view: viewModeRef.current,
    });

    return () => {
      window.electronAPI.pdfViewer.destroy({ viewId });
      viewIdRef.current = null;
      lastBoundsRef.current = null;
      lastFilePathRef.current = null;
    };
  }, [enabled]);

  // Reload when the source file changes.
  useEffect(() => {
    const id = viewIdRef.current;
    if (!id) return;
    if (lastFilePathRef.current === filePath) return;
    lastFilePathRef.current = filePath;
    window.electronAPI.pdfViewer.load({ viewId: id, filePath, page, view });
  }, [filePath, page, view]);

  // Page navigation (in-place hash mutation in the guest).
  useEffect(() => {
    const id = viewIdRef.current;
    if (!id) return;
    window.electronAPI.pdfViewer.navigate({ viewId: id, page, view });
  }, [page, view]);

  // Visibility.
  useEffect(() => {
    const id = viewIdRef.current;
    if (!id) return;
    window.electronAPI.pdfViewer.setVisible({ viewId: id, visible: enabled });
  }, [enabled]);

  // Bounds tracking.
  useEffect(() => {
    if (!enabled) return;
    const el = containerRef.current;
    if (!el) return;

    const update = (): void => {
      const id = viewIdRef.current;
      if (!id) return;
      const r = el.getBoundingClientRect();
      const bounds = { x: r.left, y: r.top, width: r.width, height: r.height };
      const prev = lastBoundsRef.current;
      if (
        prev &&
        prev.x === bounds.x &&
        prev.y === bounds.y &&
        prev.width === bounds.width &&
        prev.height === bounds.height
      ) {
        return;
      }
      lastBoundsRef.current = bounds;
      window.electronAPI.pdfViewer.setBounds({ viewId: id, bounds });
    };

    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    window.addEventListener("resize", update);

    return () => {
      ro.disconnect();
      window.removeEventListener("resize", update);
    };
  }, [containerRef, enabled]);
}
