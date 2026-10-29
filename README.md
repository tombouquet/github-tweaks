# GitHub Tweaks

Chrome extension with a few fixes for GitHub:

- **Image lightbox:** opens PR images in a zoomable gallery modal, instead of navigating to the raw image in a new tab.
- **Open in Claude Code:** the Code dropdown in a PR's header becomes a Claude Code button that opens the PR in Claude Code with a prompt ready to send.
- **Submit review from Conversation:** a floating button on the Conversation tab that jumps to Files changed with the review dialog already open, plus an LGTM button that approves with an "LGTM" comment in one click.
- **Sticky merge bar:** a bar at the bottom of the Conversation tab shows whether checks passed, reviews and conflicts, with the merge button, so you don't have to scroll to the bottom.
- **Notify when ready:** a desktop notification when a PR you have open becomes ready to merge or starts failing, and a ✅ or ❌ in its tab title.
- **Hide Checks tab:** removes the Checks tab from PRs, since the merge box already shows check results.
- **Hide command line merge hint:** removes "You can also merge this with the command line" from beside the merge button.
- **Changes since your review:** a "2 new commits" button in a PR's header that opens Files changed with only what was pushed since you last reviewed.
- **Friday merge warning:** on Fridays, an extra row in the merge card asks if you're sure, with a random message that gets more nervous as the day goes on.
- **File triage:** filter chips above the file tree that hide lockfiles, generated files, tests, docs, config or source, with a review progress bar that counts only the files still shown.
- **Rich Markdown review:** Markdown files on Files changed open as rich diffs, and you can select rendered paragraphs, list items or table rows to comment on their source lines.
- **No Copilot:** Copilot buttons (header chat, Copilot panel, "Ask about this diff") and the Agents tab are hidden.
- **Absolute dates:** every timestamp on github.com shows the real time and date, such as `4:29PM Oct 16, 2026`, instead of "last week".
- **Jump to file:** press Cmd/Ctrl+K anywhere in a repo to fuzzy-find any file and open it or preview it in Quick view.
- **README contents:** a sticky outline of the README in a repo's sidebar that follows along as you read.
- **Open Markdown outline:** a Markdown file's outline panel opens by default, and stays closed once you close it.
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

Every tweak is on by default. Click the extension icon in the toolbar to turn any of them off; changes apply when the GitHub tab reloads. The book button at the top of the popup opens **All tweaks**, a full page with a longer rundown of every tweak and where to find it, its own switches, and a link to the author's GitHub.

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

### Open in Claude Code

On a PR, the Code dropdown at the top right is replaced by a **Claude Code** button. Clicking it opens a [`claude-cli://` deep link](https://code.claude.com/docs/en/deep-links): Claude Code starts in a new terminal, in your local clone of the repo, with a prompt about the PR typed in. Nothing is sent until you press Enter. Pick the prompt from the dropdown under the switch in the popup:

- **Review the PR** (default): check it out with `gh pr checkout` and review the diff.
- **Address review comments**: check it out and fix what the unresolved review threads ask for.
- **Check out the branch**: just `gh pr checkout`.
- **Open the repo, no prompt**.

To change these, click the cog beside the dropdown. It opens a settings page where you can rename and rewrite each prompt, add your own, reorder or delete them, pick the default, or reset to the built-in ones. `{n}`, `{title}`, `{url}` and `{repo}` are filled in from the PR, and an empty prompt just opens the repo. Changes save as you type and sync with your other settings.

Claude Code finds your clone from the repo's `owner/name`, so run `claude` in that clone at least once first; otherwise it opens in your home directory. The link only works once Claude Code has registered its `claude-cli://` handler, which happens the first time you send a prompt in an interactive session. Your browser asks before opening it the first time. Turn the switch off to get the Code dropdown back.

### Submit review

When you're signed in, a **Submit review** button floats at the bottom right of a PR's Conversation tab. Clicking it opens Files changed with GitHub's review dialog already open. Next to it, **LGTM** does the same, then fills in "LGTM", picks Approve and submits the review, then throws confetti when GitHub brings you back to the Conversation tab ([confetti.js](https://confettijs.org/)). LGTM is hidden on your own PRs, since GitHub doesn't let you approve them. If Approve still isn't available, it stops with the dialog open.

### Sticky merge bar

While the merge box at the bottom of a PR's Conversation tab is off screen, a bar floats over the timeline with the same information. The headline is the most important blocker (changes requested, failing checks, review required, conflicts, pending checks, out of date), or "Ready to merge" when everything is green. The other sections show as small status chips.

Click anywhere on the bar to scroll to the merge box. The merge button scrolls there too and clicks GitHub's own merge button, so GitHub's usual confirm step still applies. It turns green only when everything has passed, and shows "Merging blocked" when GitHub offers no merge button.

The bar casts a large shadow so it stands out from the timeline. Turn off **Shadow** under the merge bar switch in the popup for a flat bar.

### Notify when ready

Leave a PR's Conversation tab open and get on with something else. When the merge box changes to ready to merge (checks passed, approved, no conflicts), you get a desktop notification. You also get one when something starts failing: checks fail, changes are requested or conflicts appear. Click the notification to jump back to the tab. Nothing fires while you're looking at the tab, and nothing fires for where the PR stands when the page loads, only for changes after.

The tab's title also starts with ✅ when the PR is ready to merge and ❌ when something is failing, so you can spot it in your tab bar.

The notifications come from Chrome, so your system has to allow notifications from Chrome. The extension asks for the `notifications` permission for this.

### Hide Checks tab

A PR's tabs read Conversation, Commits, Files changed, with no Checks tab. Check results still show in the merge box and the sticky merge bar, and `/pull/:number/checks` still opens if you go there directly.

### Hide command line merge hint

The "You can also merge this with the command line. View command line instructions." line beside GitHub's merge button is hidden. Turn the switch off to bring it back.

### Changes since your review

When commits have landed on a PR since your last review, a button such as **2 new commits** appears in the PR's header, beside the Code button. Click it to open Files changed showing only those commits, the same view as "Changes since your last review" in GitHub's commit picker, without opening the picker. While you're in that view it reads **All changes** and takes you back to the full diff. It stays hidden on PRs you haven't reviewed, or when nothing is new.

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

### Jump to file

Press **Cmd+K** (Ctrl+K on Windows and Linux) anywhere in a repo: its code, a PR, an issue, Actions. A finder opens over the page with every file in the repo. Type part of a name or path; letters don't need to be next to each other, so `chkguard` finds `checkout.guard.ts`. Matches in the file name rank above matches in folders.

| Action | Keyboard |
| --- | --- |
| Move up / down | `↑` / `↓` (or `Ctrl+P` / `Ctrl+N`) |
| Open the file | `Enter` or click |
| Open in a new tab | `Cmd/Ctrl+Enter` or Cmd/Ctrl-click |
| Preview in Quick view | `Shift+Enter` or Shift-click (needs Quick view on) |
| Close | `Esc`, `Cmd/Ctrl+K` again or click outside |

On code pages it searches the branch or tag you're looking at; everywhere else, the default branch. Inside a repo it takes over Cmd/Ctrl+K, which otherwise opens GitHub's command palette; outside repos, GitHub's palette still opens.

### README contents

On a repo's home page, a **Contents** list of the README's headings sits at the bottom of the right-hand sidebar, under About, and stays in view as you scroll. The section you're reading is highlighted. Click a heading to scroll to it. It shows when the README has three or more headings and the sidebar sits beside it; on narrow windows, where the sidebar drops below the README, it's left out.

### Open Markdown outline

When you open a Markdown file, GitHub's outline panel (the list button in the file's toolbar) opens with it. Close it and later files open without it; open it again and it's back to opening by default. The choice is remembered in this browser.

### File icons, thumbnails, downloads and quick view

In any repo file list, click a file row anywhere outside its links to quick view it; the file name still opens the normal file page. Hover a row for its download button next to the name. Files download as-is; folders, including their subfolders, are fetched file by file and saved as `repo-folder.zip`, with a progress count while it runs. Quick view shows code with GitHub's own syntax colours and images on a checkerboard; click its file name or the open button to go to the normal file page, copy the contents from its header, and close it with Esc or by clicking outside. This works on private repos you can access, since it uses your GitHub session.

## How it works

Content scripts run on `github.com`. The permissions are `storage`, for the popup settings, and `notifications`, for Notify when ready. No build step.

- `src/settings.js` lists the tweaks and loads their on/off state from `chrome.storage.sync` (default on). Every content script waits for it before starting, and `popup.html` builds its switches from the same list.

- `src/content.js` intercepts clicks on `.markdown-body img` when the URL is a PR (`/:owner/:repo/pull/:number`) and renders the viewer inside a Shadow DOM, so GitHub's styles don't leak in.
- `src/pr-review.js` throws confetti after an LGTM with a bundled copy of [confetti.js](https://confettijs.org) (`vendor/`, ISC). It watches the page with a `MutationObserver` and targets GitHub's new React PR pages (`/pull/:number` and `/pull/:number/changes`). Files are grouped by path patterns, listed in `GH_TWEAKS_FILE_CATEGORIES` in `src/settings.js`. The classic signed-out `/files` page is left alone.
- `src/absolute-dates.js` switches GitHub's `<relative-time>` elements to absolute mode, then writes the formatted text into each one, re-applying it if GitHub re-renders. The formats live in `src/settings.js` so the popup can preview them, and are built by hand because `Intl` always puts a space before AM/PM.
- `src/merge-status.js` reads the section headings of GitHub's merge box (`[data-testid="mergebox-border-container"]`) into statuses for checks, review and conflicts. `src/merge-bar.js` re-reads them as the page updates and hides the bar with an `IntersectionObserver` while the merge box is visible.
- `src/notify-ready.js` watches the same statuses and messages `src/background.js`, the extension's service worker, which shows the notification with `chrome.notifications` and focuses the PR's tab when it's clicked.
- `src/pr-data.js` is shared by the PR header tweaks. It finds the PR in the URL and loads the JSON GitHub's own Files changed page renders from (`/pull/:number/changes` with `Accept: application/json`), cached for a minute, for the PR's commits and the commit you last reviewed.
- `about.html` and `src/about.js` are the All tweaks page, built from `GH_TWEAKS_FEATURES` with a longer description of each tweak. It and the prompt editor share `src/page.css`.
- `options.html` and `src/options.js` edit the Claude Code prompts, saved as `claudePrompts` in `chrome.storage.sync`. The popup's dropdown and the button read the same list.
- `src/claude-code.js` builds `claude-cli://open?repo=owner/name&q=<prompt>` from the PR's number, title and URL, using your saved prompts, or the built-in ones in `GH_TWEAKS_CLAUDE_PROMPTS` (`src/settings.js`), and hides GitHub's Code button. The Claude logo is from [Simple Icons](https://simpleicons.org) (CC0).
- `src/since-review.js` links to `/pull/:number/changes/<last reviewed>..<head>` using the commits from that JSON. Its button copies the classes of GitHub's Code button so it matches the header.
- `src/hide-checks-tab.js` hides the `/checks` link in the PR's tab bar with CSS.
- `src/merge-hint.js` hides the muted line in the merge box that holds the "View command line instructions" link.
- `src/friday.js` checks the local day and hour on each page update and adds its row to the merge card (`[data-testid="mergebox-border-container"]`) just before the footer holding the merge button.
- `src/md-review.js` reads each Markdown file's source diff lines before switching it to rich, then matches each rendered block to its lines by comparing letters and digits only. Commenting drives GitHub's own line selection and "Add comment" button.
- `src/hide-copilot.css` hides anything with a Copilot icon, plus the Agents tab.
- `src/repo-files.js` swaps GitHub's file octicons for icons from `icons/`, chosen by `src/file-icons-data.js`. Both are generated from the `material-icon-theme` npm package by `scripts/vendor-icons.js` (icons are MIT, see `icons/LICENSE`). Thumbnails load from `/raw/`. Folder downloads read GitHub's tree JSON and build an uncompressed ZIP in the page. Quick view highlights with a bundled copy of [highlight.js](https://highlightjs.org) (`vendor/`, BSD-3-Clause), coloured with GitHub's `--color-prettylights-syntax-*` variables so it follows your theme.
- `src/jump-to-file.js` loads every path in one request from `/:owner/:repo/tree-list/:commit`, the endpoint GitHub's own file finder uses, after looking up the branch's commit in its tree JSON. Icons and Quick view come from `src/repo-files.js` through `GH_TWEAKS_FILES`.
- `src/readme-toc.js` lists the README's `.markdown-heading` blocks (h1 to h3) in GitHub's sidebar pane, which it lets overflow so the list can stick to the page.
- `src/md-outline.js` clicks the outline button (`button[class*="TableOfContents"]`) once per file, and saves your own opens and closes, read from its `aria-pressed`, in `localStorage`.
- The extension icon in `images/` is drawn by `scripts/make-icon.js`.
