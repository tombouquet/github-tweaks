// Hides the Checks tab on PRs. Check results still show in the merge box and the sticky merge bar.
import { addStyle } from '@/lib/schedule';
import type { Settings } from '@/lib/settings';

export function hideChecksTab(settings: Settings): void {
  if (!settings.hideChecksTab) return;
  addStyle('nav[aria-label="Pull request navigation"] a[href$="/checks"] { display: none !important; }');
}
