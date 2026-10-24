// Every tweak can be turned off from the toolbar popup. Settings live in
// chrome.storage.sync and default to on. Content scripts wait on
// GH_TWEAKS_SETTINGS before starting, so a change applies on the next page load.
globalThis.GH_TWEAKS_FEATURES = [
  { group: 'Pull requests', key: 'lightbox', label: 'Image lightbox', description: 'Open PR images in a zoomable gallery.' },
  { group: 'Pull requests', key: 'reviewButton', label: 'Submit review button', description: 'Open the review dialog from the Conversation tab.' },
  { group: 'Pull requests', key: 'mergeBar', label: 'Sticky merge bar', description: 'Checks, reviews and the merge button, always in view.' },
  { group: 'Pull requests', key: 'fileTriage', label: 'File triage', description: 'Filter chips and review progress on Files changed.' },
  { group: 'Pull requests', key: 'markdownReview', label: 'Rich Markdown review', description: 'Comment on rendered Markdown blocks.' },
  { group: 'Repository files', key: 'fileIcons', label: 'File icons', description: 'VS Code-style icons in file lists and trees.' },
  { group: 'Repository files', key: 'thumbnails', label: 'Image thumbnails', description: 'Preview images in file lists.' },
  { group: 'Repository files', key: 'downloads', label: 'Download files and folders', description: 'Download buttons, with folders as a ZIP.' },
  { group: 'Repository files', key: 'quickView', label: 'Quick view', description: 'Click a file row to preview it in place.' },
  { group: 'Everywhere', key: 'absoluteDates', label: 'Absolute dates', description: 'Show real dates instead of "last week".' },
  { group: 'Everywhere', key: 'hideCopilot', label: 'Hide Copilot', description: 'Hide Copilot buttons and the Agents tab.' },
];

globalThis.GH_TWEAKS_SETTINGS = chrome.storage.sync.get(
  Object.fromEntries(globalThis.GH_TWEAKS_FEATURES.map(({ key }) => [key, true])),
);

// hide-copilot.css applies unless this attribute is set.
globalThis.GH_TWEAKS_SETTINGS.then((settings) => {
  if (!settings.hideCopilot) document.documentElement.setAttribute('data-gh-tweaks-show-copilot', '');
});
