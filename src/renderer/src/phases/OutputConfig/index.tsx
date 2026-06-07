import { useEffect, useRef, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { useShallow } from "zustand/shallow";
import { usePdfStore } from "../../store/usePdfStore";
import { PdfPreview } from "../../components/PdfPreview";
import { useSplitPaneResize } from "../../lib/useSplitPaneResize";
import { ChevronLeft, ChevronRight, File, AlertTriangle } from "lucide-react";
import { indicesToRangeString, formatBytes } from "../../types/pdf";
import type { PageGroup } from "../../types/pdf";
import { Button } from "../../components/Button";
import type { OutputFile } from "../../types/pdf";

// Split-screen flex constants (config panel relative to webview's flex:1)
const CONFIG_PANEL_FLEX_DEFAULT = 1.0;
const CONFIG_PANEL_FLEX_MIN = 0.3;
const CONFIG_PANEL_FLEX_MAX = 4.0;

function sanitizeFileName(name: string): string {
  return name.replace(/[<>:"/\\|?*]/g, "_").trim();
}

export function OutputConfig() {
  const {
    loadedPdf,
    groups,
    metaGroups,
    outputFiles,
    setOutputFiles,
    updateOutputFile,
    saveDirectory,
    setSaveDirectory,
    setPhase,
    setProcessingProgress,
    setOutputFilePaths,
    setError,
  } = usePdfStore(
    useShallow((s) => ({
      loadedPdf: s.loadedPdf,
      groups: s.groups,
      metaGroups: s.metaGroups,
      outputFiles: s.outputFiles,
      setOutputFiles: s.setOutputFiles,
      updateOutputFile: s.updateOutputFile,
      saveDirectory: s.saveDirectory,
      setSaveDirectory: s.setSaveDirectory,
      setPhase: s.setPhase,
      setProcessingProgress: s.setProcessingProgress,
      setOutputFilePaths: s.setOutputFilePaths,
      setError: s.setError,
    })),
  );

  const [isProcessing, setIsProcessing] = useState(false);

  // ── per-groupId save directory ────────────────────────────────────────────
  const [outputDirs, setOutputDirs] = useState<Record<string, string>>({});

  // ── global "same location for all" (applies to non-meta-group groups) ────
  const [applyDirToAll, setApplyDirToAll] = useState(false);
  const [dirOverrides, setDirOverrides] = useState<Set<string>>(new Set());

  // ── per-meta-group "same location for all" ────────────────────────────────
  const [metaGroupDirs, setMetaGroupDirs] = useState<
    Record<string, { applyToAll: boolean; dir: string }>
  >({});

  // ── split-screen state ────────────────────────────────────────────────────
  const [webviewPage, setWebviewPage] = useState(0);
  const [configPanelFlex, setConfigPanelFlex] = useState(
    CONFIG_PANEL_FLEX_DEFAULT,
  );
  const webviewPanelRef = useRef<HTMLDivElement>(null);
  const configPanelRef = useRef<HTMLDivElement>(null);
  const webviewNavTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const navigateWebview = useCallback((pageIndex: number) => {
    if (webviewNavTimer.current) clearTimeout(webviewNavTimer.current);
    webviewNavTimer.current = setTimeout(() => setWebviewPage(pageIndex), 120);
  }, []);

  useEffect(
    () => () => {
      if (webviewNavTimer.current) clearTimeout(webviewNavTimer.current);
    },
    [],
  );

  const handleDividerMouseDown = useSplitPaneResize({
    leftRef: webviewPanelRef,
    rightRef: configPanelRef,
    minLeft: 180,
    minRight: 200,
    flexMin: CONFIG_PANEL_FLEX_MIN,
    flexMax: CONFIG_PANEL_FLEX_MAX,
    setFlex: setConfigPanelFlex,
  });

  const activeGroups = groups.filter((g) => g.pageIndices.length > 0);
  const activeOutputFiles = outputFiles.filter((f) =>
    activeGroups.some((g) => g.id === f.groupId),
  );

  // ── Initialize on mount ───────────────────────────────────────────────────
  useEffect(() => {
    if (!loadedPdf) return;

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

    const initialMetaGroupDirs: Record<
      string,
      { applyToAll: boolean; dir: string }
    > = {};
    metaGroups.forEach((mg) => {
      initialMetaGroupDirs[mg.id] = { applyToAll: false, dir: saveDirectory };
    });
    setMetaGroupDirs(initialMetaGroupDirs);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Directory resolution ──────────────────────────────────────────────────
  const getEffectiveDir = (group: PageGroup): string => {
    if (dirOverrides.has(group.id)) return outputDirs[group.id] ?? "";

    if (group.metaGroupId) {
      const mgState = metaGroupDirs[group.metaGroupId];
      if (mgState?.applyToAll) return mgState.dir;
      return outputDirs[group.id] ?? "";
    }

    if (applyDirToAll) return saveDirectory;

    return outputDirs[group.id] ?? "";
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
    setSaveDirectory(dir);
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
    activeGroups
      .filter((g) => !g.metaGroupId)
      .forEach((g) => {
        next[g.id] = dir;
      });
    setOutputDirs((prev) => ({ ...prev, ...next }));
    setSaveDirectory(dir);
  };

  const handleChooseMetaGroupDir = async (metaGroupId: string) => {
    const current =
      metaGroupDirs[metaGroupId]?.dir || saveDirectory || undefined;
    const dir = await window.electronAPI.chooseSaveDirectory(current);
    if (!dir) return;
    setMetaGroupDirs((prev) => ({
      ...prev,
      [metaGroupId]: { ...prev[metaGroupId], dir },
    }));
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
      const dir = getEffectiveDir(g);
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
    activeGroups.length > 0 && activeGroups.every((g) => !!getEffectiveDir(g));

  if (!loadedPdf) {
    setPhase("drop");
    return null;
  }

  const standaloneGroups = activeGroups.filter((g) => !g.metaGroupId);

  return (
    <div className="flex flex-col h-full bg-surf-2">
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="flex items-center px-6 py-4 border-b border-bdr-hi flex-shrink-0">
        <button
          onClick={() => setPhase("selecting")}
          className="text-ink-3 hover:text-ink-2 transition-colors cursor-pointer mr-4"
        >
          <ChevronLeft size={20} strokeWidth={2} />
        </button>
        <div className="flex-1">
          <h1 className="text-ink-1 font-semibold text-lg">Configure Output</h1>
          <p className="text-ink-4 text-sm">
            Name your files and choose save locations
          </p>
        </div>
      </div>

      {/* ── Content row (split screen) ───────────────────────────────────── */}
      <div className="flex flex-1 min-h-0">
        {/* ── Webview ─────────────────────────────────────────────────── */}
        <div
          ref={webviewPanelRef}
          className="flex flex-col min-w-0 min-h-0 border-r border-bdr-hi"
          style={{ flex: 1 }}
        >
          <div className="px-4 py-2 border-b border-bdr flex-shrink-0 flex items-center justify-between">
            <span className="text-ink-4 text-xs">PDF Preview</span>
            <span className="text-ink-3 text-xs tabular-nums">
              Page {webviewPage + 1}
              <span className="text-ink-4"> / {loadedPdf.totalPages}</span>
            </span>
          </div>
          <div className="flex-1 relative overflow-hidden min-h-0 bg-surf-1">
            <PdfPreview pageIndex={webviewPage} />
          </div>
        </div>

        {/* ── Resize handle ────────────────────────────────────────────── */}
        <div
          className="w-1 flex-shrink-0 bg-bdr/40 hover:bg-acc/50 active:bg-acc/70 cursor-col-resize transition-colors"
          onMouseDown={handleDividerMouseDown}
        />

        {/* ── Config panel ─────────────────────────────────────────────── */}
        <div
          ref={configPanelRef}
          data-tour="output-config"
          className="flex flex-col min-h-0"
          style={{ flex: configPanelFlex, minWidth: 0 }}
        >
          {/* Scrollable content */}
          <div className="flex-1 overflow-y-auto min-h-0 px-5 py-5">
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="space-y-5"
            >
              {/* Source info */}
              <div className="bg-surf-1/50 border border-bdr/50 rounded-xl p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-acc/15 flex items-center justify-center flex-shrink-0">
                    <File size={20} strokeWidth={2} color="var(--acc)" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-ink-1 font-medium truncate">
                      {loadedPdf.fileName}
                    </div>
                    <div className="text-ink-4 text-sm">
                      {loadedPdf.totalPages} pages ·{" "}
                      {formatBytes(loadedPdf.fileSizeBytes)}
                    </div>
                  </div>
                  <div className="text-acc font-semibold text-lg flex-shrink-0">
                    → {activeGroups.length}
                  </div>
                </div>
              </div>

              {/* ── Meta group sections ────────────────────────────────── */}
              {metaGroups.map((metaGroup) => {
                const mgActiveGroups = activeGroups.filter(
                  (g) => g.metaGroupId === metaGroup.id,
                );
                if (mgActiveGroups.length === 0) return null;

                const mgState = metaGroupDirs[metaGroup.id] ?? {
                  applyToAll: false,
                  dir: "",
                };

                return (
                  <div key={metaGroup.id}>
                    <div
                      className="rounded-xl overflow-hidden"
                      style={{ border: `1px solid ${metaGroup.color}50` }}
                    >
                      <div
                        className="flex items-center gap-3 px-4 py-2.5"
                        style={{ backgroundColor: `${metaGroup.color}18` }}
                      >
                        <div
                          className="w-3 h-3 rounded-full flex-shrink-0"
                          style={{ backgroundColor: metaGroup.color }}
                        />
                        <span className="text-ink-1 font-semibold text-sm flex-1 truncate">
                          {metaGroup.name}
                        </span>
                        <span className="text-ink-4 text-xs">
                          {mgActiveGroups.length} file
                          {mgActiveGroups.length !== 1 ? "s" : ""}
                        </span>
                        {mgActiveGroups.length > 1 && (
                          <label className="flex items-center gap-1.5 cursor-pointer select-none group/toggle">
                            <input
                              type="checkbox"
                              checked={mgState.applyToAll}
                              onChange={(e) => {
                                setMetaGroupDirs((prev) => ({
                                  ...prev,
                                  [metaGroup.id]: {
                                    ...prev[metaGroup.id],
                                    applyToAll: e.target.checked,
                                  },
                                }));
                                if (!e.target.checked) {
                                  setDirOverrides((prev) => {
                                    const next = new Set(prev);
                                    mgActiveGroups.forEach((g) =>
                                      next.delete(g.id),
                                    );
                                    return next;
                                  });
                                }
                              }}
                              className="w-3 h-3 rounded accent-[var(--acc)] cursor-pointer"
                            />
                            <span className="text-ink-4 group-hover/toggle:text-ink-2 text-xs transition-colors">
                              Same location
                            </span>
                          </label>
                        )}
                      </div>

                      {/* Shared dir for meta group */}
                      {mgState.applyToAll && mgActiveGroups.length > 1 && (
                        <div className="flex items-center gap-2 mx-4 mb-3 mt-1 p-3 bg-surf-1/60 border border-acc/30 rounded-xl">
                          <div
                            className="flex-1 bg-ctrl border border-bdr rounded-lg px-3 py-1.5 text-sm font-mono text-ink-2 truncate min-w-0 cursor-default"
                            title={mgState.dir}
                          >
                            {mgState.dir || (
                              <span className="text-ink-4 italic">
                                No folder selected
                              </span>
                            )}
                          </div>
                          <button
                            onClick={() =>
                              handleChooseMetaGroupDir(metaGroup.id)
                            }
                            className="px-3 py-1.5 rounded-lg bg-ctrl hover:bg-ctrl-hi border border-bdr text-ink-2 hover:text-ink-1 text-xs font-medium transition-colors flex-shrink-0 cursor-pointer"
                          >
                            Browse…
                          </button>
                        </div>
                      )}

                      {/* Member group cards */}
                      <div className="px-3 pb-3 space-y-2 bg-surf-3/20">
                        {mgActiveGroups.map((group) => (
                          <GroupOutputCard
                            key={group.id}
                            group={group}
                            outputFile={activeOutputFiles.find(
                              (f) => f.groupId === group.id,
                            )}
                            effectiveDir={getEffectiveDir(group)}
                            outputDirs={outputDirs}
                            dirOverrides={dirOverrides}
                            applyDirToAll={mgState.applyToAll}
                            onUpdateFileName={(val) =>
                              updateOutputFile(group.id, {
                                outputFileName: val,
                              })
                            }
                            onChooseDir={() => handleChooseDir(group.id)}
                            onToggleDirOverride={() =>
                              toggleDirOverride(group.id)
                            }
                            onNavigate={() =>
                              group.pageIndices.length > 0 &&
                              navigateWebview(group.pageIndices[0])
                            }
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* ── Standalone groups ──────────────────────────────────── */}
              {standaloneGroups.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="text-ink-2 text-sm font-medium">
                      {metaGroups.length > 0
                        ? `Standalone Files (${standaloneGroups.length})`
                        : `Output Files (${standaloneGroups.length})`}
                    </h2>
                    {standaloneGroups.length > 1 && (
                      <label className="flex items-center gap-1.5 cursor-pointer select-none group/toggle">
                        <input
                          type="checkbox"
                          checked={applyDirToAll}
                          onChange={(e) => {
                            setApplyDirToAll(e.target.checked);
                            if (!e.target.checked) setDirOverrides(new Set());
                          }}
                          className="w-3 h-3 rounded accent-[var(--acc)] cursor-pointer"
                        />
                        <span className="text-ink-4 group-hover/toggle:text-ink-2 text-xs transition-colors">
                          Same location for all
                        </span>
                      </label>
                    )}
                  </div>

                  {applyDirToAll && standaloneGroups.length > 1 && (
                    <div className="flex items-center gap-2 mb-3 p-3 bg-surf-1/60 border border-acc/30 rounded-xl">
                      <div
                        className="flex-1 bg-ctrl border border-bdr rounded-lg px-3 py-1.5 text-sm font-mono text-ink-2 truncate min-w-0 cursor-default"
                        title={saveDirectory}
                      >
                        {saveDirectory || (
                          <span className="text-ink-4 italic">
                            No folder selected
                          </span>
                        )}
                      </div>
                      <button
                        onClick={handleChooseDirForAll}
                        className="px-3 py-1.5 rounded-lg bg-ctrl hover:bg-ctrl-hi border border-bdr text-ink-2 hover:text-ink-1 text-xs font-medium transition-colors flex-shrink-0 cursor-pointer"
                      >
                        Browse…
                      </button>
                    </div>
                  )}

                  <div className="space-y-3">
                    {standaloneGroups.map((group) => (
                      <GroupOutputCard
                        key={group.id}
                        group={group}
                        outputFile={activeOutputFiles.find(
                          (f) => f.groupId === group.id,
                        )}
                        effectiveDir={getEffectiveDir(group)}
                        outputDirs={outputDirs}
                        dirOverrides={dirOverrides}
                        applyDirToAll={applyDirToAll}
                        onUpdateFileName={(val) =>
                          updateOutputFile(group.id, { outputFileName: val })
                        }
                        onChooseDir={() => handleChooseDir(group.id)}
                        onToggleDirOverride={() => toggleDirOverride(group.id)}
                        onNavigate={() =>
                          group.pageIndices.length > 0 &&
                          navigateWebview(group.pageIndices[0])
                        }
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Skipped pages notice */}
              {(() => {
                const allAssigned = new Set(
                  groups.flatMap((g) => g.pageIndices),
                );
                const skipped = loadedPdf.totalPages - allAssigned.size;
                if (skipped === 0) return null;
                return (
                  <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-500/10 border border-amber-500/30">
                    <AlertTriangle
                      size={18}
                      strokeWidth={2}
                      color="var(--warn-icon)"
                      className="flex-shrink-0 mt-0.5"
                    />
                    <div className="text-sm text-warn">
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
          <div className="flex items-center justify-between px-5 py-4 border-t border-bdr-hi flex-shrink-0">
            <div className="text-ink-4 text-sm">
              {activeGroups.length} file
              {activeGroups.length !== 1 ? "s" : ""} will be created
            </div>
            <Button
              data-tour="process-btn"
              variant="primary"
              size="lg"
              disabled={!canStart || isProcessing}
              onClick={handleStart}
            >
              {isProcessing ? "Starting…" : "Split PDF"}
              <ChevronRight size={18} strokeWidth={2} />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── GroupOutputCard ───────────────────────────────────────────────────────

interface GroupOutputCardProps {
  group: PageGroup;
  outputFile: OutputFile | undefined;
  effectiveDir: string;
  outputDirs: Record<string, string>;
  dirOverrides: Set<string>;
  applyDirToAll: boolean;
  onUpdateFileName: (val: string) => void;
  onChooseDir: () => void;
  onToggleDirOverride: () => void;
  onNavigate: () => void;
}

function GroupOutputCard({
  group,
  outputFile,
  effectiveDir,
  outputDirs,
  dirOverrides,
  applyDirToAll,
  onUpdateFileName,
  onChooseDir,
  onToggleDirOverride,
  onNavigate,
}: GroupOutputCardProps) {
  if (!outputFile) return null;
  const isOverride = dirOverrides.has(group.id);
  const showDirPicker = !applyDirToAll || isOverride;

  return (
    <div
      className="bg-surf-1/60 rounded-xl p-4 cursor-default"
      style={{ border: `1px solid ${group.color}50` }}
      onMouseEnter={onNavigate}
    >
      {/* Group label row */}
      <div className="flex items-center gap-3 mb-3">
        <div
          className="w-3 h-3 rounded-full flex-shrink-0"
          style={{ backgroundColor: group.color }}
        />
        <span className="text-ink-1 font-medium text-sm">{group.name}</span>
        <span className="text-ink-4 text-xs ml-auto">
          {group.pageIndices.length} pages:{" "}
          {indicesToRangeString(group.pageIndices)}
        </span>
      </div>

      {/* Filename */}
      <div className="flex items-center gap-2 mb-2">
        <input
          type="text"
          value={outputFile.outputFileName}
          onChange={(e) => onUpdateFileName(e.target.value)}
          className="flex-1 bg-ctrl border border-bdr text-ink-1 text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-acc focus:border-transparent min-w-0 font-mono"
          placeholder="output-filename"
        />
        <span className="text-ink-4 text-sm">.pdf</span>
      </div>

      {/* Save location override toggle — only shown when "same location" is active */}
      {applyDirToAll && (
        <label className="flex items-center gap-2 mt-2 mb-1 cursor-pointer select-none group/override w-fit">
          <input
            type="checkbox"
            checked={isOverride}
            onChange={onToggleDirOverride}
            className="w-3.5 h-3.5 rounded accent-[var(--acc)] cursor-pointer"
          />
          <span className="text-xs text-ink-4 mb-1 group-hover/override:text-ink-2 transition-colors">
            Save to a different folder
          </span>
        </label>
      )}

      {/* Directory picker */}
      {showDirPicker && (
        <div className="flex items-center gap-2 mt-1">
          <div
            className="flex-1 bg-surf-3/60 border border-bdr rounded-lg px-3 py-1.5 text-xs font-mono text-ink-3 truncate min-w-0 cursor-default"
            title={outputDirs[group.id] ?? ""}
          >
            {outputDirs[group.id] || (
              <span className="text-ink-4 italic">No folder selected</span>
            )}
          </div>
          <button
            onClick={onChooseDir}
            className="px-2.5 py-1.5 rounded-lg bg-ctrl hover:bg-ctrl-hi border border-bdr text-ink-3 hover:text-ink-1 text-xs font-medium transition-colors flex-shrink-0 cursor-pointer"
          >
            Browse…
          </button>
        </div>
      )}

      {/* Full path preview */}
      {effectiveDir && (
        <div className="mt-1.5 text-ink-4 text-xs font-mono truncate">
          {effectiveDir}/{outputFile.outputFileName || "…"}.pdf
        </div>
      )}
    </div>
  );
}
