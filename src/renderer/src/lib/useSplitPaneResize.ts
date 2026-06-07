import { useCallback, type RefObject } from "react";

interface SplitPaneResizeOptions {
  // The fixed (flex: 1) left panel and the flexible right panel.
  leftRef: RefObject<HTMLElement | null>;
  rightRef: RefObject<HTMLElement | null>;
  minLeft: number; // px floor for the left panel
  minRight: number; // px floor for the right panel
  flexMin: number; // clamp for the resulting right/left flex ratio
  flexMax: number;
  setFlex: (flex: number) => void;
}

// Drag handler for a vertical divider between two panels. Tracks the pointer
// and reports a new flex ratio for the right panel relative to the left.
// Shared by the PageSelector and OutputConfig split screens.
export function useSplitPaneResize({
  leftRef,
  rightRef,
  minLeft,
  minRight,
  flexMin,
  flexMax,
  setFlex,
}: SplitPaneResizeOptions): (e: React.MouseEvent) => void {
  return useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      const lEl = leftRef.current;
      const rEl = rightRef.current;
      if (!lEl || !rEl) return;

      // Let the pointer drag over the left panel without it swallowing events.
      lEl.style.pointerEvents = "none";

      const startX = e.clientX;
      const startLeftW = lEl.getBoundingClientRect().width;
      const startRightW = rEl.getBoundingClientRect().width;

      const onMove = (ev: MouseEvent): void => {
        const delta = ev.clientX - startX;
        const newLeftW = Math.max(minLeft, startLeftW + delta);
        const newRightW = Math.max(minRight, startRightW - delta);
        setFlex(Math.max(flexMin, Math.min(flexMax, newRightW / newLeftW)));
      };
      const onUp = (): void => {
        lEl.style.pointerEvents = "";
        window.removeEventListener("mousemove", onMove);
        window.removeEventListener("mouseup", onUp);
      };
      window.addEventListener("mousemove", onMove);
      window.addEventListener("mouseup", onUp);
    },
    [leftRef, rightRef, minLeft, minRight, flexMin, flexMax, setFlex],
  );
}
