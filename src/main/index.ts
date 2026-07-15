import { app, shell, BrowserWindow, nativeTheme } from "electron";
import { join } from "path";
import { electronApp, optimizer, is } from "@electron-toolkit/utils";
import { autoUpdater } from "electron-updater";
import log from "electron-log/main";
import { registerIpcHandlers } from "./ipc";

log.initialize();
log.transports.file.level = "info";
autoUpdater.logger = log;

function createWindow(): void {
  const mainWindow = new BrowserWindow({
    width: 1440,
    height: 960,
    minWidth: 960,
    minHeight: 640,
    show: false,
    autoHideMenuBar: true,
    icon: join(__dirname, "../../resources/icon.ico"),
    backgroundColor: "#0f172a",
    titleBarStyle: "hidden",
    titleBarOverlay: {
      color: "#0f172a",
      symbolColor: "#94a3b8",
      height: 38,
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

function setupAutoUpdater(): void {
  autoUpdater.setFeedURL({
    provider: "github",
    owner: "Tyler-Reagan",
    repo: "pdf-decomposer",
  });
  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on("update-available", (info) => {
    BrowserWindow.getAllWindows()[0]?.webContents.send(
      "update-available",
      info,
    );
  });

  autoUpdater.on("download-progress", (progress) => {
    BrowserWindow.getAllWindows()[0]?.webContents.send(
      "update-progress",
      progress,
    );
  });

  autoUpdater.on("update-downloaded", (info) => {
    BrowserWindow.getAllWindows()[0]?.webContents.send(
      "update-downloaded",
      info,
    );
  });

  autoUpdater.on("error", (err) => {
    console.error("Auto-updater error:", err.message);
    BrowserWindow.getAllWindows()[0]?.webContents.send(
      "update-error",
      err.message,
    );
  });

  autoUpdater.checkForUpdates().catch((err) => {
    console.error("Update check failed:", err.message);
  });
}

app.whenReady().then(() => {
  electronApp.setAppUserModelId("com.pdfdecomposer.app");

  app.on("browser-window-created", (_, window) => {
    optimizer.watchWindowShortcuts(window);
  });

  registerIpcHandlers();
  createWindow();

  if (!is.dev) {
    setupAutoUpdater();
  }

  app.on("activate", function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
