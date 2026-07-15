// PROTOTYPE — throwaway. Floating bottom-center variant switcher, dev-only.
import { useEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface PrototypeSwitcherProps {
  variants: { key: string; label: string }[];
  current: string;
  onChange: (key: string) => void;
}

export function PrototypeSwitcher({
  variants,
  current,
  onChange,
}: PrototypeSwitcherProps) {
  const idx = Math.max(
    0,
    variants.findIndex((v) => v.key === current),
  );

  const cycle = (dir: 1 | -1) => {
    const next = (idx + dir + variants.length) % variants.length;
    onChange(variants[next].key);
  };

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        (e.target as HTMLElement)?.isContentEditable
      )
        return;
      if (e.key === "ArrowLeft" && e.altKey) cycle(-1);
      if (e.key === "ArrowRight" && e.altKey) cycle(1);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx, variants]);

  return (
    <div className="fixed bottom-3 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-2 bg-black text-white rounded-full shadow-2xl px-3 py-2 text-xs font-mono">
      <button onClick={() => cycle(-1)} className="hover:text-yellow-300" title="Prev (Alt+←)">
        <ChevronLeft size={16} />
      </button>
      <span className="min-w-[220px] text-center">
        PROTOTYPE · {variants[idx]?.label ?? current}
      </span>
      <button onClick={() => cycle(1)} className="hover:text-yellow-300" title="Next (Alt+→)">
        <ChevronRight size={16} />
      </button>
    </div>
  );
}
