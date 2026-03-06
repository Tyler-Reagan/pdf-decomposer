import { registerPdfHandlers } from './pdf-handlers'
import { registerFsHandlers } from './fs-handlers'

export function registerIpcHandlers(): void {
  registerPdfHandlers()
  registerFsHandlers()
}
