// Every tweak can be turned off from the toolbar popup. Settings live in
// chrome.storage.sync and default to on (and the first option of each dropdown). A tweak can
// carry a `choice` dropdown or a `toggle` sub-switch, shown under its own switch. A
// dropdown with an `optionsKey` reads its options from that setting, edited on the prompts page.
// The content script loads them once at page load, so a change applies on the next reload.

export interface DateFormat {
  key: string;
  format: (date: Date) => string;
}

export interface ClaudePrompt {
  key: string;
  label: string;
  prompt: string;
}

// Formats for absolute dates, in local time. The first is the default.
// Built by hand because Intl always puts a space before AM/PM.
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const pad = (n: number) => String(n).padStart(2, '0');

interface DateParts {
  time12: string;
  time24: string;
  d: number;
  dd: string;
  mm: string;
  mmm: string;
  yyyy: number;
}

function dateParts(date: Date): DateParts {
  const hours = date.getHours();
  return {
    time12: `${hours % 12 || 12}:${pad(date.getMinutes())}${hours < 12 ? 'AM' : 'PM'}`,
    time24: `${pad(hours)}:${pad(date.getMinutes())}`,
    d: date.getDate(),
    dd: pad(date.getDate()),
    mm: pad(date.getMonth() + 1),
    mmm: MONTHS[date.getMonth()]!,
    yyyy: date.getFullYear(),
  };
}

const dateFormat = (key: string, fn: (p: DateParts) => string): DateFormat => ({ key, format: (date) => fn(dateParts(date)) });

export const DATE_FORMATS: [DateFormat, ...DateFormat[]] = [
  dateFormat('time-mmm-d-yyyy', (p) => `${p.time12} ${p.mmm} ${p.d}, ${p.yyyy}`),
  dateFormat('mmm-d-yyyy', (p) => `${p.mmm} ${p.d}, ${p.yyyy} ${p.time12}`),
  dateFormat('time-dmy', (p) => `${p.time12} ${p.dd}/${p.mm}/${p.yyyy}`),
  dateFormat('dmy-time', (p) => `${p.dd}/${p.mm}/${p.yyyy} ${p.time12}`),
  dateFormat('mdy-time', (p) => `${p.mm}/${p.dd}/${p.yyyy} ${p.time12}`),
  dateFormat('iso', (p) => `${p.yyyy}-${p.mm}-${p.dd} ${p.time24}`),
  dateFormat('d-mmm-yyyy', (p) => `${p.d} ${p.mmm} ${p.yyyy}, ${p.time24}`),
  dateFormat('dmy', (p) => `${p.dd}/${p.mm}/${p.yyyy}`),
  dateFormat('iso-date', (p) => `${p.yyyy}-${p.mm}-${p.dd}`),
];

// File groups for File triage, by path.
// First match wins, so the specific buckets come before the catch-all ones.
export const FILE_CATEGORIES: [string, RegExp][] = [
  ['Lockfiles', /(^|\/)(package-lock\.json|npm-shrinkwrap\.json|yarn\.lock|pnpm-lock\.yaml|bun\.lockb?|Cargo\.lock|Gemfile\.lock|poetry\.lock|uv\.lock|Pipfile\.lock|composer\.lock|go\.sum|flake\.lock|Podfile\.lock|packages\.lock\.json)$/],
  ['Generated', /(^|\/)(dist|build|out|vendor|node_modules|__generated__|generated|__snapshots__)\/|\.min\.(js|css)$|\.(map|snap)$|\.pb\.go$|_pb2\.pyi?$|\.g\.dart$|\.designer\.cs$/],
  ['Tests', /(^|\/)(tests?|__tests__|__mocks__|spec|specs|e2e|fixtures)\/|[._-](test|spec)\.[^/]+$|_test\.go$|(^|\/)test_[^/]+\.py$/],
  ['Docs', /\.(md|mdx|rst|adoc|txt)$|(^|\/)docs?\//i],
  ['Config', /(^|\/)\.[^/]+|\.(json|jsonc|ya?ml|toml|ini|cfg|conf|properties|xml|lock)$|(^|\/)(Dockerfile|Makefile)$/],
  ['Source', /./],
];

// The Claude Code button's built-in prompts, which you can edit on the prompts page
// (stored as `claudePrompts`). `{n}`, `{title}`, `{url}` and `{repo}` are filled in from the PR.
export const CLAUDE_PROMPTS: [ClaudePrompt, ...ClaudePrompt[]] = [
  { key: 'review', label: 'Review the PR', prompt: 'Review PR #{n} ({title}): {url}\nCheck it out with `gh pr checkout {n}`, read the diff against its base branch, and point out bugs, risks and anything unclear.' },
  { key: 'feedback', label: 'Address review comments', prompt: 'Address the review comments on PR #{n} ({title}): {url}\nCheck it out with `gh pr checkout {n}`, read the unresolved review threads with `gh`, and fix what they ask for.' },
  { key: 'checkout', label: 'Check out the branch', prompt: 'Check out PR #{n} ({title}) with `gh pr checkout {n}`: {url}' },
  { key: 'none', label: 'Open the repo, no prompt', prompt: '' },
];

export type FeatureKey =
  | 'lightbox'
  | 'claudeCode'
  | 'reviewButton'
  | 'mergeBar'
  | 'sinceReview'
  | 'fileTriage'
  | 'notifyReady'
  | 'hideChecksTab'
  | 'hideMergeHint'
  | 'fridayWarning'
  | 'markdownReview'
  | 'pdfPreview'
  | 'jumpToFile'
  | 'readmeToc'
  | 'markdownOutline'
  | 'fileIcons'
  | 'thumbnails'
  | 'downloads'
  | 'quickView'
  | 'absoluteDates'
  | 'hideCopilot';

export interface Settings extends Record<FeatureKey, boolean> {
  mergeBarShadow: boolean;
  claudePrompt: string;
  claudePrompts: ClaudePrompt[];
  dateFormat: string;
}

/** A dropdown under a tweak's switch. Options show their `label`, or the current time in their date format. */
export interface Choice {
  key: 'claudePrompt' | 'dateFormat';
  label: string;
  options: readonly { key: string; label?: string; format?: (date: Date) => string }[];
  /** Read the options from this setting instead, when it has any. */
  optionsKey?: 'claudePrompts';
  /** Shows a cog beside the dropdown that opens the prompts page. */
  editLabel?: string;
}

/** A secondary switch under a tweak's switch. */
export interface Toggle {
  key: 'mergeBarShadow';
  label: string;
  description: string;
}

export interface Feature {
  group: 'Pull requests' | 'Repository files' | 'Everywhere';
  key: FeatureKey;
  label: string;
  description: string;
  choice?: Choice;
  toggle?: Toggle;
}

export const FEATURES: Feature[] = [
  { group: 'Pull requests', key: 'lightbox', label: 'Image lightbox', description: 'Open PR images in a zoomable gallery.' },
  { group: 'Pull requests', key: 'claudeCode', label: 'Open in Claude Code', description: 'Swap the Code dropdown for a button that opens the PR in Claude Code.', choice: { key: 'claudePrompt', label: 'Prompt', options: CLAUDE_PROMPTS, optionsKey: 'claudePrompts', editLabel: 'Edit prompts…' } },
  { group: 'Pull requests', key: 'reviewButton', label: 'Submit review and LGTM buttons', description: 'Open the review dialog, or approve with LGTM, from the Conversation tab.' },
  { group: 'Pull requests', key: 'mergeBar', label: 'Sticky merge bar', description: 'Checks, reviews and the merge button, always in view.', toggle: { key: 'mergeBarShadow', label: 'Shadow', description: 'Glow that lifts the bar off the page.' } },
  { group: 'Pull requests', key: 'sinceReview', label: 'Changes since your review', description: 'A header button showing only what was pushed since you last reviewed.' },
  { group: 'Pull requests', key: 'fileTriage', label: 'File triage', description: 'Filter chips and review progress on Files changed.' },
  { group: 'Pull requests', key: 'notifyReady', label: 'Notify when ready', description: 'A desktop notification when an open PR is ready to merge or starts failing.' },
  { group: 'Pull requests', key: 'hideChecksTab', label: 'Hide Checks tab', description: 'Drop the Checks tab from PRs; checks still show in the merge box.' },
  { group: 'Pull requests', key: 'hideMergeHint', label: 'Hide command line merge hint', description: 'Drop "You can also merge this with the command line" from the merge box.' },
  { group: 'Pull requests', key: 'fridayWarning', label: 'Friday merge warning', description: 'A worried note above the merge button on Fridays.' },
  { group: 'Pull requests', key: 'markdownReview', label: 'Rich Markdown review', description: 'Comment on rendered Markdown blocks.' },
  { group: 'Pull requests', key: 'pdfPreview', label: 'PDFs render inline', description: 'Preview changed PDFs on Files changed instead of "Binary file not shown."' },
  { group: 'Repository files', key: 'jumpToFile', label: 'Jump to file', description: 'Cmd/Ctrl+K in any repo to fuzzy-find a file.' },
  { group: 'Repository files', key: 'readmeToc', label: 'README contents', description: "A sticky outline of the README in the repo's sidebar." },
  { group: 'Repository files', key: 'markdownOutline', label: 'Open Markdown outline', description: "Show a Markdown file's outline by default; close it to keep it closed." },
  { group: 'Repository files', key: 'fileIcons', label: 'File icons', description: 'VS Code-style icons in file lists and trees.' },
  { group: 'Repository files', key: 'thumbnails', label: 'Image thumbnails', description: 'Preview images in file lists.' },
  { group: 'Repository files', key: 'downloads', label: 'Download files and folders', description: 'Download buttons, with folders as a ZIP.' },
  { group: 'Repository files', key: 'quickView', label: 'Quick view', description: 'Click a file row to preview it in place.' },
  { group: 'Everywhere', key: 'absoluteDates', label: 'Absolute dates', description: 'Show real dates instead of "last week".', choice: { key: 'dateFormat', label: 'Format', options: DATE_FORMATS } },
  { group: 'Everywhere', key: 'hideCopilot', label: 'Hide Copilot', description: 'Hide Copilot buttons and the Agents tab.' },
];

export const DEFAULT_SETTINGS: Settings = {
  ...(Object.fromEntries(FEATURES.map(({ key }) => [key, true])) as Record<FeatureKey, boolean>),
  mergeBarShadow: true,
  // Each dropdown defaults to its first option, and the editable prompts start as the built-in ones.
  claudePrompt: CLAUDE_PROMPTS[0].key,
  claudePrompts: CLAUDE_PROMPTS,
  dateFormat: DATE_FORMATS[0].key,
};

export async function loadSettings(): Promise<Settings> {
  return (await chrome.storage.sync.get(DEFAULT_SETTINGS)) as Settings;
}

export function saveSettings(values: Partial<Settings>): Promise<void> {
  return chrome.storage.sync.set(values);
}

/** The saved prompts, or the built-in ones when there are none. */
export function claudePrompts(settings: Settings): ClaudePrompt[] {
  return settings.claudePrompts?.length ? settings.claudePrompts : CLAUDE_PROMPTS;
}
