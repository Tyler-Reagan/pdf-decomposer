import { memo } from "react";
import { motion } from "framer-motion";
import type { PageGroup } from "../../types/pdf";

interface PageNodeProps {
  pageIndex: number;
  group: PageGroup | undefined;
  isSelected: boolean;
  isFocused: boolean; // currently shown in the webview
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
    ? "#6366f1"
    : isFocused
      ? "#818cf8"
      : group
        ? group.color + "80"
        : "#334155";

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
        className="relative rounded-md overflow-hidden bg-slate-800 flex flex-col h-full"
        style={{
          border: `${borderWidth}px solid ${borderColor}`,
          boxShadow: isSelected
            ? "0 0 0 2px rgba(99,102,241,0.4)"
            : isFocused
              ? "0 0 0 1px rgba(129,140,248,0.25)"
              : group
                ? `0 0 0 1px ${group.color}30`
                : "none",
        }}
        animate={{ scale: isSelected ? 1.04 : 1 }}
        transition={{ duration: 0.1 }}
      >
        {/* Group color stripe */}
        {group && (
          <div
            className="absolute left-0 top-0 bottom-0 w-1 z-10"
            style={{ backgroundColor: group.color }}
          />
        )}

        {/* Selected overlay */}
        {isSelected && (
          <div className="absolute inset-0 bg-indigo-500/15 z-10 pointer-events-none" />
        )}

        {/* Checkmark */}
        {isSelected && (
          <div className="absolute top-1 right-1 z-20 w-4 h-4 rounded-full bg-indigo-500 flex items-center justify-center shadow">
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

        {/* Document body — faint horizontal rules suggest page content */}
        <div className="flex-1 flex flex-col justify-center gap-1 px-2 pl-3 opacity-[0.11]">
          <div className="h-px rounded bg-slate-300" />
          <div className="h-px rounded bg-slate-300 w-4/5" />
          <div className="h-px rounded bg-slate-300" />
          <div className="h-px rounded bg-slate-300 w-3/4" />
          <div className="h-px rounded bg-slate-300 w-5/6" />
          <div className="h-px rounded bg-slate-300" />
          <div className="h-px rounded bg-slate-300 w-2/3" />
        </div>

        {/* Page number */}
        <div className="bg-slate-900/70 text-center py-0.5 flex-shrink-0">
          <span className="text-slate-400 text-[9px] font-medium">
            {pageIndex + 1}
          </span>
        </div>
      </motion.div>
    </div>
  );
});
