# Video Browser

A lightweight browser application for importing and organizing local media files (video/audio) with folders.

## Features

- Import multiple media files (`mp4`, `mp3`, and other browser-supported video/audio formats).
- Organize files into folders.
- Drag and drop media cards onto folders.
- Browse by folder and preview files in an integrated player.

## Run locally

Because browsers limit `file://` script behavior, use a local server:

```bash
python3 -m http.server 4173
```

Then open `http://localhost:4173`.
