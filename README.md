# GitHub Tweaks

Chrome extension with a few fixes for GitHub:

- **Image lightbox:** opens PR images in a zoomable gallery modal, instead of navigating to the raw image in a new tab.
- **Submit review from Conversation:** a floating button on the Conversation tab that jumps to Files changed with the review dialog already open, plus an LGTM button that approves with an "LGTM" comment in one click.
- **Sticky merge bar:** a bar at the bottom of the Conversation tab shows whether checks passed, reviews and conflicts, with the merge button, so you don't have to scroll to the bottom.
- **Review time estimate:** a "~12 min review" chip next to a PR's line count, skipping lockfiles and generated files and counting down as you mark files viewed.
- **Friday merge warning:** on Fridays, an extra row in the merge card asks if you're sure, with a random message that gets more nervous as the day goes on.
- **File triage:** filter chips above the file tree that hide lockfiles, generated files, tests, docs, config or source, with a review progress bar that counts only the files still shown.
- **Rich Markdown review:** Markdown files on Files changed open as rich diffs, and you can select rendered paragraphs, list items or table rows to comment on their source lines.
- **No Copilot:** Copilot buttons (header chat, Copilot panel, "Ask about this diff") and the Agents tab are hidden.
- **Absolute dates:** every timestamp on github.com shows the real time and date, such as `4:29PM Oct 16, 2026`, instead of "last week".
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

Every tweak is on by default. Click the extension icon in the toolbar to turn any of them off; changes apply when the GitHub tab reloads.

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

When you're signed in, a **Submit review** button floats at the bottom right of a PR's Conversation tab. Clicking it opens Files changed with GitHub's review dialog already open. Next to it, **LGTM** does the same, then fills in "LGTM", picks Approve and submits the review, then throws confetti when GitHub brings you back to the Conversation tab ([confetti.js](https://confettijs.org/)). If Approve isn't available, such as on your own PR, it stops with the dialog open.

### Sticky merge bar

While the merge box at the bottom of a PR's Conversation tab is off screen, a bar floats over the timeline with the same information. The headline is the most important blocker (changes requested, failing checks, review required, conflicts, pending checks, out of date), or "Ready to merge" when everything is green. The other sections show as small status chips.

Click anywhere on the bar to scroll to the merge box. The merge button scrolls there too and clicks GitHub's own merge button, so GitHub's usual confirm step still applies. It turns green only when everything has passed, and shows "Merging blocked" when GitHub offers no merge button.

The bar casts a large shadow so it stands out from the timeline. Turn off **Shadow** under the merge bar switch in the popup for a flat bar.

### Review time estimate

Next to the `+30 −4` line count in a PR's header, on both the Conversation and Files changed tabs, a chip guesses how long the review will take, such as `~12 min review`. Lockfiles, generated and vendored files don't count, and nor do groups you've hidden with File triage. Tests, docs and config count for less than source, deletions count for less than additions, and every file adds a little for the context switch. Once you start marking files as Viewed it shows what's left, such as `~4 min left`, and turns green at `All viewed`. Hover it for the full estimate and the line count it's based on.

### Friday merge warning

All day Friday (your local time), the merge card on a PR's Conversation tab gets an extra row, styled like its other checks, just above the merge button. It starts gentle in the morning and gets more alarmed in the afternoon, after 3pm and into the evening, with a different message picked at random each time the page loads. The sticky merge bar's button reads "Squash and merge on a Friday?" too. Nothing is blocked; it's only a nudge.

### File triage

On Files changed, chips under the file filter group the PR's files into Lockfiles, Generated, Tests, Docs, Config and Source. Only groups present in the PR appear. Click a chip to hide that group from both the file tree and the diff, and click it again to bring it back. Folders whose files are all hidden disappear too. Your choice is remembered across PRs.

The bar under the chips shows how many of the files still shown you've marked as Viewed, and how many are hidden.

### Rich Markdown review

On a PR's Files changed tab, `.md`, `.mdx` and `.markdown` files switch to the rich diff once when they load; switch one back to source and it stays there. In the rich diff, click a block to select it and shift-click another to extend the selection. Hover a selected block and click the blue **+** to comment: the file switches to its source diff, the matching lines are selected and GitHub's own comment form opens, ready to type. Only lines in the diff can take comments, so in an edited file only the changed blocks are selectable.

Quick view in repo file lists shows Markdown rendered too.

### Absolute dates

Timestamps on every GitHub page (repo home, file lists, commits, PRs, issues, Actions, releases) show `4:29PM Oct 16, 2026` in your local time zone by default. Pick another format, such as `Oct 16, 2026 4:29PM`, `YYYY-MM-DD HH:mm` or date only, from the dropdown under Absolute dates in the popup. Hovering still shows GitHub's full tooltip. Durations, such as how long an Actions run took, are left as they are.

### File icons, thumbnails, downloads and quick view

In any repo file list, click a file row anywhere outside its links to quick view it; the file name still opens the normal file page. Hover a row for its download button next to the name. Files download as-is; folders, including their subfolders, are fetched file by file and saved as `repo-folder.zip`, with a progress count while it runs. Quick view shows code with GitHub's own syntax colours and images on a checkerboard; click its file name or the open button to go to the normal file page, copy the contents from its header, and close it with Esc or by clicking outside. This works on private repos you can access, since it uses your GitHub session.

## How it works

Content scripts run on `github.com`. The only permission is `storage`, for the popup settings. No build step.

- `src/settings.js` lists the tweaks and loads their on/off state from `chrome.storage.sync` (default on). Every content script waits for it before starting, and `popup.html` builds its switches from the same list.

- `src/content.js` intercepts clicks on `.markdown-body img` when the URL is a PR (`/:owner/:repo/pull/:number`) and renders the viewer inside a Shadow DOM, so GitHub's styles don't leak in.
- `src/pr-review.js` throws confetti after an LGTM with a bundled copy of [confetti.js](https://confettijs.org) (`vendor/`, ISC). It watches the page with a `MutationObserver` and targets GitHub's new React PR pages (`/pull/:number` and `/pull/:number/changes`). Files are grouped by path patterns, listed in `GH_TWEAKS_FILE_CATEGORIES` in `src/settings.js`. The classic signed-out `/files` page is left alone.
- `src/absolute-dates.js` switches GitHub's `<relative-time>` elements to absolute mode, then writes the formatted text into each one, re-applying it if GitHub re-renders. The formats live in `src/settings.js` so the popup can preview them, and are built by hand because `Intl` always puts a space before AM/PM.
- `src/merge-bar.js` reads the section headings of GitHub's merge box (`[data-testid="mergebox-border-container"]`), re-reads them as the page updates, and hides the bar with an `IntersectionObserver` while the merge box is visible.
- `src/pr-data.js` is shared by the PR header tweaks. It finds the PR in the URL and loads the JSON GitHub's own Files changed page renders from (`/pull/:number/changes` with `Accept: application/json`), cached for a minute: every changed file with its line counts and viewed state, plus the head commit and the commit you last reviewed.
- `src/review-estimate.js` weighs each file from that JSON by its File triage group, and reads the Viewed toggles on the page for anything you've marked since it loaded.
- `src/friday.js` checks the local day and hour on each page update and adds its row to the merge card (`[data-testid="mergebox-border-container"]`) just before the footer holding the merge button.
- `src/md-review.js` reads each Markdown file's source diff lines before switching it to rich, then matches each rendered block to its lines by comparing letters and digits only. Commenting drives GitHub's own line selection and "Add comment" button.
- `src/hide-copilot.css` hides anything with a Copilot icon, plus the Agents tab.
- `src/repo-files.js` swaps GitHub's file octicons for icons from `icons/`, chosen by `src/file-icons-data.js`. Both are generated from the `material-icon-theme` npm package by `scripts/vendor-icons.js` (icons are MIT, see `icons/LICENSE`). Thumbnails load from `/raw/`. Folder downloads read GitHub's tree JSON and build an uncompressed ZIP in the page. Quick view highlights with a bundled copy of [highlight.js](https://highlightjs.org) (`vendor/`, BSD-3-Clause), coloured with GitHub's `--color-prettylights-syntax-*` variables so it follows your theme.
- The extension icon in `images/` is drawn by `scripts/make-icon.js`.
