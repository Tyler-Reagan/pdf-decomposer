import { useEffect, useRef, useState, type RefObject } from "react";

// Reports whether `ref`'s element is currently within the viewport (plus any
// rootMargin). Used to drive lazy thumbnail rendering + eviction: a card only
// asks the worker to render once it scrolls into view, and the provider may
// reclaim its bitmap once it scrolls away. Extracted from the original
// PagePreviewModal PreviewCard, generalised to report visibility both ways.
export function useInViewport(
  ref: RefObject<Element | null>,
  options?: IntersectionObserverInit,
): boolean {
  const [inView, setInView] = useState(false);
  const optionsRef = useRef(options);
  optionsRef.current = options;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver((entries) => {
      const entry = entries[0];
      if (entry) setInView(entry.isIntersecting);
    }, optionsRef.current);
    observer.observe(el);
    return () => observer.disconnect();
  }, [ref]);

  return inView;
}
