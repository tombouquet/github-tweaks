(() => {
  'use strict';

  // On Fridays, a banner above a PR's merge box asks whether you really want to
  // merge, getting more worried as the day goes on. The sticky merge bar's button
  // reads "… on a Friday?" too.
  const CONVERSATION_PATH = /^\/[^/]+\/[^/]+\/pull\/\d+\/?$/;
  const FRIDAY_ATTR = 'data-gh-tweaks-friday';
  // [from hour, emoji, headline, detail]. The last one whose hour has passed wins.
  const MOODS = [
    [0, '🍻', "It's Friday.", 'Merge now and you have the rest of the day to fix it. Probably.'],
    [12, '😬', "It's Friday afternoon.", 'Sure this can’t wait until Monday?'],
    [15, '🚨', "It's late on a Friday.", 'Your weekend called. It would like a word before you merge.'],
    [18, '🔥', "It's Friday night.", 'Nobody is around to roll this back. Go home.'],
  ];

  let banner = null;
  let scheduled = false;

  GH_TWEAKS_SETTINGS.then((settings) => {
    if (!settings.fridayWarning) return;
    injectStyles();
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
    const now = new Date();
    const friday = now.getDay() === 5;
    document.documentElement.toggleAttribute(FRIDAY_ATTR, friday);
    // The merge box's own wrapper, so the banner lines up with the box rather than its icon.
    const box = friday && CONVERSATION_PATH.test(location.pathname) && document.querySelector('[data-testid="mergebox-border-container"]')?.parentElement;
    if (!box) {
      banner?.remove();
      return;
    }
    const [, emoji, headline, detail] = MOODS.findLast(([hour]) => now.getHours() >= hour);
    banner ??= createBanner();
    banner.querySelector('.gh-tweaks-friday-emoji').textContent = emoji;
    banner.querySelector('strong').textContent = headline;
    banner.querySelector('.gh-tweaks-friday-detail').textContent = detail;
    if (banner.nextElementSibling !== box) box.before(banner);
  }

  function createBanner() {
    const element = document.createElement('div');
    element.className = 'gh-tweaks-friday';
    element.setAttribute('role', 'note');
    element.innerHTML = '<span class="gh-tweaks-friday-emoji" aria-hidden="true"></span><span><strong></strong> <span class="gh-tweaks-friday-detail"></span></span>';
    return element;
  }

  function injectStyles() {
    const style = document.createElement('style');
    style.textContent = `
      .gh-tweaks-friday {
        display: flex;
        align-items: center;
        gap: 12px;
        margin: 0 0 16px;
        padding: 12px 16px;
        border: 1px solid var(--borderColor-attention-muted, #d4a72c66);
        border-radius: 6px;
        background: var(--bgColor-attention-muted, #fff8c5);
        color: var(--fgColor-default, #1f2328);
        font-size: 14px;
      }
      .gh-tweaks-friday-emoji {
        font-size: 24px;
        line-height: 1;
        animation: gh-tweaks-friday-wobble 2.4s ease-in-out infinite;
      }
      .gh-tweaks-friday-detail { color: var(--fgColor-muted, #59636e); }
      @keyframes gh-tweaks-friday-wobble {
        0%, 80%, 100% { transform: rotate(0); }
        85% { transform: rotate(-12deg); }
        90% { transform: rotate(10deg); }
        95% { transform: rotate(-6deg); }
      }
      @media (prefers-reduced-motion: reduce) { .gh-tweaks-friday-emoji { animation: none; } }
      html[${FRIDAY_ATTR}] .gh-tweaks-merge-button[data-merge]::after { content: " on a Friday?"; white-space: pre; }
    `;
    document.documentElement.append(style);
  }
})();
