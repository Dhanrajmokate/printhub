const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  getSystemPrinters: () => ipcRenderer.invoke('get-system-printers'),
  printJob: (jobData) => ipcRenderer.invoke('print-job', jobData),
  getConfig: () => ipcRenderer.invoke('get-config'),
  saveConfig: (newConfig) => ipcRenderer.invoke('save-config', newConfig),
  reloadApp: () => ipcRenderer.invoke('reload-app'),
  openProofFolder: () => ipcRenderer.invoke('open-proof-folder')
});
