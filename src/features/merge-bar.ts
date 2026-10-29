import { mergeBox, mergeButton, readMergeStatus, summarize, type ChipState, type MergeStatus } from '@/lib/merge-status';
import { addStyle, batched } from '@/lib/schedule';
import type { Settings } from '@/lib/settings';

// A sticky bar on a PR's Conversation tab that mirrors GitHub's merge box
// (checks, reviews, conflicts) and its merge button, so you don't have to
// scroll to the bottom. It hides while the real merge box is on screen.
const CONVERSATION_PATH = /^\/[^/]+\/[^/]+\/pull\/\d+\/?$/;
// Octicons (MIT): check-circle-fill, x-circle-fill, clock, git-merge, lock.
const svg = (paths: string, size = 16) => `<svg viewBox="0 0 16 16" width="${size}" height="${size}" fill="currentColor" aria-hidden="true">${paths}</svg>`;
const ICONS: Record<ChipState | 'merge' | 'lock', string> = {
  ok: '<path d="M8 16A8 8 0 1 1 8 0a8 8 0 0 1 0 16Zm3.78-9.72a.751.751 0 0 0-.018-1.042.751.751 0 0 0-1.042-.018L6.75 9.19 5.28 7.72a.751.751 0 0 0-1.042.018.751.751 0 0 0-.018 1.042l2 2a.75.75 0 0 0 1.06 0Z"/>',
  fail: '<path d="M2.343 13.657A8 8 0 1 1 13.658 2.343 8 8 0 0 1 2.343 13.657ZM6.03 4.97a.751.751 0 0 0-1.042.018.751.751 0 0 0-.018 1.042L6.94 8 4.97 9.97a.749.749 0 0 0 .326 1.275.749.749 0 0 0 .734-.215L8 9.06l1.97 1.97a.749.749 0 0 0 1.275-.326.749.749 0 0 0-.215-.734L9.06 8l1.97-1.97a.749.749 0 0 0-.326-1.275.749.749 0 0 0-.734.215L8 6.94Z"/>',
  pending: '<path d="M8 0a8 8 0 1 1 0 16A8 8 0 0 1 8 0ZM1.5 8a6.5 6.5 0 1 0 13 0 6.5 6.5 0 0 0-13 0Zm7-3.25v2.992l2.028.812a.75.75 0 0 1-.557 1.392l-2.5-1A.751.751 0 0 1 7 8.25v-3.5a.75.75 0 0 1 1.5 0Z"/>',
  merge: '<path d="M5.45 5.154A4.25 4.25 0 0 0 9.25 7.5h1.378a2.251 2.251 0 1 1 0 1.5H9.25A5.734 5.734 0 0 1 5 7.123v3.505a2.25 2.25 0 1 1-1.5 0V5.372a2.25 2.25 0 1 1 1.95-.218ZM4.25 13.5a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Zm8.5-4.5a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5ZM5 3.25a.75.75 0 1 0 0 .005V3.25Z"/>',
  lock: '<path d="M4 4a4 4 0 0 1 8 0v2h.25c.966 0 1.75.784 1.75 1.75v5.5A1.75 1.75 0 0 1 12.25 15h-8.5A1.75 1.75 0 0 1 2 13.25v-5.5C2 6.784 2.784 6 3.75 6H4Zm8.25 3.5h-8.5a.25.25 0 0 0-.25.25v5.5c0 .138.112.25.25.25h8.5a.25.25 0 0 0 .25-.25v-5.5a.25.25 0 0 0-.25-.25ZM10.5 6V4a2.5 2.5 0 1 0-5 0v2Z"/>',
};

let bar: HTMLDivElement | null = null;
let watched: Element | null = null;
let lastKey = '';
const visibility = new IntersectionObserver(([entry]) => {
  if (entry) bar?.classList.toggle('gh-tweaks-merge-hidden', entry.isIntersecting);
});
const schedule = batched(update, 50);

export function mergeBar(settings: Settings): void {
  if (!settings.mergeBar) return;
  injectStyles(settings.mergeBarShadow);
  new MutationObserver(schedule).observe(document.documentElement, { childList: true, subtree: true, characterData: true });
  addEventListener('resize', place);
  schedule();
}

function update() {
  const box = CONVERSATION_PATH.test(location.pathname) && mergeBox();
  if (!box) {
    bar?.remove();
    lastKey = '';
    return;
  }
  const partial = box.closest('[data-testid="mergebox-partial"]') ?? box;
  if (watched !== partial) {
    if (watched) visibility.unobserve(watched);
    visibility.observe(partial);
    watched = partial;
  }

  const status = readMergeStatus(box, partial);
  const key = JSON.stringify(status);
  bar ??= createBar();
  if (key !== lastKey) {
    lastKey = key;
    render(bar, status);
  }
  // Attached to <html> so swapping <body> during navigation doesn't drop it.
  if (!bar.isConnected) document.documentElement.append(bar);
  place();
}

function createBar() {
  const element = document.createElement('div');
  element.className = 'gh-tweaks-merge-bar';
  element.setAttribute('role', 'button');
  element.tabIndex = 0;
  element.title = 'Jump to the merge box';
  element.addEventListener('click', onBarClick);
  element.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      scrollToBox();
    }
  });
  return element;
}

function render(bar: HTMLDivElement, { chips, mergeLabel }: MergeStatus) {
  const { lead, ready: allPassed } = summarize(chips);
  // No lead means no chips, which counts as ready.
  const ready = allPassed || !lead;
  bar.dataset.state = ready ? 'ok' : lead.state;

  const icon = document.createElement('span');
  icon.className = 'gh-tweaks-merge-lead';
  icon.innerHTML = svg(ICONS[ready ? 'ok' : lead.state], 20);

  const text = document.createElement('div');
  text.className = 'gh-tweaks-merge-text';
  const headline = document.createElement('strong');
  headline.textContent = ready ? 'Ready to merge' : lead.title;
  const sub = document.createElement('span');
  sub.textContent = ready ? chips.map((chip) => chip.title).join(' · ') : lead.detail;
  text.append(headline, sub);

  const chipList = document.createElement('div');
  chipList.className = 'gh-tweaks-merge-chips';
  for (const chip of chips) {
    if (!ready && chip === lead) continue;
    const element = document.createElement('span');
    element.className = 'gh-tweaks-merge-chip';
    element.dataset.state = chip.state;
    element.title = chip.title;
    element.innerHTML = svg(ICONS[chip.state], 12);
    element.append(chip.label);
    chipList.append(element);
  }

  const button = document.createElement('button');
  button.type = 'button';
  if (mergeLabel) {
    button.className = `gh-tweaks-merge-button ${ready ? 'gh-tweaks-merge-primary' : ''}`;
    button.innerHTML = svg(ICONS.merge);
    // In its own span, so Friday's "on a Friday?" suffix flows with the text instead of
    // becoming a separate flex item with the button's gap before it.
    const label = document.createElement('span');
    label.className = 'gh-tweaks-merge-label';
    label.textContent = mergeLabel;
    button.append(label);
    button.dataset.merge = '';
  } else {
    button.className = 'gh-tweaks-merge-button gh-tweaks-merge-blocked';
    button.innerHTML = svg(ICONS.lock);
    button.append('Merging blocked');
    // aria-disabled, not disabled, so a click still reaches the bar and scrolls.
    button.setAttribute('aria-disabled', 'true');
  }

  bar.replaceChildren(icon, text, chipList, button);
}

function onBarClick(event: MouseEvent) {
  const merge = event.target instanceof Element ? event.target.closest('button[data-merge]') : null;
  scrollToBox();
  if (!merge) return;
  // Hand off to GitHub's own button, which shows its usual confirm step.
  event.stopPropagation();
  const partial = mergeBox()?.closest('[data-testid="mergebox-partial"]');
  if (partial) mergeButton(partial)?.click();
}

function scrollToBox() {
  const box = mergeBox();
  box?.closest('[data-testid="mergebox-partial"]')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

// Line the bar up with the timeline column, which moves with the sidebar and window size.
function place() {
  if (!bar?.isConnected) return;
  const box = mergeBox();
  if (!box) return;
  const { left, width } = box.getBoundingClientRect();
  bar.style.left = `${left}px`;
  bar.style.width = `${width}px`;
}

function injectStyles(shadow: boolean) {
  addStyle(`
    /* Shadow follows GitHub's theme: black in dark mode, white in light mode.
       GitHub's "auto" mode follows the system setting. */
    :root { --gh-tweaks-merge-shadow: 0 0 0; }
    html[data-color-mode="light"] { --gh-tweaks-merge-shadow: 255 255 255; }
    @media (prefers-color-scheme: light) {
      html[data-color-mode="auto"] { --gh-tweaks-merge-shadow: 255 255 255; }
    }
    .gh-tweaks-merge-bar {
      position: fixed;
      bottom: 16px;
      z-index: 99;
      box-sizing: border-box;
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 10px 10px 10px 16px;
      border: 1px solid var(--borderColor-default, #d1d9e0);
      border-radius: 12px;
      /* The overlay colour is a step lighter than the page in dark mode, and the
         layered shadow lifts the bar off content that matches its colour. */
      background: color-mix(in srgb, var(--overlay-bgColor, var(--bgColor-default, #fff)) 92%, transparent);
      backdrop-filter: blur(12px) saturate(1.4);
      box-shadow:
        0 1px 0 rgba(255, 255, 255, 0.06) inset,
        0 0 0 1px rgb(var(--gh-tweaks-merge-shadow) / 0.5),
        0 6px 16px rgb(var(--gh-tweaks-merge-shadow) / 0.65),
        0 20px 56px 12px rgb(var(--gh-tweaks-merge-shadow) / 0.8),
        0 0 100px 32px rgb(var(--gh-tweaks-merge-shadow) / 0.55);
      color: var(--fgColor-default, #1f2328);
      font: 14px var(--fontStack-sansSerif, -apple-system, sans-serif);
      cursor: pointer;
      /* Slides rather than fades, so the shadow is always at full strength. */
      transition: transform 260ms cubic-bezier(0.2, 0.8, 0.2, 1), border-color 160ms ease;
      animation: gh-tweaks-merge-slide-in 320ms cubic-bezier(0.2, 0.8, 0.2, 1) backwards;
    }
    .gh-tweaks-merge-bar:hover { border-color: var(--borderColor-emphasis, #818b98); }
    .gh-tweaks-merge-bar:focus-visible { outline: 2px solid var(--focus-outlineColor, #0969da); outline-offset: 2px; }
    .gh-tweaks-merge-bar.gh-tweaks-merge-hidden { transform: translateY(calc(100% + 200px)); pointer-events: none; }
    @keyframes gh-tweaks-merge-slide-in { from { transform: translateY(calc(100% + 200px)); } }
    .gh-tweaks-merge-bar[data-state="fail"] { border-color: color-mix(in srgb, var(--fgColor-danger, #d1242f) 55%, var(--borderColor-default, #d1d9e0)); }
    .gh-tweaks-merge-bar[data-state="pending"] { border-color: color-mix(in srgb, var(--fgColor-attention, #9a6700) 45%, var(--borderColor-default, #d1d9e0)); }
    .gh-tweaks-merge-lead { display: flex; flex-shrink: 0; }
    .gh-tweaks-merge-bar[data-state="ok"] .gh-tweaks-merge-lead { color: var(--fgColor-success, #1a7f37); }
    .gh-tweaks-merge-bar[data-state="fail"] .gh-tweaks-merge-lead { color: var(--fgColor-danger, #d1242f); }
    .gh-tweaks-merge-bar[data-state="pending"] .gh-tweaks-merge-lead { color: var(--fgColor-attention, #9a6700); }
    .gh-tweaks-merge-text { display: flex; flex-direction: column; min-width: 0; margin-right: auto; line-height: 1.35; }
    .gh-tweaks-merge-text strong { font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .gh-tweaks-merge-text span { font-size: 12px; color: var(--fgColor-muted, #59636e); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .gh-tweaks-merge-chips { display: flex; gap: 6px; flex-shrink: 0; }
    .gh-tweaks-merge-chip {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      height: 22px;
      padding: 0 8px;
      border-radius: 999px;
      background: var(--bgColor-neutral-muted, rgba(175,184,193,.2));
      color: var(--fgColor-muted, #59636e);
      font-size: 12px;
      font-weight: 500;
      white-space: nowrap;
    }
    .gh-tweaks-merge-chip[data-state="ok"] svg { color: var(--fgColor-success, #1a7f37); }
    .gh-tweaks-merge-chip[data-state="fail"] { background: var(--bgColor-danger-muted, #ffebe9); color: var(--fgColor-danger, #d1242f); }
    .gh-tweaks-merge-chip[data-state="pending"] { background: var(--bgColor-attention-muted, #fff8c5); color: var(--fgColor-attention, #9a6700); }
    .gh-tweaks-merge-button {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      flex-shrink: 0;
      height: 32px;
      padding: 0 14px;
      border: 1px solid var(--button-default-borderColor-rest, #d1d9e0);
      border-radius: 6px;
      background: var(--button-default-bgColor-rest, #f6f8fa);
      color: var(--button-default-fgColor-rest, #25292e);
      font: 500 14px var(--fontStack-sansSerif, -apple-system, sans-serif);
      white-space: nowrap;
      cursor: pointer;
    }
    .gh-tweaks-merge-button:hover { background: var(--button-default-bgColor-hover, #eff2f5); }
    .gh-tweaks-merge-primary {
      border-color: var(--button-primary-borderColor-rest, transparent);
      background: var(--button-primary-bgColor-rest, #1f883d);
      color: var(--button-primary-fgColor-rest, #fff);
    }
    .gh-tweaks-merge-primary:hover { background: var(--button-primary-bgColor-hover, #1c8139); }
    .gh-tweaks-merge-blocked, .gh-tweaks-merge-blocked:hover {
      background: transparent;
      color: var(--fgColor-disabled, #818b98);
      cursor: inherit;
    }
    @media (max-width: 767px) { .gh-tweaks-merge-chips { display: none; } }
    /* Keep the Submit review and LGTM buttons clear of the bar once the sidebar stacks below the timeline. */
    @media (max-width: 1011px) {
      html:has(.gh-tweaks-merge-bar:not(.gh-tweaks-merge-hidden)) .gh-tweaks-review-actions { bottom: 88px; }
    }
    ${shadow ? '' : '.gh-tweaks-merge-bar { box-shadow: none; }'}
  `);
}
