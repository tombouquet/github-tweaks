(() => {
  'use strict';

  // Changelog page: renders the bundled CHANGELOG.md (written by Release Please),
  // marks the installed version, and shows an update banner when a newer release is out.
  const current = chrome.runtime.getManifest().version;
  document.getElementById('version').textContent = `v${current}`;

  const escape = (text) => text.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

  // Just what Release Please writes: `code`, **bold** and [text](url) links (http(s) only).
  function inline(text) {
    return escape(text)
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
  }

  // One card per `## version` section, with `###` headings and `*` lists inside.
  function render(markdown) {
    const main = document.getElementById('changelog');
    let section;
    let list;
    for (const line of markdown.split('\n')) {
      const version = line.match(/^## \[?(\d+\.\d+\.\d+)\]?(?:\([^)]*\))?\s*(?:\(([^)]+)\))?/);
      if (version) {
        section = document.createElement('section');
        section.className = 'release';
        list = null;
        const heading = document.createElement('h2');
        heading.textContent = `v${version[1]}`;
        if (version[2]) heading.insertAdjacentHTML('beforeend', `<span class="date">${escape(version[2])}</span>`);
        if (version[1] === current) {
          section.classList.add('current');
          heading.insertAdjacentHTML('beforeend', '<span class="badge">Installed</span>');
        }
        section.append(heading);
        main.append(section);
      } else if (!section) {
        continue;
      } else if (line.startsWith('### ')) {
        const heading = document.createElement('h3');
        heading.innerHTML = inline(line.slice(4));
        section.append(heading);
        list = null;
      } else if (/^[*-] /.test(line)) {
        if (!list) {
          list = document.createElement('ul');
          section.append(list);
        }
        const item = document.createElement('li');
        item.innerHTML = inline(line.slice(2));
        list.append(item);
      }
    }
  }

  fetch(chrome.runtime.getURL('CHANGELOG.md'))
    .then((response) => response.text())
    .then(render);

  function showUpdate(update) {
    const banner = document.getElementById('update');
    banner.hidden = !GH_TWEAKS_IS_NEWER(update?.latestVersion, current);
    if (banner.hidden) return;
    document.getElementById('update-title').textContent = `v${update.latestVersion} is available. You're on v${current}.`;
    document.getElementById('update-link').href = update.releaseUrl;
  }
  document.getElementById('update-reload').addEventListener('click', () => chrome.runtime.reload());
  chrome.storage.local.get(GH_TWEAKS_UPDATE_KEY).then((stored) => showUpdate(stored[GH_TWEAKS_UPDATE_KEY]));
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && changes[GH_TWEAKS_UPDATE_KEY]) showUpdate(changes[GH_TWEAKS_UPDATE_KEY].newValue);
  });
})();
