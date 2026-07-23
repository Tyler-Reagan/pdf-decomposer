import { describe, it, expect, beforeEach } from "vitest";
import { usePdfStore } from "./usePdfStore";

function resetStore(): void {
  usePdfStore.getState().reset();
}

describe("usePdfStore pending page edits", () => {
  beforeEach(() => {
    resetStore();
  });

  it("setLoadedPdf initializes pages from totalPages with zero rotation", () => {
    usePdfStore.getState().setLoadedPdf({
      filePath: "/tmp/a.pdf",
      fileName: "a.pdf",
      totalPages: 3,
      fileSizeBytes: 100,
    });

    const { pages } = usePdfStore.getState();
    expect(pages).toEqual([
      { pageId: "page-0", originalIndex: 0, rotation: 0 },
      { pageId: "page-1", originalIndex: 1, rotation: 0 },
      { pageId: "page-2", originalIndex: 2, rotation: 0 },
    ]);
  });

  function loadThreePages(): void {
    usePdfStore.getState().setLoadedPdf({
      filePath: "/tmp/a.pdf",
      fileName: "a.pdf",
      totalPages: 3,
      fileSizeBytes: 100,
    });
  }

  it("rotatePage cw cycles rotation by 90 and wraps at 360", () => {
    loadThreePages();
    const { rotatePage } = usePdfStore.getState();
    rotatePage("page-1", "cw");
    expect(usePdfStore.getState().pages[1].rotation).toBe(90);
    rotatePage("page-1", "cw");
    rotatePage("page-1", "cw");
    rotatePage("page-1", "cw");
    expect(usePdfStore.getState().pages[1].rotation).toBe(0);
  });

  it("rotatePage ccw wraps negative rotation to 270", () => {
    loadThreePages();
    usePdfStore.getState().rotatePage("page-0", "ccw");
    expect(usePdfStore.getState().pages[0].rotation).toBe(270);
  });

  it("deletePage splices the page and renumbers group/selection indices above it", () => {
    loadThreePages();
    const { addGroup, assignPagesToGroup, setSelectedPageIndices, deletePage } =
      usePdfStore.getState();
    const group = addGroup("g");
    assignPagesToGroup(group.id, [0, 1, 2]);
    setSelectedPageIndices(new Set([1, 2]));

    deletePage("page-1"); // position 1

    const s = usePdfStore.getState();
    expect(s.pages.map((p) => p.pageId)).toEqual(["page-0", "page-2"]);
    expect(s.groups[0].pageIndices).toEqual([0, 1]); // 0 stays, 2 -> 1, deleted one dropped
    expect(s.selectedPageIndices).toEqual(new Set([1])); // 1 dropped, 2 -> 1
  });

  it("deletePage is a no-op when only one page remains", () => {
    usePdfStore.getState().setLoadedPdf({
      filePath: "/tmp/a.pdf",
      fileName: "a.pdf",
      totalPages: 1,
      fileSizeBytes: 100,
    });
    usePdfStore.getState().deletePage("page-0");
    expect(usePdfStore.getState().pages).toHaveLength(1);
  });

  it("undo reverts the last rotate/delete and redo reapplies it", () => {
    loadThreePages();
    const { rotatePage, deletePage, undo, redo } = usePdfStore.getState();
    rotatePage("page-0", "cw");
    deletePage("page-1");

    undo();
    let s = usePdfStore.getState();
    expect(s.pages.map((p) => p.pageId)).toEqual([
      "page-0",
      "page-1",
      "page-2",
    ]);
    expect(s.pages[0].rotation).toBe(90);

    undo();
    s = usePdfStore.getState();
    expect(s.pages[0].rotation).toBe(0);

    redo();
    s = usePdfStore.getState();
    expect(s.pages[0].rotation).toBe(90);

    redo();
    s = usePdfStore.getState();
    expect(s.pages.map((p) => p.pageId)).toEqual(["page-0", "page-2"]);
  });

  it("a new rotate/delete action clears the redo stack", () => {
    loadThreePages();
    const { rotatePage, undo, redo } = usePdfStore.getState();
    rotatePage("page-0", "cw");
    undo();
    expect(usePdfStore.getState().redoStack).toHaveLength(1);

    rotatePage("page-2", "cw");
    expect(usePdfStore.getState().redoStack).toHaveLength(0);
    redo(); // no-op, nothing to redo
    expect(usePdfStore.getState().pages[0].rotation).toBe(0);
  });

  it("setLoadedPdf clears the undo/redo stacks", () => {
    loadThreePages();
    usePdfStore.getState().rotatePage("page-0", "cw");
    expect(usePdfStore.getState().undoStack).toHaveLength(1);

    loadThreePages();
    expect(usePdfStore.getState().undoStack).toHaveLength(0);
    expect(usePdfStore.getState().redoStack).toHaveLength(0);
  });

  it("commitSave resets rotation deltas and originalIndex to position, clears history, and bumps reloadToken", () => {
    loadThreePages();
    const { rotatePage, deletePage, commitSave } = usePdfStore.getState();
    rotatePage("page-2", "cw");
    deletePage("page-0"); // page-1, page-2 remain at positions 0, 1
    const tokenBefore = usePdfStore.getState().reloadToken;

    commitSave();

    const s = usePdfStore.getState();
    expect(s.pages).toEqual([
      { pageId: "page-1", originalIndex: 0, rotation: 0 },
      { pageId: "page-2", originalIndex: 1, rotation: 0 },
    ]);
    expect(s.undoStack).toHaveLength(0);
    expect(s.redoStack).toHaveLength(0);
    expect(s.reloadToken).toBe(tokenBefore + 1);
  });

  it("commitSave syncs loadedPdf.totalPages to the saved page count so dirty clears", () => {
    loadThreePages();
    const { deletePage, commitSave } = usePdfStore.getState();
    deletePage("page-0"); // 2 pages remain

    commitSave();

    const s = usePdfStore.getState();
    expect(s.loadedPdf?.totalPages).toBe(s.pages.length);
  });

  it("commitSave empties the undo stack after a delete, so a dirty flag derived from it clears", () => {
    loadThreePages();
    const { deletePage, commitSave } = usePdfStore.getState();
    deletePage("page-0");
    expect(usePdfStore.getState().undoStack.length).toBeGreaterThan(0);

    commitSave();

    expect(usePdfStore.getState().undoStack).toHaveLength(0);
  });
});
