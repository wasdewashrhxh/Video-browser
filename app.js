const state = {
  folders: [
    { id: 'all', name: 'All Media' },
    { id: 'uncategorized', name: 'Uncategorized' },
  ],
  activeFolderId: 'all',
  mediaItems: [],
};

const mediaInput = document.getElementById('mediaInput');
const folderList = document.getElementById('folderList');
const mediaGrid = document.getElementById('mediaGrid');
const createFolderBtn = document.getElementById('createFolderBtn');
const activeFolderTitle = document.getElementById('activeFolderTitle');
const playerWrapper = document.getElementById('playerWrapper');
const nowPlaying = document.getElementById('nowPlaying');

mediaInput.addEventListener('change', importFiles);
createFolderBtn.addEventListener('click', createFolder);

function importFiles(event) {
  const files = [...event.target.files];
  const validFiles = files.filter((file) => file.type.startsWith('video/') || file.type.startsWith('audio/'));

  validFiles.forEach((file) => {
    state.mediaItems.push({
      id: crypto.randomUUID(),
      name: file.name,
      type: file.type,
      objectUrl: URL.createObjectURL(file),
      folderId: 'uncategorized',
    });
  });

  mediaInput.value = '';
  render();
}

function createFolder() {
  const name = window.prompt('Folder name:');
  if (!name || !name.trim()) {
    return;
  }

  state.folders.push({
    id: crypto.randomUUID(),
    name: name.trim(),
  });
  renderFolders();
}

function selectFolder(folderId) {
  state.activeFolderId = folderId;
  render();
}

function mediaForCurrentFolder() {
  if (state.activeFolderId === 'all') {
    return state.mediaItems;
  }
  return state.mediaItems.filter((item) => item.folderId === state.activeFolderId);
}

function openPlayer(itemId) {
  const selected = state.mediaItems.find((item) => item.id === itemId);
  if (!selected) {
    return;
  }

  const isVideo = selected.type.startsWith('video/');
  playerWrapper.classList.remove('empty');
  playerWrapper.innerHTML = '';

  const media = document.createElement(isVideo ? 'video' : 'audio');
  media.controls = true;
  media.src = selected.objectUrl;
  if (isVideo) {
    media.playsInline = true;
  }

  playerWrapper.appendChild(media);
  nowPlaying.textContent = `Now playing: ${selected.name}`;
}

function moveToFolder(mediaId, folderId) {
  const item = state.mediaItems.find((entry) => entry.id === mediaId);
  if (!item) {
    return;
  }

  item.folderId = folderId;
  render();
}

function renderFolders() {
  folderList.innerHTML = '';
  state.folders.forEach((folder) => {
    const li = document.createElement('li');
    li.className = 'folder-item';
    if (folder.id === state.activeFolderId) {
      li.classList.add('active');
    }

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'folder-select';
    const folderCount = folder.id === 'all'
      ? state.mediaItems.length
      : state.mediaItems.filter((item) => item.folderId === folder.id).length;
    button.textContent = `${folder.name} (${folderCount})`;
    button.addEventListener('click', () => selectFolder(folder.id));

    if (!['all'].includes(folder.id)) {
      li.addEventListener('dragover', (event) => {
        event.preventDefault();
        li.classList.add('drag-over');
      });

      li.addEventListener('dragleave', () => {
        li.classList.remove('drag-over');
      });

      li.addEventListener('drop', (event) => {
        event.preventDefault();
        const mediaId = event.dataTransfer.getData('text/plain');
        li.classList.remove('drag-over');
        moveToFolder(mediaId, folder.id);
      });
    }

    li.appendChild(button);
    folderList.appendChild(li);
  });
}

function renderMedia() {
  mediaGrid.innerHTML = '';
  const items = mediaForCurrentFolder();

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
    });

    const open = document.createElement('button');
    open.type = 'button';
    open.className = 'media-open';
    open.textContent = item.name;
    open.addEventListener('click', () => openPlayer(item.id));

    const type = document.createElement('span');
    type.className = 'media-type';
    type.textContent = item.type;

    li.append(open, type);
    mediaGrid.appendChild(li);
  });
}

function render() {
  const activeFolder = state.folders.find((folder) => folder.id === state.activeFolderId);
  activeFolderTitle.textContent = activeFolder ? activeFolder.name : 'All Media';
  renderFolders();
  renderMedia();
}

render();
