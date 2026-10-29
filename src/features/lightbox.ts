import type { Settings } from '@/lib/settings';

// GitHub is a single-page app, so the script runs on every github.com page
// and checks the URL at click time.
const PR_PATH = /^\/[^/]+\/[^/]+\/pull\/\d+/;
const IMAGE_SELECTOR = '.markdown-body img';
const MIN_IMAGE_SIZE = 24; // skips emoji, badges and other inline icons
const MAX_SCALE = 8;
const PADDING = 24;
const WHEEL_SPEED = 0.0015;
const PINCH_SPEED = 0.01;
const BUTTON_ZOOM_STEP = 1.25;

interface GalleryItem {
  src: string;
  alt: string;
}

interface Viewer {
  open: (items: GalleryItem[], startIndex: number) => void;
  close: () => void;
}

let viewer: Viewer | null = null;

export function lightbox(settings: Settings): void {
  if (settings.lightbox) document.addEventListener('click', onPageClick, true);
}

function onPageClick(event: MouseEvent): void {
  if (event.defaultPrevented || event.button !== 0) return;
  // Modifier clicks keep GitHub's default (open in new tab, etc.).
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  if (!PR_PATH.test(location.pathname)) return;
  if (!(event.target instanceof Element)) return;

  const clicked = event.target.closest<HTMLImageElement>(IMAGE_SELECTOR);
  if (!clicked || !isGalleryImage(clicked)) return;

  const items = collectImages();
  const src = imageSrc(clicked);
  const index = items.findIndex((item) => item.src === src);
  if (index === -1) return;

  event.preventDefault();
  event.stopPropagation();
  viewer ??= createViewer();
  viewer.open(items, index);
}

function imageSrc(img: HTMLImageElement): string {
  return img.currentSrc || img.src;
}

function isGalleryImage(img: HTMLImageElement): boolean {
  if (img.classList.contains('emoji')) return false;
  if (img.closest('.avatar')) return false;
  if (!imageSrc(img)) return false;
  const width = img.naturalWidth || img.width;
  const height = img.naturalHeight || img.height;
  // Images inside collapsed <details> report 0x0 until shown, so only
  // reject images whose size we actually know.
  if (img.complete && width && height && (width < MIN_IMAGE_SIZE || height < MIN_IMAGE_SIZE)) {
    return false;
  }
  return true;
}

function collectImages(): GalleryItem[] {
  const seen = new Set<string>();
  const items: GalleryItem[] = [];
  for (const img of document.querySelectorAll<HTMLImageElement>(IMAGE_SELECTOR)) {
    if (!isGalleryImage(img)) continue;
    const src = imageSrc(img);
    if (seen.has(src)) continue;
    seen.add(src);
    items.push({ src, alt: img.alt.trim() });
  }
  return items;
}

interface Drag {
  id: number;
  target: EventTarget | null;
  startX: number;
  startY: number;
  tx: number;
  ty: number;
  moved: boolean;
}

function createViewer(): Viewer {
  const host = document.createElement('div');
  host.id = 'gh-pr-image-lightbox';
  const root = host.attachShadow({ mode: 'open' });
  root.innerHTML = `
    <style>${STYLES}</style>
    <div class="overlay" role="dialog" aria-modal="true" aria-label="Image viewer" tabindex="-1" hidden>
      <div class="toolbar">
        <span class="counter"></span>
        <span class="spacer"></span>
        <button type="button" data-action="zoom-out" title="Zoom out (-)" aria-label="Zoom out">${ICONS.minus}</button>
        <button type="button" class="zoom-level" data-action="actual" title="Actual size (1)"></button>
        <button type="button" data-action="zoom-in" title="Zoom in (+)" aria-label="Zoom in">${ICONS.plus}</button>
        <button type="button" data-action="fit" title="Fit to screen (0)" aria-label="Fit to screen">${ICONS.fit}</button>
        <a class="btn open-original" target="_blank" rel="noopener noreferrer" title="Open original in new tab" aria-label="Open original in new tab">${ICONS.external}</a>
        <button type="button" data-action="close" title="Close (Esc)" aria-label="Close">${ICONS.close}</button>
      </div>
      <div class="stage">
        <div class="spinner" hidden></div>
        <div class="error" hidden>
          Couldn't load image.
          <a target="_blank" rel="noopener noreferrer">Open original</a>
        </div>
        <img class="image" alt="" draggable="false" hidden>
        <button type="button" class="nav prev" data-action="prev" title="Previous (←)" aria-label="Previous image">${ICONS.left}</button>
        <button type="button" class="nav next" data-action="next" title="Next (→)" aria-label="Next image">${ICONS.right}</button>
      </div>
      <div class="caption"></div>
      <div class="thumbs"></div>
    </div>`;

  // Every element below was just created by the innerHTML above.
  const $ = <T extends Element = HTMLElement>(selector: string): T => root.querySelector<T>(selector)!;
  const overlay = $('.overlay');
  const stage = $('.stage');
  const spinner = $('.spinner');
  const errorBox = $('.error');
  const errorLink = $<HTMLAnchorElement>('.error a');
  const counter = $('.counter');
  const zoomLevel = $('.zoom-level');
  const openOriginal = $<HTMLAnchorElement>('.open-original');
  const caption = $('.caption');
  const thumbs = $('.thumbs');
  const prevButton = $('.prev');
  const nextButton = $('.next');
  let image = $<HTMLImageElement>('.image');

  let items: GalleryItem[] = [];
  let index = 0;
  let loadToken = 0;
  let naturalWidth = 0;
  let naturalHeight = 0;
  let fitScale = 1;
  let scale = 1;
  let tx = 0;
  let ty = 0;
  let drag: Drag | null = null;
  let isOpen = false;
  let previousFocus: Element | null = null;
  let previousOverflow = '';

  root.addEventListener('click', (event) => {
    if (!(event.target instanceof Element)) return;
    const button = event.target.closest<HTMLElement>('[data-action]');
    if (!button) return;
    const actions: Record<string, () => void> = {
      close,
      prev: () => show(index - 1),
      next: () => show(index + 1),
      'zoom-in': () => zoomBy(BUTTON_ZOOM_STEP),
      'zoom-out': () => zoomBy(1 / BUTTON_ZOOM_STEP),
      fit: () => fit(true),
      actual: () => zoomTo(1, undefined, undefined, true),
    };
    actions[button.dataset.action ?? '']?.();
  });

  stage.addEventListener('wheel', onWheel, { passive: false });
  stage.addEventListener('pointerdown', onPointerDown);
  stage.addEventListener('pointermove', onPointerMove);
  stage.addEventListener('pointerup', onPointerUp);
  stage.addEventListener('pointercancel', () => endDrag());

  function open(newItems: GalleryItem[], startIndex: number): void {
    items = newItems;
    if (!host.isConnected) {
      // Attach to <html> so GitHub's Turbo navigation (which swaps <body>) doesn't remove it.
      document.documentElement.append(host);
    }
    buildThumbs();
    const multiple = items.length > 1;
    prevButton.hidden = !multiple;
    nextButton.hidden = !multiple;
    thumbs.hidden = !multiple;
    counter.hidden = !multiple;

    if (!isOpen) {
      isOpen = true;
      previousFocus = document.activeElement;
      previousOverflow = document.documentElement.style.overflow;
      document.documentElement.style.overflow = 'hidden';
      overlay.hidden = false;
      document.addEventListener('keydown', onKeyDown, true);
      window.addEventListener('resize', onResize);
      window.addEventListener('popstate', close);
      document.addEventListener('turbo:visit', close);
    }
    overlay.focus({ preventScroll: true });
    show(startIndex);
  }

  function close(): void {
    if (!isOpen) return;
    isOpen = false;
    loadToken++;
    endDrag();
    overlay.hidden = true;
    image.hidden = true;
    image.removeAttribute('src');
    thumbs.replaceChildren();
    document.documentElement.style.overflow = previousOverflow;
    document.removeEventListener('keydown', onKeyDown, true);
    window.removeEventListener('resize', onResize);
    window.removeEventListener('popstate', close);
    document.removeEventListener('turbo:visit', close);
    if (previousFocus instanceof HTMLElement && previousFocus.isConnected) {
      previousFocus.focus({ preventScroll: true });
    }
  }

  function show(newIndex: number): void {
    index = (newIndex + items.length) % items.length;
    const item = items[index];
    if (!item) return;
    const token = ++loadToken;

    counter.textContent = `${index + 1} / ${items.length}`;
    caption.textContent = item.alt && item.alt.toLowerCase() !== 'image' ? item.alt : '';
    openOriginal.href = item.src;
    errorLink.href = item.src;
    thumbs.querySelectorAll('.thumb').forEach((thumb, i) => {
      const active = i === index;
      thumb.classList.toggle('active', active);
      thumb.setAttribute('aria-current', active ? 'true' : 'false');
      if (active) thumb.scrollIntoView({ block: 'nearest', inline: 'center' });
    });

    image.hidden = true;
    errorBox.hidden = true;
    spinner.hidden = false;

    const next = new Image();
    next.className = 'image';
    next.alt = item.alt;
    next.draggable = false;
    next.decoding = 'async';
    next.onload = () => {
      if (token !== loadToken) return;
      // SVGs without intrinsic dimensions report 0; fall back to the stage size.
      naturalWidth = next.naturalWidth || stage.clientWidth;
      naturalHeight = next.naturalHeight || stage.clientHeight;
      next.style.width = `${naturalWidth}px`;
      next.style.height = `${naturalHeight}px`;
      image.replaceWith(next);
      image = next;
      spinner.hidden = true;
      fit(false);
      preloadNeighbours();
    };
    next.onerror = () => {
      if (token !== loadToken) return;
      spinner.hidden = true;
      errorBox.hidden = false;
    };
    next.src = item.src;
  }

  function preloadNeighbours(): void {
    if (items.length < 2) return;
    for (const offset of [1, -1]) {
      new Image().src = items[(index + offset + items.length) % items.length]?.src ?? '';
    }
  }

  function buildThumbs(): void {
    thumbs.replaceChildren(
      ...items.map((item, i) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'thumb';
        button.title = item.alt || `Image ${i + 1}`;
        button.setAttribute('aria-label', `Show image ${i + 1}`);
        const thumb = document.createElement('img');
        thumb.src = item.src;
        thumb.alt = '';
        thumb.loading = 'lazy';
        thumb.draggable = false;
        button.append(thumb);
        button.addEventListener('click', () => show(i));
        return button;
      }),
    );
  }

  // --- Zoom and pan -------------------------------------------------------

  function computeFitScale(): number {
    const width = stage.clientWidth - PADDING * 2;
    const height = stage.clientHeight - PADDING * 2;
    return Math.max(0.01, Math.min(1, width / naturalWidth, height / naturalHeight));
  }

  function minScale(): number {
    return fitScale / 4;
  }

  function maxScale(): number {
    return Math.max(MAX_SCALE, fitScale * 2);
  }

  function isAtFit(): boolean {
    return Math.abs(scale - fitScale) < 0.001;
  }

  function fit(animate: boolean): void {
    if (!naturalWidth) return;
    fitScale = computeFitScale();
    scale = fitScale;
    clampPosition();
    render(animate);
  }

  function zoomBy(factor: number): void {
    zoomTo(scale * factor, undefined, undefined, true);
  }

  // Zooms so the point under (x, y) in stage coordinates stays put.
  function zoomTo(target: number, x = stage.clientWidth / 2, y = stage.clientHeight / 2, animate = false): void {
    if (!naturalWidth) return;
    const next = Math.min(maxScale(), Math.max(minScale(), target));
    const ratio = next / scale;
    tx = x - (x - tx) * ratio;
    ty = y - (y - ty) * ratio;
    scale = next;
    clampPosition();
    render(animate);
  }

  // Centres the image on any axis where it fits, otherwise keeps its edges
  // from being dragged inside the stage.
  function clampPosition(): void {
    const width = naturalWidth * scale;
    const height = naturalHeight * scale;
    const stageWidth = stage.clientWidth;
    const stageHeight = stage.clientHeight;
    tx = width <= stageWidth ? (stageWidth - width) / 2 : Math.min(0, Math.max(stageWidth - width, tx));
    ty = height <= stageHeight ? (stageHeight - height) / 2 : Math.min(0, Math.max(stageHeight - height, ty));
  }

  function canPan(): boolean {
    return naturalWidth * scale > stage.clientWidth + 1 || naturalHeight * scale > stage.clientHeight + 1;
  }

  function render(animate: boolean): void {
    image.hidden = false;
    image.style.transition = animate ? 'transform 150ms ease-out' : 'none';
    image.style.transform = `translate(${tx}px, ${ty}px) scale(${scale})`;
    zoomLevel.textContent = `${Math.round(scale * 100)}%`;
    stage.classList.toggle('zoomed', !isAtFit());
    stage.classList.toggle('pannable', canPan());
  }

  function stagePoint(event: MouseEvent): { x: number; y: number } {
    const rect = stage.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  }

  function onWheel(event: WheelEvent): void {
    event.preventDefault();
    if (!naturalWidth || image.hidden) return;
    const lineHeight = 16;
    const delta = event.deltaY * (event.deltaMode === 1 ? lineHeight : event.deltaMode === 2 ? stage.clientHeight : 1);
    // Trackpad pinch arrives as a ctrl+wheel event with small deltas.
    const speed = event.ctrlKey ? PINCH_SPEED : WHEEL_SPEED;
    const { x, y } = stagePoint(event);
    zoomTo(scale * Math.exp(-delta * speed), x, y);
  }

  function onPointerDown(event: PointerEvent): void {
    if (!(event.target instanceof Element)) return;
    if (event.button !== 0 || event.target.closest('button, a')) return;
    drag = {
      id: event.pointerId,
      target: event.target,
      startX: event.clientX,
      startY: event.clientY,
      tx,
      ty,
      moved: false,
    };
    stage.setPointerCapture(event.pointerId);
  }

  function onPointerMove(event: PointerEvent): void {
    if (!drag || event.pointerId !== drag.id) return;
    const dx = event.clientX - drag.startX;
    const dy = event.clientY - drag.startY;
    if (!drag.moved && Math.hypot(dx, dy) < 4) return;
    drag.moved = true;
    if (!canPan()) return;
    stage.classList.add('dragging');
    tx = drag.tx + dx;
    ty = drag.ty + dy;
    clampPosition();
    render(false);
  }

  function onPointerUp(event: PointerEvent): void {
    if (!drag || event.pointerId !== drag.id) return;
    const { target, moved } = drag;
    endDrag();
    if (moved) return;
    if (target === image) {
      // Click on the image toggles between fit and a closer zoom.
      if (isAtFit()) {
        const { x, y } = stagePoint(event);
        zoomTo(Math.max(1, fitScale * 2), x, y, true);
      } else {
        fit(true);
      }
    } else if (target === stage) {
      close();
    }
  }

  function endDrag(): void {
    if (drag && stage.hasPointerCapture(drag.id)) stage.releasePointerCapture(drag.id);
    drag = null;
    stage.classList.remove('dragging');
  }

  function onResize(): void {
    if (!naturalWidth) return;
    if (isAtFit()) {
      fit(false);
    } else {
      fitScale = computeFitScale();
      clampPosition();
      render(false);
    }
  }

  function onKeyDown(event: KeyboardEvent): void {
    // Leave browser shortcuts (copy, reload, devtools) alone.
    if (event.metaKey || event.ctrlKey) return;
    const keyActions: Record<string, () => void> = {
      Escape: close,
      ArrowLeft: () => items.length > 1 && show(index - 1),
      ArrowRight: () => items.length > 1 && show(index + 1),
      '+': () => zoomBy(BUTTON_ZOOM_STEP),
      '=': () => zoomBy(BUTTON_ZOOM_STEP),
      '-': () => zoomBy(1 / BUTTON_ZOOM_STEP),
      _: () => zoomBy(1 / BUTTON_ZOOM_STEP),
      0: () => fit(true),
      1: () => zoomTo(1, undefined, undefined, true),
    };
    const action = keyActions[event.key];
    if (action) {
      event.preventDefault();
      action();
    }
    // Swallow everything else too so GitHub's hotkeys don't fire behind the modal.
    if (event.key !== 'Tab') event.stopPropagation();
  }

  return { open, close };
}

const svg = (path: string): string =>
  `<svg viewBox="0 0 16 16" width="16" height="16" fill="currentColor" aria-hidden="true">${path}</svg>`;

// Octicons (MIT): dash, plus, screen-normal, link-external, x, chevron-left, chevron-right.
const ICONS = {
  minus: svg('<path d="M2 7.75A.75.75 0 0 1 2.75 7h10a.75.75 0 0 1 0 1.5h-10A.75.75 0 0 1 2 7.75Z"/>'),
  plus: svg('<path d="M7.75 2a.75.75 0 0 1 .75.75V7h4.25a.75.75 0 0 1 0 1.5H8.5v4.25a.75.75 0 0 1-1.5 0V8.5H2.75a.75.75 0 0 1 0-1.5H7V2.75A.75.75 0 0 1 7.75 2Z"/>'),
  fit: svg('<path d="M1.75 10a.75.75 0 0 1 .75.75v2.5c0 .138.112.25.25.25h2.5a.75.75 0 0 1 0 1.5h-2.5A1.75 1.75 0 0 1 1 13.25v-2.5a.75.75 0 0 1 .75-.75Zm12.5 0a.75.75 0 0 1 .75.75v2.5A1.75 1.75 0 0 1 13.25 15h-2.5a.75.75 0 0 1 0-1.5h2.5a.25.25 0 0 0 .25-.25v-2.5a.75.75 0 0 1 .75-.75ZM2.75 2.5a.25.25 0 0 0-.25.25v2.5a.75.75 0 0 1-1.5 0v-2.5C1 1.784 1.784 1 2.75 1h2.5a.75.75 0 0 1 0 1.5ZM10 1.75a.75.75 0 0 1 .75-.75h2.5c.966 0 1.75.784 1.75 1.75v2.5a.75.75 0 0 1-1.5 0v-2.5a.25.25 0 0 0-.25-.25h-2.5a.75.75 0 0 1-.75-.75Z"/>'),
  external: svg('<path d="M3.75 2h3.5a.75.75 0 0 1 0 1.5h-3.5a.25.25 0 0 0-.25.25v8.5c0 .138.112.25.25.25h8.5a.25.25 0 0 0 .25-.25v-3.5a.75.75 0 0 1 1.5 0v3.5A1.75 1.75 0 0 1 12.25 14h-8.5A1.75 1.75 0 0 1 2 12.25v-8.5C2 2.784 2.784 2 3.75 2Zm6.854-1h4.146a.25.25 0 0 1 .25.25v4.146a.25.25 0 0 1-.427.177L13.03 4.03 9.28 7.78a.751.751 0 0 1-1.042-.018.751.751 0 0 1-.018-1.042l3.75-3.75-1.543-1.543A.25.25 0 0 1 10.604 1Z"/>'),
  close: svg('<path d="M3.72 3.72a.75.75 0 0 1 1.06 0L8 6.94l3.22-3.22a.749.749 0 0 1 1.275.326.749.749 0 0 1-.215.734L9.06 8l3.22 3.22a.749.749 0 0 1-.326 1.275.749.749 0 0 1-.734-.215L8 9.06l-3.22 3.22a.751.751 0 0 1-1.042-.018.751.751 0 0 1-.018-1.042L6.94 8 3.72 4.78a.75.75 0 0 1 0-1.06Z"/>'),
  left: svg('<path d="M9.78 12.78a.75.75 0 0 1-1.06 0L4.47 8.53a.75.75 0 0 1 0-1.06l4.25-4.25a.751.751 0 0 1 1.042.018.751.751 0 0 1 .018 1.042L6.06 8l3.72 3.72a.75.75 0 0 1 0 1.06Z"/>'),
  right: svg('<path d="M6.22 3.22a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.751.751 0 0 1-1.042-.018.751.751 0 0 1-.018-1.042L9.94 8 6.22 4.28a.75.75 0 0 1 0-1.06Z"/>'),
};

const STYLES = `
  :host { all: initial; }
  [hidden] { display: none !important; }
  .overlay {
    position: fixed;
    inset: 0;
    z-index: 2147483647;
    display: flex;
    flex-direction: column;
    background: rgba(1, 4, 9, 0.96);
    color: #f0f6fc;
    font: 14px/1.5 -apple-system, BlinkMacSystemFont, "Segoe UI", "Noto Sans", Helvetica, Arial, sans-serif;
    outline: none;
  }
  .toolbar {
    flex: none;
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 8px 12px;
  }
  .spacer { flex: 1; }
  .counter {
    padding: 0 8px;
    color: #9198a1;
    font-variant-numeric: tabular-nums;
  }
  button, .btn {
    all: unset;
    box-sizing: border-box;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 36px;
    height: 36px;
    padding: 0 8px;
    border-radius: 6px;
    color: inherit;
    cursor: pointer;
  }
  button:hover, .btn:hover { background: rgba(240, 246, 252, 0.12); }
  button:focus-visible, .btn:focus-visible { outline: 2px solid #4493f8; outline-offset: -2px; }
  .zoom-level {
    min-width: 60px;
    font-size: 13px;
    font-variant-numeric: tabular-nums;
  }
  .stage {
    position: relative;
    flex: 1;
    min-height: 0;
    overflow: hidden;
    touch-action: none;
    user-select: none;
  }
  .image {
    position: absolute;
    top: 0;
    left: 0;
    max-width: none;
    max-height: none;
    transform-origin: 0 0;
    cursor: zoom-in;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
  }
  .stage.zoomed .image { cursor: zoom-out; }
  .stage.pannable .image { cursor: grab; }
  .stage.dragging .image { cursor: grabbing; }
  .nav {
    position: absolute;
    top: 50%;
    width: 44px;
    height: 64px;
    transform: translateY(-50%);
    background: rgba(1, 4, 9, 0.6);
  }
  .nav svg { width: 24px; height: 24px; }
  .prev { left: 12px; }
  .next { right: 12px; }
  .spinner {
    position: absolute;
    top: 50%;
    left: 50%;
    width: 32px;
    height: 32px;
    margin: -16px 0 0 -16px;
    border: 3px solid rgba(240, 246, 252, 0.2);
    border-top-color: #f0f6fc;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }
  @keyframes spin { to { transform: rotate(360deg); } }
  .error {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    pointer-events: none;
  }
  .error a { pointer-events: auto; }
  a { color: #4493f8; }
  .caption {
    flex: none;
    padding: 4px 16px 0;
    color: #9198a1;
    text-align: center;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .caption:empty { display: none; }
  .thumbs {
    flex: none;
    display: flex;
    justify-content: safe center;
    gap: 8px;
    padding: 8px 12px 12px;
    overflow-x: auto;
  }
  .thumb {
    flex: none;
    width: 72px;
    height: 52px;
    padding: 0;
    overflow: hidden;
    border: 2px solid transparent;
    opacity: 0.5;
  }
  .thumb:hover { opacity: 0.85; background: none; }
  .thumb.active { opacity: 1; border-color: #4493f8; }
  .thumb img {
    display: block;
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
`;
