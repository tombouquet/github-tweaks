(() => {
  'use strict';

  // Targets GitHub's React PR pages (signed-in: Conversation at /pull/N, files at /pull/N/changes).
  // The classic /files page (signed-out) is left alone.
  const CONVERSATION_PATH = /^\/[^/]+\/[^/]+\/pull\/\d+\/?$/;
  const CHANGES_PATH = /^\/[^/]+\/[^/]+\/pull\/\d+\/changes/;
  const OPEN_REVIEW_KEY = 'gh-tweaks-open-review';
  const HIDDEN_KEY = 'gh-tweaks-hidden-categories';
  const HIDDEN_ATTR = 'data-gh-tweaks-hidden';

  // First match wins, so the specific buckets come before the catch-all ones.
  const CATEGORIES = [
    ['Lockfiles', /(^|\/)(package-lock\.json|npm-shrinkwrap\.json|yarn\.lock|pnpm-lock\.yaml|bun\.lockb?|Cargo\.lock|Gemfile\.lock|poetry\.lock|uv\.lock|Pipfile\.lock|composer\.lock|go\.sum|flake\.lock|Podfile\.lock|packages\.lock\.json)$/],
    ['Generated', /(^|\/)(dist|build|out|vendor|node_modules|__generated__|generated|__snapshots__)\/|\.min\.(js|css)$|\.(map|snap)$|\.pb\.go$|_pb2\.pyi?$|\.g\.dart$|\.designer\.cs$/],
    ['Tests', /(^|\/)(tests?|__tests__|__mocks__|spec|specs|e2e|fixtures)\/|[._-](test|spec)\.[^/]+$|_test\.go$|(^|\/)test_[^/]+\.py$/],
    ['Docs', /\.(md|mdx|rst|adoc|txt)$|(^|\/)docs?\//i],
    ['Config', /(^|\/)\.[^/]+|\.(json|jsonc|ya?ml|toml|ini|cfg|conf|properties|xml|lock)$|(^|\/)(Dockerfile|Makefile)$/],
    ['Source', /./],
  ];

  let hidden = loadHidden();
  let toolbar = null;
  let scheduled = false;
  let settings;

  GH_TWEAKS_SETTINGS.then((loaded) => {
    settings = loaded;
    if (!settings.reviewButton && !settings.fileTriage) return;
    injectStyles();
    new MutationObserver(schedule).observe(document.documentElement, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['aria-pressed'],
    });
    schedule();
  });

  // Batches the flood of React mutations into one pass.
  function schedule() {
    if (scheduled) return;
    scheduled = true;
    setTimeout(() => {
      scheduled = false;
      update();
    }, 50);
  }

  function update() {
    const path = location.pathname;
    if (settings.reviewButton) updateReviewButton(CONVERSATION_PATH.test(path) && isSignedIn());
    if (CHANGES_PATH.test(path)) {
      if (settings.reviewButton) openPendingReview();
      if (settings.fileTriage) updateTriage();
    }
  }

  function isSignedIn() {
    return Boolean(document.querySelector('meta[name="user-login"]')?.content);
  }

  // --- Review button on the Conversation tab --------------------------------

  let reviewButton = null;

  function updateReviewButton(show) {
    if (!show) {
      reviewButton?.remove();
      return;
    }
    if (!reviewButton) {
      reviewButton = document.createElement('button');
      reviewButton.type = 'button';
      reviewButton.className = 'gh-tweaks-review-button';
      // Octicon code-review (MIT).
      reviewButton.innerHTML =
        '<svg viewBox="0 0 16 16" width="16" height="16" fill="currentColor" aria-hidden="true"><path d="M1.75 1h12.5c.966 0 1.75.784 1.75 1.75v8.5A1.75 1.75 0 0 1 14.25 13H8.061l-2.574 2.573A1.458 1.458 0 0 1 3 14.543V13H1.75A1.75 1.75 0 0 1 0 11.25v-8.5C0 1.784.784 1 1.75 1ZM1.5 2.75v8.5c0 .138.112.25.25.25h2a.75.75 0 0 1 .75.75v2.19l2.72-2.72a.749.749 0 0 1 .53-.22h6.5a.25.25 0 0 0 .25-.25v-8.5a.25.25 0 0 0-.25-.25H1.75a.25.25 0 0 0-.25.25Zm5.28 1.72a.75.75 0 0 1 0 1.06L5.31 7l1.47 1.47a.751.751 0 0 1-.018 1.042.751.751 0 0 1-1.042.018l-2-2a.75.75 0 0 1 0-1.06l2-2a.75.75 0 0 1 1.06 0Zm2.44 0a.75.75 0 0 1 1.06 0l2 2a.75.75 0 0 1 0 1.06l-2 2a.751.751 0 0 1-1.042-.018.751.751 0 0 1-.018-1.042L10.69 7 9.22 5.53a.75.75 0 0 1 0-1.06Z"/></svg><span>Submit review</span>';
      reviewButton.title = 'Open the review dialog on the Files changed tab';
      reviewButton.addEventListener('click', () => {
        sessionStorage.setItem(OPEN_REVIEW_KEY, '1');
        location.assign(`${location.pathname.replace(/\/$/, '')}/changes`);
      });
    }
    // Attached to <html> so swapping <body> during navigation doesn't drop it.
    if (!reviewButton.isConnected) document.documentElement.append(reviewButton);
  }

  function openPendingReview() {
    if (!sessionStorage.getItem(OPEN_REVIEW_KEY)) return;
    const button = document.querySelector('button[class*="ReviewMenuButton"]');
    if (!button) return;
    sessionStorage.removeItem(OPEN_REVIEW_KEY);
    button.click();
  }

  // --- File triage on the Files changed tab ----------------------------------

  function categorize(path) {
    return CATEGORIES.find(([, pattern]) => pattern.test(path))[0];
  }

  function updateTriage() {
    const tree = document.querySelector('#pr-file-tree');
    if (!tree) return;

    // Tree leaves are the <li>s without aria-expanded; their id is the file path.
    const treeFiles = [...tree.querySelectorAll('li[role="treeitem"]:not([aria-expanded])')];
    const diffs = [...document.querySelectorAll('[data-testid="progressive-diffs-list"] > div')]
      .map((entry) => ({ entry, path: diffPath(entry) }))
      .filter((diff) => diff.path);

    const counts = new Map();
    for (const li of treeFiles) {
      const category = categorize(li.id);
      counts.set(category, (counts.get(category) ?? 0) + 1);
      setHidden(li, hidden.has(category));
    }

    let total = 0;
    let viewed = 0;
    for (const { entry, path } of diffs) {
      const isHidden = hidden.has(categorize(path));
      setHidden(entry, isHidden);
      if (isHidden) continue;
      total++;
      // The toggle's label flips between "Not Viewed" and "Viewed"; aria-pressed is the stable bit.
      const toggle = [...entry.querySelectorAll('button[aria-pressed]')].find((b) => /viewed/i.test(b.textContent));
      if (toggle?.getAttribute('aria-pressed') === 'true') viewed++;
    }

    renderToolbar(tree, counts, viewed, total, treeFiles.length - total);
  }

  function diffPath(entry) {
    // GitHub wraps the path in left-to-right marks.
    return entry.querySelector('h3 code')?.textContent.replace(/[‎‏]/g, '').trim();
  }

  function setHidden(element, value) {
    if (element.hasAttribute(HIDDEN_ATTR) !== value) element.toggleAttribute(HIDDEN_ATTR, value);
  }

  function renderToolbar(tree, counts, viewed, total, hiddenCount) {
    if (!toolbar) {
      toolbar = document.createElement('div');
      toolbar.className = 'gh-tweaks-triage';
      toolbar.addEventListener('click', (event) => {
        const chip = event.target.closest('button[data-category]');
        if (!chip) return;
        const { category } = chip.dataset;
        if (hidden.has(category)) hidden.delete(category);
        else hidden.add(category);
        saveHidden();
        update();
      });
    }
    const filter = tree.querySelector('#diff-file-tree-filter');
    if (!toolbar.isConnected) (filter ?? tree.firstElementChild)?.after(toolbar);

    // Rebuilding on every pass would steal focus and thrash React's observer, so diff by key.
    const key = JSON.stringify([...counts, viewed, total, hiddenCount, [...hidden]]);
    if (toolbar.dataset.key === key) return;
    toolbar.dataset.key = key;

    const chips = CATEGORIES.map(([name]) => name)
      .filter((name) => counts.has(name))
      .map((name) => {
        const chip = document.createElement('button');
        chip.type = 'button';
        chip.dataset.category = name;
        chip.setAttribute('aria-pressed', String(!hidden.has(name)));
        chip.title = hidden.has(name) ? `Show ${name.toLowerCase()}` : `Hide ${name.toLowerCase()}`;
        // Octicon check (MIT), shown only while the category is visible.
        chip.innerHTML =
          '<svg viewBox="0 0 16 16" width="12" height="12" fill="currentColor" aria-hidden="true"><path d="M13.78 4.22a.75.75 0 0 1 0 1.06l-7.25 7.25a.75.75 0 0 1-1.06 0L2.22 9.28a.751.751 0 0 1 .018-1.042.751.751 0 0 1 1.042-.018L6 10.94l6.72-6.72a.75.75 0 0 1 1.06 0Z"/></svg><span></span><span class="gh-tweaks-count"></span>';
        chip.querySelector('span').textContent = name;
        chip.querySelector('.gh-tweaks-count').textContent = counts.get(name);
        return chip;
      });

    const progress = document.createElement('div');
    progress.className = 'gh-tweaks-progress';
    const percent = total ? Math.round((viewed / total) * 100) : 100;
    progress.innerHTML = '<div class="gh-tweaks-bar"><span></span></div><span class="gh-tweaks-label"></span>';
    progress.querySelector('.gh-tweaks-bar span').style.width = `${percent}%`;
    progress.querySelector('.gh-tweaks-label').textContent =
      `${viewed} of ${total} viewed` + (hiddenCount ? ` · ${hiddenCount} hidden` : '');

    const chipRow = document.createElement('div');
    chipRow.className = 'gh-tweaks-chips';
    chipRow.append(...chips);
    toolbar.replaceChildren(chipRow, progress);
  }

  function loadHidden() {
    try {
      return new Set(JSON.parse(localStorage.getItem(HIDDEN_KEY)) ?? []);
    } catch {
      return new Set();
    }
  }

  function saveHidden() {
    try {
      localStorage.setItem(HIDDEN_KEY, JSON.stringify([...hidden]));
    } catch {
      // Storage blocked: the filter still works for this page.
    }
  }

  function injectStyles() {
    const style = document.createElement('style');
    style.textContent = `
      [${HIDDEN_ATTR}] { display: none !important; }
      /* Hide folders whose files are all hidden. */
      #pr-file-tree li[role="treeitem"][aria-expanded]:not(:has(li[role="treeitem"]:not([aria-expanded]):not([${HIDDEN_ATTR}]))) {
        display: none !important;
      }
      .gh-tweaks-triage {
        display: flex;
        flex-direction: column;
        gap: 10px;
        /* Sits inside GitHub's filter wrapper, which already pads the bottom. */
        margin-top: 10px;
        font-size: 12px;
        line-height: 18px;
        animation: gh-tweaks-drop-in 220ms ease-out backwards;
      }
      .gh-tweaks-chips { display: flex; flex-wrap: wrap; gap: 6px; }
      .gh-tweaks-chips button {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        height: 24px;
        padding: 0 8px;
        border: 1px solid var(--borderColor-muted, #d1d9e0b3);
        border-radius: 999px;
        background: transparent;
        color: var(--fgColor-muted, #59636e);
        font: inherit;
        font-weight: 500;
        cursor: pointer;
        transition: background-color 80ms, border-color 80ms, color 80ms;
      }
      .gh-tweaks-chips button:hover {
        background: var(--bgColor-neutral-muted, #818b981f);
        color: var(--fgColor-default, #1f2328);
      }
      .gh-tweaks-chips button:focus-visible { outline: 2px solid var(--focus-outlineColor, #0969da); outline-offset: 1px; }
      .gh-tweaks-chips button svg { display: none; }
      .gh-tweaks-chips button[aria-pressed="true"] {
        border-color: var(--borderColor-default, #d1d9e0);
        background: var(--bgColor-muted, #f6f8fa);
        color: var(--fgColor-default, #1f2328);
      }
      .gh-tweaks-chips button[aria-pressed="true"] svg { display: block; color: var(--fgColor-success, #1a7f37); }
      .gh-tweaks-chips button[aria-pressed="false"] span:first-of-type { opacity: 0.7; }
      .gh-tweaks-count {
        min-width: 16px;
        padding: 0 5px;
        border-radius: 999px;
        background: var(--bgColor-neutral-muted, #818b981f);
        color: var(--fgColor-muted, #59636e);
        font-size: 11px;
        line-height: 16px;
        text-align: center;
        font-variant-numeric: tabular-nums;
      }
      .gh-tweaks-progress { display: flex; align-items: center; gap: 10px; color: var(--fgColor-muted, #59636e); }
      .gh-tweaks-bar {
        flex: 1;
        height: 4px;
        overflow: hidden;
        border-radius: 999px;
        background: var(--bgColor-neutral-muted, #818b981f);
      }
      .gh-tweaks-bar span {
        display: block;
        height: 100%;
        border-radius: inherit;
        background: var(--bgColor-success-emphasis, #1f883d);
        transition: width 200ms ease-out;
      }
      .gh-tweaks-label { flex: none; font-variant-numeric: tabular-nums; }
      .gh-tweaks-review-button {
        position: fixed;
        right: 24px;
        bottom: 24px;
        z-index: 100;
        display: inline-flex;
        align-items: center;
        gap: 8px;
        height: 40px;
        padding: 0 16px;
        border: 1px solid var(--button-primary-borderColor-rest, #1f883d);
        border-radius: 999px;
        background: var(--button-primary-bgColor-rest, #1f883d);
        color: var(--button-primary-fgColor-rest, #fff);
        font: 600 14px/20px -apple-system, BlinkMacSystemFont, "Segoe UI", "Noto Sans", Helvetica, Arial, sans-serif;
        box-shadow: var(--shadow-floating-medium, 0 8px 24px rgba(37, 41, 46, 0.2));
        cursor: pointer;
        transition: background-color 80ms, transform 80ms;
        animation: gh-tweaks-rise-in 280ms cubic-bezier(0.2, 0.8, 0.2, 1) backwards;
      }
      .gh-tweaks-review-button:hover { background: var(--button-primary-bgColor-hover, #1c8139); }
      .gh-tweaks-review-button:active { transform: translateY(1px); }
      .gh-tweaks-review-button:focus-visible { outline: 2px solid var(--focus-outlineColor, #0969da); outline-offset: 2px; }
      /* Entry animations for everything the extension adds after the page loads. */
      @keyframes gh-tweaks-drop-in { from { opacity: 0; transform: translateY(-4px); } }
      /* Slide only, no fade, so shadows show at full strength straight away. */
      @keyframes gh-tweaks-rise-in { from { transform: translateY(96px); } }
      @keyframes gh-tweaks-fade-in { from { opacity: 0; } }
      @media (prefers-reduced-motion: reduce) {
        [class*="gh-tweaks"], [class*="gh-tweaks"]::before, [class*="gh-tweaks"]::after { animation: none !important; transition: none !important; }
      }
    `;
    document.documentElement.append(style);
  }
})();
