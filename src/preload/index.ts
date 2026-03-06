import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

export interface SplitGroup {
  groupId: string
  outputPath: string
  pageIndices: number[]
}

export interface SplitPdfParams {
  sourcePath: string
  groups: SplitGroup[]
}

export interface SplitPdfResult {
  success: boolean
  outputPaths: string[]
  error?: string
}

export interface SplitProgressEvent {
  current: number
  total: number
  groupId?: string
  outputPath?: string
  done?: boolean
}

const api = {
  openPdfDialog: (): Promise<string | null> => ipcRenderer.invoke('open-pdf-dialog'),

  getPdfInfo: (
    filePath: string
  ): Promise<{ pageCount: number; fileSizeBytes: number }> =>
    ipcRenderer.invoke('get-pdf-info', filePath),

  readPdfFile: (filePath: string): Promise<Buffer> =>
    ipcRenderer.invoke('read-pdf-file', filePath),

  chooseSaveDirectory: (defaultPath?: string): Promise<string | null> =>
    ipcRenderer.invoke('choose-save-directory', defaultPath),

  splitPdf: (params: SplitPdfParams): Promise<SplitPdfResult> =>
    ipcRenderer.invoke('split-pdf', params),

  openPath: (pathToOpen: string): Promise<void> =>
    ipcRenderer.invoke('open-path', pathToOpen),

  onSplitProgress: (
    callback: (event: SplitProgressEvent) => void
  ): (() => void) => {
    const handler = (_: Electron.IpcRendererEvent, data: SplitProgressEvent): void =>
      callback(data)
    ipcRenderer.on('split-progress', handler)
    return () => ipcRenderer.removeListener('split-progress', handler)
  }
}

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('electronAPI', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore
  window.electron = electronAPI
  // @ts-ignore
  window.electronAPI = api
}
