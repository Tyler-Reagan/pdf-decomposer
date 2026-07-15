// PROTOTYPE — throwaway, ticket #7 (wayfinder map #4). Answers: what do
// rotate/delete controls look like and how do they behave in the page grid?
// Three structurally different variants, switchable via ?variant=A|B|C.
// Dev-only — see the import.meta.env.DEV gate at the bottom of this file's
// caller (PageSelector/index.tsx).
import { useCallback, useState } from "react";
import { VariantA, label as labelA } from "./VariantA";
import { VariantB, label as labelB } from "./VariantB";
import { VariantC, label as labelC } from "./VariantC";
import { PrototypeSwitcher } from "./PrototypeSwitcher";
import type { ProtoPageEdits } from "./useProtoPageEdits";

const VARIANTS = [
  { key: "A", label: labelA },
  { key: "B", label: labelB },
  { key: "C", label: labelC },
];

function readVariant(): string {
  const v = new URLSearchParams(window.location.search).get("variant");
  return v && VARIANTS.some((x) => x.key === v) ? v : "A";
}

interface PrototypeRotateDeletePanelProps {
  totalPages: number;
  edits: ProtoPageEdits;
  focusedIndex: number;
  onFocusPage: (position: number) => void;
}

export function PrototypeRotateDeletePanel({
  totalPages,
  edits,
  focusedIndex,
  onFocusPage,
}: PrototypeRotateDeletePanelProps) {
  const [variant, setVariant] = useState(readVariant);

  const onChange = useCallback((key: string) => {
    setVariant(key);
    const url = new URL(window.location.href);
    url.searchParams.set("variant", key);
    window.history.replaceState(null, "", url.toString());
  }, []);

  const variantProps = { totalPages, edits, focusedIndex, onFocusPage };

  return (
    <div className="flex flex-col h-full relative">
      {variant === "A" && <VariantA {...variantProps} />}
      {variant === "B" && <VariantB {...variantProps} />}
      {variant === "C" && <VariantC {...variantProps} />}
      <PrototypeSwitcher variants={VARIANTS} current={variant} onChange={onChange} />
    </div>
  );
}
