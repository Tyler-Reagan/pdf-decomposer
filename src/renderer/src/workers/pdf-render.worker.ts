/// <reference lib="webworker" />

import * as pdfjs from 'pdfjs-dist'
import pdfjsWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'

pdfjs.GlobalWorkerOptions.workerSrc = pdfjsWorkerUrl

// If a single page render takes longer than this, cancel and move on.
const RENDER_TIMEOUT_MS = 15_000

type RenderType = 'thumb' | 'preview'

type InMessage =
  | { type: 'INIT'; pdfData: ArrayBuffer }
  | {
      type: 'RENDER_PAGE'
      pageIndex: number
      renderType: RenderType
      // Fit-to-box mode (thumbnails)
      targetWidth?: number
      targetHeight?: number
      // Fixed-scale mode (preview) — overrides targetWidth/targetHeight
      fixedScale?: number
    }

type OutMessage =
  | { type: 'READY'; pageCount: number }
  | { type: 'PAGE_RENDERED'; pageIndex: number; bitmap: ImageBitmap; renderType: RenderType }
  | { type: 'PAGE_ERROR'; pageIndex: number; renderType: RenderType; error: string }
  | { type: 'ERROR'; error: string }

let pdfDoc: pdfjs.PDFDocumentProxy | null = null

interface QueueItem {
  pageIndex: number
  renderType: RenderType
  targetWidth?: number
  targetHeight?: number
  fixedScale?: number
}

// Preview renders go in a separate queue and are drained first
let previewQueue: QueueItem[] = []
let thumbQueue: QueueItem[] = []
let isRendering = false

async function processQueue(): Promise<void> {
  if (isRendering || !pdfDoc) return
  const item = previewQueue.shift() ?? thumbQueue.shift()
  if (!item) return

  isRendering = true

  try {
    const page = await pdfDoc.getPage(item.pageIndex + 1)
    const naturalVp = page.getViewport({ scale: 1 })

    let scale: number
    if (item.fixedScale != null) {
      scale = item.fixedScale
    } else {
      const tw = item.targetWidth ?? 120
      const th = item.targetHeight ?? 160
      scale = Math.min(tw / naturalVp.width, th / naturalVp.height)
    }

    const viewport = page.getViewport({ scale })
    const canvas = new OffscreenCanvas(Math.round(viewport.width), Math.round(viewport.height))
    const ctx = canvas.getContext('2d')!

    const renderTask = page.render({
      canvasContext: ctx as unknown as CanvasRenderingContext2D,
      viewport
    })

    // Race the render against a timeout — prevents one bad page from freezing the queue
    let timeoutId: ReturnType<typeof setTimeout>
    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutId = setTimeout(() => {
        renderTask.cancel()
        reject(new Error(`Render timed out after ${RENDER_TIMEOUT_MS}ms`))
      }, RENDER_TIMEOUT_MS)
    })

    try {
      await Promise.race([renderTask.promise, timeoutPromise])
      clearTimeout(timeoutId!)
    } catch (renderErr) {
      clearTimeout(timeoutId!)
      throw renderErr
    }

    const bitmap = canvas.transferToImageBitmap()
    page.cleanup()

    self.postMessage(
      { type: 'PAGE_RENDERED', pageIndex: item.pageIndex, bitmap, renderType: item.renderType } as OutMessage,
      [bitmap]
    )
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    // Don't emit noisy errors for expected cancellations from RenderingCancelledException
    if (!message.includes('Rendering cancelled')) {
      console.warn(`[pdf-worker] page ${item.pageIndex + 1} failed:`, message)
    }
    self.postMessage({
      type: 'PAGE_ERROR',
      pageIndex: item.pageIndex,
      renderType: item.renderType,
      error: message
    } as OutMessage)
  }

  isRendering = false
  // Continue queue without awaiting — starts next item in a new async tick
  setTimeout(processQueue, 0)
}

self.onmessage = async (e: MessageEvent<InMessage>) => {
  const msg = e.data

  if (msg.type === 'INIT') {
    try {
      pdfDoc = await pdfjs.getDocument({ data: new Uint8Array(msg.pdfData) }).promise
      self.postMessage({ type: 'READY', pageCount: pdfDoc.numPages } as OutMessage)
    } catch (err) {
      self.postMessage({
        type: 'ERROR',
        error: `Failed to load PDF: ${err instanceof Error ? err.message : String(err)}`
      } as OutMessage)
    }
    return
  }

  if (msg.type === 'RENDER_PAGE') {
    const queue = msg.renderType === 'preview' ? previewQueue : thumbQueue
    const alreadyQueued = queue.some(
      (r) => r.pageIndex === msg.pageIndex && r.renderType === msg.renderType
    )
    if (!alreadyQueued) {
      queue.push({
        pageIndex: msg.pageIndex,
        renderType: msg.renderType,
        targetWidth: msg.targetWidth,
        targetHeight: msg.targetHeight,
        fixedScale: msg.fixedScale
      })
    }
    processQueue()
  }
}
