# Video Browser (Desktop)

A local-first desktop app for importing and organizing media files (video/audio) into folders with a graphical interface.

## What changed

This project now runs as an **Electron desktop application** so you can run it locally without internet access.

## Features

- Import multiple files (`mp4`, `mp3`, and other browser-supported audio/video formats).
- Create folders and organize media with drag-and-drop.
- Browse media by folder.
- Preview selected media in the built-in player.
- Run fully offline once installed.

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

## Notes

- Imported media is loaded from local files into memory for playback during the current session.
- No network service or backend is required.
