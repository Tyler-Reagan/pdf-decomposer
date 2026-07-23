import { contextBridge, ipcRenderer } from "electron";
import { electronAPI } from "@electron-toolkit/preload";
import type {
  SplitPdfParams,
  SplitPdfResult,
  SplitProgressEvent,
  SavePdfParams,
  SavePdfResult,
} from "../shared/types";

const api = {
  openPdfDialog: (): Promise<string | null> =>
    ipcRenderer.invoke("open-pdf-dialog"),

  getPdfInfo: (
    filePath: string,
  ): Promise<{ pageCount: number; fileSizeBytes: number }> =>
    ipcRenderer.invoke("get-pdf-info", filePath),

  readPdfFile: (filePath: string): Promise<Buffer> =>
    ipcRenderer.invoke("read-pdf-file", filePath),

  storePdfData: (data: Uint8Array, originalName: string): Promise<string> =>
    ipcRenderer.invoke("store-pdf-data", Buffer.from(data), originalName),

  chooseSaveDirectory: (defaultPath?: string): Promise<string | null> =>
    ipcRenderer.invoke("choose-save-directory", defaultPath),

  splitPdf: (params: SplitPdfParams): Promise<SplitPdfResult> =>
    ipcRenderer.invoke("split-pdf", params),

  savePdf: (params: SavePdfParams): Promise<SavePdfResult> =>
    ipcRenderer.invoke("save-pdf", params),

  openPath: (pathToOpen: string): Promise<void> =>
    ipcRenderer.invoke("open-path", pathToOpen),

  onSplitProgress: (
    callback: (event: SplitProgressEvent) => void,
  ): (() => void) => {
    const handler = (
      _: Electron.IpcRendererEvent,
      data: SplitProgressEvent,
    ): void => callback(data);
    ipcRenderer.on("split-progress", handler);
    return () => ipcRenderer.removeListener("split-progress", handler);
  },

  getDemoPdfPath: (): Promise<string> =>
    ipcRenderer.invoke("get-demo-pdf-path"),

  getAppVersion: (): Promise<string> => ipcRenderer.invoke("get-app-version"),
};

// contextIsolation is always enabled (see the main-process webPreferences), so
// the bridge is the only exposure path — no non-isolated window.* fallback.
try {
  contextBridge.exposeInMainWorld("electron", electronAPI);
  contextBridge.exposeInMainWorld("electronAPI", api);
} catch (error) {
  console.error(error);
}
