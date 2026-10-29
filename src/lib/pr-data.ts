// Shared by the tweaks in a PR's header: which PR the page is on, GitHub's own
// JSON for its Files changed page (commits and your last review) and the
// header spot they add their buttons to.
const PR_PATH = /^\/([^/]+)\/([^/]+)\/pull\/(\d+)(?=\/|$)/;
// Long enough to share one request between tweaks, short enough to pick up new pushes.
const MAX_AGE = 60 * 1000;

export interface PullRequest {
  owner: string;
  repo: string;
  number: string;
  /** `/owner/repo/pull/123` */
  base: string;
}

/** The parts of GitHub's `pullRequestsChangesRoute` payload the tweaks read. */
export interface PullRequestChanges {
  user?: { lastReviewOid?: string };
  pullRequest?: { comparison?: { headOid?: string } };
  comparison?: { fullDiff?: { headOid?: string } };
  commits?: { oid: string }[];
}

let cached: { base: string; at: number; promise: Promise<PullRequestChanges | null> } | null = null;

export function currentPr(): PullRequest | null {
  const match = location.pathname.match(PR_PATH);
  if (!match) return null;
  const [base, owner, repo, number] = match as unknown as [string, string, string, string];
  return { owner, repo, number, base };
}

/** The payload GitHub's Files changed page renders from. Resolves to null when it can't be loaded. */
export function prChanges(): Promise<PullRequestChanges | null> {
  const pr = currentPr();
  if (!pr) return Promise.resolve(null);
  if (cached?.base === pr.base && Date.now() - cached.at < MAX_AGE) return cached.promise;
  const promise = fetch(`${pr.base}/changes`, { headers: { Accept: 'application/json' } })
    .then((response) => (response.ok ? response.json() : null))
    .then((json) => (json?.payload?.pullRequestsChangesRoute as PullRequestChanges | undefined) ?? null)
    .catch(() => null);
  cached = { base: pr.base, at: Date.now(), promise };
  return promise;
}

/** The row holding the header's Merge status and Code buttons. */
export function headerActions(): HTMLElement | null {
  const code = [...document.querySelectorAll<HTMLButtonElement>('[class*="PageHeader-Actions"] button[aria-haspopup]')].find(
    (button) => button.textContent?.trim() === 'Code',
  );
  return code?.parentElement ?? null;
}

/**
 * A link styled like GitHub's own header buttons, copying the Code button's classes so it
 * follows GitHub's theme. `icon` is SVG <path> markup, 16×16 like the Octicons unless `viewBox` says otherwise.
 */
export function headerButton({
  className,
  icon,
  label,
  title,
  viewBox = '0 0 16 16',
}: {
  className: string;
  icon: string;
  label: string;
  title: string;
  viewBox?: string;
}): HTMLAnchorElement {
  const code = headerActions()?.querySelector('button[aria-haspopup]');
  const classOf = (selector: string) => code?.querySelector(selector)?.className ?? '';
  const link = document.createElement('a');
  link.className = `${code?.className.replace(/\bhideLeadingVisual\S*/, '') ?? ''} ${className}`.trim();
  link.dataset.size = 'medium';
  link.dataset.variant = 'default';
  link.title = title;
  link.style.textDecoration = 'none';
  link.innerHTML = `<span class="${classOf('[data-component="buttonContent"]')}" data-component="buttonContent" data-align="center"><span class="${classOf('[data-component="leadingVisual"]')}" data-component="leadingVisual"><svg aria-hidden="true" viewBox="${viewBox}" width="16" height="16" fill="currentColor" class="octicon">${icon}</svg></span><span class="${classOf('[data-component="text"]')}" data-component="text"></span></span>`;
  link.querySelector('[data-component="text"]')!.textContent = label;
  return link;
}

/** Puts `element` just before the Code button, and back again if GitHub re-renders the header. */
export function placeBeforeCode(element: Element): boolean {
  const actions = headerActions();
  if (!actions) return false;
  if (element.parentElement !== actions) {
    actions.insertBefore(element, [...actions.children].find((child) => child.matches('button[aria-haspopup]')) ?? null);
  }
  return true;
}
