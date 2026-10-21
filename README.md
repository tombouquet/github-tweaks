# GitHub PR Image Lightbox

Chrome extension that opens images in GitHub pull requests in a zoomable gallery modal, instead of navigating to the raw image in a new tab.

## Install

1. Open `chrome://extensions`.
2. Turn on **Developer mode** (top right).
3. Click **Load unpacked** and pick this folder.

Reload any open GitHub tabs afterwards.

## Usage

Click any image in a PR description or comment. Every other image in the PR is collected into the gallery, in page order. Emoji, badges and other tiny images are skipped, as are duplicates.

Cmd/Ctrl/Shift/middle-click still opens the image the normal way.

| Action | Mouse / trackpad | Keyboard |
| --- | --- | --- |
| Zoom in / out | Scroll wheel or pinch (zooms toward the cursor), toolbar `+` / `−` | `+` / `-` |
| Toggle fit / zoom | Click the image | |
| Fit to screen | Toolbar fit button | `0` |
| Actual size (100%) | Click the zoom percentage | `1` |
| Pan | Drag when zoomed in | |
| Previous / next | Side arrows or thumbnails | `←` / `→` |
| Open original | Toolbar ↗ button | |
| Close | ✕ button or click the backdrop | `Esc` |

## How it works

A single content script (`src/content.js`) runs on `github.com`, intercepts clicks on `.markdown-body img` when the URL is a PR (`/:owner/:repo/pull/:number`), and renders the viewer inside a Shadow DOM so GitHub's styles don't leak in. No permissions, no build step.
