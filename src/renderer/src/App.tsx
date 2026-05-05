import { AnimatePresence, motion } from "framer-motion";
import { usePdfStore } from "./store/usePdfStore";
import { DropZone } from "./phases/DropZone";
import { PageSelector } from "./phases/PageSelector";
import { OutputConfig } from "./phases/OutputConfig";
import { Processing, Complete, ErrorScreen } from "./phases/Processing";
import { UpdateBanner } from "./components/UpdateBanner";
import { TourOverlay } from "./components/Tour/TourOverlay";
import { useTour } from "./components/Tour/useTour";

export function App() {
  const phase = usePdfStore((s) => s.phase);
  const { tourActive, resume, stepIndex, totalSteps } = useTour();

  const showResumeButton = !tourActive && phase !== "drop";

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-slate-900 text-white ring-1 ring-white/[0.06]">
      {/* Draggable title bar — must match titleBarOverlay height in main/index.ts */}
      <div
        className="flex-shrink-0 w-full"
        style={{ height: 38, WebkitAppRegion: "drag" } as React.CSSProperties}
      />
      <UpdateBanner />
      {/* Phase content fills remaining space */}
      <div className="flex-1 relative overflow-hidden">
        <AnimatePresence mode="wait">
          {phase === "drop" && (
            <PhaseWrapper key="drop">
              <DropZone />
            </PhaseWrapper>
          )}
          {phase === "selecting" && (
            <PhaseWrapper key="selecting">
              <PageSelector />
            </PhaseWrapper>
          )}
          {phase === "configuring" && (
            <PhaseWrapper key="configuring">
              <OutputConfig />
            </PhaseWrapper>
          )}
          {phase === "processing" && (
            <PhaseWrapper key="processing">
              <Processing />
            </PhaseWrapper>
          )}
          {phase === "complete" && (
            <PhaseWrapper key="complete">
              <Complete />
            </PhaseWrapper>
          )}
          {phase === "error" && (
            <PhaseWrapper key="error">
              <ErrorScreen />
            </PhaseWrapper>
          )}
        </AnimatePresence>
      </div>
      <TourOverlay />

      {/* Floating tour resume button — visible when tour is dismissed mid-flow */}
      <AnimatePresence>
        {showResumeButton && (
          <motion.button
            key="tour-resume"
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.85 }}
            transition={{ duration: 0.18 }}
            onClick={resume}
            title={`Resume tour (step ${stepIndex + 1}/${totalSteps})`}
            className="fixed bottom-4 right-4 z-[8999] w-9 h-9 rounded-full bg-slate-800 border border-slate-700 hover:bg-slate-700 hover:border-indigo-500/60 text-slate-400 hover:text-indigo-300 flex items-center justify-center transition-colors duration-150 cursor-pointer shadow-lg"
            style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="12" cy="12" r="10" />
              <path d="M12 8v4" />
              <path d="M12 16h.01" />
            </svg>
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}

function PhaseWrapper({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      className="h-full w-full absolute inset-0 overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
    >
      {children}
    </motion.div>
  );
}
