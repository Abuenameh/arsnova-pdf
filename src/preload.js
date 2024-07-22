const { contextBridge, ipcRenderer } = require("electron/renderer");

contextBridge.exposeInMainWorld("electronAPI", {
  onOpenFile: (callback) =>
    ipcRenderer.on("open-file", (_event, file) => callback(file)),
});
