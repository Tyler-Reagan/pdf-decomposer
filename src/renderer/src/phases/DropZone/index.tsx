import { useCallback, useState } from 'react'
import { motion } from 'framer-motion'
import { usePdfStore } from '../../store/usePdfStore'
import { formatBytes } from '../../types/pdf'

export function DropZone() {
  const { setLoadedPdf, setPhase, setError } = usePdfStore()
  const [isDragging, setIsDragging] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const loadPdf = useCallback(
    async (filePath: string) => {
      setIsLoading(true)
      try {
        const info = await window.electronAPI.getPdfInfo(filePath)
        const fileName = filePath.replace(/\\/g, '/').split('/').pop() ?? filePath

        setLoadedPdf({
          filePath,
          fileName,
          totalPages: info.pageCount,
          fileSizeBytes: info.fileSizeBytes
        })
        setPhase('selecting')
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load PDF')
      } finally {
        setIsLoading(false)
      }
    },
    [setLoadedPdf, setPhase, setError]
  )

  const handleFileSelect = useCallback(async () => {
    const filePath = await window.electronAPI.openPdfDialog()
    if (filePath) await loadPdf(filePath)
  }, [loadPdf])

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragging(false)
      const file = e.dataTransfer.files[0]
      if (!file) return
      if (!file.name.toLowerCase().endsWith('.pdf')) {
        setError('Please drop a PDF file')
        return
      }
      // In Electron, dropped files have a path property
      const filePath = (file as File & { path?: string }).path ?? file.name
      await loadPdf(filePath)
    },
    [loadPdf, setError]
  )

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-900 px-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-2xl"
      >
        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold text-white mb-2 tracking-tight">PDF Decomposer</h1>
          <p className="text-slate-400 text-lg">Split any PDF into multiple files by page range</p>
        </div>

        {/* Drop area */}
        <motion.div
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={!isLoading ? handleFileSelect : undefined}
          animate={{
            borderColor: isDragging ? '#6366f1' : '#334155',
            backgroundColor: isDragging ? 'rgba(99,102,241,0.08)' : 'rgba(15,23,42,0.6)'
          }}
          className="border-2 border-dashed rounded-2xl p-16 flex flex-col items-center gap-5 cursor-pointer transition-all duration-200 select-none"
          style={{ borderColor: '#334155', backgroundColor: 'rgba(15,23,42,0.6)' }}
        >
          {isLoading ? (
            <LoadingSpinner />
          ) : (
            <>
              <UploadIcon dragging={isDragging} />
              <div className="text-center">
                <p className="text-white text-xl font-medium">
                  {isDragging ? 'Drop your PDF here' : 'Drop a PDF here'}
                </p>
                <p className="text-slate-500 mt-1">or click to browse files</p>
              </div>
              <div className="flex items-center gap-3 text-slate-600 text-sm mt-2">
                <span className="h-px w-12 bg-slate-700" />
                <span>PDF files only</span>
                <span className="h-px w-12 bg-slate-700" />
              </div>
            </>
          )}
        </motion.div>

        {/* Features */}
        <div className="grid grid-cols-3 gap-4 mt-10">
          {[
            { icon: '⚡', label: 'Fully offline', desc: 'No data leaves your machine' },
            { icon: '🎨', label: 'Visual selection', desc: 'See thumbnails of every page' },
            { icon: '✂️', label: 'Non-contiguous', desc: 'Mix any pages into each output' }
          ].map((f) => (
            <div key={f.label} className="bg-slate-800/50 rounded-xl p-4 text-center border border-slate-700/50">
              <div className="text-2xl mb-2">{f.icon}</div>
              <div className="text-white text-sm font-medium">{f.label}</div>
              <div className="text-slate-500 text-xs mt-1">{f.desc}</div>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  )
}

function UploadIcon({ dragging }: { dragging: boolean }) {
  return (
    <motion.div
      animate={{ scale: dragging ? 1.12 : 1, rotate: dragging ? -5 : 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      className="w-20 h-20 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center"
    >
      <svg
        width="40"
        height="40"
        viewBox="0 0 24 24"
        fill="none"
        stroke={dragging ? '#818cf8' : '#64748b'}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="12" y1="18" x2="12" y2="12" />
        <polyline points="9 15 12 12 15 15" />
      </svg>
    </motion.div>
  )
}

function LoadingSpinner() {
  return (
    <div className="flex flex-col items-center gap-4 py-4">
      <motion.div
        className="w-12 h-12 border-4 border-slate-700 border-t-indigo-500 rounded-full"
        animate={{ rotate: 360 }}
        transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
      />
      <p className="text-slate-400">Reading PDF…</p>
    </div>
  )
}
