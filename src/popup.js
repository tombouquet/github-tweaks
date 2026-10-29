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
      // Octicon gear (MIT).
      edit.innerHTML =
        '<svg viewBox="0 0 16 16" width="16" height="16" fill="currentColor" aria-hidden="true"><path d="M8 0a8.2 8.2 0 0 1 .701.031C9.444.095 9.99.645 10.16 1.29l.288 1.107c.018.066.079.158.212.224.231.114.454.243.668.386.123.082.233.09.299.071l1.103-.303c.644-.176 1.392.021 1.82.63.27.385.506.792.704 1.218.315.675.111 1.422-.364 1.891l-.814.806c-.049.048-.098.147-.088.294.016.257.016.515 0 .772-.01.147.038.246.088.294l.814.806c.475.469.679 1.216.364 1.891a7.977 7.977 0 0 1-.704 1.217c-.428.61-1.176.807-1.82.63l-1.102-.302c-.067-.019-.177-.011-.3.071a5.909 5.909 0 0 1-.668.386c-.133.066-.194.158-.211.224l-.29 1.106c-.168.646-.715 1.196-1.458 1.26a8.006 8.006 0 0 1-1.402 0c-.743-.064-1.289-.614-1.458-1.26l-.289-1.106c-.018-.066-.079-.158-.212-.224a5.738 5.738 0 0 1-.668-.386c-.123-.082-.233-.09-.299-.071l-1.103.303c-.644.176-1.392-.021-1.82-.63a8.12 8.12 0 0 1-.704-1.218c-.315-.675-.111-1.422.363-1.891l.815-.806c.05-.048.098-.147.088-.294a6.214 6.214 0 0 1 0-.772c.01-.147-.038-.246-.088-.294l-.815-.806C.635 6.045.431 5.298.746 4.623a7.92 7.92 0 0 1 .704-1.217c.428-.61 1.176-.807 1.82-.63l1.102.302c.067.019.177.011.3-.071.214-.143.437-.272.668-.386.133-.066.194-.158.211-.224l.29-1.106C6.009.645 6.556.095 7.299.03 7.53.01 7.764 0 8 0Zm-.571 1.525c-.036.003-.108.036-.137.146l-.289 1.105c-.147.561-.549.967-.998 1.189-.173.086-.34.183-.5.29-.417.278-.97.423-1.529.27l-1.103-.303c-.109-.03-.175.016-.195.045-.22.312-.412.644-.573.99-.014.031-.021.11.059.19l.815.806c.411.406.562.957.53 1.456a4.709 4.709 0 0 0 0 .582c.032.499-.119 1.05-.53 1.456l-.815.806c-.081.08-.073.159-.059.19.162.346.353.677.573.989.02.03.085.076.195.046l1.102-.303c.56-.153 1.113-.008 1.53.27.161.107.328.204.501.29.447.222.85.629.997 1.189l.289 1.105c.029.109.101.143.137.146a6.6 6.6 0 0 0 1.142 0c.036-.003.108-.036.137-.146l.289-1.105c.147-.561.549-.967.998-1.189.173-.086.34-.183.5-.29.417-.278.97-.423 1.529-.27l1.103.303c.109.029.175-.016.195-.045.22-.313.411-.644.573-.99.014-.031.021-.11-.059-.19l-.815-.806c-.411-.406-.562-.957-.53-1.456a4.709 4.709 0 0 0 0-.582c-.032-.499.119-1.05.53-1.456l.815-.806c.081-.08.073-.159.059-.19a6.464 6.464 0 0 0-.573-.989c-.02-.03-.085-.076-.195-.046l-1.102.303c-.56.153-1.113.008-1.53-.27a4.44 4.44 0 0 0-.501-.29c-.447-.222-.85-.629-.997-1.189l-.289-1.105c-.029-.11-.101-.143-.137-.146a6.6 6.6 0 0 0-1.142 0ZM11 8a3 3 0 1 1-6 0 3 3 0 0 1 6 0ZM9.5 8a1.5 1.5 0 1 0-3.001.001A1.5 1.5 0 0 0 9.5 8Z"/></svg>';
      edit.addEventListener('click', (event) => {
        event.preventDefault();
        chrome.runtime.openOptionsPage();
      });
      row.append(edit);
    }
    return select;
  }
})();
