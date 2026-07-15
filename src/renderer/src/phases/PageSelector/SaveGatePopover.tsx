import { Button } from "../../components/Button";

interface SaveGatePopoverProps {
  onSaveClick: () => void;
}

export function SaveGatePopover({ onSaveClick }: SaveGatePopoverProps) {
  return (
    <div className="absolute top-full right-0 mt-2 z-40 w-64 bg-surf-2 border border-bdr-hi rounded-lg shadow-2xl p-3">
      <p className="text-ink-2 text-xs mb-2">Save edits to PDF first</p>
      <Button
        variant="primary"
        size="sm"
        className="w-full"
        onClick={onSaveClick}
      >
        Save edits to PDF
      </Button>
    </div>
  );
}
