import { useCallback } from "react";
import { useShallow } from "zustand/shallow";
import { usePdfStore } from "../../store/usePdfStore";
import { TOUR_STEPS } from "./tourSteps";

export function useTour() {
  const { tourActive, setTourActive, tourStepIndex, setTourStepIndex } =
    usePdfStore(
      useShallow((s) => ({
        tourActive: s.tourActive,
        setTourActive: s.setTourActive,
        tourStepIndex: s.tourStepIndex,
        setTourStepIndex: s.setTourStepIndex,
      })),
    );

  const currentStep = TOUR_STEPS[tourStepIndex] ?? null;
  const isFirst = tourStepIndex === 0;
  const isLast = tourStepIndex === TOUR_STEPS.length - 1;

  const next = useCallback(() => {
    if (tourStepIndex < TOUR_STEPS.length - 1) {
      setTourStepIndex(tourStepIndex + 1);
    } else {
      setTourActive(false);
      setTourStepIndex(0);
    }
  }, [tourStepIndex, setTourStepIndex, setTourActive]);

  const prev = useCallback(() => {
    if (tourStepIndex > 0) setTourStepIndex(tourStepIndex - 1);
  }, [tourStepIndex, setTourStepIndex]);

  const dismiss = useCallback(() => {
    setTourActive(false);
    // Step index is preserved so resuming returns to the same step
  }, [setTourActive]);

  const resume = useCallback(() => {
    setTourActive(true);
  }, [setTourActive]);

  const restart = useCallback(() => {
    setTourStepIndex(0);
    setTourActive(true);
  }, [setTourStepIndex, setTourActive]);

  return {
    tourActive,
    currentStep,
    stepIndex: tourStepIndex,
    totalSteps: TOUR_STEPS.length,
    isFirst,
    isLast,
    next,
    prev,
    dismiss,
    resume,
    restart,
  };
}
