/// <reference lib="webworker" />

import * as pdfjs from 'pdfjs-dist'

// Configure pdfjs worker — in a worker context, we ARE the worker, so no workerSrc needed.
// pdfjs itself runs here.
pdfjs.GlobalWorkerOptions.workerSrc = ''

type InMessage =
  | { type: 'INIT'; pdfData: ArrayBuffer }
  | { type: 'RENDER_PAGE'; pageIndex: number; scale: number }

type OutMessage =
  | { type: 'READY'; pageCount: number }
  | { type: 'PAGE_RENDERED'; pageIndex: number; bitmap: ImageBitmap }
  | { type: 'ERROR'; error: string }

let pdfDoc: pdfjs.PDFDocumentProxy | null = null
let renderQueue: Array<{ pageIndex: number; scale: number }> = []
let isRendering = false

async function processQueue(): Promise<void> {
  if (isRendering || renderQueue.length === 0 || !pdfDoc) return
  isRendering = true

  const { pageIndex, scale } = renderQueue.shift()!
  try {
    const page = await pdfDoc.getPage(pageIndex + 1) // pdfjs is 1-based
    const viewport = page.getViewport({ scale })

    const canvas = new OffscreenCanvas(
      Math.round(viewport.width),
      Math.round(viewport.height)
    )
    const ctx = canvas.getContext('2d')!

    await page.render({
      canvasContext: ctx as unknown as CanvasRenderingContext2D,
      viewport
    }).promise

    const bitmap = canvas.transferToImageBitmap()
    page.cleanup()

    const msg: OutMessage = { type: 'PAGE_RENDERED', pageIndex, bitmap }
    self.postMessage(msg, [bitmap])
  } catch (err) {
    const msg: OutMessage = {
      type: 'ERROR',
      error: `Page ${pageIndex + 1}: ${err instanceof Error ? err.message : String(err)}`
    }
    self.postMessage(msg)
  }

  isRendering = false
  processQueue()
}

self.onmessage = async (e: MessageEvent<InMessage>) => {
  const msg = e.data

  if (msg.type === 'INIT') {
    try {
      // Use the ArrayBuffer directly
      pdfDoc = await pdfjs.getDocument({ data: new Uint8Array(msg.pdfData) }).promise
      const reply: OutMessage = { type: 'READY', pageCount: pdfDoc.numPages }
      self.postMessage(reply)
    } catch (err) {
      const reply: OutMessage = {
        type: 'ERROR',
        error: `Failed to load PDF: ${err instanceof Error ? err.message : String(err)}`
      }
      self.postMessage(reply)
    }
    return
  }

  if (msg.type === 'RENDER_PAGE') {
    // Deduplicate: if same pageIndex already queued, skip
    const alreadyQueued = renderQueue.some((r) => r.pageIndex === msg.pageIndex)
    if (!alreadyQueued) {
      renderQueue.push({ pageIndex: msg.pageIndex, scale: msg.scale })
    }
    processQueue()
    return
  }
}
