# Video Browser (Desktop)

A local-first desktop app for importing and organizing media files (video/audio) into folders with a graphical interface.

## Persistent library behavior

Your media now persists on disk.

- App library location: `Documents/VideoBrowserLibrary`
- Every folder you create in the app is created on disk inside that library path (including nested folders).
- Imported files are copied into the selected library folder.
- Removing media/folders in the app removes them from disk.
- You can create folders inside folders, and selecting a parent folder shows media from its subfolders.
- If you add/remove folders or media directly in `Documents/VideoBrowserLibrary`, the app will pick up changes after refresh (or automatically within a few seconds).

## Development run

```bash
npm install
npm start
```

## Build installers

### Windows `.exe` (NSIS installer)

```bash
npm run dist:win
```

Output will be created in:

- `release/` (for example: `Video Browser Setup <version>.exe`)

> Note: Building a Windows installer from Linux/macOS may require extra host tooling (for example Wine).

### Current OS package

```bash
npm run dist
```
