import { useEffect, useRef, type RefObject } from "react";

// Minimal shape of the webview tag's DOM element that we use here.
// Electron's full WebviewTag type is awkward to import in renderer-only
// contexts; the methods we need are stable.
interface WebviewLike extends HTMLElement {
  executeJavaScript(code: string): Promise<unknown>;
}

// Drives page navigation inside an already-loaded <webview> by mutating
// location.hash in the guest, rather than re-assigning `src`. Re-assigning
// `src` reloads the entire PDF on every page change, which is slow and
// flashes the viewer chrome; hash navigation is in-place.
export function useWebviewPdfPage(
  webviewRef: RefObject<HTMLElement | null>,
  page: number,
  view: "FitH" | "Fit" = "FitH",
): void {
  const isReadyRef = useRef(false);
  const lastAppliedRef = useRef<number | null>(null);

  useEffect(() => {
    const wv = webviewRef.current as WebviewLike | null;
    if (!wv) return;

    const apply = (p: number): void => {
      lastAppliedRef.current = p;
      wv.executeJavaScript(
        `(() => { const h = '#page=${p}&view=${view}'; if (location.hash !== h) location.hash = h; })();`,
      ).catch((err: Error) => {
        // eslint-disable-next-line no-console
        console.warn("[webview] page navigation failed:", err.message);
      });
    };

    const onReady = (): void => {
      isReadyRef.current = true;
      apply(page);
    };

    wv.addEventListener("dom-ready", onReady);

    if (isReadyRef.current && lastAppliedRef.current !== page) {
      apply(page);
    }

    return () => {
      wv.removeEventListener("dom-ready", onReady);
    };
  }, [webviewRef, page, view]);

  useEffect(
    () => () => {
      isReadyRef.current = false;
      lastAppliedRef.current = null;
    },
    [],
  );
}
