const path = require('node:path');
const { pathToFileURL } = require('node:url');
const fs = require('node:fs/promises');
const { app, BrowserWindow, Menu, ipcMain, dialog, shell } = require('electron');

const MEDIA_EXTENSIONS = new Set([
  '.mp4', '.mov', '.m4v', '.webm', '.mkv', '.avi', '.wmv',
  '.mp3', '.wav', '.m4a', '.ogg', '.aac', '.flac',
]);

function getLibraryRoot() {
  return path.join(app.getPath('documents'), 'VideoBrowserLibrary');
}

function sanitizeSegment(name) {
  return name.trim().replace(/[\\/:*?"<>|]/g, '_');
}

function sanitizeRelativePath(relPath) {
  return relPath
    .split('/')
    .map((segment) => sanitizeSegment(segment))
    .filter(Boolean)
    .join('/');
}

async function ensureLibrary() {
  const root = getLibraryRoot();
  await fs.mkdir(root, { recursive: true });
  await fs.mkdir(path.join(root, 'Uncategorized'), { recursive: true });
  return root;
}

function extensionToType(ext) {
  const video = new Set(['.mp4', '.mov', '.m4v', '.webm', '.mkv', '.avi', '.wmv']);
  return video.has(ext) ? `video/${ext.slice(1)}` : `audio/${ext.slice(1)}`;
}

async function collectFoldersAndMedia(root, currentPath = '', folders = [], mediaItems = []) {
  const dirPath = currentPath ? path.join(root, currentPath) : root;
  const entries = await fs.readdir(dirPath, { withFileTypes: true });

  for (const entry of entries) {
    if (entry.isDirectory()) {
      const relPath = currentPath ? `${currentPath}/${entry.name}` : entry.name;
      folders.push({ id: relPath, name: entry.name, relPath });
      await collectFoldersAndMedia(root, relPath, folders, mediaItems);
      continue;
    }

    if (!entry.isFile()) {
      continue;
    }

    const ext = path.extname(entry.name).toLowerCase();
    if (!MEDIA_EXTENSIONS.has(ext)) {
      continue;
    }

    const folderId = currentPath || 'Uncategorized';
    const fullPath = path.join(dirPath, entry.name);
    mediaItems.push({
      id: fullPath,
      name: entry.name,
      folderId,
      path: fullPath,
      url: pathToFileURL(fullPath).href,
      type: extensionToType(ext),
    });
  }
}

async function scanLibrary() {
  const root = await ensureLibrary();
  const folders = [];
  const mediaItems = [];

  await collectFoldersAndMedia(root, '', folders, mediaItems);

  folders.sort((a, b) => a.relPath.localeCompare(b.relPath));

  return {
    libraryPath: root,
    folders: [{ id: 'all', name: 'All Media' }, ...folders.map(({ id, name, relPath }) => ({ id, name, relPath }))],
    mediaItems,
  };
}

async function uniquePath(targetDir, baseName) {
  const ext = path.extname(baseName);
  const stem = path.basename(baseName, ext);
  let candidate = path.join(targetDir, baseName);
  let i = 1;
  while (true) {
    try {
      await fs.access(candidate);
      candidate = path.join(targetDir, `${stem} (${i})${ext}`);
      i += 1;
    } catch {
      return candidate;
    }
  }
}

async function copyFilesIntoFolder(filePaths, folderId) {
  const root = await ensureLibrary();
  const safeFolderPath = sanitizeRelativePath(folderId) || 'Uncategorized';
  const targetDir = path.join(root, safeFolderPath);
  await fs.mkdir(targetDir, { recursive: true });

  for (const src of filePaths) {
    const ext = path.extname(src).toLowerCase();
    if (!MEDIA_EXTENSIONS.has(ext)) {
      continue;
    }
    const destination = await uniquePath(targetDir, path.basename(src));
    await fs.copyFile(src, destination);
  }
}

function registerIpcHandlers() {
  ipcMain.handle('library:scan', async () => scanLibrary());

  ipcMain.handle('library:create-folder', async (_event, parentFolderId, name) => {
    const root = await ensureLibrary();
    const safeName = sanitizeSegment(name);
    if (!safeName || safeName.toLowerCase() === 'all') {
      throw new Error('Invalid folder name.');
    }

    const safeParent = parentFolderId && parentFolderId !== 'all' ? sanitizeRelativePath(parentFolderId) : '';
    const newFolderPath = safeParent ? `${safeParent}/${safeName}` : safeName;
    await fs.mkdir(path.join(root, newFolderPath), { recursive: true });
    return scanLibrary();
  });

  ipcMain.handle('library:delete-folder', async (_event, folderId) => {
    if (folderId === 'all' || folderId === 'Uncategorized') {
      throw new Error('Cannot delete this folder.');
    }
    const root = await ensureLibrary();
    const safeFolder = sanitizeRelativePath(folderId);
    await fs.rm(path.join(root, safeFolder), { recursive: true, force: true });
    return scanLibrary();
  });

  ipcMain.handle('library:delete-media', async (_event, mediaPath) => {
    await fs.rm(mediaPath, { force: true });
    return scanLibrary();
  });

  ipcMain.handle('library:move-media', async (_event, mediaPath, targetFolderId) => {
    const root = await ensureLibrary();
    const safeTarget = sanitizeRelativePath(targetFolderId);
    const targetDir = path.join(root, safeTarget || 'Uncategorized');
    await fs.mkdir(targetDir, { recursive: true });
    const destination = await uniquePath(targetDir, path.basename(mediaPath));
    await fs.rename(mediaPath, destination);
    return scanLibrary();
  });

  ipcMain.handle('library:import-media', async (_event, targetFolderId) => {
    const result = await dialog.showOpenDialog({
      title: 'Import media files',
      properties: ['openFile', 'multiSelections'],
      filters: [{ name: 'Media', extensions: Array.from(MEDIA_EXTENSIONS).map((ext) => ext.slice(1)) }],
    });

    if (result.canceled || result.filePaths.length === 0) {
      return scanLibrary();
    }

    await copyFilesIntoFolder(result.filePaths, targetFolderId === 'all' ? 'Uncategorized' : targetFolderId);
    return scanLibrary();
  });

  ipcMain.handle('library:open-folder', async () => {
    const root = await ensureLibrary();
    await shell.openPath(root);
    return root;
  });
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    autoHideMenuBar: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  win.loadFile(path.join(__dirname, 'index.html'));

  const menu = Menu.buildFromTemplate([
    { label: 'File', submenu: [{ role: 'reload' }, { type: 'separator' }, { role: 'quit' }] },
    { label: 'View', submenu: [{ role: 'togglefullscreen' }, { role: 'toggledevtools' }] },
  ]);
  Menu.setApplicationMenu(menu);
}

app.whenReady().then(() => {
  registerIpcHandlers();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
