import { memo } from "react";
import { motion } from "framer-motion";
import type { PageGroup } from "../../types/pdf";

interface PageNodeProps {
  pageIndex: number;
  group: PageGroup | undefined;
  isSelected: boolean;
  isFocused: boolean;
  onMouseDown: (e: React.MouseEvent, index: number) => void;
  onMouseEnter: (e: React.MouseEvent, index: number) => void;
  nodeRef: (el: HTMLDivElement | null) => void;
}

export const PageNode = memo(function PageNode({
  pageIndex,
  group,
  isSelected,
  isFocused,
  onMouseDown,
  onMouseEnter,
  nodeRef,
}: PageNodeProps) {
  const borderColor = isSelected
    ? "var(--acc)"
    : isFocused
      ? "var(--acc-hi)"
      : group
        ? group.color + "80"
        : "var(--bdr)";

  const borderWidth = isSelected || group || isFocused ? 2 : 1;

  return (
    <div
      ref={nodeRef}
      data-page-index={pageIndex}
      onMouseDown={(e) => onMouseDown(e, pageIndex)}
      onMouseEnter={(e) => onMouseEnter(e, pageIndex)}
      className="relative select-none cursor-pointer"
      style={{ aspectRatio: "3 / 4", userSelect: "none" }}
    >
      <motion.div
        className="relative rounded-md overflow-hidden bg-surf-1 flex flex-col h-full"
        style={{
          border: `${borderWidth}px solid ${borderColor}`,
          boxShadow: isSelected
            ? "0 0 0 2px color-mix(in oklch, var(--acc) 35%, transparent)"
            : isFocused
              ? "0 0 0 1px color-mix(in oklch, var(--acc-hi) 25%, transparent)"
              : group
                ? `0 0 0 1px ${group.color}30`
                : "none",
        }}
        animate={{ scale: isSelected ? 1.04 : 1 }}
        transition={{ duration: 0.1 }}
      >
        {group && (
          <div
            className="absolute left-0 top-0 bottom-0 w-1 z-10"
            style={{ backgroundColor: group.color }}
          />
        )}

        {isSelected && (
          <div className="absolute inset-0 bg-acc/12 z-10 pointer-events-none" />
        )}

        {isSelected && (
          <div className="absolute top-1 right-1 z-20 w-4 h-4 rounded-full bg-acc flex items-center justify-center shadow">
            <svg width="8" height="7" viewBox="0 0 11 9" fill="none">
              <path
                d="M1 4L4 7L10 1"
                stroke="white"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        )}

        {/* Simulated page lines */}
        <div className="flex-1 flex flex-col justify-center gap-1 px-2 pl-3 opacity-[0.11]">
          <div className="h-px rounded bg-ink-2" />
          <div className="h-px rounded bg-ink-2 w-4/5" />
          <div className="h-px rounded bg-ink-2" />
          <div className="h-px rounded bg-ink-2 w-3/4" />
          <div className="h-px rounded bg-ink-2 w-5/6" />
          <div className="h-px rounded bg-ink-2" />
          <div className="h-px rounded bg-ink-2 w-2/3" />
        </div>

        <div className="bg-surf-2/70 text-center py-0.5 flex-shrink-0">
          <span className="text-ink-3 text-[9px] font-medium">
            {pageIndex + 1}
          </span>
        </div>
      </motion.div>
    </div>
  );
});
