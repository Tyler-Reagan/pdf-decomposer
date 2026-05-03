import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { UpdateInfo, DownloadProgress } from "../../../preload/index";

type BannerState = "available" | "downloading" | "downloaded" | "error";

const RELEASES_URL =
  "https://github.com/Tyler-Reagan/pdf-decomposer/releases/latest";

export function UpdateBanner() {
  const [state, setState] = useState<BannerState | null>(null);
  const [version, setVersion] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [dismissed, setDismissed] = useState(false);

  // macOS requires manual install from signed DMG; open browser instead
  const isMac = window.electron.process.platform === "darwin";

  useEffect(() => {
    const offAvailable = window.electronAPI.onUpdateAvailable(
      (info: UpdateInfo) => {
        setVersion(info.version);
        setState("available");
        setDismissed(false);
      },
    );

    const offProgress = window.electronAPI.onUpdateProgress(
      (p: DownloadProgress) => {
        setProgress(Math.round(p.percent));
        setState("downloading");
      },
    );

    const offDownloaded = window.electronAPI.onUpdateDownloaded(() => {
      setProgress(100);
      setState("downloaded");
    });

    const offError = window.electronAPI.onUpdateError(() => {
      setState("error");
    });

    return () => {
      offAvailable();
      offProgress();
      offDownloaded();
      offError();
    };
  }, []);

  function handleDownload() {
    if (isMac) {
      window.open(RELEASES_URL);
      setDismissed(true);
    } else {
      window.electronAPI.downloadUpdate();
      setState("downloading");
    }
  }

  function handleRetry() {
    setState("available");
    window.electronAPI.downloadUpdate();
    setState("downloading");
  }

  function handleInstall() {
    window.electronAPI.installUpdate();
  }

  const visible = state !== null && !dismissed;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="update-banner"
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="flex-shrink-0 overflow-hidden"
        >
          <div className={`flex items-center gap-3 px-4 py-2 border-b text-sm ${state === "error" ? "bg-red-950/80 border-red-500/20" : "bg-blue-950/80 border-blue-500/20"}`}>
            {/* Status dot */}
            <span
              className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                state === "downloaded"
                  ? "bg-green-400"
                  : state === "error"
                    ? "bg-red-400"
                    : state === "downloading"
                      ? "bg-blue-400 animate-pulse"
                      : "bg-blue-400"
              }`}
            />

            {/* Message */}
            <span className="text-slate-300 flex-1 min-w-0">
              {state === "available" && (
                <>
                  <span className="text-white font-medium">
                    v{version} available
                  </span>
                  {isMac ? (
                    <span className="text-slate-400">
                      {" "}
                      — opens GitHub releases. If Gatekeeper blocks the app,
                      right-click the DMG and choose Open.
                    </span>
                  ) : null}
                </>
              )}
              {state === "downloading" && (
                <span className="flex items-center gap-2">
                  <span className="text-slate-300">Downloading update…</span>
                  <span className="w-24 h-1 bg-slate-700 rounded-full overflow-hidden flex-shrink-0">
                    <span
                      className="h-full bg-blue-400 rounded-full block transition-all duration-300"
                      style={{ width: `${progress}%` }}
                    />
                  </span>
                  <span className="text-slate-400 text-xs tabular-nums">
                    {progress}%
                  </span>
                </span>
              )}
              {state === "downloaded" && (
                <span className="text-white font-medium">
                  v{version} ready to install
                </span>
              )}
              {state === "error" && (
                <span className="text-red-300">
                  Update failed — check your connection
                </span>
              )}
            </span>

            {/* Actions */}
            <div className="flex items-center gap-2 flex-shrink-0">
              {state === "available" && (
                <button
                  onClick={handleDownload}
                  className="px-2.5 py-0.5 rounded bg-blue-500 hover:bg-blue-400 text-white text-xs font-medium transition-colors cursor-pointer"
                >
                  {isMac ? "Download" : "Update"}
                </button>
              )}
              {state === "downloaded" && (
                <button
                  onClick={handleInstall}
                  className="px-2.5 py-0.5 rounded bg-green-600 hover:bg-green-500 text-white text-xs font-medium transition-colors cursor-pointer"
                >
                  Restart &amp; Install
                </button>
              )}
              {state === "error" && (
                <button
                  onClick={handleRetry}
                  className="px-2.5 py-0.5 rounded bg-red-600 hover:bg-red-500 text-white text-xs font-medium transition-colors cursor-pointer"
                >
                  Retry
                </button>
              )}
              {state !== "downloading" && (
                <button
                  onClick={() => setDismissed(true)}
                  className="text-slate-500 hover:text-slate-300 transition-colors leading-none cursor-pointer p-0.5"
                  aria-label="Dismiss"
                >
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 12 12"
                    fill="currentColor"
                  >
                    <path d="M1 1l10 10M11 1L1 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" fill="none" />
                  </svg>
                </button>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
