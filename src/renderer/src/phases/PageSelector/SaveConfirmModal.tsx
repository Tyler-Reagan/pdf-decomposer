import { AlertTriangle } from "lucide-react";
import { Button } from "../../components/Button";

interface SaveConfirmModalProps {
  rotatedCount: number;
  deletedCount: number;
  onCancel: () => void;
  onConfirm: () => void;
}

export function SaveConfirmModal({
  rotatedCount,
  deletedCount,
  onCancel,
  onConfirm,
}: SaveConfirmModalProps) {
  return (
    <div className="absolute inset-0 z-50 bg-black/50 flex items-center justify-center">
      <div className="bg-surf-2 border border-bdr-hi rounded-xl shadow-2xl w-96 p-5">
        <div className="flex items-start gap-3 mb-3">
          <div className="w-9 h-9 rounded-full bg-red-500/15 flex items-center justify-center flex-shrink-0">
            <AlertTriangle size={16} strokeWidth={2} className="text-red-500" />
          </div>
          <div>
            <h3 className="text-ink-1 font-semibold text-sm">
              This will permanently overwrite the original file
            </h3>
            <p className="text-ink-3 text-xs mt-1">
              {rotatedCount} rotation{rotatedCount === 1 ? "" : "s"},{" "}
              {deletedCount} deletion{deletedCount === 1 ? "" : "s"}. There is
              no backup — this cannot be undone once saved.
            </p>
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" size="sm" onClick={onCancel}>
            Cancel
          </Button>
          <Button variant="danger" size="sm" onClick={onConfirm}>
            Overwrite original file
          </Button>
        </div>
      </div>
    </div>
  );
}
