import type { ElectronAPI } from "@electron-toolkit/preload";
import type {
  SplitPdfParams,
  SplitPdfResult,
  SplitProgressEvent,
  SavePdfParams,
  SavePdfResult,
  PdfInfo,
} from "../shared/types";

export interface ElectronAppAPI {
  openPdfDialog(): Promise<string | null>;
  getPdfInfo(filePath: string): Promise<PdfInfo>;
  readPdfFile(filePath: string): Promise<Buffer>;
  storePdfData(data: Uint8Array, originalName: string): Promise<string>;
  chooseSaveDirectory(defaultPath?: string): Promise<string | null>;
  splitPdf(params: SplitPdfParams): Promise<SplitPdfResult>;
  savePdf(params: SavePdfParams): Promise<SavePdfResult>;
  openPath(pathToOpen: string): Promise<void>;
  onSplitProgress(callback: (event: SplitProgressEvent) => void): () => void;
  getDemoPdfPath(): Promise<string>;
  getAppVersion(): Promise<string>;
}

declare global {
  interface Window {
    electron: ElectronAPI;
    electronAPI: ElectronAppAPI;
  }
}
