import { app, shell, BrowserWindow, nativeTheme } from "electron";
import { join } from "path";
import { electronApp, optimizer, is } from "@electron-toolkit/utils";
import windowStateKeeper from "electron-window-state";
import { registerIpcHandlers } from "./ipc";
import { TITLE_BAR_HEIGHT } from "../shared/window-chrome";

const INITIAL_WINDOW_WIDTH = 1440;
const INITIAL_WINDOW_HEIGHT = 960;
const MIN_WINDOW_WIDTH = 960;
const MIN_WINDOW_HEIGHT = 640;

function createWindow(): void {
  // Persists size/position to userData/window-state.json and restores it on
  // the next launch; falls back to the defaults below on first run.
  const windowState = windowStateKeeper({
    defaultWidth: INITIAL_WINDOW_WIDTH,
    defaultHeight: INITIAL_WINDOW_HEIGHT,
  });

  const mainWindow = new BrowserWindow({
    x: windowState.x,
    y: windowState.y,
    width: windowState.width,
    height: windowState.height,
    minWidth: MIN_WINDOW_WIDTH,
    minHeight: MIN_WINDOW_HEIGHT,
    show: false,
    autoHideMenuBar: true,
    icon: join(__dirname, "../../resources/icon.ico"),
    backgroundColor: "#0f172a",
    titleBarStyle: "hidden",
    titleBarOverlay: {
      color: "#0f172a",
      symbolColor: "#94a3b8",
      height: TITLE_BAR_HEIGHT,
    },
    webPreferences: {
      preload: join(__dirname, "../preload/index.js"),
      // sandbox must stay false so the preload script can use Node APIs;
      // contextIsolation keeps the renderer isolated despite this.
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  windowState.manage(mainWindow);

  mainWindow.on("ready-to-show", () => {
    mainWindow.show();
  });

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url);
    return { action: "deny" };
  });

  if (is.dev && process.env["ELECTRON_RENDERER_URL"]) {
    mainWindow.loadURL(process.env["ELECTRON_RENDERER_URL"]);
  } else {
    mainWindow.loadFile(join(__dirname, "../renderer/index.html"));
  }
}

// Force dark theme so native OS dialogs (file/folder pickers) use dark styling
nativeTheme.themeSource = "dark";

app.whenReady().then(() => {
  electronApp.setAppUserModelId("com.pdfdecomposer.app");

  app.on("browser-window-created", (_, window) => {
    optimizer.watchWindowShortcuts(window);
  });

  registerIpcHandlers();
  createWindow();

  app.on("activate", function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
