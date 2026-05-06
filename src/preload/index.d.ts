import type { ElectronAPI } from "@electron-toolkit/preload";

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

export type PdfViewMode = "FitH" | "Fit";

export interface PdfViewerBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface PdfViewerAPI {
  create(params: {
    viewId: string;
    filePath: string;
    page: number;
    view: PdfViewMode;
  }): Promise<void>;
  load(params: {
    viewId: string;
    filePath: string;
    page: number;
    view: PdfViewMode;
  }): Promise<void>;
  navigate(params: {
    viewId: string;
    page: number;
    view: PdfViewMode;
  }): Promise<void>;
  setBounds(params: {
    viewId: string;
    bounds: PdfViewerBounds;
  }): Promise<void>;
  setVisible(params: { viewId: string; visible: boolean }): Promise<void>;
  destroy(params: { viewId: string }): Promise<void>;
}

export interface ElectronAppAPI {
  openPdfDialog(): Promise<string | null>;
  getPdfInfo(
    filePath: string,
  ): Promise<{ pageCount: number; fileSizeBytes: number }>;
  readPdfFile(filePath: string): Promise<Buffer>;
  storePdfData(data: Uint8Array, originalName: string): Promise<string>;
  chooseSaveDirectory(defaultPath?: string): Promise<string | null>;
  splitPdf(params: SplitPdfParams): Promise<SplitPdfResult>;
  openPath(pathToOpen: string): Promise<void>;
  onSplitProgress(callback: (event: SplitProgressEvent) => void): () => void;
  onUpdateAvailable(callback: (info: UpdateInfo) => void): () => void;
  onUpdateProgress(callback: (progress: DownloadProgress) => void): () => void;
  onUpdateDownloaded(callback: (info: UpdateInfo) => void): () => void;
  onUpdateError(callback: (message: string) => void): () => void;
  downloadUpdate(): Promise<void>;
  installUpdate(): void;
  getDemoPdfPath(): Promise<string>;
  pdfViewer: PdfViewerAPI;
}

declare global {
  interface Window {
    electron: ElectronAPI;
    electronAPI: ElectronAppAPI;
  }
}
