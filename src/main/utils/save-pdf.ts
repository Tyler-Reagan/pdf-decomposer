import { PDFDocument, degrees } from "pdf-lib";
import { promises as fs } from "fs";
import * as path from "path";
import type { SavePdfParams, SavePdfResult } from "../../shared/types";

function assertSafePdfPath(filePath: string, label: string): void {
  if (filePath.includes("\0")) throw new Error(`Invalid ${label}`);
  if (path.extname(filePath).toLowerCase() !== ".pdf") {
    throw new Error(`${label} must be a .pdf file`);
  }
}

function isFileBusyError(err: unknown): boolean {
  const code = (err as NodeJS.ErrnoException)?.code;
  return code === "EBUSY" || code === "EPERM" || code === "EACCES";
}

export async function savePdf(params: SavePdfParams): Promise<SavePdfResult> {
  const { sourcePath, pages } = params;
  let tempPath: string | undefined;

  try {
    assertSafePdfPath(sourcePath, "source path");

    const sourceBytes = await fs.readFile(sourcePath);
    const sourcePdf = await PDFDocument.load(sourceBytes);

    const outPdf = await PDFDocument.create();
    const copied = await outPdf.copyPages(
      sourcePdf,
      pages.map((p) => p.originalIndex),
    );
    copied.forEach((page, i) => {
      const spec = pages[i];
      const current = page.getRotation().angle;
      page.setRotation(degrees((current + spec.rotationDelta) % 360));
      outPdf.addPage(page);
    });

    const outBytes = await outPdf.save();

    const dir = path.dirname(sourcePath);
    const random = Math.random().toString(36).slice(2);
    tempPath = path.join(dir, `${path.basename(sourcePath)}.tmp-${random}`);
    await fs.writeFile(tempPath, outBytes);
    await fs.rename(tempPath, sourcePath);
    tempPath = undefined;

    return { success: true };
  } catch (err) {
    if (tempPath) {
      await fs.unlink(tempPath).catch(() => {});
    }
    if (isFileBusyError(err)) {
      return {
        success: false,
        error:
          "Couldn't save — the file may be open in another program. Close it and try again.",
      };
    }
    const error = err instanceof Error ? err.message : String(err);
    return { success: false, error };
  }
}
