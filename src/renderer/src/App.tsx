import { AnimatePresence, motion } from 'framer-motion'
import { usePdfStore } from './store/usePdfStore'
import { DropZone } from './phases/DropZone'
import { PageSelector } from './phases/PageSelector'
import { OutputConfig } from './phases/OutputConfig'
import { Processing, Complete, ErrorScreen } from './phases/Processing'

export function App() {
  const phase = usePdfStore((s) => s.phase)

  return (
    <div className="h-screen overflow-hidden bg-slate-900 text-white">
      <AnimatePresence mode="wait">
        {phase === 'drop' && (
          <PhaseWrapper key="drop">
            <DropZone />
          </PhaseWrapper>
        )}
        {phase === 'selecting' && (
          <PhaseWrapper key="selecting">
            <PageSelector />
          </PhaseWrapper>
        )}
        {phase === 'configuring' && (
          <PhaseWrapper key="configuring">
            <OutputConfig />
          </PhaseWrapper>
        )}
        {phase === 'processing' && (
          <PhaseWrapper key="processing">
            <Processing />
          </PhaseWrapper>
        )}
        {phase === 'complete' && (
          <PhaseWrapper key="complete">
            <Complete />
          </PhaseWrapper>
        )}
        {phase === 'error' && (
          <PhaseWrapper key="error">
            <ErrorScreen />
          </PhaseWrapper>
        )}
      </AnimatePresence>
    </div>
  )
}

function PhaseWrapper({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      className="h-full w-full absolute inset-0"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
    >
      {children}
    </motion.div>
  )
}
