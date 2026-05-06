#!/usr/bin/env node
// Generates resources/demo.pdf at build time so it can be bundled as an
// extraResource by electron-builder. The repo's .gitignore intentionally
// excludes *.pdf, so the file is regenerated on each build instead of
// being committed.

const fs = require("fs");
const path = require("path");
const { PDFDocument, StandardFonts, rgb } = require("pdf-lib");

const OUT_PATH = path.join(__dirname, "..", "resources", "demo.pdf");

const PAGES = [
  {
    title: "PDF Decomposer — Demo",
    body: [
      "This is a sample document used by the in-app tour.",
      "Use it to explore page selection, grouping, and split output.",
      "Each page below has distinct content so groupings are visible.",
    ],
  },
  {
    title: "Section 1 — Overview",
    body: [
      "Decompose long PDFs by selecting pages visually.",
      "Drag or click to build groups that become separate output PDFs.",
    ],
  },
  {
    title: "Section 2 — Selection",
    body: [
      "Click a page thumbnail to select it.",
      "Shift-click to extend a range.",
      "Ctrl/Cmd-click to toggle individual pages.",
    ],
  },
  {
    title: "Section 3 — Groups",
    body: [
      "Assign selected pages to a group from the floating action bar.",
      "Each group writes one output PDF when you run the split.",
    ],
  },
  {
    title: "Section 4 — Output",
    body: [
      "Configure the output folder and filename pattern.",
      "Run the split to produce a PDF per group.",
    ],
  },
  {
    title: "Section 5 — Done",
    body: [
      "That's the full flow. Replace this demo with your own PDF anytime.",
    ],
  },
];

async function main() {
  const doc = await PDFDocument.create();
  doc.setTitle("PDF Decomposer Demo");
  doc.setAuthor("PDF Decomposer");
  doc.setSubject("Sample document for the in-app tour");
  doc.setCreator("scripts/build-demo-pdf.cjs");

  const titleFont = await doc.embedFont(StandardFonts.HelveticaBold);
  const bodyFont = await doc.embedFont(StandardFonts.Helvetica);

  const W = 612;
  const H = 792;

  PAGES.forEach((spec, idx) => {
    const page = doc.addPage([W, H]);

    page.drawRectangle({
      x: 0,
      y: H - 96,
      width: W,
      height: 96,
      color: rgb(0.13, 0.16, 0.22),
    });
    page.drawText(spec.title, {
      x: 56,
      y: H - 60,
      size: 22,
      font: titleFont,
      color: rgb(0.95, 0.97, 1),
    });
    page.drawText(`Page ${idx + 1} of ${PAGES.length}`, {
      x: 56,
      y: H - 84,
      size: 11,
      font: bodyFont,
      color: rgb(0.7, 0.78, 0.9),
    });

    let y = H - 150;
    for (const line of spec.body) {
      page.drawText(line, {
        x: 56,
        y,
        size: 13,
        font: bodyFont,
        color: rgb(0.1, 0.12, 0.16),
        maxWidth: W - 112,
        lineHeight: 18,
      });
      y -= 36;
    }

    page.drawText(`— ${idx + 1} —`, {
      x: W / 2 - 16,
      y: 40,
      size: 10,
      font: bodyFont,
      color: rgb(0.5, 0.55, 0.62),
    });
  });

  const bytes = await doc.save();
  fs.mkdirSync(path.dirname(OUT_PATH), { recursive: true });
  fs.writeFileSync(OUT_PATH, bytes);
  console.log(
    `Generated ${path.relative(process.cwd(), OUT_PATH)} (${bytes.length} bytes, ${PAGES.length} pages)`,
  );
}

main().catch((err) => {
  console.error("Failed to generate demo.pdf:", err);
  process.exit(1);
});
