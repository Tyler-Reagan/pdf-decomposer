import { ipcMain, dialog, app } from 'electron'
import * as fs from 'fs'
import * as path from 'path'
import { PDFDocument } from 'pdf-lib'
import { splitPdf, SplitPdfParams } from '../utils/pdf-splitter'

export function registerPdfHandlers(): void {
  // Open file dialog
  ipcMain.handle('open-pdf-dialog', async () => {
    const result = await dialog.showOpenDialog({
      title: 'Open PDF',
      filters: [{ name: 'PDF Files', extensions: ['pdf'] }],
      properties: ['openFile']
    })

    if (result.canceled || result.filePaths.length === 0) {
      return null
    }
    return result.filePaths[0]
  })

  // Get PDF info (page count, file size)
  ipcMain.handle('get-pdf-info', async (_event, filePath: string) => {
    try {
      const bytes = fs.readFileSync(filePath)
      const pdf = await PDFDocument.load(bytes, { ignoreEncryption: true })
      return {
        pageCount: pdf.getPageCount(),
        fileSizeBytes: bytes.length
      }
    } catch (err) {
      throw new Error(`Failed to read PDF: ${err instanceof Error ? err.message : String(err)}`)
    }
  })

  // Read raw PDF bytes (for renderer/worker)
  ipcMain.handle('read-pdf-file', async (_event, filePath: string) => {
    try {
      const bytes = fs.readFileSync(filePath)
      return bytes
    } catch (err) {
      throw new Error(`Failed to read file: ${err instanceof Error ? err.message : String(err)}`)
    }
  })

  // Store drag-dropped PDF bytes to a stable temp path and return it.
  // Needed because files dragged from browsers/email clients live in an OS
  // temp dir that gets deleted almost immediately after the drop event.
  ipcMain.handle('store-pdf-data', async (_event, data: Buffer, originalName: string) => {
    const dir = path.join(app.getPath('temp'), 'pdf-decomposer')
    fs.mkdirSync(dir, { recursive: true })
    const dest = path.join(dir, originalName)
    fs.writeFileSync(dest, data)
    return dest
  })

  // Split PDF
  ipcMain.handle('split-pdf', async (_event, params: SplitPdfParams) => {
    return splitPdf(params)
  })

  // Open path in Explorer/Finder
  ipcMain.handle('open-path', async (_event, pathToOpen: string) => {
    const { shell } = await import('electron')
    await shell.openPath(pathToOpen)
  })
}
