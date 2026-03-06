import { PDFDocument } from 'pdf-lib'
import * as fs from 'fs'
import { BrowserWindow } from 'electron'

export interface SplitGroup {
  groupId: string
  outputPath: string
  pageIndices: number[] // 0-based
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

export async function splitPdf(params: SplitPdfParams): Promise<SplitPdfResult> {
  const { sourcePath, groups } = params

  try {
    const sourceBytes = fs.readFileSync(sourcePath)
    const sourcePdf = await PDFDocument.load(sourceBytes)
    const totalGroups = groups.length
    const outputPaths: string[] = []

    for (let i = 0; i < totalGroups; i++) {
      const group = groups[i]

      // Send progress event
      const win = BrowserWindow.getAllWindows()[0]
      if (win) {
        win.webContents.send('split-progress', {
          current: i,
          total: totalGroups,
          groupId: group.groupId,
          outputPath: group.outputPath
        })
      }

      const outPdf = await PDFDocument.create()
      const pages = await outPdf.copyPages(sourcePdf, group.pageIndices)
      pages.forEach((p: import('pdf-lib').PDFPage) => outPdf.addPage(p))

      const outBytes = await outPdf.save()
      fs.writeFileSync(group.outputPath, outBytes)
      outputPaths.push(group.outputPath)
    }

    // Send completion
    const win = BrowserWindow.getAllWindows()[0]
    if (win) {
      win.webContents.send('split-progress', {
        current: totalGroups,
        total: totalGroups,
        done: true
      })
    }

    return { success: true, outputPaths }
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err)
    return { success: false, outputPaths: [], error }
  }
}
