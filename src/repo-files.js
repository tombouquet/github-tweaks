(() => {
  'use strict';

  // Repo file lists and file trees: VS Code-style file icons, thumbnails for
  // images, and a download button on every file and folder row.
  const DONE_ATTR = 'data-gh-tweaks-icon';
  const IMAGE_EXT = /\.(png|jpe?g|gif|webp|avif|svg|ico|bmp)$/i;
  const ICONS = globalThis.GH_TWEAKS_ICONS;
  const MARKDOWN_EXT = /\.(md|mdx|markdown)$/i;
  const MAX_VIEW_BYTES = 5 * 1024 * 1024;
  const MAX_HIGHLIGHT_BYTES = 500 * 1024;
  // Octicons (MIT): download, copy, link-external, x.
  const svg = (paths) => `<svg viewBox="0 0 16 16" width="16" height="16" fill="currentColor" aria-hidden="true">${paths}</svg>`;
  const COPY_SVG = svg(
    '<path d="M0 6.75C0 5.784.784 5 1.75 5h1.5a.75.75 0 0 1 0 1.5h-1.5a.25.25 0 0 0-.25.25v7.5c0 .138.112.25.25.25h7.5a.25.25 0 0 0 .25-.25v-1.5a.75.75 0 0 1 1.5 0v1.5A1.75 1.75 0 0 1 9.25 16h-7.5A1.75 1.75 0 0 1 0 14.25Z"></path><path d="M5 1.75C5 .784 5.784 0 6.75 0h7.5C15.216 0 16 .784 16 1.75v7.5A1.75 1.75 0 0 1 14.25 11h-7.5A1.75 1.75 0 0 1 5 9.25Zm1.75-.25a.25.25 0 0 0-.25.25v7.5c0 .138.112.25.25.25h7.5a.25.25 0 0 0 .25-.25v-7.5a.25.25 0 0 0-.25-.25Z"></path>',
  );
  const LINK_SVG = svg(
    '<path d="M3.75 2h3.5a.75.75 0 0 1 0 1.5h-3.5a.25.25 0 0 0-.25.25v8.5c0 .138.112.25.25.25h8.5a.25.25 0 0 0 .25-.25v-3.5a.75.75 0 0 1 1.5 0v3.5A1.75 1.75 0 0 1 12.25 14h-8.5A1.75 1.75 0 0 1 2 12.25v-8.5C2 2.784 2.784 2 3.75 2Zm6.854-1h4.146a.25.25 0 0 1 .25.25v4.146a.25.25 0 0 1-.427.177L13.03 4.03 9.28 7.78a.751.751 0 0 1-1.042-.018.751.751 0 0 1-.018-1.042l3.75-3.75-1.543-1.543A.25.25 0 0 1 10.604 1Z"></path>',
  );
  const CLOSE_SVG = svg(
    '<path d="M3.72 3.72a.75.75 0 0 1 1.06 0L8 6.94l3.22-3.22a.749.749 0 0 1 1.275.326.749.749 0 0 1-.215.734L9.06 8l3.22 3.22a.749.749 0 0 1-.326 1.275.749.749 0 0 1-.734-.215L8 9.06l-3.22 3.22a.751.751 0 0 1-1.042-.018.751.751 0 0 1-.018-1.042L6.94 8 3.72 4.78a.75.75 0 0 1 0-1.06Z"></path>',
  );
  const DOWNLOAD_SVG =
    '<svg viewBox="0 0 16 16" width="16" height="16" fill="currentColor" aria-hidden="true"><path d="M2.75 14A1.75 1.75 0 0 1 1 12.25v-2.5a.75.75 0 0 1 1.5 0v2.5c0 .138.112.25.25.25h10.5a.25.25 0 0 0 .25-.25v-2.5a.75.75 0 0 1 1.5 0v2.5A1.75 1.75 0 0 1 13.25 14Z"></path><path d="M7.25 7.689V2a.75.75 0 0 1 1.5 0v5.689l1.97-1.969a.749.749 0 1 1 1.06 1.06l-3.25 3.25a.749.749 0 0 1-1.06 0L4.22 6.78a.749.749 0 1 1 1.06-1.06l1.97 1.969Z"></path></svg>';

  let scheduled = false;
  let settings;

  GH_TWEAKS_SETTINGS.then((loaded) => {
    settings = loaded;
    if (!['fileIcons', 'thumbnails', 'downloads', 'quickView'].some((key) => settings[key])) return;
    injectStyles();
    new MutationObserver(schedule).observe(document.documentElement, { childList: true, subtree: true });
    if (settings.quickView) document.addEventListener('click', onRowClick);
    apply();
  });

  function schedule() {
    if (scheduled) return;
    scheduled = true;
    setTimeout(() => {
      scheduled = false;
      apply();
    }, 50);
  }

  function apply() {
    for (const column of document.querySelectorAll(`.react-directory-filename-column:not([${DONE_ATTR}])`)) {
      const link = column.querySelector('a[href*="/blob/"], a[href*="/tree/"]');
      if (!link) continue;
      column.setAttribute(DONE_ATTR, '');
      const isFile = link.pathname.includes('/blob/');
      const octicon = column.querySelector(':scope > svg.octicon-file');
      const thumb = settings.thumbnails && IMAGE_EXT.test(link.title) ? link.pathname.replace('/blob/', '/raw/') : null;
      if (octicon && (thumb || settings.fileIcons)) replaceIcon(octicon, link.title, thumb);
      if (settings.downloads) column.querySelector(':scope > .overflow-hidden')?.after(rowActions(link.pathname, isFile));
    }
    if (!settings.fileIcons) return;

    // File trees: the repo sidebar uses octicon-file, the PR tree octicon-file-diff/-added/-removed/-moved.
    const treeIcons = `li[role="treeitem"]:not([aria-expanded]) .PRIVATE_TreeView-item-visual > svg[class*="octicon-file"]:not([${DONE_ATTR}])`;
    for (const octicon of document.querySelectorAll(treeIcons)) {
      const name = octicon.closest('li').querySelector('.PRIVATE_TreeView-item-content-text')?.textContent.trim();
      if (name) replaceIcon(octicon, name, null);
    }

    // PR diff headers have no icon, so add one before the path.
    for (const heading of document.querySelectorAll(`[data-diff-header-wrapper] h3:not([${DONE_ATTR}])`)) {
      heading.setAttribute(DONE_ATTR, '');
      const name = heading.textContent.replace(/[‎‏]/g, '').trim().split('/').pop();
      heading.before(iconImage(name, null));
    }
  }

  // Hide GitHub's icon rather than removing it, so React can still find its node.
  // A non-modified PR status (added, removed, moved) stays visible as a dot.
  function replaceIcon(octicon, name, thumbSrc) {
    octicon.setAttribute(DONE_ATTR, '');
    const img = iconImage(name, thumbSrc);
    const status = octicon.getAttribute('class').match(/octicon-file-(added|removed|moved|renamed)/)?.[1];
    if (!status) return octicon.after(img);
    const wrap = document.createElement('span');
    wrap.className = 'gh-tweaks-status';
    wrap.dataset.status = status;
    wrap.append(img);
    octicon.after(wrap);
  }

  function iconImage(name, thumbSrc) {
    const img = document.createElement('img');
    img.alt = '';
    img.loading = 'lazy';
    img.className = thumbSrc ? 'gh-tweaks-file-icon gh-tweaks-thumb' : 'gh-tweaks-file-icon';
    img.src = thumbSrc ?? chrome.runtime.getURL(`icons/${iconFor(name)}.svg`);
    return img;
  }

  function iconFor(fileName) {
    const name = fileName.toLowerCase();
    const maps = isDark() ? [ICONS] : [ICONS.light, ICONS];
    for (const map of maps) if (map.names[name]) return map.names[name];
    // Try the longest extension first, so "foo.test.ts" matches "test.ts" before "ts".
    for (let dot = name.indexOf('.'); dot !== -1; dot = name.indexOf('.', dot + 1)) {
      const ext = name.slice(dot + 1);
      for (const map of maps) if (map.exts[ext]) return map.exts[ext];
    }
    return ICONS.file;
  }

  function isDark() {
    const mode = document.documentElement.dataset.colorMode;
    return mode === 'dark' || (mode !== 'light' && matchMedia('(prefers-color-scheme: dark)').matches);
  }

  // Icon buttons with a hit area bigger than their hover highlight, so they're
  // easy to click without looking heavy.
  function rowActions(pathname, isFile) {
    const group = document.createElement('span');
    group.className = 'gh-tweaks-actions';
    group.append(downloadButton(pathname, isFile));
    return group;
  }

  // Clicking a file row anywhere outside its links and buttons opens quick view.
  function onRowClick(event) {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const row = event.target.closest('.react-directory-row');
    if (!row || event.target.closest('a, button, input, label')) return;
    if (getSelection().toString()) return;
    const link = row.querySelector('.react-directory-filename-column a[href*="/blob/"]');
    if (link) openQuickView(link.pathname, link.title);
  }

  function actionButton(label, svg, onClick) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'gh-tweaks-row-button';
    button.setAttribute('aria-label', label);
    button.dataset.tooltip = label;
    button.innerHTML = svg;
    button.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      onClick();
    });
    return button;
  }

  function downloadButton(pathname, isFile) {
    const label = isFile ? 'Download file' : 'Download folder as ZIP';
    const button = actionButton(label, DOWNLOAD_SVG, async () => {
      if (button.disabled) return;
      button.disabled = true;
      try {
        if (isFile) await downloadFile(pathname);
        else await downloadFolder(pathname, (done, total) => (button.dataset.tooltip = `Downloading ${done} of ${total}…`));
      } catch (error) {
        console.error('[GitHub Tweaks] download failed', error);
        alert(`Download failed: ${error.message}`);
      } finally {
        button.disabled = false;
        button.dataset.tooltip = label;
      }
    });
    return button;
  }

  let dialog;
  async function openQuickView(pathname, name) {
    dialog ??= createDialog();
    const raw = pathname.replace('/blob/', '/raw/');
    const [, owner, repo, , ...rest] = pathname.split('/');
    dialog.querySelector('.gh-tweaks-qv-icon').src = chrome.runtime.getURL(`icons/${iconFor(name)}.svg`);
    const title = dialog.querySelector('.gh-tweaks-qv-path');
    title.textContent = decodeURIComponent(rest.slice(1).join('/')) || name;
    title.href = pathname;
    dialog.querySelector('.gh-tweaks-qv-repo').textContent = `${owner}/${repo}`;
    dialog.querySelector('.gh-tweaks-qv-open').href = pathname;
    dialog.querySelector('.gh-tweaks-qv-meta').textContent = '';
    const copy = dialog.querySelector('.gh-tweaks-qv-copy');
    copy.hidden = true;
    const body = dialog.querySelector('.gh-tweaks-qv-body');
    body.replaceChildren(message('Loading…'));
    if (!dialog.open) dialog.showModal();

    if (IMAGE_EXT.test(name)) {
      const img = document.createElement('img');
      img.className = 'gh-tweaks-qv-image';
      img.src = raw;
      img.alt = name;
      return body.replaceChildren(img);
    }

    try {
      const response = await fetch(raw);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const bytes = new Uint8Array(await response.arrayBuffer());
      if (dialog.querySelector('.gh-tweaks-qv-open').getAttribute('href') !== pathname) return;
      dialog.querySelector('.gh-tweaks-qv-meta').textContent = formatSize(bytes.length);
      if (bytes.length > MAX_VIEW_BYTES) return body.replaceChildren(message('This file is too large to quick view.'));
      if (bytes.subarray(0, 8000).includes(0)) return body.replaceChildren(message('Binary file, nothing to preview.'));

      const text = new TextDecoder().decode(bytes);
      const lines = text.replace(/\n$/, '').split('\n');
      dialog.querySelector('.gh-tweaks-qv-meta').textContent = `${lines.length.toLocaleString()} lines · ${formatSize(bytes.length)}`;
      copy.hidden = false;
      copy.onclick = async () => {
        await navigator.clipboard.writeText(text);
        copy.dataset.tooltip = 'Copied!';
        setTimeout(() => (copy.dataset.tooltip = 'Copy contents'), 1500);
      };

      // Markdown shows rendered, using the HTML GitHub's file page would show.
      const rendered = MARKDOWN_EXT.test(name) && (await renderedMarkdown(pathname));
      if (dialog.querySelector('.gh-tweaks-qv-open').getAttribute('href') !== pathname) return;
      if (rendered) {
        const article = document.createElement('div');
        article.className = 'gh-tweaks-qv-markdown';
        article.innerHTML = rendered;
        body.replaceChildren(article);
        body.scrollTop = 0;
        return;
      }

      const gutter = document.createElement('pre');
      gutter.className = 'gh-tweaks-qv-gutter';
      gutter.textContent = lines.map((_, i) => i + 1).join('\n');
      const code = document.createElement('code');
      code.className = 'hljs';
      const language = name.includes('.') && hljs.getLanguage(name.split('.').pop()) ? name.split('.').pop() : null;
      if (language && bytes.length <= MAX_HIGHLIGHT_BYTES) code.innerHTML = hljs.highlight(text, { language }).value;
      else code.textContent = text;
      const pre = document.createElement('pre');
      pre.append(code);
      const wrap = document.createElement('div');
      wrap.className = 'gh-tweaks-qv-code';
      wrap.append(gutter, pre);
      body.replaceChildren(wrap);
      body.scrollTop = 0;
    } catch (error) {
      body.replaceChildren(message(`Couldn't load the file: ${error.message}`));
    }
  }

  async function renderedMarkdown(pathname) {
    try {
      const response = await fetch(pathname, { headers: { Accept: 'application/json' } });
      return (await response.json()).payload.codeViewBlobRoute.richText || null;
    } catch {
      return null;
    }
  }

  function createDialog() {
    const element = document.createElement('dialog');
    element.className = 'gh-tweaks-qv';
    element.innerHTML = `
      <header>
        <img class="gh-tweaks-qv-icon" alt="">
        <div class="gh-tweaks-qv-title">
          <a class="gh-tweaks-qv-path"></a>
          <span class="gh-tweaks-qv-sub"><span class="gh-tweaks-qv-repo"></span> <span class="gh-tweaks-qv-meta"></span></span>
        </div>
        <button type="button" class="gh-tweaks-row-button gh-tweaks-qv-copy" aria-label="Copy contents" data-tooltip="Copy contents">${COPY_SVG}</button>
        <a class="gh-tweaks-row-button gh-tweaks-qv-open" aria-label="Open file" data-tooltip="Open file">${LINK_SVG}</a>
        <button type="button" class="gh-tweaks-row-button gh-tweaks-qv-close" aria-label="Close" data-tooltip="Close (Esc)">${CLOSE_SVG}</button>
      </header>
      <div class="gh-tweaks-qv-body"></div>`;
    element.querySelector('.gh-tweaks-qv-close').addEventListener('click', () => element.close());
    // GitHub may navigate without a page load, so don't leave the modal open on top.
    for (const link of element.querySelectorAll('a')) link.addEventListener('click', () => element.close());
    // A click on the backdrop lands on the dialog itself.
    element.addEventListener('click', (event) => event.target === element && element.close());
    document.body.append(element);
    return element;
  }

  function message(text) {
    const element = document.createElement('p');
    element.className = 'gh-tweaks-qv-message';
    element.textContent = text;
    return element;
  }

  function formatSize(bytes) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  }

  async function downloadFile(pathname) {
    const response = await fetch(pathname.replace('/blob/', '/raw/'));
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    save(await response.blob(), decodeURIComponent(pathname.split('/').pop()));
  }

  async function downloadFolder(pathname, onProgress) {
    const [, owner, repo] = pathname.split('/');
    const root = await treeJson(pathname);
    const oid = root.refInfo.currentOid;
    const base = root.path ? `${root.path}/` : '';
    const folder = root.path.split('/').pop() || repo;

    const paths = [];
    // ponytail: one request per subfolder, fine for typical folders; GitHub caps
    // each listing at 1,000 items, so huge folders come back incomplete.
    const walk = async (tree) => {
      for (const item of tree.tree.items) {
        if (item.contentType === 'file') paths.push(item.path);
        else if (item.contentType === 'directory') await walk(await treeJson(`/${owner}/${repo}/tree/${oid}/${encodePath(item.path)}`));
      }
    };
    await walk(root);

    const files = [];
    let next = 0;
    const worker = async () => {
      while (next < paths.length) {
        const path = paths[next++];
        const response = await fetch(`/${owner}/${repo}/raw/${oid}/${encodePath(path)}`);
        if (!response.ok) throw new Error(`HTTP ${response.status} for ${path}`);
        files.push({ name: `${folder}/${path.slice(base.length)}`, data: new Uint8Array(await response.arrayBuffer()) });
        onProgress(files.length, paths.length);
      }
    };
    await Promise.all(Array.from({ length: 6 }, worker));
    save(zip(files), `${repo}-${folder}.zip`);
  }

  async function treeJson(pathname) {
    const response = await fetch(pathname, { headers: { Accept: 'application/json' } });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return (await response.json()).payload.codeViewTreeRoute;
  }

  function encodePath(path) {
    return path.split('/').map(encodeURIComponent).join('/');
  }

  function save(blob, name) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 10000);
  }

  // Uncompressed ZIP: a local header plus data per file, then the central directory.
  function zip(files) {
    const encoder = new TextEncoder();
    const parts = [];
    const central = [];
    let offset = 0;
    for (const { name, data } of files) {
      const nameBytes = encoder.encode(name);
      const crc = crc32(data);
      const local = new DataView(new ArrayBuffer(30));
      local.setUint32(0, 0x04034b50, true);
      writeCommon(local, 4, crc, data.length, nameBytes.length);
      parts.push(local, nameBytes, data);

      const entry = new DataView(new ArrayBuffer(46));
      entry.setUint32(0, 0x02014b50, true);
      entry.setUint16(4, 20, true);
      writeCommon(entry, 6, crc, data.length, nameBytes.length);
      entry.setUint32(42, offset, true);
      central.push(entry, nameBytes);
      offset += 30 + nameBytes.length + data.length;
    }
    const centralSize = central.reduce((sum, part) => sum + part.byteLength, 0);
    const end = new DataView(new ArrayBuffer(22));
    end.setUint32(0, 0x06054b50, true);
    end.setUint16(8, files.length, true);
    end.setUint16(10, files.length, true);
    end.setUint32(12, centralSize, true);
    end.setUint32(16, offset, true);
    return new Blob([...parts, ...central, end], { type: 'application/zip' });
  }

  // Fields shared by local and central headers: version, flags (UTF-8 names),
  // method 0 (stored), time/date (1980-01-01), CRC, sizes, name length.
  function writeCommon(view, at, crc, size, nameLength) {
    view.setUint16(at, 20, true);
    view.setUint16(at + 2, 0x0800, true);
    view.setUint16(at + 8, 0x21, true);
    view.setUint32(at + 10, crc, true);
    view.setUint32(at + 14, size, true);
    view.setUint32(at + 18, size, true);
    view.setUint16(at + 22, nameLength, true);
  }

  let crcTable;
  function crc32(data) {
    crcTable ??= Array.from({ length: 256 }, (_, n) => {
      for (let k = 0; k < 8; k++) n = n & 1 ? 0xedb88320 ^ (n >>> 1) : n >>> 1;
      return n >>> 0;
    });
    let crc = 0xffffffff;
    for (const byte of data) crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8);
    return (crc ^ 0xffffffff) >>> 0;
  }

  function injectStyles() {
    const style = document.createElement('style');
    style.textContent = `
      svg[${DONE_ATTR}] { display: none !important; }
      .gh-tweaks-file-icon { width: 16px; height: 16px; flex-shrink: 0; vertical-align: text-bottom; animation: gh-tweaks-fade-in 200ms ease-out backwards; }
      .gh-tweaks-thumb {
        object-fit: cover;
        border-radius: 3px;
        background: var(--bgColor-muted, #f6f8fa);
        box-shadow: 0 0 0 1px var(--borderColor-muted, #d1d9e0);
        transition: transform 120ms ease, box-shadow 120ms ease;
        transform-origin: left center;
        position: relative;
      }
      .gh-tweaks-thumb:hover {
        transform: scale(8);
        z-index: 10;
        object-fit: contain;
        box-shadow: 0 0 0 0.15px var(--borderColor-default, #d1d9e0), var(--shadow-floating-medium, 0 8px 24px rgba(0,0,0,.2));
      }
      [data-diff-header-wrapper] .gh-tweaks-file-icon { margin: 0 6px 0 2px; }
      .gh-tweaks-status { position: relative; display: inline-flex; flex-shrink: 0; }
      .gh-tweaks-status::after {
        content: '';
        position: absolute;
        right: -2px;
        bottom: -2px;
        width: 7px;
        height: 7px;
        border-radius: 50%;
        box-shadow: 0 0 0 1.5px var(--bgColor-default, #fff);
      }
      .gh-tweaks-status[data-status="added"]::after { background: var(--fgColor-success, #1a7f37); }
      .gh-tweaks-status[data-status="removed"]::after { background: var(--fgColor-danger, #d1242f); }
      .gh-tweaks-status:is([data-status="moved"], [data-status="renamed"])::after { background: var(--fgColor-attention, #9a6700); }
      .gh-tweaks-row-button {
        position: relative;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
        width: 28px;
        height: 28px;
        padding: 0;
        border: 0;
        border-radius: 6px;
        background: transparent;
        color: var(--fgColor-muted, #59636e);
        cursor: pointer;
        transition: opacity 80ms ease, background-color 80ms ease;
      }
      .gh-tweaks-row-button:hover { background: var(--bgColor-neutral-muted, rgba(175,184,193,.2)); color: var(--fgColor-default, #1f2328); }
      .gh-tweaks-actions {
        display: inline-flex;
        flex-shrink: 0;
        margin: -10px 0 -10px -6px;
        opacity: 0;
        transition: opacity 120ms ease;
      }
      .react-directory-row:hover .gh-tweaks-actions, .gh-tweaks-actions:focus-within, .gh-tweaks-actions:has(:disabled) { opacity: 1; }
      .gh-tweaks-actions .gh-tweaks-row-button { width: 32px; height: 36px; background: transparent; }
      .gh-tweaks-actions .gh-tweaks-row-button::before {
        content: '';
        position: absolute;
        inset: 5px 3px;
        border-radius: 6px;
        transition: background-color 80ms ease;
      }
      .gh-tweaks-actions .gh-tweaks-row-button:hover::before { background: var(--bgColor-neutral-muted, rgba(175,184,193,.2)); }
      .gh-tweaks-actions .gh-tweaks-row-button svg { position: relative; }
      .gh-tweaks-actions .gh-tweaks-row-button::after { bottom: calc(100% - 2px); }
      .gh-tweaks-actions .gh-tweaks-row-button:focus-visible { outline: none; }
      .gh-tweaks-actions .gh-tweaks-row-button:focus-visible::before { outline: 2px solid var(--focus-outlineColor, #0969da); }
      .gh-tweaks-row-button:disabled { cursor: progress; }
      .gh-tweaks-row-button:disabled svg { animation: gh-tweaks-bounce 0.8s ease-in-out infinite; }
      .gh-tweaks-row-button::after {
        content: attr(data-tooltip);
        position: absolute;
        left: 50%;
        bottom: calc(100% + 6px);
        z-index: 20;
        padding: 4px 8px;
        border-radius: 6px;
        background: var(--tooltip-bgColor, var(--bgColor-emphasis, #25292e));
        color: var(--tooltip-fgColor, var(--fgColor-onEmphasis, #fff));
        font: 500 12px/1.5 var(--fontStack-sansSerif, -apple-system, sans-serif);
        white-space: nowrap;
        pointer-events: none;
        opacity: 0;
        transform: translate(-50%, 2px);
        transition: opacity 80ms ease, transform 80ms ease;
      }
      .gh-tweaks-row-button:is(:hover, :focus-visible, :disabled)::after { opacity: 1; transform: translate(-50%, 0); }
      @keyframes gh-tweaks-bounce { 50% { transform: translateY(2px); } }

      html:has(.gh-tweaks-qv[open]) { overflow: hidden; }
      .gh-tweaks-qv {
        width: min(1100px, calc(100vw - 32px));
        height: min(820px, calc(100vh - 64px));
        max-width: none;
        max-height: none;
        padding: 0;
        border: 1px solid var(--borderColor-default, #d1d9e0);
        border-radius: 12px;
        background: var(--bgColor-default, #fff);
        color: var(--fgColor-default, #1f2328);
        box-shadow: var(--shadow-floating-xlarge, 0 12px 48px rgba(0,0,0,.3));
        overflow: hidden;
      }
      .gh-tweaks-qv[open] { display: flex; flex-direction: column; animation: gh-tweaks-qv-in 140ms ease-out; }
      .gh-tweaks-qv::backdrop { background: rgba(1, 4, 9, .6); }
      @keyframes gh-tweaks-qv-in { from { opacity: 0; transform: translateY(8px) scale(.99); } }
      .gh-tweaks-qv header {
        display: flex;
        align-items: center;
        gap: 4px;
        padding: 10px 10px 10px 16px;
        border-bottom: 1px solid var(--borderColor-muted, #d1d9e0b3);
        background: var(--bgColor-muted, #f6f8fa);
      }
      .gh-tweaks-qv-icon { width: 20px; height: 20px; margin-right: 8px; flex-shrink: 0; }
      .gh-tweaks-qv-title { display: flex; flex-direction: column; min-width: 0; margin-right: auto; }
      .gh-tweaks-qv-path { font: 600 14px/1.4 var(--fontStack-monospace, monospace); color: inherit; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .gh-tweaks-qv-path:hover { color: var(--fgColor-accent, #0969da); text-decoration: underline; }
      .gh-tweaks-qv-sub { font-size: 12px; color: var(--fgColor-muted, #59636e); }
      .gh-tweaks-qv-meta:not(:empty)::before { content: '· '; }
      .gh-tweaks-qv header .gh-tweaks-row-button::after { top: calc(100% + 6px); bottom: auto; }
      .gh-tweaks-qv-close::after { left: auto !important; right: 0; transform: none !important; }
      .gh-tweaks-qv-body { flex: 1; overflow: auto; }
      .gh-tweaks-qv-markdown { padding: 24px 32px 32px; }
      .gh-tweaks-qv-markdown > .markdown-body { max-width: 900px; margin: 0 auto; }
      .gh-tweaks-qv-body > * { animation: gh-tweaks-fade-in 160ms ease-out backwards; }
      .gh-tweaks-qv-code { display: flex; min-width: max-content; min-height: 100%; }
      .gh-tweaks-qv-code pre {
        margin: 0;
        padding: 12px 16px;
        font: 12px/20px var(--fontStack-monospace, ui-monospace, monospace);
        tab-size: 4;
        background: transparent;
      }
      .gh-tweaks-qv-code .gh-tweaks-qv-gutter {
        position: sticky;
        left: 0;
        padding-right: 12px;
        text-align: right;
        color: var(--fgColor-muted, #59636e);
        background: var(--bgColor-default, #fff);
        border-right: 1px solid var(--borderColor-muted, #d1d9e0b3);
        user-select: none;
      }
      .gh-tweaks-qv-code code.hljs { padding: 0; background: transparent; color: inherit; font: inherit; }
      .gh-tweaks-qv-image { display: block; max-width: calc(100% - 48px); max-height: calc(100% - 48px); margin: 24px auto; object-fit: contain; }
      .gh-tweaks-qv-body:has(.gh-tweaks-qv-image) {
        display: flex;
        align-items: center;
        background: repeating-conic-gradient(var(--bgColor-muted, #f6f8fa) 0 25%, transparent 0 50%) 0 0 / 16px 16px;
      }
      .gh-tweaks-qv-message { margin: 48px auto; text-align: center; color: var(--fgColor-muted, #59636e); }
      .hljs-comment, .hljs-quote { color: var(--color-prettylights-syntax-comment); }
      .hljs-keyword, .hljs-selector-tag, .hljs-type, .hljs-template-tag, .hljs-doctag, .hljs-meta .hljs-keyword { color: var(--color-prettylights-syntax-keyword); }
      .hljs-string, .hljs-meta .hljs-string, .hljs-regexp { color: var(--color-prettylights-syntax-string); }
      .hljs-number, .hljs-literal, .hljs-built_in, .hljs-attr, .hljs-attribute, .hljs-variable.language_, .hljs-symbol, .hljs-meta, .hljs-selector-attr, .hljs-selector-class, .hljs-selector-id { color: var(--color-prettylights-syntax-constant); }
      .hljs-title, .hljs-title.function_, .hljs-title.class_, .hljs-section { color: var(--color-prettylights-syntax-entity); }
      .hljs-name, .hljs-tag, .hljs-selector-pseudo { color: var(--color-prettylights-syntax-entity-tag); }
      .hljs-variable, .hljs-template-variable, .hljs-params { color: var(--color-prettylights-syntax-variable); }
      .hljs-section { font-weight: 600; }
      .hljs-bullet { color: var(--color-prettylights-syntax-markup-list); }
      .hljs-addition { color: var(--color-prettylights-syntax-markup-inserted-text); background: var(--color-prettylights-syntax-markup-inserted-bg); }
      .hljs-deletion { color: var(--color-prettylights-syntax-markup-deleted-text); background: var(--color-prettylights-syntax-markup-deleted-bg); }
      .hljs-emphasis { font-style: italic; }
      .hljs-strong { font-weight: 600; }
    `;
    document.documentElement.append(style);
  }
})();
