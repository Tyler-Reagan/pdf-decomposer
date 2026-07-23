import { useState, useEffect, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { usePdfStore } from "./store/usePdfStore";
import { DropZone } from "./phases/DropZone";
import { PageSelector } from "./phases/PageSelector";
import { OutputConfig } from "./phases/OutputConfig";
import { Processing, Complete, ErrorScreen } from "./phases/Processing";
import { TourOverlay } from "./components/Tour/TourOverlay";
import { useTour } from "./components/Tour/useTour";
import { PdfRenderProvider } from "./lib/PdfRenderProvider";
import {
  TITLE_BAR_HEIGHT,
  WIN_TITLE_BAR_CONTROLS_WIDTH,
} from "../../shared/window-chrome";
import {
  Home,
  Minus,
  Plus,
  AlertCircle,
  Sun,
  Moon,
  Download,
} from "lucide-react";

const RELEASES_URL =
  "https://github.com/Tyler-Reagan/pdf-decomposer/releases/latest";

function useTheme() {
  const [theme, setTheme] = useState<"dark" | "light">(() => {
    return (localStorage.getItem("theme") as "dark" | "light") ?? "dark";
  });

  useEffect(() => {
    document.documentElement.dataset.theme = theme === "light" ? "light" : "";
    localStorage.setItem("theme", theme);
  }, [theme]);

  return {
    theme,
    toggleTheme: () => setTheme((t) => (t === "dark" ? "light" : "dark")),
  };
}

const ZOOM_STEPS = [0.75, 0.85, 1.0, 1.15, 1.3, 1.5];
const ZOOM_DEFAULT = 1.0;

function useZoom() {
  const [zoom, setZoom] = useState<number>(() => {
    const saved = parseFloat(localStorage.getItem("zoom") ?? "");
    return ZOOM_STEPS.includes(saved) ? saved : ZOOM_DEFAULT;
  });

  useEffect(() => {
    (
      document.documentElement.style as CSSStyleDeclaration & { zoom: string }
    ).zoom = String(zoom);
    localStorage.setItem("zoom", String(zoom));
  }, [zoom]);

  const zoomIn = () =>
    setZoom(
      (z) =>
        ZOOM_STEPS[Math.min(ZOOM_STEPS.indexOf(z) + 1, ZOOM_STEPS.length - 1)],
    );
  const zoomOut = () =>
    setZoom((z) => ZOOM_STEPS[Math.max(ZOOM_STEPS.indexOf(z) - 1, 0)]);
  const zoomReset = () => setZoom(ZOOM_DEFAULT);

  return {
    zoom,
    zoomIn,
    zoomOut,
    zoomReset,
    canZoomIn: zoom < ZOOM_STEPS[ZOOM_STEPS.length - 1],
    canZoomOut: zoom > ZOOM_STEPS[0],
    isDefault: zoom === ZOOM_DEFAULT,
  };
}

function useAppVersion() {
  const [version, setVersion] = useState<string | null>(null);

  useEffect(() => {
    window.electronAPI.getAppVersion().then(setVersion);
  }, []);

  return version;
}

export function App() {
  const phase = usePdfStore((s) => s.phase);
  const groups = usePdfStore((s) => s.groups);
  const reset = usePdfStore((s) => s.reset);
  const filePath = usePdfStore((s) => s.loadedPdf?.filePath ?? "");
  const reloadToken = usePdfStore((s) => s.reloadToken);
  const { tourActive, resume, stepIndex, totalSteps } = useTour();
  const { theme, toggleTheme } = useTheme();
  const appVersion = useAppVersion();
  const { zoom, zoomIn, zoomOut, zoomReset, canZoomIn, canZoomOut, isDefault } =
    useZoom();

  const showTourButton = !tourActive && phase !== "drop";
  const showHomeButton = phase !== "drop" && phase !== "processing";

  const handleHome = useCallback(() => {
    const hasWork = groups.some((g) => g.pageIndices.length > 0);
    if (
      hasWork &&
      !window.confirm(
        "Load a different file? Your current groups will be lost.",
      )
    )
      return;
    reset();
  }, [groups, reset]);

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-surf-2 text-ink-1 ring-1 ring-bdr/40">
      {/* Draggable title bar */}
      <div
        className="flex-shrink-0 w-full grid grid-cols-[1fr_auto_1fr] items-center pr-2"
        style={
          {
            height: TITLE_BAR_HEIGHT,
            WebkitAppRegion: "drag",
            paddingRight:
              window.electron?.process?.platform === "win32"
                ? WIN_TITLE_BAR_CONTROLS_WIDTH
                : undefined,
          } as React.CSSProperties
        }
      >
        {/* Left: home / load different file */}
        <div className="flex items-center pl-20 justify-self-start">
          <AnimatePresence>
            {showHomeButton && (
              <motion.button
                key="home-btn"
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -6 }}
                transition={{ duration: 0.15 }}
                onClick={handleHome}
                title="Load a different file"
                style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}
                className="h-8 flex items-center gap-1.5 px-2.5 rounded-md text-ink-4 hover:text-ink-1 hover:bg-surf-1 border border-transparent hover:border-bdr transition-all duration-150 cursor-pointer text-xs font-medium"
              >
                <Home size={14} strokeWidth={2} />
                <span>Home</span>
              </motion.button>
            )}
          </AnimatePresence>
        </div>

        {/* Center: zoom controls */}
        <div
          className="flex items-center gap-0.5 justify-self-center"
          style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}
        >
          <button
            onClick={zoomOut}
            disabled={!canZoomOut}
            title="Zoom out"
            className="w-8 h-8 flex items-center justify-center rounded text-ink-4 hover:text-ink-1 hover:bg-surf-1 disabled:opacity-30 disabled:cursor-not-allowed transition-colors duration-150 cursor-pointer"
          >
            <Minus size={13} strokeWidth={2.5} />
          </button>
          <button
            onClick={isDefault ? undefined : zoomReset}
            title={
              isDefault ? `Zoom: ${Math.round(zoom * 100)}%` : "Reset zoom"
            }
            className={`h-8 px-2 rounded text-xs font-mono tabular-nums transition-colors duration-150 ${isDefault ? "text-ink-4 cursor-default" : "text-ink-2 hover:bg-surf-1 cursor-pointer"}`}
          >
            {Math.round(zoom * 100)}%
          </button>
          <button
            onClick={zoomIn}
            disabled={!canZoomIn}
            title="Zoom in"
            className="w-8 h-8 flex items-center justify-center rounded text-ink-4 hover:text-ink-1 hover:bg-surf-1 disabled:opacity-30 disabled:cursor-not-allowed transition-colors duration-150 cursor-pointer"
          >
            <Plus size={13} strokeWidth={2.5} />
          </button>
        </div>

        {/* Right: check for updates + theme toggle + tour button */}
        <div className="flex items-center gap-1 justify-self-end">
          {/* Version + check for updates */}
          {appVersion && (
            <span className="text-ink-4 text-xs font-mono tabular-nums px-1">
              v{appVersion}
            </span>
          )}
          <button
            onClick={() => window.open(RELEASES_URL)}
            style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}
            className="h-8 flex items-center gap-1.5 px-2.5 rounded-md text-ink-3 hover:text-ink-1 hover:bg-surf-1 border border-transparent hover:border-bdr transition-all duration-150 cursor-pointer text-xs font-medium"
            title="Check for updates on GitHub"
          >
            <Download size={16} strokeWidth={2} />
            <span>Check for Updates</span>
          </button>

          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}
            className="h-8 flex items-center gap-1.5 px-2.5 rounded-md text-ink-3 hover:text-ink-1 hover:bg-surf-1 border border-transparent hover:border-bdr transition-all duration-150 cursor-pointer text-xs font-medium"
            title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
          >
            {theme === "dark" ? (
              <Sun size={16} strokeWidth={2} />
            ) : (
              <Moon size={16} strokeWidth={2} />
            )}
            <span>{theme === "dark" ? "Light" : "Dark"}</span>
          </button>

          {/* Tour resume button */}
          <AnimatePresence>
            {showTourButton && (
              <motion.button
                key="tour-resume"
                initial={{ opacity: 0, scale: 0.85 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.85 }}
                transition={{ duration: 0.18 }}
                onClick={resume}
                title={`Resume tour (step ${stepIndex + 1}/${totalSteps})`}
                style={
                  {
                    WebkitAppRegion: "no-drag",
                    boxShadow:
                      "0 0 0 2px color-mix(in oklch, var(--acc) 40%, transparent)",
                  } as React.CSSProperties
                }
                className="h-8 flex items-center gap-1.5 px-2.5 rounded-md bg-acc/10 border border-acc/40 text-acc hover:bg-acc/20 hover:border-acc/70 transition-all duration-150 cursor-pointer text-xs font-medium"
              >
                <AlertCircle size={14} strokeWidth={2.5} />
                <span>Tour</span>
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      </div>

      <PdfRenderProvider filePath={filePath} reloadToken={reloadToken}>
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
      </PdfRenderProvider>
      <TourOverlay />
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
