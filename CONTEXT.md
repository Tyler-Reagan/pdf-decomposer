# Domain Context

A shared glossary for pdf-decomposer. Names here are the ubiquitous language —
prefer them in code, comments, and future architecture reviews.

## Terms

### Phase sequence

The app's linear progression through `AppPhase`:
`drop → selecting → configuring → processing → complete`. Defined once as
`PHASE_SEQUENCE` in `src/renderer/src/types/pdf.ts`, with `phaseRank` giving a
phase's position. `error` is deliberately **outside** the sequence — an
off-ramp, not a rank — so anything comparing forward progress treats `error` as
"held," neither advancing nor satisfying a step.

### Tour controller

The deep module behind the guided tour
(`src/renderer/src/components/Tour/tourController.ts`). Pure — no React, no
store, no DOM. It owns two things:

- **Derivation** — `deriveTourView(steps, stepIndex, phase)` returns the whole
  view a step should show: current step, `isFirst`/`isLast`, whether the step is
  gated and satisfied (`canAdvance`/`blocked`), whether it should `autoAdvance`,
  and the `gateMessage` to show while blocked.
- **Transitions** — `advance` / `retreat` / `dismiss` / `resume` / `restart`,
  each a pure `(TourState) → TourState`.

`useTour` is the thin adapter that binds these to the store and runs the
readiness-driven auto-advance effect; `TourOverlay` is a renderer of the view.
The store owns only `tourActive` and `tourStepIndex`.

### Step gate

A tour step's optional `requiresPhase` (and paired `gateMessage`), declared on
the step itself in `tourSteps.ts`. The step cannot be advanced past until the
phase sequence reaches `requiresPhase`; once reached, the step auto-advances as
soon as the next step's target has mounted in the DOM.
