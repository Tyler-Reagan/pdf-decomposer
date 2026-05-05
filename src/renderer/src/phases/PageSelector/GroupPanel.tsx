import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { HexColorPicker } from "react-colorful";
import { usePdfStore } from "../../store/usePdfStore";
import { indicesToRangeString, GROUP_COLORS } from "../../types/pdf";
import type { MetaGroup, PageGroup } from "../../types/pdf";
import { Button } from "../../components/Button";

export function GroupPanel() {
  const {
    groups,
    metaGroups,
    loadedPdf,
    addGroup,
    removeGroup,
    updateGroup,
    setSelectedPageIndices,
    addMetaGroup,
    removeMetaGroup,
    updateMetaGroup,
    setGroupMetaGroup,
  } = usePdfStore();

  const totalPages = loadedPdf?.totalPages ?? 0;
  const assignedPages = new Set(groups.flatMap((g) => g.pageIndices));
  const unassignedCount = totalPages - assignedPages.size;

  const ungroupedGroups = groups.filter((g) => g.metaGroupId === null);

  return (
    <div className="flex flex-col h-full" data-tour="group-panel-inner">
      <div className="px-4 pt-4 pb-2">
        <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">
          Output Files
        </h2>
      </div>

      {/* Groups list */}
      <div className="flex-1 overflow-y-auto px-3 pb-3 space-y-2 min-h-0">
        {/* Meta group sections */}
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
          <div className="text-center py-6 text-slate-600 text-sm">
            No output files yet.
            <br />
            Select pages and assign them to a group.
          </div>
        )}
      </div>

      {/* Warnings */}
      {unassignedCount > 0 && groups.length > 0 && (
        <div className="mx-3 mb-2 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center gap-2">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#f59e0b"
            strokeWidth="2"
          >
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
          <span className="text-amber-400 text-xs">
            {unassignedCount} page{unassignedCount !== 1 ? "s" : ""} unassigned
          </span>
        </div>
      )}

      {/* Add buttons */}
      <div className="p-3 border-t border-slate-700/60 space-y-1.5">
        <Button
          variant="secondary"
          size="sm"
          className="w-full"
          onClick={() => addGroup()}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Add Output File
        </Button>
        <Button
          variant="secondary"
          size="sm"
          className="w-full"
          onClick={() => addMetaGroup()}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
            <line x1="12" y1="11" x2="12" y2="17" />
            <line x1="9" y1="14" x2="15" y2="14" />
          </svg>
          Add Meta Group
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
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameValue, setNameValue] = useState(metaGroup.name);
  const [showAddDropdown, setShowAddDropdown] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const addDropdownRef = useRef<HTMLDivElement>(null);
  const pickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setNameValue(metaGroup.name);
  }, [metaGroup.name]);

  // Close add dropdown on outside click
  useEffect(() => {
    if (!showAddDropdown) return;
    const handler = (e: MouseEvent) => {
      if (
        addDropdownRef.current &&
        !addDropdownRef.current.contains(e.target as Node)
      ) {
        setShowAddDropdown(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showAddDropdown]);

  // Close color picker on outside click
  useEffect(() => {
    if (!showColorPicker) return;
    const handler = (e: MouseEvent) => {
      if (
        pickerRef.current &&
        !pickerRef.current.contains(e.target as Node)
      ) {
        setShowColorPicker(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showColorPicker]);

  const commitName = () => {
    const trimmed = nameValue.trim();
    if (trimmed) onUpdateMetaGroup({ name: trimmed });
    else setNameValue(metaGroup.name);
    setIsEditingName(false);
  };

  return (
    <div
      className="rounded-xl border border-slate-700/50 overflow-visible"
      style={{ borderLeftColor: metaGroup.color, borderLeftWidth: 3 }}
    >
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 bg-slate-800/80 rounded-t-xl">
        {/* Color swatch */}
        <div className="relative flex-shrink-0">
          <button
            className="w-5 h-5 rounded-full border-2 border-slate-600 focus:outline-none cursor-pointer hover:scale-110 transition-transform duration-150"
            style={{ backgroundColor: metaGroup.color }}
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
                className="absolute left-7 top-0 z-50 bg-slate-900 border border-slate-700 rounded-xl p-3 shadow-2xl"
                style={{ width: 200 }}
              >
                <HexColorPicker
                  color={metaGroup.color}
                  onChange={(c) => onUpdateMetaGroup({ color: c })}
                />
                <div className="grid grid-cols-8 gap-1 mt-2">
                  {GROUP_COLORS.map((c) => (
                    <button
                      key={c}
                      className="w-5 h-5 rounded-full border border-slate-700 hover:scale-110 transition-transform"
                      style={{ backgroundColor: c }}
                      onClick={() => {
                        onUpdateMetaGroup({ color: c });
                        setShowColorPicker(false);
                      }}
                    />
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Editable name */}
        {isEditingName ? (
          <input
            autoFocus
            value={nameValue}
            onChange={(e) => setNameValue(e.target.value)}
            onBlur={commitName}
            onKeyDown={(e) => {
              if (e.key === "Enter") commitName();
              if (e.key === "Escape") {
                setNameValue(metaGroup.name);
                setIsEditingName(false);
              }
            }}
            className="flex-1 bg-slate-700 text-white text-sm rounded px-2 py-0.5 outline-none focus:ring-1 focus:ring-indigo-500 min-w-0"
          />
        ) : (
          <button
            className="flex-1 text-left text-slate-200 text-sm font-semibold truncate hover:text-white transition-colors min-w-0"
            onDoubleClick={() => setIsEditingName(true)}
            title="Double-click to rename"
          >
            {metaGroup.name}
          </button>
        )}

        {/* Add ungrouped groups to this meta group */}
        <div className="relative flex-shrink-0" ref={addDropdownRef}>
          <button
            onClick={() => setShowAddDropdown((v) => !v)}
            disabled={ungroupedGroups.length === 0}
            className="text-slate-500 hover:text-slate-300 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            title={
              ungroupedGroups.length === 0
                ? "No ungrouped files to add"
                : "Add files to this meta group"
            }
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </button>
          {showAddDropdown && ungroupedGroups.length > 0 && (
            <div className="absolute right-0 top-6 z-50 bg-slate-900 border border-slate-700 rounded-lg shadow-xl min-w-40 py-1">
              <div className="px-2 py-1 text-slate-600 text-[10px] uppercase tracking-wide">
                Add to this meta group
              </div>
              {ungroupedGroups.map((g) => (
                <button
                  key={g.id}
                  onClick={() => {
                    onAssignToMetaGroup(g.id, metaGroup.id);
                    setShowAddDropdown(false);
                  }}
                  className="w-full text-left px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-800 flex items-center gap-2 transition-colors"
                >
                  <span
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ backgroundColor: g.color }}
                  />
                  <span className="truncate">{g.name}</span>
                  <span className="text-slate-600 ml-auto flex-shrink-0">
                    {g.pageIndices.length}p
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Delete meta group */}
        <button
          onClick={onRemoveMetaGroup}
          className="text-slate-600 hover:text-red-400 transition-colors flex-shrink-0"
          title="Remove meta group"
        >
          <svg
            width="13"
            height="13"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      {/* Member groups */}
      <div className="px-2 py-2 space-y-1.5 bg-slate-900/40 rounded-b-xl">
        {groups.length === 0 ? (
          <div className="text-xs text-slate-600 italic px-2 py-1">
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
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameValue, setNameValue] = useState(group.name);
  const [showMetaGroupPicker, setShowMetaGroupPicker] = useState(false);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const pickerRef = useRef<HTMLDivElement>(null);
  const metaPickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setNameValue(group.name);
  }, [group.name]);

  useEffect(() => {
    if (isEditingName) nameInputRef.current?.select();
  }, [isEditingName]);

  useEffect(() => {
    if (!showColorPicker) return;
    const handler = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setShowColorPicker(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showColorPicker]);

  useEffect(() => {
    if (!showMetaGroupPicker) return;
    const handler = (e: MouseEvent) => {
      if (
        metaPickerRef.current &&
        !metaPickerRef.current.contains(e.target as Node)
      ) {
        setShowMetaGroupPicker(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showMetaGroupPicker]);

  const commitName = () => {
    const trimmed = nameValue.trim();
    if (trimmed) onUpdateName(trimmed);
    else setNameValue(group.name);
    setIsEditingName(false);
  };

  return (
    <div
      className={`rounded-xl bg-slate-800/60 border border-slate-700/50 p-3 cursor-pointer transition-colors hover:bg-slate-800${group.pageIndices.length === 0 ? " opacity-60" : ""}`}
      style={{ borderLeftColor: group.color, borderLeftWidth: 3 }}
      onClick={group.pageIndices.length > 0 ? onSelectGroup : undefined}
      title={
        group.pageIndices.length > 0 ? "Click to select these pages" : undefined
      }
    >
      <div className="flex items-center gap-2">
        {/* Color swatch */}
        <div className="relative flex-shrink-0">
          <button
            className="w-6 h-6 rounded-full border-2 border-slate-600 flex-shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 cursor-pointer hover:scale-110 transition-transform duration-150"
            style={{ backgroundColor: group.color }}
            onClick={(e) => {
              e.stopPropagation();
              setShowColorPicker((v) => !v);
            }}
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
                      onClick={() => {
                        onUpdateColor(c);
                        setShowColorPicker(false);
                      }}
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
            onClick={(e) => e.stopPropagation()}
            onBlur={commitName}
            onKeyDown={(e) => {
              if (e.key === "Enter") commitName();
              if (e.key === "Escape") {
                setNameValue(group.name);
                setIsEditingName(false);
              }
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

        {/* Meta group assignment button */}
        {insideMetaGroup ? (
          /* Remove from meta group */
          <button
            onClick={(e) => {
              e.stopPropagation();
              onAssignToMetaGroup(null);
            }}
            className="text-slate-600 hover:text-slate-400 transition-colors flex-shrink-0"
            title="Remove from meta group"
          >
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
              <line x1="9" y1="14" x2="15" y2="14" />
            </svg>
          </button>
        ) : allMetaGroups.length > 0 ? (
          /* Move to meta group dropdown */
          <div className="relative flex-shrink-0" ref={metaPickerRef}>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowMetaGroupPicker((v) => !v);
              }}
              className="text-slate-600 hover:text-slate-400 transition-colors"
              title="Move to meta group"
            >
              <svg
                width="13"
                height="13"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                <line x1="12" y1="11" x2="12" y2="17" />
                <line x1="9" y1="14" x2="15" y2="14" />
              </svg>
            </button>
            {showMetaGroupPicker && (
              <div className="absolute right-0 bottom-6 z-50 bg-slate-900 border border-slate-700 rounded-lg shadow-xl min-w-36 py-1">
                <div className="px-2 py-1 text-slate-600 text-[10px] uppercase tracking-wide">
                  Move to meta group
                </div>
                {allMetaGroups.map((mg) => (
                  <button
                    key={mg.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      onAssignToMetaGroup(mg.id);
                      setShowMetaGroupPicker(false);
                    }}
                    className="w-full text-left px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-800 flex items-center gap-2 transition-colors"
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
          className="text-slate-600 hover:text-red-400 transition-colors flex-shrink-0"
          title="Remove group"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
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
            <span className="text-slate-300 font-medium">
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
