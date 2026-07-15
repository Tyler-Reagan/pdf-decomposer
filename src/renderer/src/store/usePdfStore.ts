import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import { enableMapSet } from "immer";
import type {
  AppPhase,
  LoadedPdf,
  PageGroup,
  PageState,
  PageEditSnapshot,
  OutputFile,
  MetaGroup,
} from "../types/pdf";
import { GROUP_COLORS } from "../types/pdf";

enableMapSet();

let groupIdCounter = 0;
const nextGroupId = (): string => `group-${++groupIdCounter}`;

let metaGroupIdCounter = 0;
const nextMetaGroupId = (): string => `meta-group-${++metaGroupIdCounter}`;

interface PdfStore {
  // Phase
  phase: AppPhase;
  setPhase: (phase: AppPhase) => void;

  // Loaded PDF
  loadedPdf: LoadedPdf | null;
  setLoadedPdf: (pdf: LoadedPdf) => void;

  // Pending page edits (rotate/delete), see #5
  pages: PageState[];
  undoStack: PageEditSnapshot[];
  redoStack: PageEditSnapshot[];
  reloadToken: number; // bumped on successful save so renderers reload the file
  rotatePage: (pageId: string, direction: "cw" | "ccw") => void;
  deletePage: (pageId: string) => void;
  undo: () => void;
  redo: () => void;
  commitSave: () => void;

  // Page selection
  selectedPageIndices: Set<number>;
  setSelectedPageIndices: (indices: Set<number>) => void;
  togglePageSelection: (index: number) => void;
  clearSelection: () => void;

  // Groups
  groups: PageGroup[];
  addGroup: (name?: string) => PageGroup;
  removeGroup: (id: string) => void;
  updateGroup: (id: string, updates: Partial<Omit<PageGroup, "id">>) => void;
  assignPagesToGroup: (groupId: string, pageIndices: number[]) => void;
  unassignPages: (pageIndices: number[]) => void;
  getGroupForPage: (pageIndex: number) => PageGroup | undefined;

  // Meta groups
  metaGroups: MetaGroup[];
  addMetaGroup: (name?: string) => MetaGroup;
  removeMetaGroup: (id: string) => void;
  updateMetaGroup: (
    id: string,
    updates: Partial<Omit<MetaGroup, "id">>,
  ) => void;
  setGroupMetaGroup: (groupId: string, metaGroupId: string | null) => void;

  // Output config
  outputFiles: OutputFile[];
  setOutputFiles: (files: OutputFile[]) => void;
  updateOutputFile: (
    groupId: string,
    updates: Partial<Omit<OutputFile, "groupId">>,
  ) => void;
  saveDirectory: string;
  setSaveDirectory: (dir: string) => void;

  // Processing
  processingProgress: number; // 0-1
  processingCurrent: number;
  processingTotal: number;
  setProcessingProgress: (current: number, total: number) => void;
  outputFilePaths: string[];
  setOutputFilePaths: (paths: string[]) => void;

  // Error
  errorMessage: string;
  setError: (msg: string) => void;

  // Tour
  tourActive: boolean;
  setTourActive: (active: boolean) => void;
  tourStepIndex: number;
  setTourStepIndex: (index: number) => void;

  // Reset
  reset: () => void;
}

const initialState = {
  phase: "drop" as AppPhase,
  loadedPdf: null,
  pages: [] as PageState[],
  undoStack: [] as PageEditSnapshot[],
  redoStack: [] as PageEditSnapshot[],
  reloadToken: 0,
  selectedPageIndices: new Set<number>(),
  groups: [],
  metaGroups: [],
  outputFiles: [],
  saveDirectory: "",
  processingProgress: 0,
  processingCurrent: 0,
  processingTotal: 0,
  outputFilePaths: [],
  errorMessage: "",
  tourActive: false,
  tourStepIndex: 0,
};

export const usePdfStore = create<PdfStore>()(
  immer((set, get) => ({
    ...initialState,

    setPhase: (phase) =>
      set((s) => {
        s.phase = phase;
      }),

    setLoadedPdf: (pdf) =>
      set((s) => {
        s.loadedPdf = pdf;
        s.pages = Array.from({ length: pdf.totalPages }, (_, i) => ({
          pageId: `page-${i}`,
          originalIndex: i,
          rotation: 0 as const,
        }));
        s.undoStack = [];
        s.redoStack = [];
        s.groups = [];
        s.metaGroups = [];
        s.selectedPageIndices = new Set();
        s.outputFiles = [];
        s.saveDirectory = "";
      }),

    rotatePage: (pageId, direction) =>
      set((s) => {
        const page = s.pages.find((p) => p.pageId === pageId);
        if (!page) return;
        s.undoStack.push({
          pages: s.pages.map((p) => ({ ...p })),
          groups: s.groups.map((g) => ({
            ...g,
            pageIndices: [...g.pageIndices],
          })),
          selectedPageIndices: new Set(s.selectedPageIndices),
        });
        s.redoStack = [];
        const delta = direction === "cw" ? 90 : -90;
        page.rotation = ((((page.rotation + delta) % 360) + 360) % 360) as
          | 0
          | 90
          | 180
          | 270;
      }),

    deletePage: (pageId) =>
      set((s) => {
        if (s.pages.length <= 1) return;
        const position = s.pages.findIndex((p) => p.pageId === pageId);
        if (position === -1) return;

        s.undoStack.push({
          pages: s.pages.map((p) => ({ ...p })),
          groups: s.groups.map((g) => ({
            ...g,
            pageIndices: [...g.pageIndices],
          })),
          selectedPageIndices: new Set(s.selectedPageIndices),
        });
        s.redoStack = [];

        s.pages.splice(position, 1);

        for (const g of s.groups) {
          g.pageIndices = g.pageIndices
            .filter((i) => i !== position)
            .map((i) => (i > position ? i - 1 : i));
        }

        const nextSelected = new Set<number>();
        for (const i of s.selectedPageIndices) {
          if (i === position) continue;
          nextSelected.add(i > position ? i - 1 : i);
        }
        s.selectedPageIndices = nextSelected;
      }),

    undo: () =>
      set((s) => {
        const snapshot = s.undoStack.pop();
        if (!snapshot) return;
        s.redoStack.push({
          pages: s.pages.map((p) => ({ ...p })),
          groups: s.groups.map((g) => ({
            ...g,
            pageIndices: [...g.pageIndices],
          })),
          selectedPageIndices: new Set(s.selectedPageIndices),
        });
        s.pages = snapshot.pages;
        s.groups = snapshot.groups;
        s.selectedPageIndices = snapshot.selectedPageIndices;
      }),

    redo: () =>
      set((s) => {
        const snapshot = s.redoStack.pop();
        if (!snapshot) return;
        s.undoStack.push({
          pages: s.pages.map((p) => ({ ...p })),
          groups: s.groups.map((g) => ({
            ...g,
            pageIndices: [...g.pageIndices],
          })),
          selectedPageIndices: new Set(s.selectedPageIndices),
        });
        s.pages = snapshot.pages;
        s.groups = snapshot.groups;
        s.selectedPageIndices = snapshot.selectedPageIndices;
      }),

    // A successful Save has just baked pending rotations/deletions into the
    // source file on disk, so the file's page order now matches `pages`
    // exactly — reset originalIndex to position and rotation to 0, and drop
    // the undo/redo history since it referred to a file layout that no
    // longer exists. Bump reloadToken so renderers re-read the new bytes.
    commitSave: () =>
      set((s) => {
        s.pages = s.pages.map((p, i) => ({
          ...p,
          originalIndex: i,
          rotation: 0,
        }));
        s.undoStack = [];
        s.redoStack = [];
        s.reloadToken += 1;
      }),

    setSelectedPageIndices: (indices) =>
      set((s) => {
        s.selectedPageIndices = indices;
      }),

    togglePageSelection: (index) =>
      set((s) => {
        const next = new Set(s.selectedPageIndices);
        if (next.has(index)) next.delete(index);
        else next.add(index);
        s.selectedPageIndices = next;
      }),

    clearSelection: () =>
      set((s) => {
        s.selectedPageIndices = new Set();
      }),

    addGroup: (name) => {
      const existingCount = get().groups.length;
      const color = GROUP_COLORS[existingCount % GROUP_COLORS.length];
      const group: PageGroup = {
        id: nextGroupId(),
        name: name ?? `Output ${existingCount + 1}`,
        color,
        pageIndices: [],
        metaGroupId: null,
      };
      set((s) => {
        s.groups.push(group);
      });
      return group;
    },

    removeGroup: (id) =>
      set((s) => {
        s.groups = s.groups.filter((g) => g.id !== id);
      }),

    updateGroup: (id, updates) =>
      set((s) => {
        const g = s.groups.find((g) => g.id === id);
        if (g) Object.assign(g, updates);
      }),

    assignPagesToGroup: (groupId, pageIndices) =>
      set((s) => {
        // Remove pages from any existing groups first
        for (const g of s.groups) {
          g.pageIndices = g.pageIndices.filter((p) => !pageIndices.includes(p));
        }
        // Add to target group
        const target = s.groups.find((g) => g.id === groupId);
        if (target) {
          const combined = new Set([...target.pageIndices, ...pageIndices]);
          target.pageIndices = [...combined].sort((a, b) => a - b);
        }
      }),

    unassignPages: (pageIndices) =>
      set((s) => {
        for (const g of s.groups) {
          g.pageIndices = g.pageIndices.filter((p) => !pageIndices.includes(p));
        }
      }),

    getGroupForPage: (pageIndex) => {
      return get().groups.find((g) => g.pageIndices.includes(pageIndex));
    },

    addMetaGroup: (name) => {
      const existingCount = get().metaGroups.length;
      // Offset from group colors so meta groups get visually distinct defaults
      const color = GROUP_COLORS[(existingCount + 4) % GROUP_COLORS.length];
      const metaGroup: MetaGroup = {
        id: nextMetaGroupId(),
        name: name ?? `Group ${existingCount + 1}`,
        color,
      };
      set((s) => {
        s.metaGroups.push(metaGroup);
      });
      return metaGroup;
    },

    removeMetaGroup: (id) =>
      set((s) => {
        s.metaGroups = s.metaGroups.filter((mg) => mg.id !== id);
        // Unassign all groups from this meta group
        for (const g of s.groups) {
          if (g.metaGroupId === id) g.metaGroupId = null;
        }
      }),

    updateMetaGroup: (id, updates) =>
      set((s) => {
        const mg = s.metaGroups.find((mg) => mg.id === id);
        if (mg) Object.assign(mg, updates);
      }),

    setGroupMetaGroup: (groupId, metaGroupId) =>
      set((s) => {
        const g = s.groups.find((g) => g.id === groupId);
        if (g) g.metaGroupId = metaGroupId;
      }),

    setOutputFiles: (files) =>
      set((s) => {
        s.outputFiles = files;
      }),

    updateOutputFile: (groupId, updates) =>
      set((s) => {
        const f = s.outputFiles.find((f) => f.groupId === groupId);
        if (f) Object.assign(f, updates);
      }),

    setSaveDirectory: (dir) =>
      set((s) => {
        s.saveDirectory = dir;
      }),

    setProcessingProgress: (current, total) =>
      set((s) => {
        s.processingCurrent = current;
        s.processingTotal = total;
        s.processingProgress = total > 0 ? current / total : 0;
      }),

    setOutputFilePaths: (paths) =>
      set((s) => {
        s.outputFilePaths = paths;
      }),

    setError: (msg) =>
      set((s) => {
        s.errorMessage = msg;
        s.phase = "error";
      }),

    setTourActive: (active) =>
      set((s) => {
        s.tourActive = active;
      }),

    setTourStepIndex: (index) =>
      set((s) => {
        s.tourStepIndex = index;
      }),

    reset: () =>
      set(() => ({
        ...initialState,
        selectedPageIndices: new Set<number>(),
        metaGroups: [],
      })),
  })),
);
