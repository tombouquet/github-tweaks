import { addStyle, batched } from '@/lib/schedule';
import type { Settings } from '@/lib/settings';

// A sticky "Contents" list of the README's headings at the bottom of a repo's
// right-hand sidebar (under About, Releases…). It highlights the section you're
// reading and scrolls there on click. Hidden when the sidebar stacks under the
// README on narrow windows, or when the README has fewer than three headings.
const MIN_HEADINGS = 3;
const PANE_ATTR = 'data-gh-tweaks-toc-pane';
const READ_LINE = 120;

interface Heading {
  level: number;
  id: string;
  text: string;
  element: Element;
}

let panel: HTMLElement | null = null;
let headings: Heading[] = [];
let lastKey = '';
const schedule = batched(update, 100);

export function readmeToc(settings: Settings): void {
  if (!settings.readmeToc) return;
  injectStyles();
  new MutationObserver(schedule).observe(document.documentElement, { childList: true, subtree: true });
  addEventListener('scroll', highlight, { passive: true });
  addEventListener('resize', schedule);
  schedule();
}

function update() {
  const article = document.querySelector('article.markdown-body');
  const pane = article && sidebar(article);
  const found = article && pane ? [...article.querySelectorAll('.markdown-heading')].map(read).filter((heading) => heading !== null) : [];
  if (!pane || found.length < MIN_HEADINGS) {
    panel?.parentElement?.removeAttribute(PANE_ATTR);
    panel?.remove();
    lastKey = '';
    headings = [];
    return;
  }
  headings = found;
  const key = found.map((heading) => `${heading.level}${heading.id}`).join('|');
  panel ??= createPanel();
  if (key !== lastKey) {
    lastKey = key;
    render(panel, found);
  }
  if (panel.parentElement !== pane) pane.append(panel);
  // The pane scrolls itself, which would pin the panel to the pane instead of the page.
  pane.setAttribute(PANE_ATTR, '');
  highlight();
}

// GitHub's right-hand pane, only while it sits beside the README rather than under it.
function sidebar(article: Element) {
  const pane = document.querySelector('[class*="PageLayout-Pane-"]');
  if (!pane || pane.contains(article)) return null;
  return pane.getBoundingClientRect().left >= article.getBoundingClientRect().right ? pane : null;
}

function read(wrapper: Element): Heading | null {
  const heading = wrapper.querySelector('h1, h2, h3');
  const anchor = wrapper.querySelector('a.anchor[href^="#"]');
  if (!heading || !anchor) return null;
  return { level: Number(heading.tagName[1]), id: anchor.getAttribute('href')!.slice(1), text: heading.textContent?.trim() ?? '', element: wrapper };
}

function render(panel: HTMLElement, found: Heading[]) {
  const top = Math.min(...found.map((heading) => heading.level));
  const list = panel.querySelector('ol')!;
  list.replaceChildren(
    ...found.map(({ level, id, text }) => {
      const item = document.createElement('li');
      const link = document.createElement('a');
      link.href = `#${id}`;
      link.textContent = text;
      link.style.paddingLeft = `${8 + (level - top) * 12}px`;
      item.append(link);
      return item;
    }),
  );
}

function createPanel() {
  const element = document.createElement('nav');
  element.className = 'gh-tweaks-toc';
  element.setAttribute('aria-label', 'README contents');
  element.innerHTML = '<h2>Contents</h2><ol></ol>';
  element.addEventListener('click', (event) => {
    const link = event.target instanceof Element ? event.target.closest('a[href^="#"]') : null;
    if (!link || event.metaKey || event.ctrlKey || event.shiftKey) return;
    const target = headings.find((heading) => `#${heading.id}` === link.getAttribute('href'));
    if (!target) return;
    event.preventDefault();
    target.element.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
    history.replaceState(history.state, '', link.getAttribute('href'));
  });
  return element;
}

// The section you're reading is the last heading above the reading line.
function highlight() {
  if (!panel?.isConnected) return;
  let current = 0;
  headings.forEach((heading, index) => {
    if (heading.element.getBoundingClientRect().top <= READ_LINE) current = index;
  });
  const links = panel.querySelectorAll('a');
  links.forEach((link, index) => link.toggleAttribute('aria-current', index === current));
  const active = links[current];
  const list = panel.querySelector('ol')!;
  // Keep the active entry in view inside a long list, without scrolling the page.
  if (active && (active.offsetTop < list.scrollTop || active.offsetTop + active.offsetHeight > list.scrollTop + list.clientHeight)) {
    list.scrollTop = active.offsetTop - list.clientHeight / 2;
  }
}

function injectStyles() {
  addStyle(`
    [${PANE_ATTR}] { overflow: visible !important; }
    .gh-tweaks-toc {
      position: sticky;
      top: 16px;
      display: flex;
      flex-direction: column;
      max-height: calc(100vh - 32px);
      margin-top: 16px;
      padding-top: 16px;
      border-top: 1px solid var(--borderColor-muted, #d1d9e0b3);
    }
    .gh-tweaks-toc h2 { margin: 0 0 8px; font-size: 16px; font-weight: 600; }
    .gh-tweaks-toc ol {
      position: relative;
      margin: 0;
      padding: 0;
      overflow-y: auto;
      list-style: none;
      overscroll-behavior: contain;
    }
    .gh-tweaks-toc a {
      display: block;
      padding: 3px 8px;
      border-left: 2px solid var(--borderColor-muted, #d1d9e0b3);
      color: var(--fgColor-muted, #59636e);
      font-size: 13px;
      line-height: 18px;
      text-decoration: none;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .gh-tweaks-toc a:hover { color: var(--fgColor-default, #1f2328); background: var(--bgColor-neutral-muted, #818b981f); }
    .gh-tweaks-toc a[aria-current] {
      border-left-color: var(--fgColor-accent, #0969da);
      color: var(--fgColor-default, #1f2328);
      font-weight: 600;
    }
  `);
}
