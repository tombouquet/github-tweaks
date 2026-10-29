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

  // A link styled like GitHub's own header buttons, copying the Code button's
  // classes so it follows GitHub's theme. `icon` is an Octicon's <path> markup.
  function headerButton({ className, icon, label, title }) {
    const code = headerActions()?.querySelector('button[aria-haspopup]');
    const classOf = (selector) => code?.querySelector(selector)?.className ?? '';
    const link = document.createElement('a');
    link.className = `${code?.className.replace(/\bhideLeadingVisual\S*/, '') ?? ''} ${className}`.trim();
    link.dataset.size = 'medium';
    link.dataset.variant = 'default';
    link.title = title;
    link.style.textDecoration = 'none';
    link.innerHTML = `<span class="${classOf('[data-component="buttonContent"]')}" data-component="buttonContent" data-align="center"><span class="${classOf('[data-component="leadingVisual"]')}" data-component="leadingVisual"><svg aria-hidden="true" viewBox="0 0 16 16" width="16" height="16" fill="currentColor" class="octicon">${icon}</svg></span><span class="${classOf('[data-component="text"]')}" data-component="text"></span></span>`;
    link.querySelector('[data-component="text"]').textContent = label;
    return link;
  }

  // Puts `element` just before the Code button, and back again if GitHub re-renders the header.
  function placeBeforeCode(element) {
    const actions = headerActions();
    if (!actions) return false;
    if (element.parentElement !== actions) actions.insertBefore(element, [...actions.children].find((child) => child.matches('button[aria-haspopup]')) ?? null);
    return true;
  }

  // The "+30 −4" line count next to the PR's tabs.
  function headerDiffstat() {
    const label = [...document.querySelectorAll('[data-component="PH_Navigation"] .sr-only')].find((element) =>
      element.textContent.startsWith('Lines changed'),
    );
    return label?.parentElement ?? null;
  }

  return { current, changes, headerActions, headerButton, placeBeforeCode, headerDiffstat };
})();
