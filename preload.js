const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('libraryApi', {
  scan: () => ipcRenderer.invoke('library:scan'),
  importMedia: (targetFolderId) => ipcRenderer.invoke('library:import-media', targetFolderId),
  createFolder: (parentFolderId, name) => ipcRenderer.invoke('library:create-folder', parentFolderId, name),
  deleteFolder: (folderId) => ipcRenderer.invoke('library:delete-folder', folderId),
  deleteMedia: (mediaPath) => ipcRenderer.invoke('library:delete-media', mediaPath),
  moveMedia: (mediaPath, targetFolderId) => ipcRenderer.invoke('library:move-media', mediaPath, targetFolderId),
  reorderMedia: (folderId, orderedMediaPaths) => ipcRenderer.invoke('library:reorder-media', folderId, orderedMediaPaths),
  openLibraryFolder: () => ipcRenderer.invoke('library:open-folder'),
});
