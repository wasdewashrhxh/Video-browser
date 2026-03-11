const state = {
  folders: [],
  activeFolderId: 'all',
  mediaItems: [],
  libraryPath: '',
};

const folderList = document.getElementById('folderList');
const mediaGrid = document.getElementById('mediaGrid');
const createFolderBtn = document.getElementById('createFolderBtn');
const importBtn = document.getElementById('importBtn');
const refreshBtn = document.getElementById('refreshBtn');
const openLibraryBtn = document.getElementById('openLibraryBtn');
const activeFolderTitle = document.getElementById('activeFolderTitle');
const playerWrapper = document.getElementById('playerWrapper');
const nowPlaying = document.getElementById('nowPlaying');
const libraryPathLabel = document.getElementById('libraryPathLabel');
const arrangeHint = document.getElementById('arrangeHint');
const folderModal = document.getElementById('folderModal');
const folderForm = document.getElementById('folderForm');
const folderNameInput = document.getElementById('folderNameInput');
const folderFormError = document.getElementById('folderFormError');
const cancelFolderBtn = document.getElementById('cancelFolderBtn');

createFolderBtn.addEventListener('click', showCreateFolderModal);
importBtn.addEventListener('click', importMedia);
refreshBtn.addEventListener('click', loadLibrary);
openLibraryBtn.addEventListener('click', () => window.libraryApi.openLibraryFolder());
folderForm.addEventListener('submit', onFolderFormSubmit);
cancelFolderBtn.addEventListener('click', closeFolderModal);
folderModal.addEventListener('click', (event) => {
  if (event.target.dataset.closeModal === 'true') {
    closeFolderModal();
  }
});

window.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && !folderModal.classList.contains('hidden')) {
    closeFolderModal();
  }
});

async function loadLibrary() {
  const data = await window.libraryApi.scan();
  state.folders = data.folders;
  state.mediaItems = data.mediaItems;
  state.libraryPath = data.libraryPath;

  if (!state.folders.some((folder) => folder.id === state.activeFolderId)) {
    state.activeFolderId = 'all';
  }

  libraryPathLabel.textContent = `Library folder: ${state.libraryPath}`;
  render();
}

function showCreateFolderModal() {
  folderForm.reset();
  setFolderError('');
  folderModal.classList.remove('hidden');
  folderModal.setAttribute('aria-hidden', 'false');

  requestAnimationFrame(() => {
    folderNameInput.focus();
  });
}

function closeFolderModal() {
  folderModal.classList.add('hidden');
  folderModal.setAttribute('aria-hidden', 'true');
}

async function onFolderFormSubmit(event) {
  event.preventDefault();
  const name = folderNameInput.value.trim();

  if (!name) {
    setFolderError('Folder name is required.');
    return;
  }

  const parentId = state.activeFolderId === 'all' ? '' : state.activeFolderId;
  const duplicate = state.folders.some((folder) => {
    if (!folder.relPath) return false;
    const folderParent = folder.relPath.includes('/') ? folder.relPath.slice(0, folder.relPath.lastIndexOf('/')) : '';
    return folderParent === parentId && folder.name.toLowerCase() === name.toLowerCase();
  });
  if (duplicate) {
    setFolderError('A folder with this name already exists in this location.');
    return;
  }

  await window.libraryApi.createFolder(parentId, name);
  closeFolderModal();
  await loadLibrary();
}

function setFolderError(message) {
  folderFormError.textContent = message;
  folderFormError.hidden = !message;
}

async function importMedia() {
  const target = state.activeFolderId === 'all' ? 'Uncategorized' : state.activeFolderId;
  await window.libraryApi.importMedia(target);
  await loadLibrary();
}

function selectFolder(folderId) {
  state.activeFolderId = folderId;
  render();
}

function mediaForCurrentFolder() {
  if (state.activeFolderId === 'all') return state.mediaItems;
  return state.mediaItems.filter((item) => item.folderId === state.activeFolderId || item.folderId.startsWith(`${state.activeFolderId}/`));
}

function mediaForExactActiveFolder() {
  if (state.activeFolderId === 'all') return [];
  return state.mediaItems.filter((item) => item.folderId === state.activeFolderId);
}

function openPlayer(itemId) {
  const selected = state.mediaItems.find((item) => item.id === itemId);
  if (!selected) return;

  const isVideo = selected.type.startsWith('video/');
  playerWrapper.classList.remove('empty');
  playerWrapper.innerHTML = '';

  const media = document.createElement(isVideo ? 'video' : 'audio');
  media.controls = true;
  media.src = selected.url;
  if (isVideo) media.playsInline = true;

  playerWrapper.appendChild(media);
  nowPlaying.textContent = `Now playing: ${selected.name}`;
}

async function moveToFolder(mediaId, folderId) {
  await window.libraryApi.moveMedia(mediaId, folderId);
  await loadLibrary();
}

async function reorderInsideActiveFolder(draggedMediaId, targetMediaId) {
  if (state.activeFolderId === 'all' || !draggedMediaId || draggedMediaId === targetMediaId) return;

  const ordered = mediaForExactActiveFolder().map((item) => item.id);
  const fromIndex = ordered.indexOf(draggedMediaId);
  const toIndex = ordered.indexOf(targetMediaId);
  if (fromIndex < 0 || toIndex < 0 || fromIndex === toIndex) return;

  const [moved] = ordered.splice(fromIndex, 1);
  ordered.splice(toIndex, 0, moved);

  await window.libraryApi.reorderMedia(state.activeFolderId, ordered);
  await loadLibrary();
}

async function deleteFolder(folderId) {
  if (!window.confirm(`Delete folder "${folderId}" and all files in it?`)) return;
  await window.libraryApi.deleteFolder(folderId);
  if (state.activeFolderId === folderId || state.activeFolderId.startsWith(`${folderId}/`)) {
    state.activeFolderId = 'all';
  }
  await loadLibrary();
}

async function deleteMedia(mediaId) {
  await window.libraryApi.deleteMedia(mediaId);
  await loadLibrary();
}

function renderFolders() {
  folderList.innerHTML = '';
  state.folders.forEach((folder) => {
    const li = document.createElement('li');
    li.className = 'folder-item';
    if (folder.id === state.activeFolderId) li.classList.add('active');

    const row = document.createElement('div');
    row.className = 'folder-row';

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'folder-select';
    const depth = folder.relPath ? folder.relPath.split('/').length - 1 : 0;
    button.style.paddingLeft = `${0.8 + (depth * 1.0)}rem`;
    const folderCount = folder.id === 'all'
      ? state.mediaItems.length
      : state.mediaItems.filter((item) => item.folderId === folder.id || item.folderId.startsWith(`${folder.id}/`)).length;
    const folderLabel = folder.relPath ? folder.relPath : folder.name;
    button.textContent = `${folderLabel} (${folderCount})`;
    button.addEventListener('click', () => selectFolder(folder.id));
    row.appendChild(button);

    if (!['all', 'Uncategorized'].includes(folder.id)) {
      const deleteBtn = document.createElement('button');
      deleteBtn.type = 'button';
      deleteBtn.className = 'danger-btn';
      deleteBtn.textContent = 'Delete';
      deleteBtn.addEventListener('click', () => deleteFolder(folder.id));
      row.appendChild(deleteBtn);
    }

    if (folder.id !== 'all') {
      li.addEventListener('dragover', (event) => {
        event.preventDefault();
        li.classList.add('drag-over');
      });
      li.addEventListener('dragleave', () => li.classList.remove('drag-over'));
      li.addEventListener('drop', async (event) => {
        event.preventDefault();
        const mediaId = event.dataTransfer.getData('text/plain');
        li.classList.remove('drag-over');
        await moveToFolder(mediaId, folder.id);
      });
    }

    li.appendChild(row);
    folderList.appendChild(li);
  });
}

function renderMedia() {
  mediaGrid.innerHTML = '';
  const items = mediaForCurrentFolder();

  if (state.activeFolderId === 'all') {
    arrangeHint.textContent = 'To custom-order media, open a specific folder and drag items there.';
  } else {
    arrangeHint.textContent = 'Tip: drag items up/down in this folder to set custom order.';
  }

  if (items.length === 0) {
    const empty = document.createElement('li');
    empty.textContent = 'No media in this folder yet.';
    empty.className = 'media-item';
    mediaGrid.appendChild(empty);
    return;
  }

  items.forEach((item) => {
    const li = document.createElement('li');
    li.className = 'media-item';
    li.draggable = true;
    li.addEventListener('dragstart', (event) => {
      event.dataTransfer.setData('text/plain', item.id);
      event.dataTransfer.setData('application/x-reorder-media-id', item.id);
    });

    li.addEventListener('dragover', (event) => {
      if (state.activeFolderId !== 'all' && item.folderId === state.activeFolderId) {
        event.preventDefault();
      }
    });

    li.addEventListener('drop', async (event) => {
      const draggedId = event.dataTransfer.getData('application/x-reorder-media-id');
      if (state.activeFolderId !== 'all' && item.folderId === state.activeFolderId && draggedId) {
        event.preventDefault();
        await reorderInsideActiveFolder(draggedId, item.id);
      }
    });

    const open = document.createElement('button');
    open.type = 'button';
    open.className = 'media-open';
    open.textContent = item.name;
    open.addEventListener('click', () => openPlayer(item.id));

    const type = document.createElement('span');
    type.className = 'media-type';
    type.textContent = item.type;

    const actions = document.createElement('div');
    actions.className = 'media-actions';

    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.className = 'danger-btn';
    removeBtn.textContent = 'Remove';
    removeBtn.addEventListener('click', () => deleteMedia(item.id));

    actions.appendChild(removeBtn);
    li.append(open, type, actions);
    mediaGrid.appendChild(li);
  });
}

function render() {
  const activeFolder = state.folders.find((folder) => folder.id === state.activeFolderId);
  activeFolderTitle.textContent = activeFolder ? activeFolder.name : 'All Media';
  renderFolders();
  renderMedia();
}

loadLibrary();
setInterval(loadLibrary, 5000);
