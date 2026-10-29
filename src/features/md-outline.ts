// Opens GitHub's outline panel on Markdown file pages by default. Close it and
// it stays closed on later files, until you open it again.
import { batched } from '@/lib/schedule';
import type { Settings } from '@/lib/settings';

const PREF_KEY = 'gh-tweaks-md-outline';
const BUTTON = 'button[class*="TableOfContents"][aria-pressed]';

const seen = new WeakSet<Element>();
let opening = false;
const schedule = batched(update, 50);

export function markdownOutline(settings: Settings): void {
  if (!settings.markdownOutline) return;
  new MutationObserver(onMutations).observe(document.documentElement, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['aria-pressed'],
  });
  schedule();
}

function onMutations(mutations: MutationRecord[]): void {
  for (const mutation of mutations) {
    // Your own open or close (not ours) becomes the new default.
    if (mutation.type === 'attributes' && !opening && mutation.target instanceof Element && mutation.target.matches(BUTTON)) {
      localStorage.setItem(PREF_KEY, mutation.target.getAttribute('aria-pressed') === 'true' ? 'open' : 'closed');
    }
  }
  schedule();
}

function update(): void {
  const button = document.querySelector<HTMLButtonElement>(BUTTON);
  // Each file page gets a new button, so this opens the outline once per file.
  if (!button || seen.has(button)) return;
  seen.add(button);
  if (localStorage.getItem(PREF_KEY) === 'closed' || button.getAttribute('aria-pressed') === 'true') return;
  opening = true;
  button.click();
  // The aria-pressed change from this click arrives with the next mutation batch.
  setTimeout(() => (opening = false), 0);
}
