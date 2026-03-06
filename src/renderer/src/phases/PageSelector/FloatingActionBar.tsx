import { AnimatePresence, motion } from 'framer-motion'
import { usePdfStore } from '../../store/usePdfStore'
import { Button } from '../../components/Button'

interface FloatingActionBarProps {
  visible: boolean
  onAddGroup: () => void
  onPreview: () => void
}

export function FloatingActionBar({ visible, onAddGroup, onPreview }: FloatingActionBarProps) {
  const { selectedPageIndices, groups, assignPagesToGroup, clearSelection } = usePdfStore()
  const selected = [...selectedPageIndices]

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 16 }}
          transition={{ duration: 0.18, ease: 'easeOut' }}
          className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30"
        >
          <div className="flex items-center gap-2 bg-slate-800 border border-slate-700 rounded-2xl px-4 py-3 shadow-2xl">
            <span className="text-slate-400 text-sm font-medium whitespace-nowrap">
              {selected.length} selected —
            </span>

            {/* Preview */}
            <button
              onClick={onPreview}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 transition-colors text-sm font-medium text-slate-200"
              title="Preview selected pages"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
              Preview
            </button>

            <span className="text-slate-600 text-sm">Assign to:</span>

            {/* Existing groups */}
            {groups.map((group) => (
              <button
                key={group.id}
                onClick={() => {
                  assignPagesToGroup(group.id, selected)
                  clearSelection()
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-slate-700 transition-colors text-sm font-medium text-white"
              >
                <span
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: group.color }}
                />
                {group.name}
              </button>
            ))}

            {/* New group */}
            <button
              onClick={onAddGroup}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-dashed border-slate-600 hover:border-indigo-500 hover:bg-indigo-500/10 transition-colors text-sm font-medium text-slate-400 hover:text-indigo-300"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              New Group
            </button>

            {/* Dismiss */}
            <button
              onClick={clearSelection}
              className="ml-1 text-slate-600 hover:text-slate-300 transition-colors"
              title="Dismiss"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
