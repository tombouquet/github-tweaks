(() => {
  'use strict';

  // All tweaks page: every tweak in GH_TWEAKS_FEATURES with a longer rundown of
  // what it does and where, and a switch that works like the popup's.
  // Longer than the popup's one-liners: where each tweak shows up and how to use it.
  const DETAILS = {
    lightbox: 'Click any image in a PR description or comment to open every image in the PR as a gallery. Zoom with the scroll wheel or pinch, drag to pan, and use the arrow keys to move between images.',
    claudeCode: 'The Code dropdown at the top right of a PR becomes a Claude Code button. It opens Claude Code in your local clone with a prompt about the PR typed in, ready to send. Pick or edit the prompts with the cog in the popup.',
    reviewButton: 'Floating buttons at the bottom right of the Conversation tab. Submit review opens Files changed with the review dialog open; LGTM approves with an "LGTM" comment and throws confetti. LGTM hides on your own PRs.',
    mergeBar: "While the merge box is off screen, a bar floats over the timeline with the PR's most important blocker, its other statuses and the merge button. Click it to jump to the merge box.",
    sinceReview: 'When commits have been pushed since your last review, a "2 new commits" button appears in the PR header. It opens Files changed with only those commits.',
    fileTriage: 'Chips above the Files changed file tree hide lockfiles, generated files, tests, docs, config or source, with a progress bar of the files you\'ve marked viewed.',
    notifyReady: 'Leave a PR open in a tab and get a desktop notification when it becomes ready to merge or starts failing. The tab title also starts with ✅ or ❌.',
    hideChecksTab: 'Removes the Checks tab from PRs. Check results still show in the merge box and the sticky merge bar.',
    hideMergeHint: 'Removes "You can also merge this with the command line" from beside the merge button.',
    fridayWarning: 'On Fridays, a row in the merge card asks if you really want to merge, with a random message that gets more worried as the day goes on.',
    markdownReview: 'Markdown files on Files changed open as rendered diffs. Select paragraphs, list items or table rows and click + to comment on their source lines.',
    jumpToFile: 'Press <kbd>Cmd</kbd>/<kbd>Ctrl</kbd>+<kbd>K</kbd> anywhere in a repo to fuzzy-find any file. <kbd>Enter</kbd> opens it, <kbd>Cmd</kbd>/<kbd>Ctrl</kbd>+<kbd>Enter</kbd> opens a new tab, <kbd>Shift</kbd>+<kbd>Enter</kbd> previews it in Quick view.',
    readmeToc: "On a repo's home page, a Contents list of the README's headings sticks to the sidebar and highlights the section you're reading.",
    markdownOutline: "GitHub's outline panel opens with every Markdown file. Close it and it stays closed until you open it again.",
    fileIcons: 'VS Code-style file icons from Material Icon Theme in repo file lists, the file tree and the PR file tree.',
    thumbnails: 'Image files in a file list show a small preview in place of their icon. Hover it to enlarge.',
    downloads: 'Hover a file list row for a download button. Folders download as a ZIP, with no clone needed.',
    quickView: 'Click a file row (anywhere but its name) to preview it in a modal with syntax highlighting, or rendered if it\'s Markdown.',
    absoluteDates: 'Every timestamp shows the real date and time, such as 4:29PM Oct 16, 2026, instead of "last week". Pick the format in the popup.',
    hideCopilot: 'Hides Copilot buttons across GitHub, including header chat, the Copilot panel and "Ask about this diff", plus the Agents tab.',
  };

  document.getElementById('version').textContent = `v${chrome.runtime.getManifest().version}`;
  const container = document.getElementById('groups');
  const flash = document.getElementById('flash');

  GH_TWEAKS_SETTINGS.then((settings) => {
    let list;
    let group;
    for (const feature of GH_TWEAKS_FEATURES) {
      if (feature.group !== group) {
        group = feature.group;
        const heading = document.createElement('h2');
        heading.textContent = group;
        list = document.createElement('div');
        list.className = 'tweaks';
        container.append(heading, list);
      }
      list.append(tweak(feature, settings[feature.key]));
    }
  });

  function tweak({ key, label, description }, on) {
    const element = document.createElement('section');
    element.className = `tweak${on ? ' on' : ''}`;
    element.innerHTML = '<div class="tweak-text"><h3><span></span><span class="state"></span></h3><p class="summary"></p><p class="details"></p></div>';
    element.querySelector('h3 span').textContent = label;
    element.querySelector('.summary').textContent = description;
    // Details are written above and include <kbd> markup.
    element.querySelector('.details').innerHTML = DETAILS[key] ?? '';
    const state = element.querySelector('.state');
    state.textContent = on ? 'On' : 'Off';

    const toggle = document.createElement('input');
    toggle.type = 'checkbox';
    toggle.setAttribute('role', 'switch');
    toggle.setAttribute('aria-label', label);
    toggle.checked = on;
    toggle.addEventListener('change', () => {
      chrome.storage.sync.set({ [key]: toggle.checked });
      element.classList.toggle('on', toggle.checked);
      state.textContent = toggle.checked ? 'On' : 'Off';
      flash.hidden = false;
    });
    element.append(toggle);
    return element;
  }
})();
