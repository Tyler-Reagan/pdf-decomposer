import { useCallback, useEffect } from "react";
import { useShallow } from "zustand/shallow";
import { usePdfStore } from "../../store/usePdfStore";
import { TOUR_STEPS } from "./tourSteps";
import {
  advance,
  deriveTourView,
  dismiss as dismissState,
  restart as restartState,
  resume as resumeState,
  retreat,
  type TourState,
} from "./tourController";

// Resolves once an element matching `selector` is present in the DOM, or
// immediately if it already is. Returns a cleanup that cancels the wait.
function whenTargetReady(selector: string, run: () => void): () => void {
  if (document.querySelector(selector)) {
    run();
    return () => {};
  }
  const observer = new MutationObserver(() => {
    if (document.querySelector(selector)) {
      observer.disconnect();
      run();
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });
  return () => observer.disconnect();
}

export function useTour() {
  const { tourActive, setTourActive, tourStepIndex, setTourStepIndex, phase } =
    usePdfStore(
      useShallow((s) => ({
        tourActive: s.tourActive,
        setTourActive: s.setTourActive,
        tourStepIndex: s.tourStepIndex,
        setTourStepIndex: s.setTourStepIndex,
        phase: s.phase,
      })),
    );

  const view = deriveTourView(TOUR_STEPS, tourStepIndex, phase);

  const commit = useCallback(
    (next: TourState) => {
      setTourActive(next.active);
      setTourStepIndex(next.stepIndex);
    },
    [setTourActive, setTourStepIndex],
  );

  const next = useCallback(() => {
    commit(advance({ active: tourActive, stepIndex: tourStepIndex }, TOUR_STEPS.length));
  }, [commit, tourActive, tourStepIndex]);

  const prev = useCallback(() => {
    commit(retreat({ active: tourActive, stepIndex: tourStepIndex }));
  }, [commit, tourActive, tourStepIndex]);

  const dismiss = useCallback(() => {
    commit(dismissState({ active: tourActive, stepIndex: tourStepIndex }));
  }, [commit, tourActive, tourStepIndex]);

  const resume = useCallback(() => {
    commit(resumeState({ active: tourActive, stepIndex: tourStepIndex }));
  }, [commit, tourActive, tourStepIndex]);

  const restart = useCallback(() => {
    commit(restartState({ active: tourActive, stepIndex: tourStepIndex }));
  }, [commit, tourActive, tourStepIndex]);

  // Auto-advance a gated step once its phase is reached — but only after the
  // next step's target has mounted, so the tooltip never jumps to a
  // not-yet-present anchor. Replaces the old fixed 600ms guess.
  useEffect(() => {
    if (!tourActive || !view.autoAdvance) return;
    const nextTarget = TOUR_STEPS[tourStepIndex + 1]?.target;
    if (!nextTarget) return;
    return whenTargetReady(`[data-tour="${nextTarget}"]`, next);
  }, [tourActive, view.autoAdvance, tourStepIndex, next]);

  return {
    tourActive,
    currentStep: view.currentStep,
    stepIndex: view.stepIndex,
    totalSteps: view.totalSteps,
    isFirst: view.isFirst,
    isLast: view.isLast,
    blocked: view.blocked,
    gateMessage: view.gateMessage,
    next,
    prev,
    dismiss,
    resume,
    restart,
  };
}
