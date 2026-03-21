import { ipcMain } from "electron";
import { autoUpdater } from "electron-updater";

export function registerUpdateHandlers(): void {
  ipcMain.handle("download-update", () => autoUpdater.downloadUpdate());
  ipcMain.on("install-update", () => autoUpdater.quitAndInstall());
}
