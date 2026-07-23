import type { AppPhase } from "../../types/pdf";
import { phaseRank } from "../../types/pdf";
import type { TourStep } from "./tourSteps";

export interface TourState {
  active: boolean;
  stepIndex: number;
}

export interface TourView {
  currentStep: TourStep | null;
  stepIndex: number;
  totalSteps: number;
  isFirst: boolean;
  isLast: boolean;
  canAdvance: boolean;
  blocked: boolean;
  autoAdvance: boolean;
  gateMessage?: string;
}

function gateSatisfied(step: TourStep, phase: AppPhase): boolean {
  if (step.requiresPhase === undefined) return true;
  // `error` ranks -1 (outside the sequence) and so never satisfies a gate.
  return phaseRank(phase) >= phaseRank(step.requiresPhase);
}

export function deriveTourView(
  steps: TourStep[],
  stepIndex: number,
  phase: AppPhase,
): TourView {
  const totalSteps = steps.length;
  const currentStep = steps[stepIndex] ?? null;

  if (!currentStep) {
    return {
      currentStep: null,
      stepIndex,
      totalSteps,
      isFirst: stepIndex <= 0,
      isLast: stepIndex >= totalSteps - 1,
      canAdvance: false,
      blocked: false,
      autoAdvance: false,
    };
  }

  const gated = currentStep.requiresPhase !== undefined;
  const satisfied = gateSatisfied(currentStep, phase);
  const blocked = gated && !satisfied;

  return {
    currentStep,
    stepIndex,
    totalSteps,
    isFirst: stepIndex === 0,
    isLast: stepIndex === totalSteps - 1,
    canAdvance: satisfied,
    blocked,
    autoAdvance: gated && satisfied,
    gateMessage: blocked ? currentStep.gateMessage : undefined,
  };
}

export function advance(state: TourState, totalSteps: number): TourState {
  if (state.stepIndex < totalSteps - 1) {
    return { active: state.active, stepIndex: state.stepIndex + 1 };
  }
  // Past the last step finishes the tour and rewinds for a fresh restart.
  return { active: false, stepIndex: 0 };
}

export function retreat(state: TourState): TourState {
  if (state.stepIndex > 0) {
    return { active: state.active, stepIndex: state.stepIndex - 1 };
  }
  return state;
}

export function dismiss(state: TourState): TourState {
  // Index is preserved so resuming returns to the same step.
  return { active: false, stepIndex: state.stepIndex };
}

export function resume(state: TourState): TourState {
  return { active: true, stepIndex: state.stepIndex };
}

export function restart(_state: TourState): TourState {
  return { active: true, stepIndex: 0 };
}
