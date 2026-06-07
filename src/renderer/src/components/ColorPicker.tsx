import { useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { HexColorPicker } from "react-colorful";
import { GROUP_COLORS } from "../types/pdf";
import { useClickOutside } from "../lib/useClickOutside";

interface ColorPickerProps {
  color: string;
  onChange: (color: string) => void;
  // Lets callers size the trigger swatch (group vs meta-group cards differ).
  swatchClassName?: string;
}

const DEFAULT_SWATCH =
  "w-6 h-6 rounded-full border-2 border-bdr flex-shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-acc cursor-pointer hover:scale-110 transition-transform duration-150";

// Swatch button that opens a popover with a freeform hue picker plus the
// preset palette. Owns its own open state + click-outside dismissal.
export function ColorPicker({
  color,
  onChange,
  swatchClassName = DEFAULT_SWATCH,
}: ColorPickerProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useClickOutside(ref, () => setOpen(false), open);

  return (
    <div className="relative flex-shrink-0" ref={ref}>
      <button
        className={swatchClassName}
        style={{ backgroundColor: color }}
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        title="Change color"
      />
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.12 }}
            className="absolute left-8 top-0 z-50 bg-surf-2 border border-bdr-hi rounded-xl p-3 shadow-2xl"
            style={{ width: 200 }}
          >
            <HexColorPicker color={color} onChange={onChange} />
            <div className="grid grid-cols-8 gap-1 mt-2">
              {GROUP_COLORS.map((c) => (
                <button
                  key={c}
                  className="w-5 h-5 rounded-full border border-bdr hover:scale-110 transition-transform"
                  style={{ backgroundColor: c }}
                  onClick={() => {
                    onChange(c);
                    setOpen(false);
                  }}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
