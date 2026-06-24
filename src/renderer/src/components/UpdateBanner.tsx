import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import type { UpdateInfo, DownloadProgress } from "../../../shared/types";

type BannerState = "available" | "downloading" | "downloaded" | "error";

const RELEASES_URL =
  "https://github.com/Tyler-Reagan/pdf-decomposer/releases/latest";

export function UpdateBanner() {
  const [state, setState] = useState<BannerState | null>(null);
  const [version, setVersion] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [dismissed, setDismissed] = useState(false);

  const isMac = window.electron?.process?.platform === "darwin";

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
          <div
            className={`flex items-center gap-3 px-4 py-2 border-b text-sm ${state === "error" ? "bg-red-950/80 border-red-500/20" : "bg-acc/8 border-acc/20"}`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                state === "downloaded"
                  ? "bg-green-400"
                  : state === "error"
                    ? "bg-red-400"
                    : state === "downloading"
                      ? "bg-acc animate-pulse"
                      : "bg-acc"
              }`}
            />

            <span className="text-ink-2 flex-1 min-w-0">
              {state === "available" && (
                <>
                  <span className="text-ink-1 font-medium">
                    v{version} available
                  </span>
                  {isMac ? (
                    <span className="text-ink-3">
                      {" "}
                      — opens GitHub releases. If Gatekeeper blocks the app,
                      right-click the DMG and choose Open.
                    </span>
                  ) : null}
                </>
              )}
              {state === "downloading" && (
                <span className="flex items-center gap-2">
                  <span className="text-ink-2">Downloading update…</span>
                  <span className="w-24 h-1 bg-ctrl rounded-full overflow-hidden flex-shrink-0">
                    <span
                      className="h-full bg-acc rounded-full block transition-all duration-300"
                      style={{ width: `${progress}%` }}
                    />
                  </span>
                  <span className="text-ink-3 text-xs tabular-nums">
                    {progress}%
                  </span>
                </span>
              )}
              {state === "downloaded" && (
                <span className="text-ink-1 font-medium">
                  v{version} ready to install
                </span>
              )}
              {state === "error" && (
                <span className="text-red-300">
                  Update failed —{" "}
                  <button
                    onClick={() => window.open(RELEASES_URL)}
                    className="underline cursor-pointer hover:text-red-200 transition-colors"
                  >
                    download manually
                  </button>
                </span>
              )}
            </span>

            <div className="flex items-center gap-2 flex-shrink-0">
              {state === "available" && (
                <button
                  onClick={handleDownload}
                  className="px-2.5 py-0.5 rounded bg-acc hover:bg-acc-hi text-white text-xs font-medium transition-colors cursor-pointer"
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
                  className="text-ink-4 hover:text-ink-2 transition-colors leading-none cursor-pointer p-0.5"
                  aria-label="Dismiss"
                >
                  <X size={12} strokeWidth={1.5} />
                </button>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
