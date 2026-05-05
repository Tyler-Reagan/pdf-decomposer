import { useState, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { usePdfStore } from "./store/usePdfStore";
import { DropZone } from "./phases/DropZone";
import { PageSelector } from "./phases/PageSelector";
import { OutputConfig } from "./phases/OutputConfig";
import { Processing, Complete, ErrorScreen } from "./phases/Processing";
import { UpdateBanner } from "./components/UpdateBanner";
import { TourOverlay } from "./components/Tour/TourOverlay";
import { useTour } from "./components/Tour/useTour";

function useTheme() {
  const [theme, setTheme] = useState<"dark" | "light">(() => {
    return (localStorage.getItem("theme") as "dark" | "light") ?? "dark";
  });

  useEffect(() => {
    document.documentElement.dataset.theme = theme === "light" ? "light" : "";
    localStorage.setItem("theme", theme);
  }, [theme]);

  return { theme, toggleTheme: () => setTheme((t) => (t === "dark" ? "light" : "dark")) };
}

export function App() {
  const phase = usePdfStore((s) => s.phase);
  const { tourActive, resume, stepIndex, totalSteps } = useTour();
  const { theme, toggleTheme } = useTheme();

  const showResumeButton = !tourActive && phase !== "drop";

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-surf-2 text-ink-1 ring-1 ring-bdr/40">
      {/* Draggable title bar */}
      <div
        className="flex-shrink-0 w-full flex items-center justify-end pr-2"
        style={{ height: 38, WebkitAppRegion: "drag" } as React.CSSProperties}
      >
        <button
          onClick={toggleTheme}
          style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}
          className="w-7 h-7 flex items-center justify-center rounded text-ink-3 hover:text-ink-1 hover:bg-surf-1 transition-colors duration-150 cursor-pointer"
          title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
        >
          {theme === "dark" ? <SunIcon /> : <MoonIcon />}
        </button>
      </div>

      <UpdateBanner />

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
            className="fixed bottom-4 right-4 z-[8999] w-9 h-9 rounded-full bg-surf-1 border border-bdr-hi hover:bg-ctrl hover:border-acc/60 text-ink-3 hover:text-acc flex items-center justify-center transition-colors duration-150 cursor-pointer shadow-lg"
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

function SunIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="5" />
      <line x1="12" y1="1" x2="12" y2="3" />
      <line x1="12" y1="21" x2="12" y2="23" />
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
      <line x1="1" y1="12" x2="3" y2="12" />
      <line x1="21" y1="12" x2="23" y2="12" />
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}
