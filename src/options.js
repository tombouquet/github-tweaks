(() => {
  'use strict';

  // Options page: edit, add, reorder and delete the Claude Code button's prompts.
  // They're saved as `claudePrompts` in chrome.storage.sync as you type, with the
  // default stored as `claudePrompt` like the popup's dropdown.
  const MAX_PROMPT = 5000;
  const SAVE_DELAY = 400;

  const container = document.getElementById('prompts');
  const status = document.getElementById('status');
  let prompts = [];
  let selected = '';
  let saveTimer = null;

  GH_TWEAKS_SETTINGS.then((settings) => {
    prompts = structuredClone(settings.claudePrompts?.length ? settings.claudePrompts : GH_TWEAKS_CLAUDE_PROMPTS);
    selected = prompts.some((prompt) => prompt.key === settings.claudePrompt) ? settings.claudePrompt : prompts[0]?.key;
    render();
  });

  document.getElementById('add').addEventListener('click', () => {
    prompts.push({ key: `custom-${Date.now()}`, label: 'New prompt', prompt: 'Look at PR #{n} ({title}): {url}' });
    render();
    save();
    container.lastElementChild?.querySelector('input[type="text"]').select();
  });

  document.getElementById('reset').addEventListener('click', () => {
    if (!confirm('Replace your prompts with the built-in ones?')) return;
    prompts = structuredClone(GH_TWEAKS_CLAUDE_PROMPTS);
    selected = prompts[0].key;
    render();
    save();
  });

  function render() {
    container.replaceChildren(...prompts.map(card));
  }

  function card(prompt, index) {
    const element = document.createElement('section');
    element.className = `prompt${prompt.key === selected ? ' default' : ''}`;
    element.innerHTML = `
      <div class="prompt-head">
        <input type="text" aria-label="Prompt name" maxlength="60">
        <label class="default-label"><input type="radio" name="default"> Default</label>
        <button type="button" class="icon" data-move="-1" aria-label="Move up" title="Move up">↑</button>
        <button type="button" class="icon" data-move="1" aria-label="Move down" title="Move down">↓</button>
        <button type="button" class="danger" data-delete>Delete</button>
      </div>
      <textarea aria-label="Prompt" spellcheck="false" placeholder="Empty: open the repo with no prompt"></textarea>
      <div class="prompt-foot"></div>`;

    const name = element.querySelector('input[type="text"]');
    name.value = prompt.label;
    name.addEventListener('input', () => {
      prompt.label = name.value;
      save();
    });

    const radio = element.querySelector('input[type="radio"]');
    radio.checked = prompt.key === selected;
    radio.addEventListener('change', () => {
      selected = prompt.key;
      for (const other of container.children) other.classList.toggle('default', other === element);
      save();
    });

    const text = element.querySelector('textarea');
    const count = element.querySelector('.prompt-foot');
    text.value = prompt.prompt;
    const updateCount = () => {
      count.textContent = `${text.value.length.toLocaleString()} / ${MAX_PROMPT.toLocaleString()}`;
      count.classList.toggle('over', text.value.length > MAX_PROMPT);
    };
    updateCount();
    text.addEventListener('input', () => {
      prompt.prompt = text.value;
      updateCount();
      save();
    });

    for (const button of element.querySelectorAll('[data-move]')) {
      const to = index + Number(button.dataset.move);
      button.disabled = to < 0 || to >= prompts.length;
      button.addEventListener('click', () => {
        [prompts[index], prompts[to]] = [prompts[to], prompts[index]];
        render();
        save();
      });
    }

    const remove = element.querySelector('[data-delete]');
    remove.disabled = prompts.length === 1;
    remove.addEventListener('click', () => {
      prompts.splice(index, 1);
      if (prompt.key === selected) selected = prompts[0].key;
      render();
      save();
    });
    return element;
  }

  function save() {
    clearTimeout(saveTimer);
    setStatus('Saving…');
    saveTimer = setTimeout(async () => {
      const cleaned = prompts.map(({ key, label, prompt }) => ({ key, label: label.trim() || 'Untitled prompt', prompt: prompt.slice(0, MAX_PROMPT) }));
      try {
        await chrome.storage.sync.set({ claudePrompts: cleaned, claudePrompt: selected });
        setStatus('Saved. Reload GitHub to use the changes.', 'saved');
      } catch (error) {
        // chrome.storage.sync allows 8 KB per setting, which very long prompts can go over.
        setStatus(`Couldn't save: ${error.message}. Try shorter prompts.`, 'error');
      }
    }, SAVE_DELAY);
  }

  function setStatus(text, kind = '') {
    status.textContent = text;
    status.className = `status ${kind}`;
  }
})();
