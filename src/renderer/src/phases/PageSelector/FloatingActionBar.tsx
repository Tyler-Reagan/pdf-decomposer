import { useEffect, useRef, useState, useCallback } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { usePdfStore } from '../../store/usePdfStore'

interface FloatingActionBarProps {
  visible: boolean
}

export function FloatingActionBar({ visible }: FloatingActionBarProps) {
  const {
    selectedPageIndices,
    groups,
    addGroup,
    assignPagesToGroup,
    unassignPages,
    removeGroup,
    updateGroup,
    clearSelection
  } = usePdfStore()

  const [renamingGroupId, setRenamingGroupId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const renameInputRef = useRef<HTMLInputElement>(null)

  const selected = [...selectedPageIndices]

  // Group that contains ALL currently selected pages — enables F2 rename
  const commonGroup = selected.length > 0
    ? groups.find((g) => selected.every((p) => g.pageIndices.includes(p)))
    : undefined

  // Whether any selected pages are currently in a group — controls Remove button
  const hasAssignedPages = groups.some((g) =>
    g.pageIndices.some((p) => selectedPageIndices.has(p))
  )

  const startRename = useCallback((groupId: string, currentName: string) => {
    setRenamingGroupId(groupId)
    setRenameValue(currentName)
  }, [])

  const confirmRename = useCallback(() => {
    if (!renamingGroupId) return
    const trimmed = renameValue.trim()
    if (trimmed) updateGroup(renamingGroupId, { name: trimmed })
    setRenamingGroupId(null)
    clearSelection()
  }, [renamingGroupId, renameValue, updateGroup, clearSelection])

  const cancelRename = useCallback(() => {
    setRenamingGroupId(null)
  }, [])

  const handleCreateGroup = useCallback(() => {
    const group = addGroup()
    assignPagesToGroup(group.id, selected)
    startRename(group.id, group.name)
  }, [addGroup, assignPagesToGroup, selected, startRename])

  const handleAssignToGroup = useCallback((groupId: string) => {
    assignPagesToGroup(groupId, selected)
    clearSelection()
  }, [assignPagesToGroup, selected, clearSelection])

  const handleRemoveFromGroups = useCallback(() => {
    // Determine which groups will be fully emptied BEFORE mutating state
    const groupsToDelete = groups.filter((g) =>
      g.pageIndices.length > 0 && g.pageIndices.every((p) => selectedPageIndices.has(p))
    )
    unassignPages(selected)
    for (const g of groupsToDelete) removeGroup(g.id)
    clearSelection()
  }, [groups, selectedPageIndices, selected, unassignPages, removeGroup, clearSelection])

  // Auto-focus and select-all when rename mode opens
  useEffect(() => {
    if (renamingGroupId) {
      const t = setTimeout(() => renameInputRef.current?.select(), 30)
      return () => clearTimeout(t)
    }
  }, [renamingGroupId])

  // Reset rename state when bar is dismissed
  useEffect(() => {
    if (!visible) setRenamingGroupId(null)
  }, [visible])

  // Keyboard shortcuts — suppressed when any input/textarea has focus
  useEffect(() => {
    if (!visible) return
    const handler = (e: KeyboardEvent): void => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return

      if (e.key === 'Escape') {
        e.preventDefault()
        if (renamingGroupId) cancelRename()
        else clearSelection()
        return
      }
      if (e.key === 'Enter') {
        e.preventDefault()
        if (!renamingGroupId) handleCreateGroup()
        return
      }
      if (e.key === 'F2') {
        e.preventDefault()
        if (!renamingGroupId && commonGroup) startRename(commonGroup.id, commonGroup.name)
        return
      }
      if (e.key === 'Backspace') {
        e.preventDefault()
        if (!renamingGroupId) handleRemoveFromGroups()
        return
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [
    visible,
    renamingGroupId,
    commonGroup,
    handleCreateGroup,
    handleRemoveFromGroups,
    cancelRename,
    clearSelection,
    startRename
  ])

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 12 }}
          transition={{ duration: 0.15, ease: 'easeOut' }}
          className="absolute bottom-4 left-3 right-3 z-30"
        >
          {renamingGroupId ? (
            /* ── Rename mode ───────────────────────────────────────────── */
            <div className="bg-slate-800 border border-indigo-500/50 rounded-xl shadow-2xl overflow-hidden">
              <div className="flex items-center justify-between px-3 py-2 border-b border-slate-700/50">
                <span className="text-slate-400 text-xs">Name this group</span>
                <button
                  onClick={cancelRename}
                  className="text-slate-600 hover:text-slate-300 transition-colors"
                  title="Cancel (Esc)"
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>

              <div className="px-3 py-2">
                <input
                  ref={renameInputRef}
                  value={renameValue}
                  onChange={(e) => setRenameValue(e.target.value)}
                  onKeyDown={(e) => {
                    // Prevent window-level shortcuts from firing while typing
                    e.stopPropagation()
                    if (e.key === 'Enter') confirmRename()
                    if (e.key === 'Escape') cancelRename()
                  }}
                  placeholder="Group name…"
                  className="w-full bg-slate-700 text-white text-sm rounded-lg px-3 py-1.5 outline-none focus:ring-1 focus:ring-indigo-500 placeholder:text-slate-500"
                />
              </div>

              <div className="px-3 py-1.5 bg-slate-900/50 flex items-center justify-between">
                <span className="text-slate-600 text-[10px]">↵ confirm · Esc cancel</span>
                <button
                  onClick={confirmRename}
                  className="text-indigo-400 hover:text-indigo-300 text-[11px] font-medium transition-colors"
                >
                  Save
                </button>
              </div>
            </div>
          ) : (
            /* ── Selection mode ────────────────────────────────────────── */
            <div className="bg-slate-800 border border-slate-700 rounded-xl shadow-2xl overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between px-3 py-2 border-b border-slate-700/50">
                <span className="text-slate-300 text-sm font-medium">
                  {selected.length} page{selected.length !== 1 ? 's' : ''} selected
                </span>
                <button
                  onClick={clearSelection}
                  className="text-slate-600 hover:text-slate-300 transition-colors"
                  title="Dismiss (Esc)"
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>

              {/* Existing groups — click to assign */}
              {groups.length > 0 && (
                <div className="px-2 py-1 flex flex-col gap-0.5 max-h-36 overflow-y-auto">
                  {groups.map((group) => (
                    <button
                      key={group.id}
                      onClick={() => handleAssignToGroup(group.id)}
                      className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-slate-700 transition-colors text-left w-full group/row"
                    >
                      <span
                        className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: group.color }}
                      />
                      <span className="text-white text-xs font-medium truncate flex-1">
                        {group.name}
                      </span>
                      <span className="text-slate-600 text-[10px] flex-shrink-0 group-hover/row:text-slate-400 transition-colors">
                        {group.pageIndices.length}p
                      </span>
                    </button>
                  ))}
                </div>
              )}

              {/* Action row */}
              <div className={`px-2 py-2 flex items-center gap-1.5 ${groups.length > 0 ? 'border-t border-slate-700/50' : ''}`}>
                <button
                  onClick={handleCreateGroup}
                  title="Create new group (↵)"
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/30 hover:border-indigo-500/50 transition-colors text-[11px] font-medium text-indigo-300 flex-1"
                >
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                  New Group
                </button>
                {hasAssignedPages && (
                  <button
                    onClick={handleRemoveFromGroups}
                    title="Remove from group (⌫)"
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg hover:bg-slate-700 transition-colors text-[11px] font-medium text-slate-500 hover:text-slate-300 flex-shrink-0"
                  >
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6l-1 14H6L5 6" />
                      <path d="M10 11v6M14 11v6" />
                      <path d="M9 6V4h6v2" />
                    </svg>
                    Remove
                  </button>
                )}
              </div>

              {/* Keyboard hint strip */}
              <div className="px-3 py-1.5 bg-slate-900/50 border-t border-slate-700/30">
                <span className="text-slate-600 text-[10px]">
                  ↵ new{commonGroup ? ' · F2 rename' : ''} · ⌫ remove · Esc dismiss
                </span>
              </div>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  )
}
