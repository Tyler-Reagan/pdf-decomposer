import { useEffect, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useShallow } from "zustand/shallow";
import { useTour } from "./useTour";
import { usePdfStore } from "../../store/usePdfStore";
import type { TourPlacement } from "./tourSteps";

const TOOLTIP_W = 296;
const TOOLTIP_OFFSET = 14;
const TOOLTIP_H_EST = 210;

interface ResolvedPos {
  top: number;
  left: number;
  translateY: string;
}

function resolvePosition(
  rect: DOMRect,
  placement: TourPlacement,
  vpW: number,
  vpH: number,
): ResolvedPos {
  let top = 0;
  let left = 0;
  let translateY = "0px";

  switch (placement) {
    case "top":
      top = rect.top - TOOLTIP_OFFSET;
      left = rect.left + rect.width / 2 - TOOLTIP_W / 2;
      translateY = "-100%";
      break;
    case "bottom":
      top = rect.bottom + TOOLTIP_OFFSET;
      left = rect.left + rect.width / 2 - TOOLTIP_W / 2;
      translateY = "0px";
      break;
    case "left":
      top = rect.top + rect.height / 2 - TOOLTIP_H_EST / 2;
      left = rect.left - TOOLTIP_W - TOOLTIP_OFFSET;
      translateY = "0px";
      break;
    case "right":
      top = rect.top + rect.height / 2 - TOOLTIP_H_EST / 2;
      left = rect.right + TOOLTIP_OFFSET;
      translateY = "0px";
      break;
  }

  left = Math.max(8, Math.min(left, vpW - TOOLTIP_W - 8));

  if (placement === "top") {
    const effectiveTop = top - TOOLTIP_H_EST;
    if (effectiveTop < 8) {
      top = rect.bottom + TOOLTIP_OFFSET;
      translateY = "0px";
    }
    top = Math.min(top, vpH - 8);
  } else {
    top = Math.max(8, Math.min(top, vpH - TOOLTIP_H_EST - 8));
  }

  return { top, left, translateY };
}

export function TourOverlay() {
  const {
    tourActive,
    currentStep,
    stepIndex,
    totalSteps,
    isFirst,
    isLast,
    blocked,
    gateMessage,
    next,
    prev,
    dismiss,
  } = useTour();

  const { phase, setLoadedPdf, setPhase, setError } = usePdfStore(
    useShallow((s) => ({
      phase: s.phase,
      setLoadedPdf: s.setLoadedPdf,
      setPhase: s.setPhase,
      setError: s.setError,
    })),
  );

  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [loadingDemo, setLoadingDemo] = useState(false);

  const measureTarget = useCallback(() => {
    if (!currentStep) return;
    const el = document.querySelector<HTMLElement>(
      `[data-tour="${currentStep.target}"]`,
    );
    if (el) setTargetRect(el.getBoundingClientRect());
    else setTargetRect(null);
  }, [currentStep]);

  useEffect(() => {
    if (!tourActive) return;
    measureTarget();
    const id = setInterval(measureTarget, 200);
    return () => clearInterval(id);
  }, [tourActive, measureTarget]);

  useEffect(() => {
    if (!tourActive) return;

    const APP_STATE_KEYS = new Set([
      "Enter",
      "Backspace",
      "Delete",
      "F2",
      "ArrowLeft",
      "ArrowRight",
      "ArrowUp",
      "ArrowDown",
    ]);

    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopImmediatePropagation();
        dismiss();
        return;
      }

      if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
        const active = document.activeElement;
        const appHasFocus =
          active !== null &&
          active !== document.body &&
          active !== document.documentElement;
        if (!appHasFocus) {
          e.stopImmediatePropagation();
          if (e.key === "ArrowRight" && !blocked) next();
          else prev();
          return;
        }
      }

      if (APP_STATE_KEYS.has(e.key)) {
        e.stopImmediatePropagation();
        e.preventDefault();
      }
    };

    window.addEventListener("keydown", handler, { capture: true });
    return () =>
      window.removeEventListener("keydown", handler, { capture: true });
  }, [tourActive, next, prev, dismiss, blocked]);

  const handleLoadDemo = useCallback(async () => {
    if (loadingDemo) return;
    setLoadingDemo(true);
    try {
      const demoPath = await window.electronAPI.getDemoPdfPath();
      const info = await window.electronAPI.getPdfInfo(demoPath);
      setLoadedPdf({
        filePath: demoPath,
        fileName: "demo.pdf",
        totalPages: info.pageCount,
        fileSizeBytes: info.fileSizeBytes,
      });
      setPhase("selecting");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load demo PDF");
    } finally {
      setLoadingDemo(false);
    }
  }, [loadingDemo, setLoadedPdf, setPhase, setError]);

  if (!tourActive || !currentStep) return null;

  const vpW = window.innerWidth;
  const vpH = window.innerHeight;

  const pos = targetRect
    ? resolvePosition(targetRect, currentStep.placement, vpW, vpH)
    : {
        top: vpH / 2 - TOOLTIP_H_EST / 2,
        left: vpW / 2 - TOOLTIP_W / 2,
        translateY: "0px",
      };

  const showDemoOption = stepIndex === 0 && phase === "drop";

  return createPortal(
    <AnimatePresence>
      {tourActive && (
        <>
          {/* Scrim */}
          <div
            className="fixed inset-0 z-[9000] pointer-events-none"
            style={{
              background: targetRect
                ? `radial-gradient(ellipse ${targetRect.width + 32}px ${targetRect.height + 32}px at ${targetRect.left + targetRect.width / 2}px ${targetRect.top + targetRect.height / 2}px, transparent 88%, oklch(0.11 0.007 232 / 0.75) 100%)`
                : "oklch(0.11 0.007 232 / 0.75)",
            }}
          />

          {/* Highlight ring */}
          {targetRect && (
            <motion.div
              key={currentStep.target}
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              className="fixed z-[9001] pointer-events-none rounded-xl"
              style={{
                top: targetRect.top - 4,
                left: targetRect.left - 4,
                width: targetRect.width + 8,
                height: targetRect.height + 8,
                boxShadow:
                  "0 0 0 2px var(--acc), 0 0 0 5px color-mix(in oklch, var(--acc) 22%, transparent), 0 8px 32px rgba(0,0,0,0.5)",
              }}
            />
          )}

          {/* Tooltip */}
          <div
            className="fixed z-[9002] pointer-events-auto"
            style={{
              top: pos.top,
              left: pos.left,
              width: TOOLTIP_W,
              transform: `translateY(${pos.translateY})`,
            }}
          >
            <motion.div
              key={`tooltip-${stepIndex}`}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 6 }}
              transition={{ duration: 0.18, ease: [0, 0, 0.2, 1] }}
            >
              <div className="bg-surf-2 border border-bdr-hi rounded-2xl shadow-2xl overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-4 pt-3 pb-1">
                  <div className="flex gap-1 items-center">
                    {Array.from({ length: totalSteps }, (_, i) => (
                      <div
                        key={i}
                        className={`h-1 rounded-full transition-all duration-200 ${
                          i === stepIndex ? "w-4 bg-acc" : "w-1.5 bg-ctrl"
                        }`}
                      />
                    ))}
                    <span className="text-ink-4 text-[10px] ml-2 tabular-nums">
                      {stepIndex + 1}/{totalSteps}
                    </span>
                  </div>
                  <button
                    onClick={dismiss}
                    className="text-ink-4 hover:text-ink-2 transition-colors cursor-pointer -mr-1"
                    aria-label="Close tour"
                  >
                    <svg
                      width="14"
                      height="14"
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

                {/* Content */}
                <div className="px-4 pt-1 pb-3">
                  <h3 className="text-ink-1 font-semibold text-sm mb-1.5">
                    {currentStep.title}
                  </h3>
                  <p className="text-ink-3 text-xs leading-relaxed">
                    {currentStep.description}
                  </p>

                  {currentStep.hint && !blocked && (
                    <div className="mt-3 flex gap-2 items-start bg-acc/10 border border-acc/20 rounded-lg px-3 py-2">
                      <svg
                        className="flex-shrink-0 mt-0.5 text-acc"
                        width="11"
                        height="11"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                      >
                        <polyline points="9 18 15 12 9 6" />
                      </svg>
                      <p className="text-acc text-[11px] leading-snug">
                        {currentStep.hint}
                      </p>
                    </div>
                  )}

                  {showDemoOption && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      className="mt-3 pt-3 border-t border-bdr"
                    >
                      <p className="text-ink-3 text-xs mb-2">
                        Don't have a PDF handy?
                      </p>
                      <button
                        onClick={handleLoadDemo}
                        disabled={loadingDemo}
                        className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-surf-1 hover:bg-ctrl border border-bdr-hi text-ink-2 hover:text-ink-1 text-xs font-medium transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {loadingDemo ? (
                          <>
                            <motion.span
                              className="inline-block w-3 h-3 border-2 border-bdr-hi border-t-acc rounded-full"
                              animate={{ rotate: 360 }}
                              transition={{
                                duration: 0.7,
                                repeat: Infinity,
                                ease: "linear",
                              }}
                            />
                            Loading…
                          </>
                        ) : (
                          <>
                            <svg
                              width="13"
                              height="13"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                            >
                              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                              <polyline points="14 2 14 8 20 8" />
                            </svg>
                            Load demo PDF
                          </>
                        )}
                      </button>
                    </motion.div>
                  )}

                  {blocked && gateMessage && (
                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="mt-3 text-[11px] leading-snug"
                      style={{ color: "var(--warn)" }}
                    >
                      {gateMessage}
                    </motion.p>
                  )}
                </div>

                {/* Nav footer */}
                <div className="flex items-center justify-between px-4 py-3 border-t border-bdr">
                  <button
                    onClick={prev}
                    disabled={isFirst}
                    className="text-ink-3 hover:text-ink-1 text-xs transition-colors disabled:opacity-0 cursor-pointer"
                  >
                    ← Back
                  </button>
                  <button
                    onClick={blocked ? undefined : next}
                    disabled={blocked}
                    className="px-3 py-1.5 rounded-lg bg-acc hover:bg-acc-hi disabled:bg-ctrl disabled:text-ink-3 disabled:cursor-not-allowed text-white text-xs font-medium transition-colors cursor-pointer"
                  >
                    {isLast ? "Done" : "Next →"}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>,
    document.body,
  );
}
