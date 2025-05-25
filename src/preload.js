const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  saveMessage: (message) => ipcRenderer.send('save-message', message),
  deleteMessage: (timestamp) => ipcRenderer.send('delete-message', timestamp),
  onLoadMessages: (callback) => ipcRenderer.on('load-messages', (event, messages) => callback(messages))
});