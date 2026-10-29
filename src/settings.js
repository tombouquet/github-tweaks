// Every tweak can be turned off from the toolbar popup. Settings live in
// chrome.storage.sync and default to on (and the first date format). A tweak can
// carry a `choice` dropdown or a `toggle` sub-switch, shown under its own switch.
// Content scripts wait on GH_TWEAKS_SETTINGS before starting, so a change applies
// on the next page load.

// Formats for absolute dates, in local time. The first is the default.
// Built by hand because Intl always puts a space before AM/PM.
globalThis.GH_TWEAKS_DATE_FORMATS = (() => {
  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const pad = (n) => String(n).padStart(2, '0');
  const parts = (date) => {
    const hours = date.getHours();
    return {
      time12: `${hours % 12 || 12}:${pad(date.getMinutes())}${hours < 12 ? 'AM' : 'PM'}`,
      time24: `${pad(hours)}:${pad(date.getMinutes())}`,
      d: date.getDate(),
      dd: pad(date.getDate()),
      mm: pad(date.getMonth() + 1),
      mmm: MONTHS[date.getMonth()],
      yyyy: date.getFullYear(),
    };
  };
  const format = (fn) => (date) => fn(parts(date));
  return [
    { key: 'time-mmm-d-yyyy', format: format((p) => `${p.time12} ${p.mmm} ${p.d}, ${p.yyyy}`) },
    { key: 'mmm-d-yyyy', format: format((p) => `${p.mmm} ${p.d}, ${p.yyyy} ${p.time12}`) },
    { key: 'time-dmy', format: format((p) => `${p.time12} ${p.dd}/${p.mm}/${p.yyyy}`) },
    { key: 'dmy-time', format: format((p) => `${p.dd}/${p.mm}/${p.yyyy} ${p.time12}`) },
    { key: 'mdy-time', format: format((p) => `${p.mm}/${p.dd}/${p.yyyy} ${p.time12}`) },
    { key: 'iso', format: format((p) => `${p.yyyy}-${p.mm}-${p.dd} ${p.time24}`) },
    { key: 'd-mmm-yyyy', format: format((p) => `${p.d} ${p.mmm} ${p.yyyy}, ${p.time24}`) },
    { key: 'dmy', format: format((p) => `${p.dd}/${p.mm}/${p.yyyy}`) },
    { key: 'iso-date', format: format((p) => `${p.yyyy}-${p.mm}-${p.dd}`) },
  ];
})();

globalThis.GH_TWEAKS_FEATURES = [
  { group: 'Pull requests', key: 'lightbox', label: 'Image lightbox', description: 'Open PR images in a zoomable gallery.' },
  { group: 'Pull requests', key: 'reviewButton', label: 'Submit review and LGTM buttons', description: 'Open the review dialog, or approve with LGTM, from the Conversation tab.' },
  { group: 'Pull requests', key: 'mergeBar', label: 'Sticky merge bar', description: 'Checks, reviews and the merge button, always in view.', toggle: { key: 'mergeBarShadow', label: 'Shadow', description: 'Glow that lifts the bar off the page.' } },
  { group: 'Pull requests', key: 'fileTriage', label: 'File triage', description: 'Filter chips and review progress on Files changed.' },
  { group: 'Pull requests', key: 'markdownReview', label: 'Rich Markdown review', description: 'Comment on rendered Markdown blocks.' },
  { group: 'Repository files', key: 'fileIcons', label: 'File icons', description: 'VS Code-style icons in file lists and trees.' },
  { group: 'Repository files', key: 'thumbnails', label: 'Image thumbnails', description: 'Preview images in file lists.' },
  { group: 'Repository files', key: 'downloads', label: 'Download files and folders', description: 'Download buttons, with folders as a ZIP.' },
  { group: 'Repository files', key: 'quickView', label: 'Quick view', description: 'Click a file row to preview it in place.' },
  { group: 'Everywhere', key: 'absoluteDates', label: 'Absolute dates', description: 'Show real dates instead of "last week".', choice: { key: 'dateFormat', label: 'Format', options: globalThis.GH_TWEAKS_DATE_FORMATS } },
  { group: 'Everywhere', key: 'hideCopilot', label: 'Hide Copilot', description: 'Hide Copilot buttons and the Agents tab.' },
];

globalThis.GH_TWEAKS_SETTINGS = chrome.storage.sync.get({
  ...Object.fromEntries(globalThis.GH_TWEAKS_FEATURES.flatMap(({ key, toggle }) => [key, toggle?.key].filter(Boolean).map((k) => [k, true]))),
  dateFormat: globalThis.GH_TWEAKS_DATE_FORMATS[0].key,
});

// hide-copilot.css applies unless this attribute is set.
globalThis.GH_TWEAKS_SETTINGS.then((settings) => {
  if (!settings.hideCopilot) document.documentElement.setAttribute('data-gh-tweaks-show-copilot', '');
});
