// Custom title bar geometry shared between the main-process BrowserWindow
// config and the renderer's draggable header. The two must stay in sync (the
// renderer's header height and the OS-drawn overlay controls both key off
// this), so it lives in one place instead of two hardcoded numbers that can
// drift apart.
export const TITLE_BAR_HEIGHT = 44;

// Width Windows reserves for the native minimize/maximize/close buttons that
// titleBarOverlay draws over our content. The renderer's draggable header
// pads its right edge by this much on win32 so nothing sits underneath them.
export const WIN_TITLE_BAR_CONTROLS_WIDTH = 142;
