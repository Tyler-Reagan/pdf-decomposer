import { PDFDocument } from "pdf-lib";
import { promises as fs } from "fs";
import * as path from "path";
import { BrowserWindow } from "electron";
import type { SplitPdfParams, SplitPdfResult } from "../../shared/types";

function assertSafePdfPath(filePath: string, label: string): void {
  if (filePath.includes("\0")) throw new Error(`Invalid ${label}`);
  if (path.extname(filePath).toLowerCase() !== ".pdf") {
    throw new Error(`${label} must be a .pdf file`);
  }
}

export async function splitPdf(
  params: SplitPdfParams,
): Promise<SplitPdfResult> {
  const { sourcePath, groups } = params;

  try {
    assertSafePdfPath(sourcePath, "source path");
    for (const g of groups) assertSafePdfPath(g.outputPath, "output path");

    const sourceBytes = await fs.readFile(sourcePath);
    const sourcePdf = await PDFDocument.load(sourceBytes);
    const totalGroups = groups.length;
    const outputPaths: string[] = [];

    for (let i = 0; i < totalGroups; i++) {
      const group = groups[i];

      // Send progress event
      const win = BrowserWindow.getAllWindows()[0];
      if (win) {
        win.webContents.send("split-progress", {
          current: i,
          total: totalGroups,
          groupId: group.groupId,
          outputPath: group.outputPath,
        });
      }

      const outPdf = await PDFDocument.create();
      const pages = await outPdf.copyPages(sourcePdf, group.pageIndices);
      pages.forEach((p: import("pdf-lib").PDFPage) => outPdf.addPage(p));

      const outBytes = await outPdf.save();
      await fs.writeFile(group.outputPath, outBytes);
      outputPaths.push(group.outputPath);
    }

    // Send completion
    const win = BrowserWindow.getAllWindows()[0];
    if (win) {
      win.webContents.send("split-progress", {
        current: totalGroups,
        total: totalGroups,
        done: true,
      });
    }

    return { success: true, outputPaths };
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    return { success: false, outputPaths: [], error };
  }
}
