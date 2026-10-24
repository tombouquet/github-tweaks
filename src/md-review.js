(() => {
  'use strict';

  // Markdown files on a PR's Files changed tab open as rich diffs, and the
  // rendered blocks can be selected (click, shift-click to extend) and commented
  // on. GitHub only comments on source lines, so each block is matched to its
  // source lines, and "Comment" switches to the source diff, selects those
  // lines and opens GitHub's own comment form.
  const CHANGES_PATH = /^\/[^/]+\/[^/]+\/pull\/\d+\/changes/;
  const MARKDOWN = /\.(md|mdx|markdown)$/i;
  const MAPPED_ATTR = 'data-gh-tweaks-md';
  const SELECTED_ATTR = 'data-gh-tweaks-md-selected';
  // How far past the previous block to look for the next block's first line.
  const SEARCH_WINDOW = 80;
  // Octicon plus (MIT).
  const PLUS_SVG =
    '<svg viewBox="0 0 16 16" width="16" height="16" fill="currentColor" aria-hidden="true"><path d="M7.75 2a.75.75 0 0 1 .75.75V7h4.25a.75.75 0 0 1 0 1.5H8.5v4.25a.75.75 0 0 1-1.5 0V8.5H2.75a.75.75 0 0 1 0-1.5H7V2.75A.75.75 0 0 1 7.75 2Z"></path></svg>';

  // Source lines seen in each file's source diff, by path: { right: Map, left: Map } of line number → text.
  const sourceLines = new Map();
  // Files already shown rich once, so a manual switch back to source sticks.
  const switched = new Set();
  const attempts = new Map();
  const RETRY_MS = 400;
  const MAX_ATTEMPTS = 15;
  let anchor = null;
  let addButton = null;
  let scheduled = false;

  GH_TWEAKS_SETTINGS.then((settings) => {
    if (!settings.markdownReview) return;
    injectStyles();
    new MutationObserver(schedule).observe(document.documentElement, { childList: true, subtree: true });
    document.addEventListener('click', onClick, true);
    document.addEventListener('mouseover', onHover);
    schedule();
  });

  function schedule() {
    if (scheduled) return;
    scheduled = true;
    setTimeout(() => {
      scheduled = false;
      update();
    }, 50);
  }

  function update() {
    if (!CHANGES_PATH.test(location.pathname)) return;
    for (const entry of document.querySelectorAll('[data-testid="progressive-diffs-list"] > div')) {
      const path = filePath(entry);
      if (!path || !MARKDOWN.test(path)) continue;
      const captured = captureLines(entry, path);
      const article = entry.querySelector('article.markdown-body');
      // Only count the switch once the rich diff is actually showing: a click
      // that lands before GitHub's React has hydrated the button does nothing.
      if (article) switched.add(path);
      else if (captured && !switched.has(path)) switchToRich(entry, path);
      if (article && !article.hasAttribute(MAPPED_ATTR)) mapBlocks(article, path);
    }
  }

  // Retries until the rich diff shows, at most every RETRY_MS and MAX_ATTEMPTS times.
  function switchToRich(entry, path) {
    const now = Date.now();
    const attempt = attempts.get(path) ?? { count: 0, at: 0 };
    if (attempt.count >= MAX_ATTEMPTS || now - attempt.at < RETRY_MS) {
      if (attempt.count < MAX_ATTEMPTS) setTimeout(schedule, RETRY_MS);
      return;
    }
    attempts.set(path, { count: attempt.count + 1, at: now });
    headerButton(entry, 'Display the rich diff')?.click();
    setTimeout(schedule, RETRY_MS);
  }

  function filePath(entry) {
    // GitHub wraps the path in left-to-right marks.
    return entry.querySelector('[data-diff-header-wrapper] h3 code')?.textContent.replace(/[‎‏]/g, '').trim();
  }

  // Header buttons are icon-only; their names live in the tooltip they point at.
  function headerButton(entry, label) {
    return [...entry.querySelectorAll('[data-diff-header-wrapper] button')].find(
      (button) => (button.getAttribute('aria-label') ?? document.getElementById(button.getAttribute('aria-labelledby'))?.textContent) === label,
    );
  }

  function captureLines(entry, path) {
    const cells = entry.querySelectorAll('td.diff-text-cell[data-diff-side][data-line-number]');
    if (!cells.length) return false;
    const lines = sourceLines.get(path) ?? { right: new Map(), left: new Map() };
    for (const cell of cells) {
      const text = cell.querySelector('.diff-text-inner')?.textContent ?? '';
      lines[cell.dataset.diffSide]?.set(Number(cell.dataset.lineNumber), text);
    }
    sourceLines.set(path, lines);
    return true;
  }

  // --- Matching rendered blocks to source lines ------------------------------

  // Letters and digits only, with link targets and HTML tags dropped, so
  // "## [Docs](./docs.md)" and the rendered "Docs" compare equal.
  function normalize(text) {
    return text
      .toLowerCase()
      .replace(/!?\[([^\]]*)\]\([^)]*\)/g, '$1')
      .replace(/<[^>]+>/g, '')
      .replace(/[^\p{L}\p{N}]/gu, '');
  }

  // The smallest commentable pieces: paragraphs, headings, list items, table
  // rows and code blocks. Blocks inside <del> are on the old (left) side.
  function blocksOf(root, side = 'right', out = []) {
    for (const element of root.children) {
      const tag = element.tagName;
      if (tag === 'A' && element.classList.contains('anchor')) continue;
      const childSide = tag === 'DEL' ? 'left' : tag === 'INS' ? 'right' : side;
      if (/^(P|H[1-6]|LI|TR|PRE|SUMMARY|DT|DD)$/.test(tag)) {
        out.push({ element, side: childSide });
        // Nested lists get their own items too.
        if (tag === 'LI') for (const list of element.querySelectorAll(':scope > ul, :scope > ol')) blocksOf(list, childSide, out);
      } else {
        // Containers: <ins>/<del>, lists, tables (wrapped in a custom element), quotes…
        blocksOf(element, childSide, out);
      }
    }
    return out;
  }

  function mapBlocks(article, path) {
    article.setAttribute(MAPPED_ATTR, '');
    const lines = sourceLines.get(path);
    if (!lines) return;
    const sides = {};
    for (const side of ['right', 'left']) {
      sides[side] = { lines: [...lines[side]].sort((a, b) => a[0] - b[0]).map(([n, text]) => ({ n, text: normalize(text) })), cursor: 0 };
    }
    for (const { element, side } of blocksOf(article)) {
      const range = matchBlock(normalize(element.textContent), sides[side]);
      if (!range) continue;
      element.classList.add('gh-tweaks-md-block');
      Object.assign(element.dataset, { mdSide: side, mdStart: range.start, mdEnd: range.end });
    }
  }

  // ponytail: greedy text matching; edited paragraphs that GitHub word-diffs
  // inline, or text repeated nearby, may not map. Those blocks just can't be selected.
  function matchBlock(text, state) {
    if (!text) return null;
    const { lines } = state;
    for (let i = state.cursor; i < Math.min(lines.length, state.cursor + SEARCH_WINDOW); i++) {
      const first = lines[i].text;
      if (!first || !(text.startsWith(first) || first.startsWith(text))) continue;
      let position = first.length;
      let end = i;
      for (let k = i + 1; k < lines.length && position < text.length && lines[k].n === lines[k - 1].n + 1; k++) {
        if (!lines[k].text) continue;
        if (!text.startsWith(lines[k].text, position)) break;
        position += lines[k].text.length;
        end = k;
      }
      // Next block starts searching just after this one's first line, so
      // nested list items, which sit inside their parent's range, still match.
      state.cursor = i + 1;
      return { start: lines[i].n, end: lines[end].n };
    }
    return null;
  }

  // --- Selecting and commenting -----------------------------------------------

  function onHover(event) {
    const block = event.target.closest?.('.gh-tweaks-md-block');
    if (!block) return;
    const article = block.closest('article');
    addButton ??= createAddButton();
    if (addButton.parentElement !== article) article.append(addButton);
    const articleRect = article.getBoundingClientRect();
    const rect = block.getBoundingClientRect();
    addButton.style.top = `${rect.top - articleRect.top + Math.min(rect.height, 24) / 2 - 12}px`;
    addButton.block = block;
    const range = selectionFor(block);
    const label = range.start === range.end ? `Comment on line ${range.start}` : `Comment on lines ${range.start}–${range.end}`;
    addButton.setAttribute('aria-label', label);
    addButton.dataset.tooltip = label;
  }

  function createAddButton() {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'gh-tweaks-md-add';
    button.innerHTML = `${PLUS_SVG}<span>Add comment</span>`;
    return button;
  }

  function onClick(event) {
    if (event.target.closest('.gh-tweaks-md-add')) {
      event.preventDefault();
      event.stopPropagation();
      const block = addButton.block;
      if (block?.isConnected) openComment(block, selectionFor(block));
      return;
    }
    const block = event.target.closest('.gh-tweaks-md-block');
    if (!block || event.button !== 0 || event.target.closest('a, button, input, summary, label')) return;
    if (getSelection().toString()) return;
    select(block, event.shiftKey);
  }

  function select(block, extend) {
    const article = block.closest('article');
    const blocks = [...article.querySelectorAll('.gh-tweaks-md-block')];
    for (const element of document.querySelectorAll(`[${SELECTED_ATTR}]`)) element.removeAttribute(SELECTED_ATTR);
    const sameRange = extend && anchor?.isConnected && anchor.closest('article') === article && anchor.dataset.mdSide === block.dataset.mdSide;
    if (!sameRange) anchor = block;
    const [from, to] = [blocks.indexOf(anchor), blocks.indexOf(block)].sort((a, b) => a - b);
    for (const element of blocks.slice(from, to + 1)) {
      if (element.dataset.mdSide === block.dataset.mdSide) element.setAttribute(SELECTED_ATTR, '');
    }
  }

  // The selection when the block is part of it, else just the block.
  function selectionFor(block) {
    const selected = block.hasAttribute(SELECTED_ATTR) ? [...block.closest('article').querySelectorAll(`[${SELECTED_ATTR}]`)] : [block];
    return {
      side: block.dataset.mdSide,
      start: Math.min(...selected.map((element) => Number(element.dataset.mdStart))),
      end: Math.max(...selected.map((element) => Number(element.dataset.mdEnd))),
    };
  }

  async function openComment(block, { side, start, end }) {
    const entry = block.closest('[data-testid="progressive-diffs-list"] > div');
    if (!entry) return;
    const path = filePath(entry);
    // Where the clicked block sat on screen, to put it back there afterwards.
    const restore = { side: block.dataset.mdSide, start: block.dataset.mdStart, top: block.getBoundingClientRect().top };
    headerButton(entry, 'Display the source diff')?.click();
    const lineCell = (n) => entry.querySelector(`td[data-diff-side="${side}"][data-line-number="${n}"]:not(.diff-text-cell)`);
    const startCell = await waitFor(() => lineCell(start));
    if (!startCell) return;
    clickCell(startCell);
    if (end !== start) clickCell(lineCell(end) ?? startCell, { shiftKey: true });

    // GitHub shows its "Add comment" button on the hovered line of the selection.
    const textCell = entry.querySelector(`td.diff-text-cell[data-diff-side="${side}"][data-line-number="${end}"]`);
    // React listens for the enter events, which don't bubble, so send the full set.
    for (const type of ['pointerover', 'pointerenter', 'mouseover', 'mouseenter', 'pointermove', 'mousemove']) {
      textCell?.dispatchEvent(new MouseEvent(type, { bubbles: !type.endsWith('enter') }));
    }
    const add = await waitFor(() =>
      [...(textCell?.closest('tr')?.querySelectorAll('button') ?? [])].find(
        (button) => (button.getAttribute('aria-label') ?? document.getElementById(button.getAttribute('aria-labelledby'))?.textContent) === 'Add comment',
      ),
    );
    if (!add) return;
    add.click();
    textCell.closest('tr')?.scrollIntoView({ behavior: 'smooth', block: 'center' });

    // Once the comment is posted or cancelled, its form goes away: switch back to rich.
    const form = await waitFor(() => (entry.contains(document.activeElement) && document.activeElement.matches('textarea') ? document.activeElement : entry.querySelector('textarea')));
    if (!form) return;
    // Removed on cancel; removed or hidden once posted.
    await waitFor(() => !form.isConnected || !form.offsetParent, Infinity, { childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'style', 'hidden'] });
    returnToRich(path, restore);
  }

  async function returnToRich(path, { side, start, top }) {
    const entry = [...document.querySelectorAll('[data-testid="progressive-diffs-list"] > div')].find((element) => filePath(element) === path);
    if (!entry) return;
    headerButton(entry, 'Display the rich diff')?.click();
    const block = await waitFor(() => entry.querySelector(`.gh-tweaks-md-block[data-md-side="${side}"][data-md-start="${start}"]`));
    if (block) window.scrollBy(0, block.getBoundingClientRect().top - top);
  }

  function clickCell(cell, options = {}) {
    for (const type of ['mousedown', 'mouseup', 'click']) {
      cell.dispatchEvent(new MouseEvent(type, { bubbles: true, cancelable: true, button: 0, ...options }));
    }
  }

  // Resolves as soon as the DOM change that makes find() succeed lands.
  function waitFor(find, timeout = 5000, watch = { childList: true, subtree: true, attributes: true }) {
    const found = find();
    if (found) return Promise.resolve(found);
    return new Promise((resolve) => {
      const observer = new MutationObserver(() => {
        const result = find();
        if (result) finish(result);
      });
      const timer = timeout === Infinity ? null : setTimeout(() => finish(null), timeout);
      function finish(result) {
        observer.disconnect();
        clearTimeout(timer);
        resolve(result);
      }
      observer.observe(document.body, watch);
    });
  }

  function injectStyles() {
    const style = document.createElement('style');
    style.textContent = `
      article[${MAPPED_ATTR}] { position: relative; }
      .gh-tweaks-md-block { border-radius: 6px; transition: background-color 80ms ease, box-shadow 80ms ease; }
      .gh-tweaks-md-block:hover { box-shadow: -8px 0 0 0 var(--bgColor-neutral-muted, rgba(175,184,193,.2)), 8px 0 0 0 var(--bgColor-neutral-muted, rgba(175,184,193,.2)); background-color: var(--bgColor-neutral-muted, rgba(175,184,193,.2)); }
      .gh-tweaks-md-add {
        position: absolute;
        /* Right edge just inside the text column; it grows left into the empty margin. */
        right: calc(100% - 12px);
        z-index: 5;
        display: inline-flex;
        align-items: center;
        gap: 4px;
        height: 24px;
        padding: 0 10px 0 6px;
        border: 0;
        border-radius: 999px;
        font: 600 12px var(--fontStack-sansSerif, -apple-system, sans-serif);
        white-space: nowrap;
        box-shadow: var(--shadow-resting-small, 0 1px 2px rgba(0,0,0,.2));
        background: var(--bgColor-accent-emphasis, #0969da);
        color: var(--fgColor-onEmphasis, #fff);
        cursor: pointer;
        /* Stays put while the mouse crosses from the line to the gutter, and
           lingers briefly after leaving the file, so it's easy to reach. */
        opacity: 0;
        visibility: hidden;
        transition: opacity 120ms ease 300ms, visibility 0s linear 420ms, transform 80ms ease;
      }
      article[${MAPPED_ATTR}]:hover > .gh-tweaks-md-add {
        opacity: 1;
        visibility: visible;
        transition: opacity 80ms ease, visibility 0s, transform 80ms ease;
      }
      .gh-tweaks-md-add:hover { background: color-mix(in srgb, var(--bgColor-accent-emphasis, #0969da) 85%, #000); transform: translateY(-1px); }
      .gh-tweaks-md-add::after {
        content: attr(data-tooltip);
        position: absolute;
        right: 0;
        bottom: calc(100% + 6px);
        padding: 4px 8px;
        border-radius: 6px;
        background: var(--bgColor-emphasis, #25292e);
        color: var(--fgColor-onEmphasis, #fff);
        font: 500 12px/1.5 var(--fontStack-sansSerif, -apple-system, sans-serif);
        white-space: nowrap;
        pointer-events: none;
        opacity: 0;
        transition: opacity 80ms ease;
      }
      .gh-tweaks-md-add:hover::after { opacity: 1; }
    `;
    document.documentElement.append(style);
  }
})();
