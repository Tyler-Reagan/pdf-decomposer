import { useEffect, useRef, useCallback, useState } from 'react'

type WorkerOutMessage =
  | { type: 'READY'; pageCount: number }
  | { type: 'PAGE_RENDERED'; pageIndex: number; bitmap: ImageBitmap; naturalWidth: number; naturalHeight: number }
  | { type: 'ERROR'; error: string }

interface UsePdfWorkerOptions {
  onReady?: (pageCount: number) => void
  onPageRendered?: (pageIndex: number, bitmap: ImageBitmap) => void
  onError?: (error: string) => void
}

export function usePdfWorker({ onReady, onPageRendered, onError }: UsePdfWorkerOptions) {
  const workerRef = useRef<Worker | null>(null)
  const [workerReady, setWorkerReady] = useState(false)
  const callbacksRef = useRef({ onReady, onPageRendered, onError })

  useEffect(() => {
    callbacksRef.current = { onReady, onPageRendered, onError }
  }, [onReady, onPageRendered, onError])

  useEffect(() => {
    const worker = new Worker(
      new URL('../../workers/pdf-render.worker.ts', import.meta.url),
      { type: 'module' }
    )

    worker.onmessage = (e: MessageEvent<WorkerOutMessage>) => {
      const msg = e.data
      if (msg.type === 'READY') {
        setWorkerReady(true)
        callbacksRef.current.onReady?.(msg.pageCount)
      } else if (msg.type === 'PAGE_RENDERED') {
        callbacksRef.current.onPageRendered?.(msg.pageIndex, msg.bitmap)
      } else if (msg.type === 'ERROR') {
        console.error('[pdf-worker]', msg.error)
        callbacksRef.current.onError?.(msg.error)
      }
    }

    worker.onerror = (e) => {
      console.error('[pdf-worker] onerror', e.message, e)
      callbacksRef.current.onError?.(e.message)
    }

    workerRef.current = worker
    return () => {
      worker.terminate()
      workerRef.current = null
      setWorkerReady(false)
    }
  }, [])

  const initWorker = useCallback((pdfData: ArrayBuffer) => {
    workerRef.current?.postMessage({ type: 'INIT', pdfData }, [pdfData])
  }, [])

  const renderPage = useCallback((pageIndex: number, targetWidth: number, targetHeight: number) => {
    workerRef.current?.postMessage({ type: 'RENDER_PAGE', pageIndex, targetWidth, targetHeight })
  }, [])

  return { workerReady, initWorker, renderPage }
}
