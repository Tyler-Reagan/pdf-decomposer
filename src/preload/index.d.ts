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
}

declare global {
  interface Window {
    electron: ElectronAPI;
    electronAPI: ElectronAppAPI;
  }
}
