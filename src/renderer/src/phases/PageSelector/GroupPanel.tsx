import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { HexColorPicker } from 'react-colorful'
import { usePdfStore } from '../../store/usePdfStore'
import { indicesToRangeString, GROUP_COLORS } from '../../types/pdf'
import { Button } from '../../components/Button'

export function GroupPanel() {
  const { groups, loadedPdf, addGroup, removeGroup, updateGroup } = usePdfStore()

  const totalPages = loadedPdf?.totalPages ?? 0
  const assignedPages = new Set(groups.flatMap((g) => g.pageIndices))
  const unassignedCount = totalPages - assignedPages.size

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 pt-4 pb-2">
        <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">Output Files</h2>
      </div>

      {/* Groups list */}
      <div className="flex-1 overflow-y-auto px-3 pb-3 space-y-2 min-h-0">
        <AnimatePresence initial={false}>
          {groups.map((group) => (
            <motion.div
              key={group.id}
              initial={{ opacity: 0, y: -8, height: 0 }}
              animate={{ opacity: 1, y: 0, height: 'auto' }}
              exit={{ opacity: 0, y: -8, height: 0 }}
              transition={{ duration: 0.18 }}
            >
              <GroupCard
                group={group}
                onRemove={() => removeGroup(group.id)}
                onUpdateColor={(color) => updateGroup(group.id, { color })}
                onUpdateName={(name) => updateGroup(group.id, { name })}
              />
            </motion.div>
          ))}
        </AnimatePresence>

        {groups.length === 0 && (
          <div className="text-center py-6 text-slate-600 text-sm">
            No output files yet.<br />Select pages and assign them to a group.
          </div>
        )}
      </div>

      {/* Warnings */}
      {unassignedCount > 0 && groups.length > 0 && (
        <div className="mx-3 mb-2 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center gap-2">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
          <span className="text-amber-400 text-xs">
            {unassignedCount} page{unassignedCount !== 1 ? 's' : ''} unassigned
          </span>
        </div>
      )}

      {/* Add group */}
      <div className="p-3 border-t border-slate-700/60">
        <Button
          variant="secondary"
          size="sm"
          className="w-full"
          onClick={() => addGroup()}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Add Output File
        </Button>
      </div>
    </div>
  )
}

interface GroupCardProps {
  group: { id: string; name: string; color: string; pageIndices: number[] }
  onRemove: () => void
  onUpdateColor: (color: string) => void
  onUpdateName: (name: string) => void
}

function GroupCard({ group, onRemove, onUpdateColor, onUpdateName }: GroupCardProps) {
  const [showColorPicker, setShowColorPicker] = useState(false)
  const [isEditingName, setIsEditingName] = useState(false)
  const [nameValue, setNameValue] = useState(group.name)
  const nameInputRef = useRef<HTMLInputElement>(null)
  const pickerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setNameValue(group.name)
  }, [group.name])

  useEffect(() => {
    if (isEditingName) nameInputRef.current?.select()
  }, [isEditingName])

  useEffect(() => {
    if (!showColorPicker) return
    const handler = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setShowColorPicker(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [showColorPicker])

  const commitName = () => {
    const trimmed = nameValue.trim()
    if (trimmed) onUpdateName(trimmed)
    else setNameValue(group.name)
    setIsEditingName(false)
  }

  return (
    <div
      className="rounded-xl bg-slate-800/60 border border-slate-700/50 p-3"
      style={{ borderLeftColor: group.color, borderLeftWidth: 3 }}
    >
      <div className="flex items-center gap-2">
        {/* Color swatch */}
        <div className="relative">
          <button
            className="w-6 h-6 rounded-full border-2 border-slate-600 flex-shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
            style={{ backgroundColor: group.color }}
            onClick={() => setShowColorPicker((v) => !v)}
            title="Change color"
          />
          <AnimatePresence>
            {showColorPicker && (
              <motion.div
                ref={pickerRef}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.12 }}
                className="absolute left-8 top-0 z-50 bg-slate-900 border border-slate-700 rounded-xl p-3 shadow-2xl"
                style={{ width: 200 }}
              >
                <HexColorPicker color={group.color} onChange={onUpdateColor} />
                {/* Preset swatches */}
                <div className="grid grid-cols-8 gap-1 mt-2">
                  {GROUP_COLORS.map((c) => (
                    <button
                      key={c}
                      className="w-5 h-5 rounded-full border border-slate-700 hover:scale-110 transition-transform"
                      style={{ backgroundColor: c }}
                      onClick={() => { onUpdateColor(c); setShowColorPicker(false) }}
                    />
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Name */}
        {isEditingName ? (
          <input
            ref={nameInputRef}
            value={nameValue}
            onChange={(e) => setNameValue(e.target.value)}
            onBlur={commitName}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commitName()
              if (e.key === 'Escape') { setNameValue(group.name); setIsEditingName(false) }
            }}
            className="flex-1 bg-slate-700 text-white text-sm rounded px-2 py-0.5 outline-none focus:ring-1 focus:ring-indigo-500 min-w-0"
          />
        ) : (
          <button
            className="flex-1 text-left text-white text-sm font-medium hover:text-indigo-300 transition-colors truncate min-w-0"
            onDoubleClick={() => setIsEditingName(true)}
            title="Double-click to rename"
          >
            {group.name}
          </button>
        )}

        {/* Remove */}
        <button
          onClick={onRemove}
          className="text-slate-600 hover:text-red-400 transition-colors flex-shrink-0"
          title="Remove group"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      {/* Page summary */}
      <div className="mt-2 text-slate-500 text-[11px]">
        {group.pageIndices.length === 0 ? (
          <span className="italic">No pages assigned</span>
        ) : (
          <span>
            <span className="text-slate-300 font-medium">{group.pageIndices.length}</span> page
            {group.pageIndices.length !== 1 ? 's' : ''}: {indicesToRangeString(group.pageIndices)}
          </span>
        )}
      </div>
    </div>
  )
}
