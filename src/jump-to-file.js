(() => {
  'use strict';

  // Cmd/Ctrl+P anywhere in a repo (code, PRs, issues, Actions…) opens a fuzzy
  // file finder over every file on the current branch, or the default branch
  // outside the code pages. Enter opens the file, Cmd/Ctrl+Enter opens it in a new
  // tab, and Shift+Enter previews it in Quick view.
  // First path segments that are GitHub pages rather than an owner.
  const RESERVED = new Set([
    'about', 'account', 'apps', 'codespaces', 'collections', 'copilot', 'dashboard', 'enterprise', 'events', 'explore',
    'features', 'issues', 'login', 'logout', 'marketplace', 'models', 'new', 'notifications', 'orgs', 'organizations',
    'pricing', 'pulls', 'search', 'settings', 'sponsors', 'stars', 'topics', 'trending', 'users', 'watching',
  ]);
  const MAX_RESULTS = 50;

  let dialog = null;
  let input;
  let list;
  let status;
  let files = null;
  let results = [];
  let selected = 0;
  let loadId = 0;

  GH_TWEAKS_SETTINGS.then((settings) => {
    if (!settings.jumpToFile) return;
    injectStyles();
    // Capture phase, so it runs before GitHub's own shortcuts and the browser's Print.
    document.addEventListener('keydown', onShortcut, true);
  });

  function currentRepo() {
    const [, owner, repo] = location.pathname.split('/');
    if (!owner || !repo || RESERVED.has(owner.toLowerCase())) return null;
    return { owner, repo };
  }

  function onShortcut(event) {
    if (event.key.toLowerCase() !== 'p' || !(event.metaKey || event.ctrlKey) || event.shiftKey || event.altKey) return;
    // While open, Ctrl+P moves up the list (like Ctrl+N moves down) and Cmd+P does nothing.
    if (dialog?.open) {
      event.preventDefault();
      event.stopPropagation();
      if (event.ctrlKey && !event.metaKey) move(-1);
      return;
    }
    const repo = currentRepo();
    if (!repo) return;
    event.preventDefault();
    event.stopPropagation();
    open(repo);
  }

  async function open(repo) {
    dialog ??= createDialog();
    if (!dialog.open) dialog.showModal();
    input.value = '';
    input.focus();
    const id = ++loadId;
    if (files?.repoKey !== `${repo.owner}/${repo.repo}`) {
      results = [];
      list.replaceChildren();
      status.textContent = 'Loading files…';
    }
    try {
      const loaded = await loadFiles(repo);
      if (id !== loadId) return;
      files = loaded;
      search();
    } catch (error) {
      if (id === loadId) status.textContent = error.message;
    }
  }

  async function loadFiles({ owner, repo }) {
    const ref = (await currentRef(owner, repo)) ?? 'HEAD';
    const key = `${owner}/${repo}@${ref}`;
    if (files?.key === key) return files;
    // tree-list wants a commit id, which the branch's tree JSON has.
    const tree = await getJson(`/${owner}/${repo}/tree/${encodePath(ref)}`);
    const oid = tree?.payload?.codeViewTreeRoute?.refInfo?.currentOid;
    const listing = oid && (await getJson(`/${owner}/${repo}/tree-list/${oid}`));
    if (!listing?.paths) throw new Error("Couldn't load this repo's files.");
    return { key, repoKey: `${owner}/${repo}`, owner, repo, ref, paths: listing.paths };
  }

  // The branch or tag shown in the page's branch picker, else the repo's default branch.
  async function currentRef(owner, repo) {
    const picker = document.querySelector('#ref-picker-repos-header-ref-selector');
    const name = picker?.getAttribute('aria-label')?.replace(/\s+(branch|tag)$/i, '').trim();
    if (name) return name;
    const home = await getJson(`/${owner}/${repo}`);
    return home?.payload?.codeViewRepoRoute?.refInfo?.name ?? null;
  }

  async function getJson(pathname) {
    try {
      const response = await fetch(pathname, { headers: { Accept: 'application/json' } });
      return response.ok ? await response.json() : null;
    } catch {
      return null;
    }
  }

  function search() {
    if (!files) return;
    const query = input.value.toLowerCase().replace(/\s+/g, '');
    if (!query) {
      results = [];
      selected = 0;
      list.replaceChildren();
      status.textContent = `Type to search ${files.paths.length.toLocaleString()} files on ${files.ref}`;
      return;
    }
    const scored = [];
    for (const path of files.paths) {
      const match = score(path, query);
      if (match) scored.push({ path, ...match });
    }
    scored.sort((a, b) => b.total - a.total);
    results = scored.slice(0, MAX_RESULTS);
    selected = 0;
    status.textContent = scored.length ? '' : 'No matching files';
    render();
  }

  // Subsequence match. Consecutive letters, letters at the start of a word and
  // letters in the file name score higher, and shorter paths win ties. Tries a
  // match inside the file name first, since that's usually what you're typing.
  function score(path, query) {
    const lower = path.toLowerCase();
    const nameStart = lower.lastIndexOf('/') + 1;
    const fromName = matchFrom(lower, query, nameStart, nameStart);
    const fromStart = matchFrom(lower, query, 0, nameStart);
    const best = fromName && (!fromStart || fromName.total >= fromStart.total) ? fromName : fromStart;
    if (!best) return null;
    best.total -= path.length * 0.01;
    return best;
  }

  function matchFrom(lower, query, start, nameStart) {
    let q = 0;
    let previous = -2;
    let total = 0;
    const hits = [];
    for (let i = start; i < lower.length && q < query.length; i++) {
      if (lower[i] !== query[q]) continue;
      total += 1 + (i === previous + 1 ? 5 : 0) + (i === 0 || '/._- '.includes(lower[i - 1]) ? 3 : 0) + (i >= nameStart ? 2 : 0);
      hits.push(i);
      previous = i;
      q++;
    }
    return q === query.length ? { total, hits } : null;
  }

  function render() {
    list.replaceChildren(
      ...results.map(({ path, hits }, index) => {
        const item = document.createElement('li');
        item.className = 'gh-tweaks-jump-item';
        item.setAttribute('role', 'option');
        item.setAttribute('aria-selected', String(index === selected));
        item.dataset.index = index;
        const slash = path.lastIndexOf('/');
        const icon = document.createElement('img');
        icon.className = 'gh-tweaks-jump-icon';
        icon.alt = '';
        icon.src = GH_TWEAKS_FILES?.iconUrl(path.slice(slash + 1)) ?? '';
        const name = document.createElement('span');
        name.className = 'gh-tweaks-jump-name';
        name.append(highlight(path, slash + 1, path.length, hits));
        const folder = document.createElement('span');
        folder.className = 'gh-tweaks-jump-folder';
        if (slash > 0) folder.append(highlight(path, 0, slash, hits));
        item.append(icon, name, folder);
        return item;
      }),
    );
    list.children[selected]?.scrollIntoView({ block: 'nearest' });
  }

  // The text from `from` to `to`, with matched letters in <mark>.
  function highlight(path, from, to, hits) {
    const fragment = document.createDocumentFragment();
    let run = '';
    for (let i = from; i < to; i++) {
      if (hits.includes(i)) {
        if (run) fragment.append(run);
        run = '';
        const mark = document.createElement('mark');
        mark.textContent = path[i];
        fragment.append(mark);
      } else {
        run += path[i];
      }
    }
    if (run) fragment.append(run);
    return fragment;
  }

  function move(step) {
    if (!results.length) return;
    selected = (selected + step + results.length) % results.length;
    for (const item of list.children) item.setAttribute('aria-selected', String(Number(item.dataset.index) === selected));
    list.children[selected]?.scrollIntoView({ block: 'nearest' });
  }

  function choose(index, { newTab = false, preview = false } = {}) {
    const result = results[index];
    if (!result || !files) return;
    const pathname = `/${files.owner}/${files.repo}/blob/${encodePath(files.ref)}/${encodePath(result.path)}`;
    const quickView = GH_TWEAKS_FILES?.quickView;
    if (preview && quickView) {
      dialog.close();
      quickView(pathname, result.path.split('/').pop());
    } else if (newTab) {
      window.open(pathname, '_blank', 'noopener');
    } else {
      dialog.close();
      location.assign(pathname);
    }
  }

  function encodePath(path) {
    return path.split('/').map(encodeURIComponent).join('/');
  }

  function createDialog() {
    const element = document.createElement('dialog');
    element.className = 'gh-tweaks-jump';
    element.setAttribute('aria-label', 'Jump to file');
    element.innerHTML = `
      <input type="text" placeholder="Jump to file…" spellcheck="false" autocomplete="off" aria-label="File name">
      <ul role="listbox"></ul>
      <p class="gh-tweaks-jump-status"></p>
      <footer><kbd>↑</kbd><kbd>↓</kbd> move <kbd>↵</kbd> open <kbd>⌘/Ctrl ↵</kbd> new tab <kbd>⇧ ↵</kbd> quick view <kbd>esc</kbd> close</footer>`;
    input = element.querySelector('input');
    list = element.querySelector('ul');
    status = element.querySelector('.gh-tweaks-jump-status');
    input.addEventListener('input', search);
    input.addEventListener('keydown', (event) => {
      if (event.key === 'ArrowDown' || (event.ctrlKey && event.key === 'n')) move(1);
      else if (event.key === 'ArrowUp') move(-1);
      else if (event.key === 'Enter') choose(selected, { newTab: event.metaKey || event.ctrlKey, preview: event.shiftKey });
      else return;
      event.preventDefault();
    });
    list.addEventListener('click', (event) => {
      const item = event.target.closest('.gh-tweaks-jump-item');
      if (item) choose(Number(item.dataset.index), { newTab: event.metaKey || event.ctrlKey, preview: event.shiftKey });
    });
    // A click on the backdrop lands on the dialog itself.
    element.addEventListener('click', (event) => event.target === element && element.close());
    document.body.append(element);
    return element;
  }

  function injectStyles() {
    const style = document.createElement('style');
    style.textContent = `
      .gh-tweaks-jump {
        width: min(640px, calc(100vw - 32px));
        max-height: min(560px, calc(100vh - 160px));
        margin: 96px auto auto;
        padding: 0;
        overflow: hidden;
        flex-direction: column;
        border: 1px solid var(--borderColor-default, #d1d9e0);
        border-radius: 12px;
        background: var(--overlay-bgColor, var(--bgColor-default, #fff));
        color: var(--fgColor-default, #1f2328);
        box-shadow: var(--shadow-floating-large, 0 24px 48px rgba(0, 0, 0, 0.3));
        font: 14px var(--fontStack-sansSerif, -apple-system, sans-serif);
      }
      .gh-tweaks-jump[open] { display: flex; }
      .gh-tweaks-jump::backdrop { background: var(--overlay-backdrop-bgColor, rgba(31, 35, 40, 0.5)); }
      .gh-tweaks-jump input {
        flex-shrink: 0;
        width: 100%;
        box-sizing: border-box;
        padding: 14px 16px;
        border: 0;
        border-bottom: 1px solid var(--borderColor-default, #d1d9e0);
        background: transparent;
        color: inherit;
        font: inherit;
        font-size: 16px;
        outline: none;
      }
      .gh-tweaks-jump ul { margin: 0; padding: 6px; overflow-y: auto; list-style: none; }
      .gh-tweaks-jump ul:empty { display: none; }
      .gh-tweaks-jump-item {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 6px 10px;
        border-radius: 6px;
        cursor: pointer;
        white-space: nowrap;
      }
      .gh-tweaks-jump-item:hover { background: var(--bgColor-neutral-muted, #818b981f); }
      .gh-tweaks-jump-item[aria-selected="true"] { background: var(--bgColor-accent-muted, #ddf4ff); }
      .gh-tweaks-jump-icon { width: 16px; height: 16px; flex-shrink: 0; }
      .gh-tweaks-jump-name { flex-shrink: 0; font-weight: 600; }
      .gh-tweaks-jump-folder { min-width: 0; overflow: hidden; text-overflow: ellipsis; color: var(--fgColor-muted, #59636e); font-size: 12px; }
      .gh-tweaks-jump mark { background: none; color: var(--fgColor-accent, #0969da); font-weight: 700; }
      .gh-tweaks-jump-status { margin: 0; padding: 12px 16px; color: var(--fgColor-muted, #59636e); }
      .gh-tweaks-jump-status:empty { display: none; }
      .gh-tweaks-jump footer {
        flex-shrink: 0;
        padding: 8px 16px;
        border-top: 1px solid var(--borderColor-muted, #d1d9e0b3);
        color: var(--fgColor-muted, #59636e);
        font-size: 12px;
      }
      .gh-tweaks-jump kbd {
        display: inline-block;
        margin: 0 2px 0 6px;
        padding: 0 4px;
        border: 1px solid var(--borderColor-default, #d1d9e0);
        border-radius: 4px;
        font: 11px var(--fontStack-monospace, ui-monospace, monospace);
        line-height: 16px;
      }
      .gh-tweaks-jump kbd:first-child { margin-left: 0; }
    `;
    document.documentElement.append(style);
  }
})();
