import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { usePdfStore } from "../../store/usePdfStore";
import { indicesToRangeString, formatBytes } from "../../types/pdf";
import { Button } from "../../components/Button";
import type { OutputFile } from "../../types/pdf";

function sanitizeFileName(name: string): string {
  return name.replace(/[<>:"/\\|?*]/g, "_").trim();
}

export function OutputConfig() {
  const {
    loadedPdf,
    groups,
    outputFiles,
    setOutputFiles,
    updateOutputFile,
    saveDirectory,
    setSaveDirectory,
    setPhase,
    setProcessingProgress,
    setOutputFilePaths,
    setError,
  } = usePdfStore();

  const [isProcessing, setIsProcessing] = useState(false);
  // per-groupId save directory; initialized from the store's last-used saveDirectory
  const [outputDirs, setOutputDirs] = useState<Record<string, string>>({});
  const [applyDirToAll, setApplyDirToAll] = useState(false);
  // groupIds that have opted out of applyDirToAll and use their own directory
  const [dirOverrides, setDirOverrides] = useState<Set<string>>(new Set());

  const activeGroups = groups.filter((g) => g.pageIndices.length > 0);
  const activeOutputFiles = outputFiles.filter((f) =>
    activeGroups.some((g) => g.id === f.groupId),
  );

  // Initialize output files and per-output dirs on mount
  useEffect(() => {
    if (!loadedPdf) return;
    const baseName = loadedPdf.fileName.replace(/\.pdf$/i, "");
    const initialFiles: OutputFile[] = groups
      .filter((g) => g.pageIndices.length > 0)
      .map((g) => ({
        groupId: g.id,
        outputFileName: sanitizeFileName(g.name),
        outputFilePath: "",
      }));
    setOutputFiles(initialFiles);

    const initialDirs: Record<string, string> = {};
    groups
      .filter((g) => g.pageIndices.length > 0)
      .forEach((g) => {
        initialDirs[g.id] = saveDirectory;
      });
    setOutputDirs(initialDirs);
  }, []); // Only on mount

  const getEffectiveDir = (groupId: string): string => {
    if (applyDirToAll && !dirOverrides.has(groupId)) return saveDirectory;
    return outputDirs[groupId] ?? "";
  };

  const toggleDirOverride = (groupId: string) => {
    setDirOverrides((prev) => {
      const next = new Set(prev);
      if (next.has(groupId)) next.delete(groupId);
      else next.add(groupId);
      return next;
    });
  };

  const setOutputDir = (groupId: string, dir: string) => {
    setOutputDirs((prev) => ({ ...prev, [groupId]: dir }));
    setSaveDirectory(dir); // keep as "last used" hint for native dialog
  };

  const handleChooseDir = async (groupId: string) => {
    const hint = outputDirs[groupId] || saveDirectory || undefined;
    const dir = await window.electronAPI.chooseSaveDirectory(hint);
    if (dir) setOutputDir(groupId, dir);
  };

  const handleChooseDirForAll = async () => {
    const dir = await window.electronAPI.chooseSaveDirectory(
      saveDirectory || undefined,
    );
    if (!dir) return;
    const next: Record<string, string> = {};
    activeGroups.forEach((g) => {
      next[g.id] = dir;
    });
    setOutputDirs(next);
    setSaveDirectory(dir);
  };

  const handleStart = async () => {
    if (!loadedPdf) return;
    setIsProcessing(true);
    setPhase("processing");

    const splitGroups = activeGroups.map((g) => {
      const of_ = activeOutputFiles.find((f) => f.groupId === g.id)!;
      const fileName = of_.outputFileName.endsWith(".pdf")
        ? of_.outputFileName
        : `${of_.outputFileName}.pdf`;
      const dir = getEffectiveDir(g.id);
      return {
        groupId: g.id,
        outputPath: `${dir}/${fileName}`.replace(/\/\//g, "/"),
        pageIndices: g.pageIndices,
      };
    });

    let unsubscribe: (() => void) | null = null;
    try {
      unsubscribe = window.electronAPI.onSplitProgress((evt) => {
        setProcessingProgress(evt.current, evt.total);
      });

      const result = await window.electronAPI.splitPdf({
        sourcePath: loadedPdf.filePath,
        groups: splitGroups,
      });

      if (result.success) {
        setOutputFilePaths(result.outputPaths);
        setPhase("complete");
      } else {
        setError(result.error ?? "Unknown error during split");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to split PDF");
    } finally {
      unsubscribe?.();
      setIsProcessing(false);
    }
  };

  const canStart =
    activeGroups.length > 0 &&
    activeGroups.every((g) => !!getEffectiveDir(g.id));

  if (!loadedPdf) {
    setPhase("drop");
    return null;
  }

  return (
    <div className="flex flex-col h-full bg-slate-900">
      {/* Header */}
      <div className="flex items-center px-6 py-4 border-b border-slate-700/60 flex-shrink-0">
        <button
          onClick={() => setPhase("selecting")}
          className="text-slate-500 hover:text-slate-300 transition-colors mr-4"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <div className="flex-1">
          <h1 className="text-white font-semibold text-lg">Configure Output</h1>
          <p className="text-slate-500 text-sm">
            Name your files and choose save locations
          </p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto min-h-0 px-6 py-6 max-w-3xl w-full mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="space-y-6"
        >
          {/* Source info */}
          <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-indigo-500/20 flex items-center justify-center">
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#818cf8"
                  strokeWidth="2"
                >
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-white font-medium truncate">
                  {loadedPdf.fileName}
                </div>
                <div className="text-slate-500 text-sm">
                  {loadedPdf.totalPages} pages ·{" "}
                  {formatBytes(loadedPdf.fileSizeBytes)}
                </div>
              </div>
              <div className="text-indigo-400 font-semibold text-lg">
                → {activeGroups.length}
              </div>
            </div>
          </div>

          {/* Output files */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-slate-300 text-sm font-medium">
                Output Files ({activeGroups.length})
              </h2>
              {activeGroups.length > 1 && (
                <label className="flex items-center gap-1.5 cursor-pointer select-none group/toggle">
                  <input
                    type="checkbox"
                    checked={applyDirToAll}
                    onChange={(e) => {
                      setApplyDirToAll(e.target.checked);
                      if (!e.target.checked) setDirOverrides(new Set());
                    }}
                    className="w-3 h-3 rounded accent-indigo-500 cursor-pointer"
                  />
                  <span className="text-slate-500 group-hover/toggle:text-slate-300 text-xs transition-colors">
                    Same location for all
                  </span>
                </label>
              )}
            </div>

            {applyDirToAll && activeGroups.length > 1 && (
              <div className="flex items-center gap-2 mb-3 p-3 bg-slate-800/60 border border-indigo-500/30 rounded-xl">
                <div
                  className="flex-1 bg-slate-700 border border-slate-600 rounded-lg px-3 py-1.5 text-sm font-mono text-slate-300 truncate min-w-0 cursor-default"
                  title={saveDirectory}
                >
                  {saveDirectory || (
                    <span className="text-slate-500 italic">
                      No folder selected
                    </span>
                  )}
                </div>
                <button
                  onClick={handleChooseDirForAll}
                  className="px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 border border-slate-600 text-slate-300 hover:text-white text-xs font-medium transition-colors flex-shrink-0"
                >
                  Browse…
                </button>
              </div>
            )}

            <div className="space-y-3">
              {activeGroups.map((group) => {
                const of_ = activeOutputFiles.find(
                  (f) => f.groupId === group.id,
                );
                if (!of_) return null;
                const isOverride = dirOverrides.has(group.id);
                const effectiveDir = getEffectiveDir(group.id);
                const showDirPicker = !applyDirToAll || isOverride;

                return (
                  <div
                    key={group.id}
                    className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-4"
                    style={{ borderLeftColor: group.color, borderLeftWidth: 3 }}
                  >
                    {/* Group label row */}
                    <div className="flex items-center gap-3 mb-3">
                      <div
                        className="w-3 h-3 rounded-full flex-shrink-0"
                        style={{ backgroundColor: group.color }}
                      />
                      <span className="text-white font-medium text-sm">
                        {group.name}
                      </span>
                      <span className="text-slate-500 text-xs ml-auto">
                        {group.pageIndices.length} pages:{" "}
                        {indicesToRangeString(group.pageIndices)}
                      </span>
                    </div>

                    {/* Filename */}
                    <div className="flex items-center gap-2 mb-2">
                      <input
                        type="text"
                        value={of_.outputFileName}
                        onChange={(e) =>
                          updateOutputFile(group.id, {
                            outputFileName: e.target.value,
                          })
                        }
                        className="flex-1 bg-slate-700 border border-slate-600 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent min-w-0 font-mono"
                        placeholder="output-filename"
                      />
                      <span className="text-slate-500 text-sm">.pdf</span>
                    </div>

                    {/* Save location override toggle — only shown when "same location for all" is active */}
                    {applyDirToAll && (
                      <label className="flex items-center gap-2 mt-2 mb-1 cursor-pointer select-none group/override w-fit">
                        <input
                          type="checkbox"
                          checked={isOverride}
                          onChange={() => toggleDirOverride(group.id)}
                          className="w-3.5 h-3.5 rounded accent-indigo-500 cursor-pointer"
                        />
                        <span className="text-xs text-slate-500 mb-1 group-hover/override:text-slate-300 transition-colors">
                          Save to a different folder than the others
                        </span>
                      </label>
                    )}

                    {/* Save location picker — shown when not using shared dir, or when overriding */}
                    {showDirPicker && (
                      <div className="flex items-center gap-2 mt-1">
                        <div
                          className="flex-1 bg-slate-900/60 border border-slate-700 rounded-lg px-3 py-1.5 text-xs font-mono text-slate-400 truncate min-w-0 cursor-default"
                          title={outputDirs[group.id] ?? ""}
                        >
                          {outputDirs[group.id] || (
                            <span className="text-slate-600 italic">
                              No folder selected
                            </span>
                          )}
                        </div>
                        <button
                          onClick={() => handleChooseDir(group.id)}
                          className="px-2.5 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 border border-slate-600 text-slate-400 hover:text-white text-xs font-medium transition-colors flex-shrink-0"
                        >
                          Browse…
                        </button>
                      </div>
                    )}

                    {/* Full output path preview */}
                    {effectiveDir && (
                      <div className="mt-1.5 text-slate-600 text-xs font-mono truncate">
                        {effectiveDir}/{of_.outputFileName || "…"}.pdf
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Skipped pages notice */}
          {(() => {
            const allAssigned = new Set(groups.flatMap((g) => g.pageIndices));
            const skipped = loadedPdf.totalPages - allAssigned.size;
            if (skipped === 0) return null;
            return (
              <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-500/10 border border-amber-500/30">
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#f59e0b"
                  strokeWidth="2"
                  className="flex-shrink-0 mt-0.5"
                >
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                  <line x1="12" y1="9" x2="12" y2="13" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
                <div className="text-sm text-amber-300">
                  <strong>
                    {skipped} unassigned page{skipped !== 1 ? "s" : ""}
                  </strong>{" "}
                  will be skipped. Go back to assign them or proceed without
                  them.
                </div>
              </div>
            );
          })()}
        </motion.div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between px-6 py-4 border-t border-slate-700/60 flex-shrink-0">
        <div className="text-slate-500 text-sm">
          {activeGroups.length} file{activeGroups.length !== 1 ? "s" : ""} will
          be created
        </div>
        <Button
          variant="primary"
          size="lg"
          disabled={!canStart || isProcessing}
          onClick={handleStart}
        >
          {isProcessing ? "Starting…" : "Split PDF"}
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </Button>
      </div>
    </div>
  );
}
