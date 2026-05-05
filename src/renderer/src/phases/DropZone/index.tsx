import { useCallback, useState } from "react";
import { motion } from "framer-motion";
import { Zap, Layers, Scissors } from "lucide-react";
import { usePdfStore } from "../../store/usePdfStore";

export function DropZone() {
  const { setLoadedPdf, setPhase, setError, setTourActive } = usePdfStore();
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const loadPdf = useCallback(
    async (filePath: string) => {
      setIsLoading(true);
      try {
        const info = await window.electronAPI.getPdfInfo(filePath);
        const fileName =
          filePath.replace(/\\/g, "/").split("/").pop() ?? filePath;

        setLoadedPdf({
          filePath,
          fileName,
          totalPages: info.pageCount,
          fileSizeBytes: info.fileSizeBytes,
        });
        setPhase("selecting");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load PDF");
      } finally {
        setIsLoading(false);
      }
    },
    [setLoadedPdf, setPhase, setError],
  );

  const handleFileSelect = useCallback(async () => {
    const filePath = await window.electronAPI.openPdfDialog();
    if (filePath) await loadPdf(filePath);
  }, [loadPdf]);

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (!file) return;
      if (!file.name.toLowerCase().endsWith(".pdf")) {
        setError("Please drop a PDF file");
        return;
      }
      setIsLoading(true);
      try {
        const arrayBuffer = await file.arrayBuffer();
        const stablePath = await window.electronAPI.storePdfData(
          new Uint8Array(arrayBuffer),
          file.name,
        );
        await loadPdf(stablePath);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to read dropped file",
        );
        setIsLoading(false);
      }
    },
    [loadPdf, setError],
  );

  return (
    <div className="flex flex-col items-center justify-center h-full bg-surf-2 px-8 overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0, 0, 0.2, 1] }}
        className="w-full max-w-2xl"
      >
        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold tracking-tight mb-2">
            <span className="text-ink-1">PDF </span>
            <span className="text-acc">Decomposer</span>
          </h1>
          <p className="text-ink-3 text-lg">
            Split any PDF into multiple files by page range
          </p>
        </div>

        {/* Drop area */}
        <motion.div
          data-tour="drop-zone"
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={!isLoading ? handleFileSelect : undefined}
          animate={{
            borderColor: isDragging
              ? "var(--color-accent)"
              : "var(--color-border-strong)",
            backgroundColor: isDragging
              ? "var(--color-accent-hover)"
              : "var(--surf-1)",
          }}
          transition={{ duration: 0.15 }}
          className="border-2 border-dashed rounded-2xl p-16 flex flex-col items-center gap-5 cursor-pointer select-none"
        >
          {isLoading ? (
            <LoadingSpinner />
          ) : (
            <>
              <UploadIcon dragging={isDragging} />
              <div className="text-center">
                <p className="text-ink-1 text-xl font-medium">
                  {isDragging ? "Drop your PDF here" : "Drop a PDF here"}
                </p>
                <p className="text-ink-3 mt-1">or click to browse files</p>
              </div>
              <div className="flex items-center gap-3 text-ink-4 text-sm mt-2">
                <span className="h-px w-12 bg-bdr" />
                <span>PDF files only</span>
                <span className="h-px w-12 bg-bdr" />
              </div>
            </>
          )}
        </motion.div>

        {/* Features */}
        <div className="grid grid-cols-3 gap-4 mt-8">
          {FEATURES.map(({ Icon, label, desc }) => (
            <div
              key={label}
              className="bg-surf-1/50 rounded-xl p-4 text-center border border-bdr cursor-default"
            >
              <div className="flex justify-center mb-2">
                <Icon size={20} className="text-acc" />
              </div>
              <div className="text-ink-1 text-sm font-medium">{label}</div>
              <div className="text-ink-3 text-xs mt-1">{desc}</div>
            </div>
          ))}
        </div>

        {/* Tour link */}
        <div className="text-center mt-6">
          <button
            onClick={() => setTourActive(true)}
            className="text-ink-3 text-sm hover:text-acc transition-colors duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-acc rounded px-1"
          >
            Take a tour →
          </button>
        </div>
      </motion.div>
    </div>
  );
}

const FEATURES = [
  {
    Icon: Zap,
    label: "Fully offline",
    desc: "No data leaves your machine",
  },
  {
    Icon: Layers,
    label: "Visual selection",
    desc: "See thumbnails of every page",
  },
  {
    Icon: Scissors,
    label: "Non-contiguous",
    desc: "Mix any pages into each output",
  },
];

function UploadIcon({ dragging }: { dragging: boolean }) {
  return (
    <motion.div
      animate={{ scale: dragging ? 1.12 : 1, rotate: dragging ? -5 : 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
      className="w-20 h-20 rounded-2xl bg-surf-1 border border-bdr-hi flex items-center justify-center"
    >
      <svg
        width="40"
        height="40"
        viewBox="0 0 24 24"
        fill="none"
        stroke={dragging ? "var(--acc)" : "var(--ink-3)"}
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
  );
}

function LoadingSpinner() {
  return (
    <div className="flex flex-col items-center gap-4 py-4">
      <motion.div
        className="w-12 h-12 border-4 border-bdr border-t-acc rounded-full"
        animate={{ rotate: 360 }}
        transition={{ duration: 0.7, repeat: Infinity, ease: "linear" }}
      />
      <p className="text-ink-3">Reading PDF…</p>
    </div>
  );
}
