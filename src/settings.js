// Every tweak can be turned off from the toolbar popup. Settings live in
// chrome.storage.sync and default to on (and the first option of each dropdown). A tweak can
// carry a `choice` dropdown or a `toggle` sub-switch, shown under its own switch. A
// dropdown with an `optionsKey` reads its options from that setting, edited on the options page.
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

// File groups for File triage, by path.
// First match wins, so the specific buckets come before the catch-all ones.
globalThis.GH_TWEAKS_FILE_CATEGORIES = [
  ['Lockfiles', /(^|\/)(package-lock\.json|npm-shrinkwrap\.json|yarn\.lock|pnpm-lock\.yaml|bun\.lockb?|Cargo\.lock|Gemfile\.lock|poetry\.lock|uv\.lock|Pipfile\.lock|composer\.lock|go\.sum|flake\.lock|Podfile\.lock|packages\.lock\.json)$/],
  ['Generated', /(^|\/)(dist|build|out|vendor|node_modules|__generated__|generated|__snapshots__)\/|\.min\.(js|css)$|\.(map|snap)$|\.pb\.go$|_pb2\.pyi?$|\.g\.dart$|\.designer\.cs$/],
  ['Tests', /(^|\/)(tests?|__tests__|__mocks__|spec|specs|e2e|fixtures)\/|[._-](test|spec)\.[^/]+$|_test\.go$|(^|\/)test_[^/]+\.py$/],
  ['Docs', /\.(md|mdx|rst|adoc|txt)$|(^|\/)docs?\//i],
  ['Config', /(^|\/)\.[^/]+|\.(json|jsonc|ya?ml|toml|ini|cfg|conf|properties|xml|lock)$|(^|\/)(Dockerfile|Makefile)$/],
  ['Source', /./],
];

// The Claude Code button's built-in prompts, which you can edit on the options page
// (stored as `claudePrompts`). `{n}`, `{title}`, `{url}` and `{repo}` are filled in from the PR.
globalThis.GH_TWEAKS_CLAUDE_PROMPTS = [
  { key: 'review', label: 'Review the PR', prompt: 'Review PR #{n} ({title}): {url}\nCheck it out with `gh pr checkout {n}`, read the diff against its base branch, and point out bugs, risks and anything unclear.' },
  { key: 'feedback', label: 'Address review comments', prompt: 'Address the review comments on PR #{n} ({title}): {url}\nCheck it out with `gh pr checkout {n}`, read the unresolved review threads with `gh`, and fix what they ask for.' },
  { key: 'checkout', label: 'Check out the branch', prompt: 'Check out PR #{n} ({title}) with `gh pr checkout {n}`: {url}' },
  { key: 'none', label: 'Open the repo, no prompt', prompt: '' },
];

// Octicon gear (MIT), for the cog that opens the prompt editor from the popup and the All tweaks page.
globalThis.GH_TWEAKS_GEAR_ICON =
  '<svg viewBox="0 0 16 16" width="16" height="16" fill="currentColor" aria-hidden="true"><path d="M8 0a8.2 8.2 0 0 1 .701.031C9.444.095 9.99.645 10.16 1.29l.288 1.107c.018.066.079.158.212.224.231.114.454.243.668.386.123.082.233.09.299.071l1.103-.303c.644-.176 1.392.021 1.82.63.27.385.506.792.704 1.218.315.675.111 1.422-.364 1.891l-.814.806c-.049.048-.098.147-.088.294.016.257.016.515 0 .772-.01.147.038.246.088.294l.814.806c.475.469.679 1.216.364 1.891a7.977 7.977 0 0 1-.704 1.217c-.428.61-1.176.807-1.82.63l-1.102-.302c-.067-.019-.177-.011-.3.071a5.909 5.909 0 0 1-.668.386c-.133.066-.194.158-.211.224l-.29 1.106c-.168.646-.715 1.196-1.458 1.26a8.006 8.006 0 0 1-1.402 0c-.743-.064-1.289-.614-1.458-1.26l-.289-1.106c-.018-.066-.079-.158-.212-.224a5.738 5.738 0 0 1-.668-.386c-.123-.082-.233-.09-.299-.071l-1.103.303c-.644.176-1.392-.021-1.82-.63a8.12 8.12 0 0 1-.704-1.218c-.315-.675-.111-1.422.363-1.891l.815-.806c.05-.048.098-.147.088-.294a6.214 6.214 0 0 1 0-.772c.01-.147-.038-.246-.088-.294l-.815-.806C.635 6.045.431 5.298.746 4.623a7.92 7.92 0 0 1 .704-1.217c.428-.61 1.176-.807 1.82-.63l1.102.302c.067.019.177.011.3-.071.214-.143.437-.272.668-.386.133-.066.194-.158.211-.224l.29-1.106C6.009.645 6.556.095 7.299.03 7.53.01 7.764 0 8 0Zm-.571 1.525c-.036.003-.108.036-.137.146l-.289 1.105c-.147.561-.549.967-.998 1.189-.173.086-.34.183-.5.29-.417.278-.97.423-1.529.27l-1.103-.303c-.109-.03-.175.016-.195.045-.22.312-.412.644-.573.99-.014.031-.021.11.059.19l.815.806c.411.406.562.957.53 1.456a4.709 4.709 0 0 0 0 .582c.032.499-.119 1.05-.53 1.456l-.815.806c-.081.08-.073.159-.059.19.162.346.353.677.573.989.02.03.085.076.195.046l1.102-.303c.56-.153 1.113-.008 1.53.27.161.107.328.204.501.29.447.222.85.629.997 1.189l.289 1.105c.029.109.101.143.137.146a6.6 6.6 0 0 0 1.142 0c.036-.003.108-.036.137-.146l.289-1.105c.147-.561.549-.967.998-1.189.173-.086.34-.183.5-.29.417-.278.97-.423 1.529-.27l1.103.303c.109.029.175-.016.195-.045.22-.313.411-.644.573-.99.014-.031.021-.11-.059-.19l-.815-.806c-.411-.406-.562-.957-.53-1.456a4.709 4.709 0 0 0 0-.582c-.032-.499.119-1.05.53-1.456l.815-.806c.081-.08.073-.159.059-.19a6.464 6.464 0 0 0-.573-.989c-.02-.03-.085-.076-.195-.046l-1.102.303c-.56.153-1.113.008-1.53-.27a4.44 4.44 0 0 0-.501-.29c-.447-.222-.85-.629-.997-1.189l-.289-1.105c-.029-.11-.101-.143-.137-.146a6.6 6.6 0 0 0-1.142 0ZM11 8a3 3 0 1 1-6 0 3 3 0 0 1 6 0ZM9.5 8a1.5 1.5 0 1 0-3.001.001A1.5 1.5 0 0 0 9.5 8Z"/></svg>';

globalThis.GH_TWEAKS_FEATURES = [
  { group: 'Pull requests', key: 'lightbox', label: 'Image lightbox', description: 'Open PR images in a zoomable gallery.' },
  { group: 'Pull requests', key: 'claudeCode', label: 'Open in Claude Code', description: 'Swap the Code dropdown for a button that opens the PR in Claude Code.', choice: { key: 'claudePrompt', label: 'Prompt', options: globalThis.GH_TWEAKS_CLAUDE_PROMPTS, optionsKey: 'claudePrompts', editLabel: 'Edit prompts…' } },
  { group: 'Pull requests', key: 'reviewButton', label: 'Submit review and LGTM buttons', description: 'Open the review dialog, or approve with LGTM, from the Conversation tab.' },
  { group: 'Pull requests', key: 'mergeBar', label: 'Sticky merge bar', description: 'Checks, reviews and the merge button, always in view.', toggle: { key: 'mergeBarShadow', label: 'Shadow', description: 'Glow that lifts the bar off the page.' } },
  { group: 'Pull requests', key: 'sinceReview', label: 'Changes since your review', description: 'A header button showing only what was pushed since you last reviewed.' },
  { group: 'Pull requests', key: 'fileTriage', label: 'File triage', description: 'Filter chips and review progress on Files changed.' },
  { group: 'Pull requests', key: 'notifyReady', label: 'Notify when ready', description: 'A desktop notification when an open PR is ready to merge or starts failing.' },
  { group: 'Pull requests', key: 'hideChecksTab', label: 'Hide Checks tab', description: 'Drop the Checks tab from PRs; checks still show in the merge box.' },
  { group: 'Pull requests', key: 'hideMergeHint', label: 'Hide command line merge hint', description: 'Drop "You can also merge this with the command line" from the merge box.' },
  { group: 'Pull requests', key: 'fridayWarning', label: 'Friday merge warning', description: 'A worried note above the merge button on Fridays.' },
  { group: 'Pull requests', key: 'markdownReview', label: 'Rich Markdown review', description: 'Comment on rendered Markdown blocks.' },
  { group: 'Repository files', key: 'jumpToFile', label: 'Jump to file', description: 'Cmd/Ctrl+K in any repo to fuzzy-find a file.' },
  { group: 'Repository files', key: 'readmeToc', label: 'README contents', description: "A sticky outline of the README in the repo's sidebar." },
  { group: 'Repository files', key: 'markdownOutline', label: 'Open Markdown outline', description: "Show a Markdown file's outline by default; close it to keep it closed." },
  { group: 'Repository files', key: 'fileIcons', label: 'File icons', description: 'VS Code-style icons in file lists and trees.' },
  { group: 'Repository files', key: 'thumbnails', label: 'Image thumbnails', description: 'Preview images in file lists.' },
  { group: 'Repository files', key: 'downloads', label: 'Download files and folders', description: 'Download buttons, with folders as a ZIP.' },
  { group: 'Repository files', key: 'quickView', label: 'Quick view', description: 'Click a file row to preview it in place.' },
  { group: 'Everywhere', key: 'absoluteDates', label: 'Absolute dates', description: 'Show real dates instead of "last week".', choice: { key: 'dateFormat', label: 'Format', options: globalThis.GH_TWEAKS_DATE_FORMATS } },
  { group: 'Everywhere', key: 'hideCopilot', label: 'Hide Copilot', description: 'Hide Copilot buttons and the Agents tab.' },
];

globalThis.GH_TWEAKS_SETTINGS = chrome.storage.sync.get({
  ...Object.fromEntries(globalThis.GH_TWEAKS_FEATURES.flatMap(({ key, toggle }) => [key, toggle?.key].filter(Boolean).map((k) => [k, true]))),
  // Each dropdown defaults to its first option.
  ...Object.fromEntries(globalThis.GH_TWEAKS_FEATURES.filter(({ choice }) => choice).map(({ choice }) => [choice.key, choice.options[0].key])),
  // Editable option lists (the Claude Code prompts) start as the built-in ones.
  ...Object.fromEntries(globalThis.GH_TWEAKS_FEATURES.filter(({ choice }) => choice?.optionsKey).map(({ choice }) => [choice.optionsKey, choice.options])),
});

// hide-copilot.css applies unless this attribute is set.
globalThis.GH_TWEAKS_SETTINGS.then((settings) => {
  if (!settings.hideCopilot) document.documentElement.setAttribute('data-gh-tweaks-show-copilot', '');
});
