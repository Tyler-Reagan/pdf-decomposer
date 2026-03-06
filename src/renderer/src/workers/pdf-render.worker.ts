/// <reference lib="webworker" />

import * as pdfjs from 'pdfjs-dist'
// Vite bundles this as a separate chunk and gives us its URL —
// pdfjs needs to spawn its own inner worker for parsing.
import pdfjsWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'

pdfjs.GlobalWorkerOptions.workerSrc = pdfjsWorkerUrl

type InMessage =
  | { type: 'INIT'; pdfData: ArrayBuffer }
  | { type: 'RENDER_PAGE'; pageIndex: number; targetWidth: number; targetHeight: number }

type OutMessage =
  | { type: 'READY'; pageCount: number }
  | { type: 'PAGE_RENDERED'; pageIndex: number; bitmap: ImageBitmap; naturalWidth: number; naturalHeight: number }
  | { type: 'ERROR'; error: string }

let pdfDoc: pdfjs.PDFDocumentProxy | null = null
let renderQueue: Array<{ pageIndex: number; targetWidth: number; targetHeight: number }> = []
let isRendering = false

async function processQueue(): Promise<void> {
  if (isRendering || renderQueue.length === 0 || !pdfDoc) return
  isRendering = true

  const item = renderQueue.shift()!
  try {
    const page = await pdfDoc.getPage(item.pageIndex + 1) // pdfjs is 1-based
    const naturalViewport = page.getViewport({ scale: 1 })

    // Fit within target dimensions while preserving aspect ratio
    const scaleX = item.targetWidth / naturalViewport.width
    const scaleY = item.targetHeight / naturalViewport.height
    const scale = Math.min(scaleX, scaleY)

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

    const msg: OutMessage = {
      type: 'PAGE_RENDERED',
      pageIndex: item.pageIndex,
      bitmap,
      naturalWidth: Math.round(viewport.width),
      naturalHeight: Math.round(viewport.height)
    }
    self.postMessage(msg, [bitmap])
  } catch (err) {
    const msg: OutMessage = {
      type: 'ERROR',
      error: `Page ${item.pageIndex + 1}: ${err instanceof Error ? err.message : String(err)}`
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
    const alreadyQueued = renderQueue.some((r) => r.pageIndex === msg.pageIndex)
    if (!alreadyQueued) {
      renderQueue.push({ pageIndex: msg.pageIndex, targetWidth: msg.targetWidth, targetHeight: msg.targetHeight })
    }
    processQueue()
    return
  }
}
