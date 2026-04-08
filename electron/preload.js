const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  sendRequest: (config) => ipcRenderer.invoke('send-request', config)
});
