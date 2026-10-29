(() => {
  'use strict';

  // Toolbar popup: one switch per tweak in GH_TWEAKS_FEATURES (src/settings.js).
  const container = document.getElementById('features');
  const flash = document.getElementById('flash');

  document.getElementById('version').textContent = `v${chrome.runtime.getManifest().version}`;
  document.getElementById('about').addEventListener('click', () => {
    chrome.tabs.create({ url: chrome.runtime.getURL('about.html') });
    window.close();
  });
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
      const toggle = row(feature, settings[feature.key]);
      box.append(toggle);
      const sub = feature.choice
        ? choiceRow(feature.choice, settings[feature.choice.key], settings[feature.choice.optionsKey])
        : feature.toggle && subSwitchRow(feature.toggle, settings[feature.toggle.key]);
      if (sub) {
        box.append(sub.parentElement);
        // The dropdown or sub-switch only matters while its tweak is on.
        const input = toggle.querySelector('input');
        sub.disabled = !input.checked;
        input.addEventListener('change', () => {
          sub.disabled = !input.checked;
        });
      }
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

  // A secondary switch under a tweak's switch, laid out like a dropdown row.
  function subSwitchRow({ key, label, description }, checked) {
    const row = document.createElement('label');
    row.className = 'row choice';
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
    return input;
  }

  // A dropdown row under a switch. Options have a `label`, or a `format` that shows
  // the current time in that date format, so the list doubles as a preview.
  function choiceRow({ key, label, options: builtIn, editLabel }, value, saved) {
    const options = saved?.length ? saved : builtIn;
    const row = document.createElement('label');
    row.className = 'row choice';
    const text = document.createElement('span');
    text.className = 'text label';
    text.textContent = label;
    const select = document.createElement('select');
    const now = new Date();
    for (const option of options) {
      select.append(new Option(option.label ?? option.format(now), option.key, false, option.key === value));
    }
    select.addEventListener('change', () => {
      chrome.storage.sync.set({ [key]: select.value });
      flash.hidden = false;
    });
    row.append(text, select);
    // Editable lists get a cog beside the dropdown that opens the options page, where there's room to edit them.
    if (editLabel) {
      const edit = document.createElement('button');
      edit.type = 'button';
      edit.className = 'icon-button';
      edit.title = editLabel;
      edit.setAttribute('aria-label', editLabel);
      edit.innerHTML = GH_TWEAKS_GEAR_ICON;
      edit.addEventListener('click', (event) => {
        event.preventDefault();
        chrome.runtime.openOptionsPage();
      });
      row.append(edit);
    }
    return select;
  }
})();
