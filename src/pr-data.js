// Shared by the tweaks in a PR's header: which PR the page is on, GitHub's own
// JSON for its Files changed page (files, line counts, viewed state, your last
// review) and the header spots they add their buttons to.
globalThis.GH_TWEAKS_PR = (() => {
  const PR_PATH = /^\/([^/]+)\/([^/]+)\/pull\/(\d+)(?=\/|$)/;
  // Long enough to share one request between tweaks, short enough to pick up new pushes.
  const MAX_AGE = 60 * 1000;
  let cached = null;

  function current() {
    const match = location.pathname.match(PR_PATH);
    if (!match) return null;
    const [base, owner, repo, number] = match;
    return { owner, repo, number, base };
  }

  // The `pullRequestsChangesRoute` payload GitHub's Files changed page renders from.
  // Resolves to null when it can't be loaded.
  function changes() {
    const pr = current();
    if (!pr) return Promise.resolve(null);
    if (cached?.base === pr.base && Date.now() - cached.at < MAX_AGE) return cached.promise;
    const promise = fetch(`${pr.base}/changes`, { headers: { Accept: 'application/json' } })
      .then((response) => (response.ok ? response.json() : null))
      .then((json) => json?.payload?.pullRequestsChangesRoute ?? null)
      .catch(() => null);
    cached = { base: pr.base, at: Date.now(), promise };
    return promise;
  }

  // The row holding the header's Merge status and Code buttons.
  function headerActions() {
    const code = [...document.querySelectorAll('[class*="PageHeader-Actions"] button[aria-haspopup]')].find(
      (button) => button.textContent.trim() === 'Code',
    );
    return code?.parentElement ?? null;
  }

  // The "+30 −4" line count next to the PR's tabs.
  function headerDiffstat() {
    const label = [...document.querySelectorAll('[data-component="PH_Navigation"] .sr-only')].find((element) =>
      element.textContent.startsWith('Lines changed'),
    );
    return label?.parentElement ?? null;
  }

  return { current, changes, headerActions, headerDiffstat };
})();
