import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useShallow } from "zustand/shallow";
import { usePdfStore } from "../../store/usePdfStore";
import { indicesToRangeString } from "../../types/pdf";
import type { MetaGroup, PageGroup } from "../../types/pdf";
import { Button } from "../../components/Button";
import { ColorPicker } from "../../components/ColorPicker";
import { useInlineRename } from "../../lib/useInlineRename";
import { useClickOutside } from "../../lib/useClickOutside";
import {
  AlertTriangle,
  Plus,
  FolderPlus,
  FolderMinus,
  FolderInput,
  X,
} from "lucide-react";

export function GroupPanel() {
  const {
    groups,
    metaGroups,
    pages,
    addGroup,
    removeGroup,
    updateGroup,
    setSelectedPageIndices,
    addMetaGroup,
    removeMetaGroup,
    updateMetaGroup,
    setGroupMetaGroup,
  } = usePdfStore(
    useShallow((s) => ({
      groups: s.groups,
      metaGroups: s.metaGroups,
      pages: s.pages,
      addGroup: s.addGroup,
      removeGroup: s.removeGroup,
      updateGroup: s.updateGroup,
      setSelectedPageIndices: s.setSelectedPageIndices,
      addMetaGroup: s.addMetaGroup,
      removeMetaGroup: s.removeMetaGroup,
      updateMetaGroup: s.updateMetaGroup,
      setGroupMetaGroup: s.setGroupMetaGroup,
    })),
  );

  const assignedPages = new Set(groups.flatMap((g) => g.pageIndices));
  const unassignedCount = pages.length - assignedPages.size;

  const ungroupedGroups = groups.filter((g) => g.metaGroupId === null);

  return (
    <div className="flex flex-col h-full" data-tour="group-panel-inner">
      <div className="px-4 pt-4 pb-2">
        <h2 className="text-xs font-semibold text-ink-3 uppercase tracking-wider">
          Output Files
        </h2>
      </div>

      {/* Groups list */}
      <div className="flex-1 overflow-y-auto px-3 pb-3 space-y-2 min-h-0">
        {/* Group sections */}
        <AnimatePresence initial={false}>
          {metaGroups.map((metaGroup) => {
            const mgGroups = groups.filter(
              (g) => g.metaGroupId === metaGroup.id,
            );
            return (
              <motion.div
                key={metaGroup.id}
                initial={{ opacity: 0, y: -8, height: 0 }}
                animate={{ opacity: 1, y: 0, height: "auto" }}
                exit={{ opacity: 0, y: -8, height: 0 }}
                transition={{ duration: 0.18 }}
              >
                <MetaGroupSection
                  metaGroup={metaGroup}
                  groups={mgGroups}
                  ungroupedGroups={ungroupedGroups}
                  allMetaGroups={metaGroups}
                  onRemoveMetaGroup={() => removeMetaGroup(metaGroup.id)}
                  onUpdateMetaGroup={(updates) =>
                    updateMetaGroup(metaGroup.id, updates)
                  }
                  onRemoveGroup={(groupId) => removeGroup(groupId)}
                  onUpdateGroupColor={(groupId, color) =>
                    updateGroup(groupId, { color })
                  }
                  onUpdateGroupName={(groupId, name) =>
                    updateGroup(groupId, { name })
                  }
                  onSelectGroup={(groupId) => {
                    const g = groups.find((g) => g.id === groupId);
                    if (g) setSelectedPageIndices(new Set(g.pageIndices));
                  }}
                  onAssignToMetaGroup={(groupId, mgId) =>
                    setGroupMetaGroup(groupId, mgId)
                  }
                />
              </motion.div>
            );
          })}
        </AnimatePresence>

        {/* Ungrouped groups */}
        <AnimatePresence initial={false}>
          {ungroupedGroups.map((group) => (
            <motion.div
              key={group.id}
              initial={{ opacity: 0, y: -8, height: 0 }}
              animate={{ opacity: 1, y: 0, height: "auto" }}
              exit={{ opacity: 0, y: -8, height: 0 }}
              transition={{ duration: 0.18 }}
            >
              <GroupCard
                group={group}
                allMetaGroups={metaGroups}
                insideMetaGroup={false}
                onRemove={() => removeGroup(group.id)}
                onUpdateColor={(color) => updateGroup(group.id, { color })}
                onUpdateName={(name) => updateGroup(group.id, { name })}
                onSelectGroup={() =>
                  setSelectedPageIndices(new Set(group.pageIndices))
                }
                onAssignToMetaGroup={(metaGroupId) =>
                  setGroupMetaGroup(group.id, metaGroupId)
                }
              />
            </motion.div>
          ))}
        </AnimatePresence>

        {groups.length === 0 && metaGroups.length === 0 && (
          <div className="text-center py-6 text-ink-4 text-sm">
            No output files yet.
            <br />
            Select pages and assign them to a group.
          </div>
        )}
      </div>

      {/* Warnings */}
      {unassignedCount > 0 && groups.length > 0 && (
        <div className="mx-3 mb-2 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center gap-2">
          <AlertTriangle size={16} strokeWidth={2} color="var(--warn-icon)" />
          <span className="text-warn text-xs">
            {unassignedCount} page{unassignedCount !== 1 ? "s" : ""} unassigned
          </span>
        </div>
      )}

      {/* Add buttons */}
      <div className="p-3 border-t border-bdr/60 space-y-1.5">
        <Button
          variant="secondary"
          size="sm"
          className="w-full"
          onClick={() => addGroup()}
        >
          <Plus size={14} strokeWidth={2} />
          Add Output File
        </Button>
        <Button
          variant="secondary"
          size="sm"
          className="w-full"
          onClick={() => addMetaGroup()}
        >
          <FolderPlus size={14} strokeWidth={2} />
          Add Group
        </Button>
      </div>
    </div>
  );
}

// ── MetaGroupSection ────────────────────────────────────────────────────────

interface MetaGroupSectionProps {
  metaGroup: MetaGroup;
  groups: PageGroup[];
  ungroupedGroups: PageGroup[];
  allMetaGroups: MetaGroup[];
  onRemoveMetaGroup: () => void;
  onUpdateMetaGroup: (updates: Partial<Omit<MetaGroup, "id">>) => void;
  onRemoveGroup: (groupId: string) => void;
  onUpdateGroupColor: (groupId: string, color: string) => void;
  onUpdateGroupName: (groupId: string, name: string) => void;
  onSelectGroup: (groupId: string) => void;
  onAssignToMetaGroup: (groupId: string, metaGroupId: string | null) => void;
}

function MetaGroupSection({
  metaGroup,
  groups,
  ungroupedGroups,
  allMetaGroups,
  onRemoveMetaGroup,
  onUpdateMetaGroup,
  onRemoveGroup,
  onUpdateGroupColor,
  onUpdateGroupName,
  onSelectGroup,
  onAssignToMetaGroup,
}: MetaGroupSectionProps) {
  const [showChecklist, setShowChecklist] = useState(false);
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());
  const checklistRef = useRef<HTMLDivElement>(null);
  useClickOutside(checklistRef, () => setShowChecklist(false), showChecklist);

  const rename = useInlineRename(metaGroup.name, (name) =>
    onUpdateMetaGroup({ name }),
  );

  // Output files that can belong to this group: its current members (shown
  // pre-ticked) plus any ungrouped files. Files in *other* groups are excluded.
  const candidates = [...groups, ...ungroupedGroups];

  const openChecklist = (): void => {
    setPendingIds(new Set(groups.map((g) => g.id)));
    setShowChecklist(true);
  };

  const togglePending = (id: string): void =>
    setPendingIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const applyChecklist = (): void => {
    for (const m of groups) {
      if (!pendingIds.has(m.id)) onAssignToMetaGroup(m.id, null); // removed
    }
    for (const c of ungroupedGroups) {
      if (pendingIds.has(c.id)) onAssignToMetaGroup(c.id, metaGroup.id); // added
    }
    setShowChecklist(false);
  };

  return (
    <div
      className="rounded-xl overflow-visible"
      style={{ border: `1px solid ${metaGroup.color}50` }}
    >
      {/* Header */}
      <div
        className="flex items-center gap-2 px-3 py-2 rounded-t-xl"
        style={{ backgroundColor: `${metaGroup.color}18` }}
      >
        {/* Color swatch */}
        <ColorPicker
          color={metaGroup.color}
          onChange={(c) => onUpdateMetaGroup({ color: c })}
          swatchClassName="w-5 h-5 rounded-full border-2 border-bdr focus:outline-none cursor-pointer hover:scale-110 transition-transform duration-150"
        />

        {/* Editable name */}
        {rename.isEditing ? (
          <input
            {...rename.inputProps}
            className="flex-1 bg-ctrl text-ink-1 text-sm rounded px-2 py-0.5 outline-none focus:ring-1 focus:ring-acc min-w-0"
          />
        ) : (
          <button
            className="flex-1 text-left text-ink-1 text-sm font-semibold truncate hover:text-ink-1 transition-colors min-w-0"
            onDoubleClick={rename.start}
            title="Double-click to rename"
          >
            {metaGroup.name}
          </button>
        )}

        {/* Add / remove output files in this group (multi-select) */}
        <div className="relative flex-shrink-0" ref={checklistRef}>
          <button
            onClick={() =>
              showChecklist ? setShowChecklist(false) : openChecklist()
            }
            disabled={candidates.length === 0}
            className="text-ink-4 hover:text-ink-2 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            title={
              candidates.length === 0
                ? "No output files to add"
                : "Add or remove output files"
            }
          >
            <Plus size={14} strokeWidth={2} />
          </button>
          {showChecklist && candidates.length > 0 && (
            <div className="absolute right-0 top-6 z-50 w-56 bg-surf-2 border border-bdr-hi rounded-lg shadow-xl py-1">
              <div className="px-3 py-1.5 text-ink-4 text-[10px] uppercase tracking-wide">
                Output files in this group
              </div>
              <div className="max-h-60 overflow-y-auto py-0.5">
                {candidates.map((g) => (
                  <label
                    key={g.id}
                    className="w-full px-3 py-1.5 text-xs text-ink-2 hover:bg-surf-1 flex items-center gap-2 transition-colors cursor-pointer select-none"
                  >
                    <input
                      type="checkbox"
                      checked={pendingIds.has(g.id)}
                      onChange={() => togglePending(g.id)}
                      className="w-3.5 h-3.5 rounded accent-[var(--acc)] cursor-pointer flex-shrink-0"
                    />
                    <span
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ backgroundColor: g.color }}
                    />
                    <span className="truncate flex-1">{g.name}</span>
                    <span className="text-ink-4 flex-shrink-0">
                      {g.pageIndices.length}p
                    </span>
                  </label>
                ))}
              </div>
              <div className="px-2 pt-1.5 mt-0.5 border-t border-bdr flex items-center justify-end gap-2">
                <button
                  onClick={() => setShowChecklist(false)}
                  className="px-2 py-1 text-[11px] text-ink-4 hover:text-ink-2 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={applyChecklist}
                  className="px-2.5 py-1 rounded-md text-[11px] font-medium bg-acc/15 hover:bg-acc/25 border border-acc/25 hover:border-acc/45 text-acc transition-colors"
                >
                  Apply
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Delete group */}
        <button
          onClick={onRemoveMetaGroup}
          className="text-ink-4 hover:text-red-400 transition-colors flex-shrink-0"
          title="Remove group"
        >
          <X size={13} strokeWidth={2} />
        </button>
      </div>

      {/* Member groups */}
      <div className="px-2 py-2 space-y-1.5 bg-surf-3/20 rounded-b-xl">
        {groups.length === 0 ? (
          <div className="text-xs text-ink-4 italic px-2 py-1">
            No files yet — click + to add
          </div>
        ) : (
          groups.map((group) => (
            <GroupCard
              key={group.id}
              group={group}
              allMetaGroups={allMetaGroups}
              insideMetaGroup={true}
              onRemove={() => onRemoveGroup(group.id)}
              onUpdateColor={(color) => onUpdateGroupColor(group.id, color)}
              onUpdateName={(name) => onUpdateGroupName(group.id, name)}
              onSelectGroup={() => onSelectGroup(group.id)}
              onAssignToMetaGroup={(mgId) =>
                onAssignToMetaGroup(group.id, mgId)
              }
            />
          ))
        )}
      </div>
    </div>
  );
}

// ── GroupCard ───────────────────────────────────────────────────────────────

interface GroupCardProps {
  group: PageGroup;
  allMetaGroups: MetaGroup[];
  insideMetaGroup: boolean;
  onRemove: () => void;
  onUpdateColor: (color: string) => void;
  onUpdateName: (name: string) => void;
  onSelectGroup: () => void;
  onAssignToMetaGroup: (metaGroupId: string | null) => void;
}

function GroupCard({
  group,
  allMetaGroups,
  insideMetaGroup,
  onRemove,
  onUpdateColor,
  onUpdateName,
  onSelectGroup,
  onAssignToMetaGroup,
}: GroupCardProps) {
  const [showMetaGroupPicker, setShowMetaGroupPicker] = useState(false);
  const metaPickerRef = useRef<HTMLDivElement>(null);
  useClickOutside(
    metaPickerRef,
    () => setShowMetaGroupPicker(false),
    showMetaGroupPicker,
  );

  const rename = useInlineRename(group.name, onUpdateName);

  return (
    <div
      className={`rounded-xl bg-surf-1/60 p-3 cursor-pointer transition-colors hover:bg-surf-1${group.pageIndices.length === 0 ? " opacity-60" : ""}`}
      style={{ border: `1px solid ${group.color}50` }}
      onClick={group.pageIndices.length > 0 ? onSelectGroup : undefined}
      title={
        group.pageIndices.length > 0 ? "Click to select these pages" : undefined
      }
    >
      <div className="flex items-center gap-2">
        {/* Color swatch */}
        <ColorPicker color={group.color} onChange={onUpdateColor} />

        {/* Name */}
        {rename.isEditing ? (
          <input
            {...rename.inputProps}
            onClick={(e) => e.stopPropagation()}
            className="flex-1 bg-ctrl text-ink-1 text-sm rounded px-2 py-0.5 outline-none focus:ring-1 focus:ring-acc min-w-0"
          />
        ) : (
          <button
            className="flex-1 text-left text-ink-1 text-sm font-medium hover:text-acc transition-colors truncate min-w-0"
            onDoubleClick={rename.start}
            title="Double-click to rename"
          >
            {group.name}
          </button>
        )}

        {/* Group assignment button */}
        {insideMetaGroup ? (
          /* Remove from group */
          <button
            onClick={(e) => {
              e.stopPropagation();
              onAssignToMetaGroup(null);
            }}
            className="text-ink-4 hover:text-ink-2 transition-colors flex-shrink-0"
            title="Remove from group"
          >
            <FolderMinus size={13} strokeWidth={2} />
          </button>
        ) : allMetaGroups.length > 0 ? (
          /* Move to group dropdown */
          <div className="relative flex-shrink-0" ref={metaPickerRef}>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowMetaGroupPicker((v) => !v);
              }}
              className="text-ink-4 hover:text-ink-2 transition-colors"
              title="Move to group"
            >
              <FolderInput size={13} strokeWidth={2} />
            </button>
            {showMetaGroupPicker && (
              <div className="absolute right-0 bottom-6 z-50 bg-surf-2 border border-bdr-hi rounded-lg shadow-xl min-w-36 py-1">
                <div className="px-2 py-1 text-ink-4 text-[10px] uppercase tracking-wide">
                  Move to group
                </div>
                {allMetaGroups.map((mg) => (
                  <button
                    key={mg.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      onAssignToMetaGroup(mg.id);
                      setShowMetaGroupPicker(false);
                    }}
                    className="w-full text-left px-3 py-1.5 text-xs text-ink-2 hover:bg-surf-1 flex items-center gap-2 transition-colors"
                  >
                    <span
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ backgroundColor: mg.color }}
                    />
                    <span className="truncate">{mg.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : null}

        {/* Remove group */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="text-ink-4 hover:text-red-400 transition-colors flex-shrink-0"
          title="Remove group"
        >
          <X size={14} strokeWidth={2} />
        </button>
      </div>

      {/* Page summary */}
      <div className="mt-2 text-ink-4 text-[11px]">
        {group.pageIndices.length === 0 ? (
          <span className="italic">No pages assigned</span>
        ) : (
          <span>
            <span className="text-ink-2 font-medium">
              {group.pageIndices.length}
            </span>{" "}
            page
            {group.pageIndices.length !== 1 ? "s" : ""}:{" "}
            {indicesToRangeString(group.pageIndices)}
          </span>
        )}
      </div>
    </div>
  );
}
