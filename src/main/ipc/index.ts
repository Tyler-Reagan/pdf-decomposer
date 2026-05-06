import { registerPdfHandlers } from "./pdf-handlers";
import { registerFsHandlers } from "./fs-handlers";
import { registerUpdateHandlers } from "./update-handlers";
import { registerPdfViewerHandlers } from "./pdf-viewer-handlers";

export function registerIpcHandlers(): void {
  registerPdfHandlers();
  registerFsHandlers();
  registerUpdateHandlers();
  registerPdfViewerHandlers();
}
