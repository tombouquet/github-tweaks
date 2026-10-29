// GitHub renders every timestamp with the <relative-time> element. We switch
// it to its absolute "datetime" mode (so it stops re-rendering as "2 minutes
// ago") and then replace its text with the format picked in the popup
// (DATE_FORMATS in lib/settings.ts).
import { addStyle, batched } from '@/lib/schedule';
import { DATE_FORMATS, type Settings } from '@/lib/settings';

const DONE_ATTR = 'data-gh-tweaks-date';
// Durations ("3m 12s" on Actions runs) aren't dates, so leave them alone.
const DURATION_FORMATS = new Set(['duration', 'elapsed']);

let formatDate = DATE_FORMATS[0].format;

export function absoluteDates(settings: Settings): void {
  if (!settings.absoluteDates) return;
  const chosen = DATE_FORMATS.find(({ key }) => key === settings.dateFormat);
  if (chosen) formatDate = chosen.format;
  injectStyles();
  new MutationObserver(batched(apply, 50)).observe(document.documentElement, { childList: true, subtree: true });
  apply();
}

function apply(): void {
  for (const element of document.querySelectorAll(`relative-time:not([${DONE_ATTR}])`)) {
    element.setAttribute(DONE_ATTR, '');
    if (DURATION_FORMATS.has(element.getAttribute('format') ?? '')) continue;
    element.setAttribute('format', 'datetime');
    // The element renders asynchronously, so rewrite whenever its output changes.
    // Waiting a task lets it attach its shadow root and do the first render.
    setTimeout(() => {
      render(element);
      if (!element.shadowRoot) return;
      new MutationObserver(() => render(element)).observe(element.shadowRoot, {
        childList: true,
        characterData: true,
        subtree: true,
      });
    });
  }
}

function render(element: Element): void {
  const date = new Date(element.getAttribute('datetime') ?? '');
  if (Number.isNaN(date.getTime())) return;
  const text = formatDate(date);
  const target = element.shadowRoot ?? element;
  if (target.textContent !== text) target.textContent = text;
}

function injectStyles(): void {
  // The repo file list sizes its last-commit column for "last week".
  addStyle(`
    .react-directory-row td:last-child, .react-directory-row ~ * td:last-child { width: auto; }
    .react-directory-commit-age { width: auto !important; white-space: nowrap; }
    table:has(.react-directory-commit-age) thead th:last-child { width: 170px !important; }
  `);
}
