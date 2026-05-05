export type TourPlacement = "top" | "bottom" | "left" | "right";

export interface TourStep {
  target: string; // data-tour attribute value
  title: string;
  description: string;
  hint?: string; // explicit call-to-action shown in the dialog
  placement: TourPlacement;
}

export const TOUR_STEPS: TourStep[] = [
  {
    target: "drop-zone",
    title: "Load a PDF",
    description:
      "Drag and drop any PDF here, or click to browse. Your file stays on your machine — nothing is uploaded.",
    // No hint — the demo button and gate notice handle guidance here.
    placement: "bottom",
  },
  {
    target: "page-grid",
    title: "Select pages",
    description:
      "Click thumbnails to select pages. Hold Shift to extend a range, Ctrl/Cmd to toggle individuals, or drag to lasso many at once.",
    hint: "Try selecting a few pages now — they'll highlight in indigo when selected.",
    placement: "left",
  },
  {
    target: "floating-bar",
    title: "Assign to a group",
    description:
      "Selected pages appear here. Create a new output group or assign to an existing one — each group becomes a separate PDF file.",
    hint: "Select some pages above, then click 'New Group' in this bar to assign them.",
    placement: "top",
  },
  {
    target: "group-panel",
    title: "Manage output files",
    description:
      "Every group you create appears here. Rename one by double-clicking its name, change its color with the swatch, or nest groups inside a meta-group (folder).",
    hint: "Double-click a group name to rename it before continuing.",
    placement: "left",
  },
  {
    target: "configure-output-btn",
    title: "Head to output configuration",
    description:
      "Once you're happy with your groups, click 'Configure Output' to set filenames and choose where each PDF will be saved.",
    hint: "Click the 'Configure Output' button above to continue.",
    placement: "bottom",
  },
  {
    target: "output-config",
    title: "Name and locate your files",
    description:
      "Set the output filename for each group and choose where to save. Use 'Same location' to send all files to one folder.",
    // No hint — gated step; gate notice handles guidance.
    placement: "left",
  },
  {
    target: "process-btn",
    title: "Split!",
    description:
      "Once every group has a save folder chosen, this button activates. Click it and your output PDFs are written instantly.",
    hint: "Choose a save folder for each group, then click Split PDF to finish.",
    placement: "top",
  },
];
