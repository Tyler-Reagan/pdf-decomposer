// Shared IPC/data contract types used across the main, preload, and renderer
// layers. Keep this module type-only (interfaces / type aliases) so it is
// safely importable from any layer without pulling in runtime code.

export interface SplitGroup {
  groupId: string;
  outputPath: string;
  pageIndices: number[]; // 0-based
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

export interface PdfInfo {
  pageCount: number;
  fileSizeBytes: number;
}
