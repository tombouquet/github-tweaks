# GitHub Tweaks

Chrome extension with a few fixes for GitHub:

- **Image lightbox:** opens PR images in a zoomable gallery modal, instead of navigating to the raw image in a new tab.
- **Submit review from Conversation:** a floating button on the Conversation tab that jumps to Files changed with the review dialog already open.
- **Sticky merge bar:** a bar at the bottom of the Conversation tab shows whether checks passed, reviews and conflicts, with the merge button, so you don't have to scroll to the bottom.
- **File triage:** filter chips above the file tree that hide lockfiles, generated files, tests, docs, config or source, with a review progress bar that counts only the files still shown.
- **Absolute dates:** every timestamp on github.com shows the real time and date, such as `4:29PM 16/10/2026`, instead of "last week".
- **File icons:** VS Code-style icons ([Material Icon Theme](https://github.com/material-extensions/vscode-material-icon-theme)) in repo file lists, the file tree and the PR file tree.
- **Image thumbnails:** image files in a file list show a small preview in place of their icon. Hover it to enlarge.
- **Download files and folders:** a download button on every file list row. Folders download as a ZIP, with no clone needed.
- **Quick view:** click a file row (anywhere but the name) to open it in a modal with line numbers and syntax highlighting, without leaving the folder.

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

### Sticky merge bar

While the merge box at the bottom of a PR's Conversation tab is off screen, a bar floats over the timeline with the same information. The headline is the most important blocker (changes requested, failing checks, review required, conflicts, pending checks, out of date), or "Ready to merge" when everything is green. The other sections show as small status chips.

Click anywhere on the bar to scroll to the merge box. The merge button scrolls there too and clicks GitHub's own merge button, so GitHub's usual confirm step still applies. It turns green only when everything has passed, and shows "Merging blocked" when GitHub offers no merge button.

### File triage

On Files changed, chips under the file filter group the PR's files into Lockfiles, Generated, Tests, Docs, Config and Source. Only groups present in the PR appear. Click a chip to hide that group from both the file tree and the diff, and click it again to bring it back. Folders whose files are all hidden disappear too. Your choice is remembered across PRs.

The bar under the chips shows how many of the files still shown you've marked as Viewed, and how many are hidden.

### Absolute dates

Timestamps on every GitHub page (repo home, file lists, commits, PRs, issues, Actions, releases) show `h:mmAM DD/MM/YYYY` in your local time zone. Hovering still shows GitHub's full tooltip. Durations, such as how long an Actions run took, are left as they are.

### File icons, thumbnails, downloads and quick view

In any repo file list, click a file row anywhere outside its links to quick view it; the file name still opens the normal file page. Hover a row for its download button next to the name. Files download as-is; folders, including their subfolders, are fetched file by file and saved as `repo-folder.zip`, with a progress count while it runs. Quick view shows code with GitHub's own syntax colours and images on a checkerboard; click its file name or the open button to go to the normal file page, copy the contents from its header, and close it with Esc or by clicking outside. This works on private repos you can access, since it uses your GitHub session.

## How it works

Content scripts run on `github.com`. No permissions, no build step.

- `src/content.js` intercepts clicks on `.markdown-body img` when the URL is a PR (`/:owner/:repo/pull/:number`) and renders the viewer inside a Shadow DOM, so GitHub's styles don't leak in.
- `src/pr-review.js` watches the page with a `MutationObserver` and targets GitHub's new React PR pages (`/pull/:number` and `/pull/:number/changes`). Files are grouped by path patterns, listed in `CATEGORIES` at the top of the file. The classic signed-out `/files` page is left alone.
- `src/absolute-dates.js` switches GitHub's `<relative-time>` elements to absolute mode, then writes the formatted text into each one, re-applying it if GitHub re-renders. The format is built by hand because `Intl` always puts a space before AM/PM.
- `src/merge-bar.js` reads the section headings of GitHub's merge box (`[data-testid="mergebox-border-container"]`), re-reads them as the page updates, and hides the bar with an `IntersectionObserver` while the merge box is visible.
- `src/repo-files.js` swaps GitHub's file octicons for icons from `icons/`, chosen by `src/file-icons-data.js`. Both are generated from the `material-icon-theme` npm package by `scripts/vendor-icons.js` (icons are MIT, see `icons/LICENSE`). Thumbnails load from `/raw/`. Folder downloads read GitHub's tree JSON and build an uncompressed ZIP in the page. Quick view highlights with a bundled copy of [highlight.js](https://highlightjs.org) (`vendor/`, BSD-3-Clause), coloured with GitHub's `--color-prettylights-syntax-*` variables so it follows your theme.
