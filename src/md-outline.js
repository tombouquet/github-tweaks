(() => {
  'use strict';

  // Opens GitHub's outline panel on Markdown file pages by default. Close it and
  // it stays closed on later files, until you open it again.
  const PREF_KEY = 'gh-tweaks-md-outline';
  const BUTTON = 'button[class*="TableOfContents"][aria-pressed]';

  let seen = new WeakSet();
  let opening = false;
  let scheduled = false;

  GH_TWEAKS_SETTINGS.then((settings) => {
    if (!settings.markdownOutline) return;
    new MutationObserver(onMutations).observe(document.documentElement, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['aria-pressed'],
    });
    schedule();
  });

  function onMutations(mutations) {
    for (const mutation of mutations) {
      // Your own open or close (not ours) becomes the new default.
      if (mutation.type === 'attributes' && !opening && mutation.target.matches?.(BUTTON)) {
        localStorage.setItem(PREF_KEY, mutation.target.getAttribute('aria-pressed') === 'true' ? 'open' : 'closed');
      }
    }
    schedule();
  }

  function schedule() {
    if (scheduled) return;
    scheduled = true;
    setTimeout(() => {
      scheduled = false;
      update();
    }, 50);
  }

  function update() {
    const button = document.querySelector(BUTTON);
    // Each file page gets a new button, so this opens the outline once per file.
    if (!button || seen.has(button)) return;
    seen.add(button);
    if (localStorage.getItem(PREF_KEY) === 'closed' || button.getAttribute('aria-pressed') === 'true') return;
    opening = true;
    button.click();
    // The aria-pressed change from this click arrives with the next mutation batch.
    setTimeout(() => (opening = false), 0);
  }
})();
