const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  saveMessage: (message) => ipcRenderer.send('save-message', message),
  deleteMessage: (timestamp) => ipcRenderer.send('delete-message', timestamp),
  onLoadMessages: (callback) => ipcRenderer.on('load-messages', (_, messages) => callback(messages)),
  onStatsUpdated: (callback) => ipcRenderer.on('stats-updated', (_, stats) => callback(stats)),
  onStatsLoaded: (callback) => ipcRenderer.on('stats-loaded', (_, stats) => callback(stats)),
  getStats: () => ipcRenderer.send('get-stats'),
  onSetMessage: (callback) => ipcRenderer.on('set-message', (event, message) => callback(message)),
  resetStats: () => ipcRenderer.send('reset-stats')
});