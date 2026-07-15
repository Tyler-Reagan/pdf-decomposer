// PROTOTYPE — throwaway. Simulates the pending-edit state model from
// wayfinder ticket #5 (pageId + rotation delta + live delete-splice) with
// plain in-memory state, so the three UI variants have something real to
// react to without touching the real store or ticket #9/#10's actual
// implementation. Do not promote this hook — it's a stand-in.
import { useCallback, useMemo, useState } from "react";

export interface ProtoPage {
  pageId: string;
  originalIndex: number;
  rotation: 0 | 90 | 180 | 270;
}

interface Snapshot {
  pages: ProtoPage[];
}

export type ProtoPageEdits = ReturnType<typeof useProtoPageEdits>;

export function useProtoPageEdits(totalPages: number) {
  const [pages, setPages] = useState<ProtoPage[]>(() =>
    Array.from({ length: totalPages }, (_, i) => ({
      pageId: `page-${i}`,
      originalIndex: i,
      rotation: 0 as const,
    })),
  );
  const [undoStack, setUndoStack] = useState<Snapshot[]>([]);
  const [redoStack, setRedoStack] = useState<Snapshot[]>([]);
  const [saving, setSaving] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);

  const pushUndo = useCallback(() => {
    setUndoStack((s) => [...s, { pages }]);
    setRedoStack([]);
  }, [pages]);

  const rotatePage = useCallback(
    (pageId: string, dir: 1 | -1) => {
      pushUndo();
      setPages((prev) =>
        prev.map((p) =>
          p.pageId === pageId
            ? { ...p, rotation: (((p.rotation + dir * 90) % 360) + 360) % 360 as 0 | 90 | 180 | 270 }
            : p,
        ),
      );
    },
    [pushUndo],
  );

  const rotateMany = useCallback(
    (pageIds: string[], dir: 1 | -1) => {
      pushUndo();
      setPages((prev) =>
        prev.map((p) =>
          pageIds.includes(p.pageId)
            ? { ...p, rotation: (((p.rotation + dir * 90) % 360) + 360) % 360 as 0 | 90 | 180 | 270 }
            : p,
        ),
      );
    },
    [pushUndo],
  );

  const deletePage = useCallback(
    (pageId: string) => {
      if (pages.length <= 1) return; // last page — blocked, per ticket #5
      pushUndo();
      setPages((prev) => prev.filter((p) => p.pageId !== pageId));
    },
    [pages.length, pushUndo],
  );

  const deleteMany = useCallback(
    (pageIds: string[]) => {
      setPages((prev) => {
        const remaining = prev.filter((p) => !pageIds.includes(p.pageId));
        if (remaining.length === 0) return prev; // never delete down to zero
        pushUndo();
        return remaining;
      });
    },
    [pushUndo],
  );

  const undo = useCallback(() => {
    setUndoStack((stack) => {
      if (stack.length === 0) return stack;
      const prevSnap = stack[stack.length - 1];
      setRedoStack((r) => [...r, { pages }]);
      setPages(prevSnap.pages);
      return stack.slice(0, -1);
    });
  }, [pages]);

  const redo = useCallback(() => {
    setRedoStack((stack) => {
      if (stack.length === 0) return stack;
      const nextSnap = stack[stack.length - 1];
      setUndoStack((u) => [...u, { pages }]);
      setPages(nextSnap.pages);
      return stack.slice(0, -1);
    });
  }, [pages]);

  const dirty = useMemo(
    () =>
      pages.length !== totalPages || pages.some((p) => p.rotation !== 0),
    [pages, totalPages],
  );

  const save = useCallback(() => {
    setSaving(true);
    // Simulates the atomic write from ticket #6 — indeterminate, no progress channel.
    setTimeout(() => {
      setSaving(false);
      setUndoStack([]);
      setRedoStack([]);
      setPages((prev) => prev.map((p) => ({ ...p, rotation: 0 })));
      setSavedFlash(true);
      setTimeout(() => setSavedFlash(false), 1600);
    }, 900);
  }, []);

  return {
    pages,
    rotatePage,
    rotateMany,
    deletePage,
    deleteMany,
    undo,
    redo,
    canUndo: undoStack.length > 0,
    canRedo: redoStack.length > 0,
    dirty,
    saving,
    savedFlash,
    save,
  };
}
