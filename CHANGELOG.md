# Changelog

## 1.10.0 (2026-10-29)

### Features

* **Friday merge warning:** on Fridays, a row in the merge card asks if you're sure, with a random message that gets more nervous as the day goes on.
* **Hide command line merge hint:** removes "You can also merge this with the command line" from beside the merge button.
* **Hide Checks tab:** removes the Checks tab from PRs.
* **Changes since your review:** a header button that opens Files changed with only what was pushed since your last review.
* **Open in Claude Code:** the PR Code dropdown becomes a Claude Code button that opens the PR with a prompt ready to send. Prompts are editable on an options page, opened from a cog beside the popup dropdown.
* **Notify when ready:** a desktop notification when an open PR becomes ready to merge or starts failing.
* **Jump to file:** a fuzzy file finder on every repo page, opened with Cmd/Ctrl+K.
* **README contents:** a sticky outline of the README in the repo sidebar.
* **Open Markdown outline:** a Markdown file's outline opens by default and stays closed once you close it.
* Popup sub-option rows are tinted to show they belong to the tweak above.

### Bug Fixes

* Pass the Shadow setting to the merge bar styles.

## 1.9.0 (2026-10-29)

### Features

* Add a Shadow switch to turn off the merge bar's shadow.

### Bug Fixes

* Throw the LGTM confetti on the Conversation tab after GitHub returns there.
* Submit the LGTM review with Cmd+Enter.

## 1.8.0 (2026-10-29)

### Features

* **LGTM button:** approves the PR with an "LGTM" comment in one click, with confetti.
* Pointer cursor on quick view rows.

### Bug Fixes

* Match the merge bar shadow to the light or dark theme.
* Keep collapsed folders visible in the filtered PR file tree.
* Skip repo file tweaks after the extension reloads.

## 1.7.0 (2026-10-26)

### Features

* A format dropdown for absolute dates, defaulting to `4:29PM Oct 16, 2026`. The popup previews each format with the current time.

## 1.6.0 (2026-10-25)

### Features

* **Popup:** turn each tweak on or off from the toolbar. Settings sync and default to on.

## 1.5.0 (2026-10-24)

### Features

* **Rich Markdown review:** Markdown files on Files changed open as commentable rich diffs, and quick view renders Markdown.
* **No Copilot:** Copilot entry points are hidden.

## 1.4.0 (2026-10-24)

### Features

* **Sticky merge bar:** a bar mirrors the merge box and its merge button while the merge box is off screen.
* Elements the extension adds animate in, and respect reduced motion.

## 1.3.0 (2026-10-24)

### Features

* **File icons:** Material Icon Theme icons in repo file lists and file trees.
* **Image thumbnails**, **download buttons** for files and folders, and **quick view** with syntax highlighting.

## 1.2.0 (2026-10-24)

### Features

* **Absolute dates:** timestamps show the real time and date instead of relative text. The extension is renamed GitHub Tweaks.

## 1.0.0 (2026-10-22)

### Features

* **Image lightbox:** PR images open in a zoomable gallery modal instead of the raw image.
