import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { promises as fs } from "fs";
import * as os from "os";
import * as path from "path";
import { PDFDocument } from "pdf-lib";
import { savePdf } from "./save-pdf";

let dir: string;
let sourcePath: string;

async function makeSourcePdf(pageCount: number): Promise<void> {
  const pdf = await PDFDocument.create();
  for (let i = 0; i < pageCount; i++) pdf.addPage([100, 100]);
  const bytes = await pdf.save();
  await fs.writeFile(sourcePath, bytes);
}

beforeEach(async () => {
  dir = await fs.mkdtemp(path.join(os.tmpdir(), "save-pdf-test-"));
  sourcePath = path.join(dir, "source.pdf");
});

afterEach(async () => {
  await fs.rm(dir, { recursive: true, force: true });
});

describe("savePdf", () => {
  it("writes only the specified pages, in order, back to sourcePath", async () => {
    await makeSourcePdf(3);

    const result = await savePdf({
      sourcePath,
      pages: [
        { originalIndex: 2, rotationDelta: 0 },
        { originalIndex: 0, rotationDelta: 0 },
      ],
    });

    expect(result).toEqual({ success: true });
    const saved = await PDFDocument.load(await fs.readFile(sourcePath));
    expect(saved.getPageCount()).toBe(2);
  });

  it("adds rotationDelta on top of the page's existing rotation", async () => {
    await makeSourcePdf(1);

    await savePdf({
      sourcePath,
      pages: [{ originalIndex: 0, rotationDelta: 90 }],
    });

    const saved = await PDFDocument.load(await fs.readFile(sourcePath));
    expect(saved.getPage(0).getRotation().angle).toBe(90);
  });

  it("leaves no temp file behind on success", async () => {
    await makeSourcePdf(1);
    await savePdf({
      sourcePath,
      pages: [{ originalIndex: 0, rotationDelta: 0 }],
    });

    const entries = await fs.readdir(dir);
    expect(entries).toEqual(["source.pdf"]);
  });

  it("returns a failure result and cleans up the temp file when the source can't be read", async () => {
    const result = await savePdf({
      sourcePath: path.join(dir, "does-not-exist.pdf"),
      pages: [],
    });

    expect(result.success).toBe(false);
    expect(result.error).toBeTruthy();
    const entries = await fs.readdir(dir);
    expect(entries).toEqual([]);
  });

  it("rejects a sourcePath that isn't a .pdf file", async () => {
    const result = await savePdf({
      sourcePath: path.join(dir, "source.txt"),
      pages: [],
    });

    expect(result).toEqual({
      success: false,
      error: "source path must be a .pdf file",
    });
  });
});
