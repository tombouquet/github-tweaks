// Hides "You can also merge this with the command line. View command line
// instructions." next to the merge button on a PR's Conversation tab.
import { addStyle, batched } from '@/lib/schedule';
import type { Settings } from '@/lib/settings';

const HIDDEN_ATTR = 'data-gh-tweaks-merge-hint';

export function hideMergeHint(settings: Settings): void {
  if (!settings.hideMergeHint) return;
  addStyle(`[${HIDDEN_ATTR}] { display: none !important; }`);
  const schedule = batched(update, 50);
  new MutationObserver(schedule).observe(document.documentElement, { childList: true, subtree: true });
  schedule();
}

function update(): void {
  const card = document.querySelector('[data-testid="mergebox-border-container"]');
  if (!card) return;
  for (const link of card.querySelectorAll('a, button')) {
    if (!/command line instructions/i.test(link.textContent ?? '')) continue;
    // The muted line holding both the sentence and the link.
    const line = link.parentElement;
    if (line && !line.hasAttribute(HIDDEN_ATTR) && /merge this with the command line/i.test(line.textContent ?? '')) line.setAttribute(HIDDEN_ATTR, '');
  }
}
