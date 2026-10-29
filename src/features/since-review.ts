// A "2 new commits" button in a PR's header that opens Files changed showing
// only the commits pushed after your last review, the same view as GitHub's
// "Changes since your last review" in the commit picker. It only shows when
// there's something new, and flips to "All changes" while you're in that view.
import { currentPr, headerActions, headerButton, placeBeforeCode, prChanges } from '@/lib/pr-data';
import { batched } from '@/lib/schedule';
import type { Settings } from '@/lib/settings';

// Octicons (MIT): history, file-diff.
const HISTORY_ICON =
  '<path d="m.427 1.927 1.215 1.215a8.002 8.002 0 1 1-1.6 5.685.75.75 0 1 1 1.493-.154 6.5 6.5 0 1 0 1.18-4.458l1.358 1.358A.25.25 0 0 1 3.896 6H.25A.25.25 0 0 1 0 5.75V2.104a.25.25 0 0 1 .427-.177ZM7.75 4a.75.75 0 0 1 .75.75v2.992l2.028.812a.75.75 0 0 1-.557 1.392l-2.5-1A.751.751 0 0 1 7 8.25v-3.5A.75.75 0 0 1 7.75 4Z"/>';
const ALL_ICON =
  '<path d="M1 1.75C1 .784 1.784 0 2.75 0h7.586c.464 0 .909.184 1.237.513l2.914 2.914c.329.328.513.773.513 1.237v9.586A1.75 1.75 0 0 1 13.25 16H2.75A1.75 1.75 0 0 1 1 14.25Zm1.75-.25a.25.25 0 0 0-.25.25v12.5c0 .138.112.25.25.25h10.5a.25.25 0 0 0 .25-.25V4.664a.25.25 0 0 0-.073-.177l-2.914-2.914a.25.25 0 0 0-.177-.073ZM8 3.25a.75.75 0 0 1 .75.75v1.5h1.5a.75.75 0 0 1 0 1.5h-1.5v1.5a.75.75 0 0 1-1.5 0V7h-1.5a.75.75 0 0 1 0-1.5h1.5V4A.75.75 0 0 1 8 3.25Zm-3 8a.75.75 0 0 1 .75-.75h4.5a.75.75 0 0 1 0 1.5h-4.5a.75.75 0 0 1-.75-.75Z"/>';

let button: HTMLAnchorElement | null = null;
let buttonKey = '';

export function sinceReview(settings: Settings): void {
  if (!settings.sinceReview) return;
  const schedule = batched(() => void update(), 100);
  new MutationObserver(schedule).observe(document.documentElement, { childList: true, subtree: true });
  schedule();
}

async function update(): Promise<void> {
  const pr = currentPr();
  if (!pr || !headerActions()) return button?.remove();
  const data = await prChanges();
  if (currentPr()?.base !== pr.base) return;
  const last = data?.user?.lastReviewOid;
  const head = data?.pullRequest?.comparison?.headOid ?? data?.comparison?.fullDiff?.headOid;
  if (!last || !head || last === head) return button?.remove();

  const inRange = location.pathname.startsWith(`${pr.base}/changes/${last}..`);
  const oids = (data.commits ?? []).map((commit) => commit.oid);
  const index = oids.indexOf(last);
  // A force-push can drop the reviewed commit from the list, so the count is a bonus.
  const count = index === -1 ? null : oids.length - 1 - index;
  const key = `${pr.base}|${last}|${head}|${inRange}`;
  if (key !== buttonKey || !button) {
    buttonKey = key;
    button?.remove();
    button = inRange
      ? headerButton({ className: 'gh-tweaks-header-button', icon: ALL_ICON, label: 'All changes', title: 'Show every change in this PR' })
      : headerButton({
          className: 'gh-tweaks-header-button',
          icon: HISTORY_ICON,
          label: count ? `${count} new commit${count === 1 ? '' : 's'}` : 'Since your review',
          title: 'Show only the changes pushed since your last review',
        });
    button.href = inRange ? `${pr.base}/changes` : `${pr.base}/changes/${last}..${head}`;
  }
  placeBeforeCode(button);
}
