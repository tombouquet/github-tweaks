(() => {
  'use strict';

  // On Fridays, a row in a PR's merge card, just above the merge button, asks whether you really want to
  // merge, getting more worried as the day goes on. The sticky merge bar's button
  // reads "… on a Friday?" too.
  const CONVERSATION_PATH = /^\/[^/]+\/[^/]+\/pull\/\d+\/?$/;
  const FRIDAY_ATTR = 'data-gh-tweaks-friday';
  // Messages by time of day: the last group whose hour has passed applies. Each
  // page load picks one at random from that group. [emoji, headline, detail].
  const MOODS = [
    [0, [
      ['🍻', "It's Friday.", 'Merge now and you have the rest of the day to fix it. Probably.'],
      ['🌤️', 'Happy Friday!', 'A fine day to merge. Said nobody on call, ever.'],
      ['🧘', "It's Friday.", 'Breathe in. Read the diff once more. Breathe out.'],
      ['☕', 'Friday morning merge?', 'Bold, but there are hours left to undo it.'],
      ['🎲', "It's Friday.", 'Feeling lucky? The pager is.'],
      ['📅', "It's Friday.", 'Monday-you would appreciate a heads-up.'],
    ]],
    [12, [
      ['😬', "It's Friday afternoon.", 'Sure this can’t wait until Monday?'],
      ['🥪', 'Friday lunch merge?', 'Eat first. Merge after. Or Monday.'],
      ['🫠', "It's Friday afternoon.", 'Half the team has mentally left the building.'],
      ['🧯', "It's Friday afternoon.", 'Know where the rollback button is? Just checking.'],
      ['📉', 'Friday afternoon.', 'Statistically the best time to find out what breaks.'],
      ['🙏', "It's Friday afternoon.", 'Have you thought about Monday instead? Monday is nice.'],
    ]],
    [15, [
      ['🚨', "It's late on a Friday.", 'Your weekend called. It would like a word before you merge.'],
      ['🫣', 'After 3pm on a Friday?', 'Brave. Very brave.'],
      ['📟', "It's late on a Friday.", 'Somewhere, a pager just shivered.'],
      ['🏖️', "It's late on a Friday.", 'Your weekend plans are in this merge button’s hands.'],
      ['🧨', 'Late Friday merge.', 'What could possibly go wrong? (Everything.)'],
      ['⏳', "It's late on a Friday.", 'This will still be here on Monday. So will you, hopefully.'],
    ]],
    [18, [
      ['🔥', "It's Friday night.", 'Nobody is around to roll this back. Go home.'],
      ['🌙', "It's Friday night.", 'The office is empty. The pager is not.'],
      ['👻', 'Friday night merge?', 'Spooky. The on-call engineer thinks so too.'],
      ['🍕', "It's Friday night.", 'Close the laptop. Order a pizza. Merge on Monday.'],
      ['🦉', "It's Friday night.", 'Only owls and incidents are up this late.'],
      ['🛑', "It's Friday night.", 'Step away from the merge button.'],
    ]],
  ];
  // One pick per group for this page load, so the message stays put while you're on the page.
  const PICKS = MOODS.map(([, messages]) => Math.floor(Math.random() * messages.length));

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
    const card = friday && CONVERSATION_PATH.test(location.pathname) && document.querySelector('[data-testid="mergebox-border-container"]');
    if (!card) {
      banner?.remove();
      return;
    }
    const mood = MOODS.findLastIndex(([hour]) => now.getHours() >= hour);
    const [emoji, headline, detail] = MOODS[mood][1][PICKS[mood]];
    banner ??= createBanner();
    banner.querySelector('.gh-tweaks-friday-emoji').textContent = emoji;
    banner.querySelector('strong').textContent = headline;
    banner.querySelector('.gh-tweaks-friday-detail').textContent = detail;
    // Sits as the card's last row, right above the footer with the merge button. With
    // no merge button, such as on a PR with conflicts, it goes at the bottom of the card.
    const footer = mergeFooter(card);
    if (footer ? banner.nextElementSibling !== footer : card.lastElementChild !== banner) {
      if (footer) footer.before(banner);
      else card.append(banner);
    }
  }

  function mergeFooter(card) {
    const button = [...card.querySelectorAll('button')].find((b) => /merge/i.test(b.textContent) && !/^rebase|command line/i.test(b.textContent.trim()));
    return [...card.children].find((section) => section !== banner && section.contains(button)) ?? null;
  }

  // Built like the card's own rows (icon, heading, detail). The heading isn't an h3,
  // so the sticky merge bar doesn't read it as a merge status.
  function createBanner() {
    const element = document.createElement('section');
    element.className = 'gh-tweaks-friday';
    element.setAttribute('aria-label', 'Friday warning');
    element.innerHTML =
      '<span class="gh-tweaks-friday-icon" aria-hidden="true"><span class="gh-tweaks-friday-emoji"></span></span><div><strong></strong><p class="gh-tweaks-friday-detail"></p></div>';
    return element;
  }

  function injectStyles() {
    const style = document.createElement('style');
    style.textContent = `
      .gh-tweaks-friday {
        display: flex;
        gap: 8px;
        padding: 16px;
        border-bottom: 1px solid var(--borderColor-muted, #d1d9e0b3);
      }
      .gh-tweaks-friday-icon {
        display: flex;
        flex-shrink: 0;
        align-items: center;
        justify-content: center;
        width: 32px;
        height: 32px;
        border-radius: 50%;
        background: var(--bgColor-attention-muted, #fff8c5);
      }
      .gh-tweaks-friday-emoji {
        font-size: 18px;
        line-height: 1;
        animation: gh-tweaks-friday-wobble 2.4s ease-in-out infinite;
      }
      .gh-tweaks-friday strong { display: block; font-size: 16px; font-weight: 600; line-height: 24px; }
      .gh-tweaks-friday-detail { margin: 0; color: var(--fgColor-muted, #59636e); font-size: 14px; line-height: 21px; }
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
