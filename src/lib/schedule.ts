/**
 * Wraps `fn` so calls within `delay` ms run it once, at the end. The tweaks call it from
 * a MutationObserver, so GitHub re-rendering a page runs them once rather than per change.
 */
export function batched(fn: () => void, delay: number): () => void {
  let scheduled = false;
  return () => {
    if (scheduled) return;
    scheduled = true;
    setTimeout(() => {
      scheduled = false;
      fn();
    }, delay);
  };
}

/** Adds a <style> to the page. */
export function addStyle(css: string): HTMLStyleElement {
  const style = document.createElement('style');
  style.textContent = css;
  document.documentElement.append(style);
  return style;
}
