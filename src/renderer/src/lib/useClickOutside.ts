import { useEffect, useRef, type RefObject } from "react";

// Calls `handler` on a mousedown outside `ref`'s element, while `enabled`.
// The handler is kept in a ref so passing an inline closure doesn't re-bind
// the listener on every render.
export function useClickOutside(
  ref: RefObject<HTMLElement | null>,
  handler: () => void,
  enabled = true,
): void {
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    if (!enabled) return;
    const onDown = (e: MouseEvent): void => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        handlerRef.current();
      }
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [ref, enabled]);
}
