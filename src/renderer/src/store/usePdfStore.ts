import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import type { AppPhase, LoadedPdf, PageGroup, OutputFile } from '../types/pdf'
import { GROUP_COLORS } from '../types/pdf'

let groupIdCounter = 0
const nextGroupId = (): string => `group-${++groupIdCounter}`

interface PdfStore {
  // Phase
  phase: AppPhase
  setPhase: (phase: AppPhase) => void

  // Loaded PDF
  loadedPdf: LoadedPdf | null
  setLoadedPdf: (pdf: LoadedPdf) => void

  // Page selection
  selectedPageIndices: Set<number>
  setSelectedPageIndices: (indices: Set<number>) => void
  togglePageSelection: (index: number) => void
  clearSelection: () => void

  // Groups
  groups: PageGroup[]
  addGroup: (name?: string) => PageGroup
  removeGroup: (id: string) => void
  updateGroup: (id: string, updates: Partial<Omit<PageGroup, 'id'>>) => void
  assignPagesToGroup: (groupId: string, pageIndices: number[]) => void
  unassignPages: (pageIndices: number[]) => void
  getGroupForPage: (pageIndex: number) => PageGroup | undefined

  // Output config
  outputFiles: OutputFile[]
  setOutputFiles: (files: OutputFile[]) => void
  updateOutputFile: (groupId: string, updates: Partial<Omit<OutputFile, 'groupId'>>) => void
  saveDirectory: string
  setSaveDirectory: (dir: string) => void

  // Processing
  processingProgress: number // 0-1
  processingCurrent: number
  processingTotal: number
  setProcessingProgress: (current: number, total: number) => void
  outputFilePaths: string[]
  setOutputFilePaths: (paths: string[]) => void

  // Error
  errorMessage: string
  setError: (msg: string) => void

  // Reset
  reset: () => void
}

const initialState = {
  phase: 'drop' as AppPhase,
  loadedPdf: null,
  selectedPageIndices: new Set<number>(),
  groups: [],
  outputFiles: [],
  saveDirectory: '',
  processingProgress: 0,
  processingCurrent: 0,
  processingTotal: 0,
  outputFilePaths: [],
  errorMessage: ''
}

export const usePdfStore = create<PdfStore>()(
  immer((set, get) => ({
    ...initialState,

    setPhase: (phase) => set((s) => { s.phase = phase }),

    setLoadedPdf: (pdf) => set((s) => {
      s.loadedPdf = pdf
      s.groups = []
      s.selectedPageIndices = new Set()
      s.outputFiles = []
      s.saveDirectory = ''
    }),

    setSelectedPageIndices: (indices) => set((s) => { s.selectedPageIndices = indices }),

    togglePageSelection: (index) => set((s) => {
      const next = new Set(s.selectedPageIndices)
      if (next.has(index)) next.delete(index)
      else next.add(index)
      s.selectedPageIndices = next
    }),

    clearSelection: () => set((s) => { s.selectedPageIndices = new Set() }),

    addGroup: (name) => {
      const existingCount = get().groups.length
      const color = GROUP_COLORS[existingCount % GROUP_COLORS.length]
      const group: PageGroup = {
        id: nextGroupId(),
        name: name ?? `Output ${existingCount + 1}`,
        color,
        pageIndices: []
      }
      set((s) => { s.groups.push(group) })
      return group
    },

    removeGroup: (id) => set((s) => {
      // Remove group and unassign its pages (pages stay in PDF, just become unassigned)
      s.groups = s.groups.filter((g) => g.id !== id)
    }),

    updateGroup: (id, updates) => set((s) => {
      const g = s.groups.find((g) => g.id === id)
      if (g) Object.assign(g, updates)
    }),

    assignPagesToGroup: (groupId, pageIndices) => set((s) => {
      // Remove pages from any existing groups first
      for (const g of s.groups) {
        g.pageIndices = g.pageIndices.filter((p) => !pageIndices.includes(p))
      }
      // Add to target group
      const target = s.groups.find((g) => g.id === groupId)
      if (target) {
        const combined = new Set([...target.pageIndices, ...pageIndices])
        target.pageIndices = [...combined].sort((a, b) => a - b)
      }
    }),

    unassignPages: (pageIndices) => set((s) => {
      for (const g of s.groups) {
        g.pageIndices = g.pageIndices.filter((p) => !pageIndices.includes(p))
      }
    }),

    getGroupForPage: (pageIndex) => {
      return get().groups.find((g) => g.pageIndices.includes(pageIndex))
    },

    setOutputFiles: (files) => set((s) => { s.outputFiles = files }),

    updateOutputFile: (groupId, updates) => set((s) => {
      const f = s.outputFiles.find((f) => f.groupId === groupId)
      if (f) Object.assign(f, updates)
    }),

    setSaveDirectory: (dir) => set((s) => { s.saveDirectory = dir }),

    setProcessingProgress: (current, total) => set((s) => {
      s.processingCurrent = current
      s.processingTotal = total
      s.processingProgress = total > 0 ? current / total : 0
    }),

    setOutputFilePaths: (paths) => set((s) => { s.outputFilePaths = paths }),

    setError: (msg) => set((s) => {
      s.errorMessage = msg
      s.phase = 'error'
    }),

    reset: () => set(() => ({ ...initialState, selectedPageIndices: new Set<number>() }))
  }))
)
