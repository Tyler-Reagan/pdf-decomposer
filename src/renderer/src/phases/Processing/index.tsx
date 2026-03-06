import { motion, AnimatePresence } from 'framer-motion'
import { usePdfStore } from '../../store/usePdfStore'
import { ProgressBar } from '../../components/ProgressBar'
import { Button } from '../../components/Button'

export function Processing() {
  const { processingProgress, processingCurrent, processingTotal } = usePdfStore()

  return (
    <div className="flex flex-col items-center justify-center h-full bg-slate-900 px-8">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        className="w-full max-w-md text-center"
      >
        {/* Spinner */}
        <div className="flex justify-center mb-8">
          <motion.div
            className="w-16 h-16 border-4 border-slate-700 border-t-indigo-500 rounded-full"
            animate={{ rotate: 360 }}
            transition={{ duration: 0.9, repeat: Infinity, ease: 'linear' }}
          />
        </div>

        <h2 className="text-white text-2xl font-semibold mb-2">Splitting PDF…</h2>
        <p className="text-slate-500 mb-8">
          Writing file {processingCurrent + 1} of {processingTotal}
        </p>

        <ProgressBar value={processingProgress} className="w-full" />
        <div className="mt-2 text-slate-500 text-sm text-right">
          {Math.round(processingProgress * 100)}%
        </div>
      </motion.div>
    </div>
  )
}

export function Complete() {
  const { outputFilePaths, reset, saveDirectory } = usePdfStore()

  const handleOpenFolder = async () => {
    if (saveDirectory) {
      await window.electronAPI.openPath(saveDirectory)
    } else if (outputFilePaths.length > 0) {
      // Open parent directory of first file
      const dir = outputFilePaths[0].replace(/\\/g, '/').split('/').slice(0, -1).join('/')
      await window.electronAPI.openPath(dir)
    }
  }

  return (
    <div className="flex flex-col items-center justify-center h-full bg-slate-900 px-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-lg text-center"
      >
        {/* Animated checkmark */}
        <CheckmarkCircle />

        <h2 className="text-white text-3xl font-bold mb-3">Done!</h2>
        <p className="text-slate-400 text-lg mb-8">
          {outputFilePaths.length} file{outputFilePaths.length !== 1 ? 's' : ''} created successfully
        </p>

        {/* File list */}
        <div className="text-left space-y-2 mb-8">
          {outputFilePaths.map((fp) => {
            const name = fp.replace(/\\/g, '/').split('/').pop() ?? fp
            return (
              <motion.div
                key={fp}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-center gap-3 bg-slate-800/60 border border-slate-700/50 rounded-lg px-4 py-3"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                </svg>
                <span className="text-white text-sm font-mono flex-1 truncate">{name}</span>
              </motion.div>
            )
          })}
        </div>

        <div className="flex items-center justify-center gap-4">
          <Button variant="secondary" onClick={reset}>
            Split Another PDF
          </Button>
          <Button variant="primary" onClick={handleOpenFolder}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
            </svg>
            Open Folder
          </Button>
        </div>
      </motion.div>
    </div>
  )
}

export function ErrorScreen() {
  const { errorMessage, reset, setPhase, loadedPdf, groups } = usePdfStore()

  // Determine the most useful "Try Again" destination based on what state exists.
  // If no PDF is loaded yet the error was during file loading — go back to drop zone.
  // If a PDF is loaded but no groups, go back to page selection.
  // Otherwise go back to output config to retry the split.
  const retryPhase = !loadedPdf
    ? 'drop'
    : groups.some((g) => g.pageIndices.length > 0)
    ? 'configuring'
    : 'selecting'

  const retryLabel = retryPhase === 'drop'
    ? 'Try Another File'
    : retryPhase === 'selecting'
    ? 'Back to Pages'
    : 'Try Again'

  return (
    <div className="flex flex-col items-center justify-center h-full bg-slate-900 px-8">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md text-center"
      >
        <div className="w-20 h-20 rounded-full bg-red-500/20 border border-red-500/40 flex items-center justify-center mx-auto mb-6">
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </div>
        <h2 className="text-white text-2xl font-semibold mb-3">Something went wrong</h2>
        <p className="text-slate-400 mb-8 text-sm font-mono bg-slate-800 rounded-lg px-4 py-3 text-left break-all">
          {errorMessage}
        </p>
        <div className="flex items-center justify-center gap-4">
          <Button variant="secondary" onClick={reset}>Start Over</Button>
          <Button variant="primary" onClick={() => setPhase(retryPhase)}>{retryLabel}</Button>
        </div>
      </motion.div>
    </div>
  )
}

function CheckmarkCircle() {
  return (
    <div className="flex justify-center mb-6">
      <motion.div
        className="w-24 h-24 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.1 }}
      >
        <motion.svg
          width="48"
          height="48"
          viewBox="0 0 48 48"
          fill="none"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
        >
          <motion.path
            d="M10 24L20 34L38 14"
            stroke="#10b981"
            strokeWidth="4"
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 1 }}
            transition={{ duration: 0.5, ease: 'easeOut', delay: 0.3 }}
          />
        </motion.svg>
      </motion.div>
    </div>
  )
}
