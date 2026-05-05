import { ipcMain, dialog, app } from "electron";
import { join } from "path";

export function registerFsHandlers(): void {
  ipcMain.handle("get-demo-pdf-path", () => {
    const base = app.isPackaged ? process.resourcesPath : join(app.getAppPath(), "resources");
    return join(base, "demo.pdf");
  });

  ipcMain.handle(
    "choose-save-directory",
    async (_event, defaultPath?: string) => {
      const result = await dialog.showOpenDialog({
        title: "Choose Output Folder",
        defaultPath: defaultPath ?? app.getPath("documents"),
        properties: ["openDirectory", "createDirectory"],
      });

      if (result.canceled || result.filePaths.length === 0) {
        return null;
      }
      return result.filePaths[0];
    },
  );
}
