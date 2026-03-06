# PDF Decomposer

A desktop app for splitting PDFs into multiple smaller PDFs by visually selecting and grouping pages.

Built with Electron, React, and pdf-lib.

## Features

- Drag-and-drop PDF loading
- Visual page thumbnails with lazy rendering via Web Worker
- Flexible page selection: click, shift-click, ctrl-click, or drag to lasso
- Group pages with custom labels and colors
- Configure output filenames and destination folder
- Outputs one PDF per group, preserving original page content

## Installation

Download the latest release from the [Releases](../../releases) page:

- **PDFDecomposer-Setup-x.x.x.exe** — NSIS installer (installs to `%LOCALAPPDATA%`, no admin required)
- **PDFDecomposer-portable.exe** — single executable, no installation needed

## Development

**Prerequisites:** Node.js 20+

```bash
npm install
npm run dev
```

**Build (transpile only):**
```bash
npm run build
```

**Package for Windows (run on Windows or via CI):**
```bash
npm run dist
```

Before packaging, place a 256x256 icon at `resources/icon.ico`. The CI workflow generates a placeholder automatically if none is present.

## CI / Releases

GitHub Actions builds Windows artifacts on every push to a `v*` tag and on manual dispatch. Artifacts are attached to the GitHub Release automatically.

To publish a release:

```bash
git tag v1.0.0
git push origin v1.0.0
```

## Tech Stack

| Layer | Library |
|---|---|
| Shell | Electron 33 |
| Bundler | electron-vite 2 / Vite 5 |
| UI | React 19 + Tailwind v4 |
| State | Zustand 5 + Immer |
| Animation | Framer Motion 11 |
| PDF rendering | pdfjs-dist 4 (Web Worker) |
| PDF writing | pdf-lib 1.17 (main process) |

## License

MIT
