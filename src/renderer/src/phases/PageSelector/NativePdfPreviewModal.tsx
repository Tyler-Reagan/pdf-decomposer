import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { usePdfViewer } from "../../lib/usePdfViewer";

interface NativePdfPreviewModalProps {
  filePath: string;
  initialPage: number;
  totalPages: number;
  onClose: () => void;
}

export function NativePdfPreviewModal({
  filePath,
  initialPage,
  totalPages,
  onClose,
}: NativePdfPreviewModalProps) {
  const [currentPage, setCurrentPage] = useState(initialPage + 1);
  const pdfContainerRef = useRef<HTMLDivElement>(null);

  usePdfViewer({
    containerRef: pdfContainerRef,
    filePath,
    page: currentPage,
    view: "Fit",
    enabled: true,
  });

  useEffect(() => {
    const handler = (e: KeyboardEvent): void => {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (e.key === "ArrowLeft" || e.key === "ArrowUp" || e.key === "PageUp") {
        e.preventDefault();
        setCurrentPage((p) => Math.max(1, p - 1));
      }
      if (
        e.key === "ArrowRight" ||
        e.key === "ArrowDown" ||
        e.key === "PageDown"
      ) {
        e.preventDefault();
        setCurrentPage((p) => Math.min(totalPages, p + 1));
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose, totalPages]);

  const goTo = (page: number): void =>
    setCurrentPage(Math.max(1, Math.min(totalPages, page)));

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex flex-col"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.15 }}
      >
        <div
          className="absolute inset-0 bg-black/80 backdrop-blur-sm"
          onClick={onClose}
        />

        {/* Card uses opacity-only entrance because the WebContentsView
            below is composited at the React layout's pixel bounds — a
            scale/translate animation would desync from the view. */}
        <motion.div
          className="relative z-10 flex flex-col bg-surf-2 border border-bdr-hi shadow-2xl mx-6 my-6 overflow-hidden"
          style={{ maxHeight: "calc(100vh - 48px)" }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
        >
          <div className="flex items-center justify-between px-6 py-4 border-b border-bdr-hi flex-shrink-0">
            <div className="flex items-center gap-5">
              <div>
                <h2 className="text-ink-1 font-semibold text-lg">
                  Native Preview
                </h2>
                <p className="text-ink-3 text-sm">
                  Rendered by Chromium's PDF engine
                </p>
              </div>

              <div className="flex items-center gap-1 border border-bdr-hi rounded-lg px-1">
                <button
                  onClick={() => goTo(currentPage - 1)}
                  disabled={currentPage <= 1}
                  className="p-1.5 rounded text-ink-3 hover:text-ink-1 hover:bg-surf-1 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  title="Previous page (←)"
                >
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <polyline points="15 18 9 12 15 6" />
                  </svg>
                </button>
                <span className="text-ink-2 text-sm font-medium tabular-nums px-1 select-none">
                  {currentPage} <span className="text-ink-4">/</span>{" "}
                  {totalPages}
                </span>
                <button
                  onClick={() => goTo(currentPage + 1)}
                  disabled={currentPage >= totalPages}
                  className="p-1.5 rounded text-ink-3 hover:text-ink-1 hover:bg-surf-1 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  title="Next page (→)"
                >
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </button>
              </div>

              <span className="text-ink-4 text-xs">
                ← → to navigate · Esc to close
              </span>
            </div>

            <button
              onClick={onClose}
              className="text-ink-3 hover:text-ink-1 transition-colors p-1 rounded-lg hover:bg-surf-1"
              title="Close (Esc)"
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          <div
            ref={pdfContainerRef}
            className="relative flex-1 min-h-0 bg-surf-1"
          />
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
