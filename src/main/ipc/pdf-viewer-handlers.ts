import { ipcMain, BrowserWindow, WebContentsView } from "electron";
import { pathToFileURL } from "url";

// Keyed pool of WebContentsView instances. The renderer creates and tears
// these down by viewId — one per <PdfViewer> mount. We swapped from
// <webview> to WebContentsView for two reasons:
//   1) Electron's docs flag <webview> as having unresolved security issues
//      and recommend WebContentsView (or a sandboxed iframe).
//   2) WebContentsView lets us drive the Chromium PDF viewer without
//      attaching the webview tag to the main BrowserWindow.
const views = new Map<string, WebContentsView>();

interface CreateParams {
  viewId: string;
  filePath: string;
  page: number;
  view: "FitH" | "Fit";
}

interface LoadParams {
  viewId: string;
  filePath: string;
  page: number;
  view: "FitH" | "Fit";
}

interface NavigateParams {
  viewId: string;
  page: number;
  view: "FitH" | "Fit";
}

interface SetBoundsParams {
  viewId: string;
  bounds: { x: number; y: number; width: number; height: number };
}

interface SetVisibleParams {
  viewId: string;
  visible: boolean;
}

interface DestroyParams {
  viewId: string;
}

function getMainWindow(): BrowserWindow | null {
  return BrowserWindow.getAllWindows()[0] ?? null;
}

function buildPdfUrl(filePath: string, page: number, view: string): string {
  return `${pathToFileURL(filePath).href}#page=${page}&view=${view}`;
}

export function registerPdfViewerHandlers(): void {
  ipcMain.handle(
    "pdf-viewer:create",
    (_e, { viewId, filePath, page, view }: CreateParams) => {
      const win = getMainWindow();
      if (!win || views.has(viewId)) return;

      const v = new WebContentsView({
        webPreferences: {
          sandbox: true,
          contextIsolation: true,
          nodeIntegration: false,
          plugins: true,
        },
      });

      win.contentView.addChildView(v);
      v.setBounds({ x: 0, y: 0, width: 0, height: 0 });
      v.setBackgroundColor("#00000000");
      v.webContents
        .loadURL(buildPdfUrl(filePath, page, view))
        .catch((err: Error) => {
          // eslint-disable-next-line no-console
          console.error("pdf-viewer load failed:", err.message);
        });

      views.set(viewId, v);
    },
  );

  ipcMain.handle(
    "pdf-viewer:set-bounds",
    (_e, { viewId, bounds }: SetBoundsParams) => {
      const v = views.get(viewId);
      if (!v) return;
      v.setBounds({
        x: Math.round(bounds.x),
        y: Math.round(bounds.y),
        width: Math.round(bounds.width),
        height: Math.round(bounds.height),
      });
    },
  );

  ipcMain.handle(
    "pdf-viewer:navigate",
    async (_e, { viewId, page, view }: NavigateParams) => {
      const v = views.get(viewId);
      if (!v) return;
      const code = `(() => { const h = '#page=${page}&view=${view}'; if (location.hash !== h) location.hash = h; })();`;
      try {
        await v.webContents.executeJavaScript(code);
      } catch {
        // Page may not be ready yet; the next navigate call (or the URL
        // hash already baked into the initial load) will catch up.
      }
    },
  );

  ipcMain.handle(
    "pdf-viewer:load",
    async (_e, { viewId, filePath, page, view }: LoadParams) => {
      const v = views.get(viewId);
      if (!v) return;
      try {
        await v.webContents.loadURL(buildPdfUrl(filePath, page, view));
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error("pdf-viewer load failed:", (err as Error).message);
      }
    },
  );

  ipcMain.handle(
    "pdf-viewer:set-visible",
    (_e, { viewId, visible }: SetVisibleParams) => {
      const v = views.get(viewId);
      if (!v) return;
      v.setVisible(visible);
    },
  );

  ipcMain.handle("pdf-viewer:destroy", (_e, { viewId }: DestroyParams) => {
    const v = views.get(viewId);
    if (!v) return;
    const win = getMainWindow();
    if (win) win.contentView.removeChildView(v);
    views.delete(viewId);
    // No explicit dispose API on WebContentsView; dropping the last
    // reference lets GC reclaim it along with its WebContents.
  });
}
