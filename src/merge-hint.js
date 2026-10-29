(() => {
  'use strict';

  // Hides "You can also merge this with the command line. View command line
  // instructions." next to the merge button on a PR's Conversation tab.
  const HIDDEN_ATTR = 'data-gh-tweaks-merge-hint';
  let scheduled = false;

  GH_TWEAKS_SETTINGS.then((settings) => {
    if (!settings.hideMergeHint) return;
    const style = document.createElement('style');
    style.textContent = `[${HIDDEN_ATTR}] { display: none !important; }`;
    document.documentElement.append(style);
    new MutationObserver(schedule).observe(document.documentElement, { childList: true, subtree: true });
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
    const card = document.querySelector('[data-testid="mergebox-border-container"]');
    if (!card) return;
    for (const link of card.querySelectorAll('a, button')) {
      if (!/command line instructions/i.test(link.textContent)) continue;
      // The muted line holding both the sentence and the link.
      const line = link.parentElement;
      if (line && !line.hasAttribute(HIDDEN_ATTR) && /merge this with the command line/i.test(line.textContent)) line.setAttribute(HIDDEN_ATTR, '');
    }
  }
})();
