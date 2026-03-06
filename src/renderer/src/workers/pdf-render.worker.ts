/// <reference lib="webworker" />

import * as pdfjs from 'pdfjs-dist'
import pdfjsWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'

pdfjs.GlobalWorkerOptions.workerSrc = pdfjsWorkerUrl

type RenderType = 'thumb' | 'preview'

type InMessage =
  | { type: 'INIT'; pdfData: ArrayBuffer }
  | { type: 'RENDER_PAGE'; pageIndex: number; targetWidth: number; targetHeight: number; renderType: RenderType }

type OutMessage =
  | { type: 'READY'; pageCount: number }
  | { type: 'PAGE_RENDERED'; pageIndex: number; bitmap: ImageBitmap; renderType: RenderType }
  | { type: 'ERROR'; error: string }

let pdfDoc: pdfjs.PDFDocumentProxy | null = null

// Two queues: preview renders are prioritised over thumbnails
let thumbQueue: Array<{ pageIndex: number; targetWidth: number; targetHeight: number; renderType: RenderType }> = []
let previewQueue: Array<{ pageIndex: number; targetWidth: number; targetHeight: number; renderType: RenderType }> = []
let isRendering = false

async function processQueue(): Promise<void> {
  if (isRendering || !pdfDoc) return
  const item = previewQueue.shift() ?? thumbQueue.shift()
  if (!item) return

  isRendering = true
  try {
    const page = await pdfDoc.getPage(item.pageIndex + 1)
    const naturalVp = page.getViewport({ scale: 1 })

    const scale = Math.min(item.targetWidth / naturalVp.width, item.targetHeight / naturalVp.height)
    const viewport = page.getViewport({ scale })

    const canvas = new OffscreenCanvas(Math.round(viewport.width), Math.round(viewport.height))
    const ctx = canvas.getContext('2d')!

    await page.render({ canvasContext: ctx as unknown as CanvasRenderingContext2D, viewport }).promise
    const bitmap = canvas.transferToImageBitmap()
    page.cleanup()

    const msg: OutMessage = { type: 'PAGE_RENDERED', pageIndex: item.pageIndex, bitmap, renderType: item.renderType }
    self.postMessage(msg, [bitmap])
  } catch (err) {
    self.postMessage({ type: 'ERROR', error: `Page ${item.pageIndex + 1}: ${err instanceof Error ? err.message : String(err)}` } as OutMessage)
  }

  isRendering = false
  processQueue()
}

self.onmessage = async (e: MessageEvent<InMessage>) => {
  const msg = e.data

  if (msg.type === 'INIT') {
    try {
      pdfDoc = await pdfjs.getDocument({ data: new Uint8Array(msg.pdfData) }).promise
      self.postMessage({ type: 'READY', pageCount: pdfDoc.numPages } as OutMessage)
    } catch (err) {
      self.postMessage({ type: 'ERROR', error: `Failed to load PDF: ${err instanceof Error ? err.message : String(err)}` } as OutMessage)
    }
    return
  }

  if (msg.type === 'RENDER_PAGE') {
    const queue = msg.renderType === 'preview' ? previewQueue : thumbQueue
    const alreadyQueued = queue.some((r) => r.pageIndex === msg.pageIndex && r.renderType === msg.renderType)
    if (!alreadyQueued) {
      queue.push({ pageIndex: msg.pageIndex, targetWidth: msg.targetWidth, targetHeight: msg.targetHeight, renderType: msg.renderType })
    }
    processQueue()
  }
}
