import { describe, it, expect } from "vitest";
import {
  advance,
  deriveTourView,
  dismiss,
  restart,
  resume,
  retreat,
} from "./tourController";
import type { TourStep } from "./tourSteps";

const ungated: TourStep = {
  target: "a",
  title: "A",
  description: "",
  placement: "bottom",
};

const gated: TourStep = {
  target: "b",
  title: "B",
  description: "",
  placement: "bottom",
  requiresPhase: "configuring",
  gateMessage: "Do the thing to continue.",
};

const steps: TourStep[] = [ungated, gated, ungated];

describe("deriveTourView — gating", () => {
  it("ungated step always advances, never blocks or auto-advances", () => {
    const v = deriveTourView(steps, 0, "drop");
    expect(v.canAdvance).toBe(true);
    expect(v.blocked).toBe(false);
    expect(v.autoAdvance).toBe(false);
    expect(v.gateMessage).toBeUndefined();
  });

  it("gated step blocks while phase is below the requirement", () => {
    const v = deriveTourView(steps, 1, "selecting");
    expect(v.canAdvance).toBe(false);
    expect(v.blocked).toBe(true);
    expect(v.autoAdvance).toBe(false);
    expect(v.gateMessage).toBe("Do the thing to continue.");
  });

  it("gated step unblocks and auto-advances once the phase is reached", () => {
    const v = deriveTourView(steps, 1, "configuring");
    expect(v.canAdvance).toBe(true);
    expect(v.blocked).toBe(false);
    expect(v.autoAdvance).toBe(true);
    expect(v.gateMessage).toBeUndefined();
  });

  it("gated step stays satisfied when the phase is past the requirement", () => {
    const v = deriveTourView(steps, 1, "processing");
    expect(v.canAdvance).toBe(true);
    expect(v.autoAdvance).toBe(true);
  });

  it("error phase sits outside the sequence and holds a gated step", () => {
    const v = deriveTourView(steps, 1, "error");
    expect(v.blocked).toBe(true);
    expect(v.canAdvance).toBe(false);
    expect(v.autoAdvance).toBe(false);
    expect(v.gateMessage).toBe("Do the thing to continue.");
  });
});

describe("deriveTourView — bounds", () => {
  it("marks first and last steps", () => {
    expect(deriveTourView(steps, 0, "drop").isFirst).toBe(true);
    expect(deriveTourView(steps, 0, "drop").isLast).toBe(false);
    expect(deriveTourView(steps, 2, "drop").isLast).toBe(true);
  });

  it("returns a null step and refuses to advance when out of range", () => {
    const v = deriveTourView(steps, 99, "drop");
    expect(v.currentStep).toBeNull();
    expect(v.canAdvance).toBe(false);
    expect(v.blocked).toBe(false);
  });
});

describe("transitions", () => {
  const total = steps.length;

  it("advance moves forward mid-tour", () => {
    expect(advance({ active: true, stepIndex: 0 }, total)).toEqual({
      active: true,
      stepIndex: 1,
    });
  });

  it("advance past the last step finishes and rewinds", () => {
    expect(advance({ active: true, stepIndex: total - 1 }, total)).toEqual({
      active: false,
      stepIndex: 0,
    });
  });

  it("retreat moves back but never below zero", () => {
    expect(retreat({ active: true, stepIndex: 2 })).toEqual({
      active: true,
      stepIndex: 1,
    });
    expect(retreat({ active: true, stepIndex: 0 })).toEqual({
      active: true,
      stepIndex: 0,
    });
  });

  it("dismiss deactivates but preserves the step index", () => {
    expect(dismiss({ active: true, stepIndex: 2 })).toEqual({
      active: false,
      stepIndex: 2,
    });
  });

  it("resume reactivates at the preserved step", () => {
    expect(resume({ active: false, stepIndex: 2 })).toEqual({
      active: true,
      stepIndex: 2,
    });
  });

  it("restart reactivates from the beginning", () => {
    expect(restart({ active: false, stepIndex: 2 })).toEqual({
      active: true,
      stepIndex: 0,
    });
  });
});
