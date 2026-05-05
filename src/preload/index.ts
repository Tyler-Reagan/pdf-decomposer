import { contextBridge, ipcRenderer } from "electron";
import { electronAPI } from "@electron-toolkit/preload";

export interface SplitGroup {
  groupId: string;
  outputPath: string;
  pageIndices: number[];
}

export interface SplitPdfParams {
  sourcePath: string;
  groups: SplitGroup[];
}

export interface SplitPdfResult {
  success: boolean;
  outputPaths: string[];
  error?: string;
}

export interface SplitProgressEvent {
  current: number;
  total: number;
  groupId?: string;
  outputPath?: string;
  done?: boolean;
}

export interface UpdateInfo {
  version: string;
  releaseDate?: string;
}

export interface DownloadProgress {
  percent: number;
  transferred: number;
  total: number;
}

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

  onUpdateAvailable: (callback: (info: UpdateInfo) => void): (() => void) => {
    const handler = (_: Electron.IpcRendererEvent, info: UpdateInfo): void =>
      callback(info);
    ipcRenderer.on("update-available", handler);
    return () => ipcRenderer.removeListener("update-available", handler);
  },

  onUpdateProgress: (
    callback: (progress: DownloadProgress) => void,
  ): (() => void) => {
    const handler = (
      _: Electron.IpcRendererEvent,
      progress: DownloadProgress,
    ): void => callback(progress);
    ipcRenderer.on("update-progress", handler);
    return () => ipcRenderer.removeListener("update-progress", handler);
  },

  onUpdateDownloaded: (callback: (info: UpdateInfo) => void): (() => void) => {
    const handler = (_: Electron.IpcRendererEvent, info: UpdateInfo): void =>
      callback(info);
    ipcRenderer.on("update-downloaded", handler);
    return () => ipcRenderer.removeListener("update-downloaded", handler);
  },

  onUpdateError: (callback: (message: string) => void): (() => void) => {
    const handler = (_: Electron.IpcRendererEvent, message: string): void =>
      callback(message);
    ipcRenderer.on("update-error", handler);
    return () => ipcRenderer.removeListener("update-error", handler);
  },

  downloadUpdate: (): Promise<void> => ipcRenderer.invoke("download-update"),

  installUpdate: (): void => ipcRenderer.send("install-update"),

  getDemoPdfPath: (): Promise<string> => ipcRenderer.invoke("get-demo-pdf-path"),
};

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld("electron", electronAPI);
    contextBridge.exposeInMainWorld("electronAPI", api);
  } catch (error) {
    console.error(error);
  }
} else {
  // @ts-ignore
  window.electron = electronAPI;
  // @ts-ignore
  window.electronAPI = api;
}
