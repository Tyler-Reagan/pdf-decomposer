import {
  createContext,
  useContext,
  useEffect,
  useRef,
  type ReactNode,
} from "react";
import * as pdfjs from "pdfjs-dist";
import type { PDFDocumentProxy } from "pdfjs-dist";
import PdfjsWorker from "pdfjs-dist/build/pdf.worker.min.mjs?worker";

// pdfjs runs on this (renderer) thread with its own dedicated parsing worker.
// We deliberately do NOT run pdfjs inside a nested Web Worker — spawning
// pdfjs's worker from within another worker is fragile under Electron and was
// the cause of the all-pages-fail-to-render failure. Rastering happens here,
// throttled by a serial queue + virtualization, which is plenty for thumbnails.
pdfjs.GlobalWorkerOptions.workerPort = new PdfjsWorker();

// Single owner of PDF rendering for a loaded document. Renders both page
// thumbnails (the grid) and the larger preview pane, and holds an LRU bitmap
// cache so memory stays bounded regardless of page count.
//
// Components don't read React state from here; they call request*/subscribe*
// and pull bitmaps via useSyncExternalStore, so an arriving bitmap only
// re-renders the one card waiting on it rather than the whole grid.

const THUMB_TARGET = { width: 160, height: 220 }; // CSS px box to fit into
const THUMB_DPR_CAP = 2;
const PREVIEW_DPR_CAP = 2;
const THUMB_LRU_CAP = 60; // max cached thumbnail bitmaps before eviction

type RenderType = "thumb" | "preview";

interface QueueItem {
  pageIndex: number;
  type: RenderType;
  targetWidth: number;
  targetHeight: number;
}

interface PdfRenderStore {
  getThumb(pageIndex: number): ImageBitmap | null;
  getThumbError(pageIndex: number): boolean;
  requestThumb(pageIndex: number): void;
  setThumbVisible(pageIndex: number, visible: boolean): void;
  subscribeThumb(pageIndex: number, cb: () => void): () => void;

  getPreview(pageIndex: number): ImageBitmap | null;
  getPreviewError(pageIndex: number): boolean;
  requestPreview(pageIndex: number, cssWidth: number, cssHeight: number): void;
  subscribePreview(cb: () => void): () => void;
}

function createStore(): {
  store: PdfRenderStore;
  init(filePath: string): void;
  dispose(): void;
} {
  let doc: PDFDocumentProxy | null = null;
  let fatalError = false;
  let loadToken = 0; // bumps each init() so stale async work is ignored

  // Thumbnails
  const thumbs = new Map<number, ImageBitmap>(); // insertion order = LRU (oldest first)
  const thumbErrors = new Set<number>();
  const requested = new Set<number>(); // thumb queued/rendering
  const visible = new Set<number>(); // never evict a visible page
  const thumbListeners = new Map<number, Set<() => void>>();

  // Preview (one page at a time)
  let previewPage: number | null = null; // page the current bitmap belongs to
  let previewBitmap: ImageBitmap | null = null;
  let previewError = false;
  let desiredPreview: { page: number; w: number; h: number } | null = null;
  const previewListeners = new Set<() => void>();

  // Render queue (previews drained before thumbnails).
  let previewQueue: QueueItem[] = [];
  let thumbQueue: QueueItem[] = [];
  let isRendering = false;

  const dprScale = (cap: number): number =>
    Math.min(window.devicePixelRatio || 1, cap);

  function notifyThumb(pageIndex: number): void {
    thumbListeners.get(pageIndex)?.forEach((cb) => cb());
  }
  function notifyPreview(): void {
    previewListeners.forEach((cb) => cb());
  }

  function touchLru(pageIndex: number): void {
    const bmp = thumbs.get(pageIndex);
    if (!bmp) return;
    thumbs.delete(pageIndex);
    thumbs.set(pageIndex, bmp); // move to newest
  }

  function evictIfNeeded(): void {
    if (thumbs.size <= THUMB_LRU_CAP) return;
    for (const pageIndex of thumbs.keys()) {
      if (thumbs.size <= THUMB_LRU_CAP) break;
      if (visible.has(pageIndex)) continue;
      thumbs.get(pageIndex)?.close();
      thumbs.delete(pageIndex);
      notifyThumb(pageIndex); // card falls back to skeleton; re-requests if visible
    }
  }

  async function renderItem(item: QueueItem): Promise<ImageBitmap> {
    const page = await doc!.getPage(item.pageIndex + 1);
    try {
      const natural = page.getViewport({ scale: 1 });
      const scale = Math.min(
        item.targetWidth / natural.width,
        item.targetHeight / natural.height,
      );
      const viewport = page.getViewport({ scale });
      const canvas = new OffscreenCanvas(
        Math.max(1, Math.round(viewport.width)),
        Math.max(1, Math.round(viewport.height)),
      );
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("no 2d context");
      await page.render({
        canvasContext: ctx as unknown as CanvasRenderingContext2D,
        viewport,
      }).promise;
      return canvas.transferToImageBitmap();
    } finally {
      page.cleanup();
    }
  }

  function processQueue(): void {
    if (isRendering || !doc) return;
    const item = previewQueue.shift() ?? thumbQueue.shift();
    if (!item) return;
    isRendering = true;
    const token = loadToken;

    renderItem(item)
      .then((bitmap) => {
        if (token !== loadToken) {
          bitmap.close(); // a newer document loaded; discard
          return;
        }
        if (item.type === "thumb") {
          requested.delete(item.pageIndex);
          thumbErrors.delete(item.pageIndex);
          thumbs.set(item.pageIndex, bitmap);
          evictIfNeeded();
          notifyThumb(item.pageIndex);
        } else if (desiredPreview && item.pageIndex === desiredPreview.page) {
          previewBitmap?.close();
          previewBitmap = bitmap;
          previewPage = item.pageIndex;
          previewError = false;
          notifyPreview();
        } else {
          bitmap.close(); // stale preview (page changed mid-render)
        }
      })
      .catch((err) => {
        if (token !== loadToken) return;
        console.error(
          `[pdf-render] page ${item.pageIndex + 1} (${item.type}) failed:`,
          err instanceof Error ? err.message : err,
        );
        if (item.type === "thumb") {
          requested.delete(item.pageIndex);
          thumbErrors.add(item.pageIndex);
          notifyThumb(item.pageIndex);
        } else if (desiredPreview && item.pageIndex === desiredPreview.page) {
          previewError = true;
          notifyPreview();
        }
      })
      .finally(() => {
        isRendering = false;
        if (previewQueue.length || thumbQueue.length) {
          queueMicrotask(processQueue);
        }
      });
  }

  const store: PdfRenderStore = {
    getThumb: (pageIndex) => thumbs.get(pageIndex) ?? null,
    getThumbError: (pageIndex) => fatalError || thumbErrors.has(pageIndex),

    requestThumb: (pageIndex) => {
      if (thumbs.has(pageIndex)) {
        touchLru(pageIndex);
        return;
      }
      if (requested.has(pageIndex) || fatalError) return;
      requested.add(pageIndex);
      const scale = dprScale(THUMB_DPR_CAP);
      thumbQueue.push({
        pageIndex,
        type: "thumb",
        targetWidth: THUMB_TARGET.width * scale,
        targetHeight: THUMB_TARGET.height * scale,
      });
      processQueue();
    },

    setThumbVisible: (pageIndex, isVisible) => {
      if (isVisible) visible.add(pageIndex);
      else visible.delete(pageIndex);
    },

    subscribeThumb: (pageIndex, cb) => {
      let set = thumbListeners.get(pageIndex);
      if (!set) {
        set = new Set();
        thumbListeners.set(pageIndex, set);
      }
      set.add(cb);
      return () => {
        set!.delete(cb);
        if (set!.size === 0) thumbListeners.delete(pageIndex);
      };
    },

    getPreview: (pageIndex) =>
      previewPage === pageIndex ? previewBitmap : null,
    getPreviewError: (pageIndex) =>
      (fatalError || previewError) && desiredPreview?.page === pageIndex,

    requestPreview: (pageIndex, cssWidth, cssHeight) => {
      desiredPreview = { page: pageIndex, w: cssWidth, h: cssHeight };
      previewError = false;
      if (fatalError) return;
      const scale = dprScale(PREVIEW_DPR_CAP);
      // Only the latest preview matters — replace any pending one.
      previewQueue = [
        {
          pageIndex,
          type: "preview",
          targetWidth: Math.max(1, Math.round(cssWidth * scale)),
          targetHeight: Math.max(1, Math.round(cssHeight * scale)),
        },
      ];
      processQueue();
    },

    subscribePreview: (cb) => {
      previewListeners.add(cb);
      return () => previewListeners.delete(cb);
    },
  };

  function init(filePath: string): void {
    dispose();
    const token = loadToken;
    window.electronAPI
      .readPdfFile(filePath)
      .then((buf) => pdfjs.getDocument({ data: new Uint8Array(buf) }).promise)
      .then((loaded) => {
        if (token !== loadToken) {
          loaded.destroy();
          return;
        }
        doc = loaded;
        processQueue(); // drain anything requested while loading
      })
      .catch((err) => {
        if (token !== loadToken) return;
        console.error(
          "[pdf-render] failed to load document:",
          err instanceof Error ? err.message : err,
        );
        fatalError = true;
        thumbListeners.forEach((set) => set.forEach((cb) => cb()));
        notifyPreview();
      });
  }

  function dispose(): void {
    loadToken++; // invalidate in-flight renders/loads
    doc?.destroy();
    doc = null;
    fatalError = false;
    isRendering = false;
    previewQueue = [];
    thumbQueue = [];
    thumbs.forEach((b) => b.close());
    thumbs.clear();
    thumbErrors.clear();
    requested.clear();
    visible.clear();
    previewBitmap?.close();
    previewBitmap = null;
    previewPage = null;
    previewError = false;
    desiredPreview = null;
  }

  return { store, init, dispose };
}

const PdfRenderContext = createContext<PdfRenderStore | null>(null);

export function PdfRenderProvider({
  filePath,
  children,
}: {
  filePath: string;
  children: ReactNode;
}) {
  const ref = useRef<ReturnType<typeof createStore> | null>(null);
  if (ref.current === null) ref.current = createStore();

  useEffect(() => {
    if (!filePath) return;
    ref.current!.init(filePath);
    return () => ref.current!.dispose();
  }, [filePath]);

  return (
    <PdfRenderContext.Provider value={ref.current.store}>
      {children}
    </PdfRenderContext.Provider>
  );
}

export function usePdfRender(): PdfRenderStore {
  const store = useContext(PdfRenderContext);
  if (!store) {
    throw new Error("usePdfRender must be used within a PdfRenderProvider");
  }
  return store;
}
