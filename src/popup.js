(() => {
  'use strict';

  // Toolbar popup: one switch per tweak in GH_TWEAKS_FEATURES (src/settings.js).
  const container = document.getElementById('features');
  const flash = document.getElementById('flash');

  document.getElementById('version').textContent = `v${chrome.runtime.getManifest().version}`;
  document.getElementById('reload').addEventListener('click', async () => {
    await chrome.tabs.reload();
    window.close();
  });

  GH_TWEAKS_SETTINGS.then((settings) => {
    let box;
    let group;
    for (const feature of GH_TWEAKS_FEATURES) {
      if (feature.group !== group) {
        group = feature.group;
        const heading = document.createElement('h2');
        heading.textContent = group;
        box = document.createElement('div');
        box.className = 'box';
        container.append(heading, box);
      }
      box.append(row(feature, settings[feature.key]));
    }
  });

  function row({ key, label, description }, checked) {
    const row = document.createElement('label');
    row.className = 'row';
    const text = document.createElement('span');
    text.className = 'text';
    text.innerHTML = '<span class="label"></span><span class="description"></span>';
    text.firstChild.textContent = label;
    text.lastChild.textContent = description;
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.setAttribute('role', 'switch');
    input.checked = checked;
    input.addEventListener('change', () => {
      chrome.storage.sync.set({ [key]: input.checked });
      flash.hidden = false;
    });
    row.append(text, input);
    return row;
  }
})();
