# GitHub Tweaks

Chrome extension with a few fixes for reviewing GitHub pull requests:

- **Image lightbox:** opens PR images in a zoomable gallery modal, instead of navigating to the raw image in a new tab.
- **Submit review from Conversation:** a floating button on the Conversation tab that jumps to Files changed with the review dialog already open.
- **File triage:** filter chips above the file tree that hide lockfiles, generated files, tests, docs, config or source, with a review progress bar that counts only the files still shown.
- **Absolute dates:** every timestamp on github.com shows the real time and date, such as `4:29PM 16/10/2026`, instead of "last week".

## Install

1. Open `chrome://extensions`.
2. Turn on **Developer mode** (top right).
3. Click **Load unpacked** and pick this folder.

Reload any open GitHub tabs afterwards.

## Usage

### Image lightbox

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

### Submit review

When you're signed in, a **Submit review** button floats at the bottom right of a PR's Conversation tab. Clicking it opens Files changed with GitHub's review dialog already open.

### File triage

On Files changed, chips under the file filter group the PR's files into Lockfiles, Generated, Tests, Docs, Config and Source. Only groups present in the PR appear. Click a chip to hide that group from both the file tree and the diff, and click it again to bring it back. Folders whose files are all hidden disappear too. Your choice is remembered across PRs.

The bar under the chips shows how many of the files still shown you've marked as Viewed, and how many are hidden.

### Absolute dates

Timestamps on every GitHub page (repo home, file lists, commits, PRs, issues, Actions, releases) show `h:mmAM DD/MM/YYYY` in your local time zone. Hovering still shows GitHub's full tooltip. Durations, such as how long an Actions run took, are left as they are.

## How it works

Three content scripts run on `github.com`. No permissions, no build step.

- `src/content.js` intercepts clicks on `.markdown-body img` when the URL is a PR (`/:owner/:repo/pull/:number`) and renders the viewer inside a Shadow DOM, so GitHub's styles don't leak in.
- `src/pr-review.js` watches the page with a `MutationObserver` and targets GitHub's new React PR pages (`/pull/:number` and `/pull/:number/changes`). Files are grouped by path patterns, listed in `CATEGORIES` at the top of the file. The classic signed-out `/files` page is left alone.
- `src/absolute-dates.js` switches GitHub's `<relative-time>` elements to absolute mode, then writes the formatted text into each one, re-applying it if GitHub re-renders. The format is built by hand because `Intl` always puts a space before AM/PM.
