import { useSyncExternalStore } from 'react';

// Hash routes, so the popup and options page can link straight to `app.html#/prompts`.
const subscribe = (listener: () => void) => {
  window.addEventListener('hashchange', listener);
  return () => window.removeEventListener('hashchange', listener);
};
const getPath = () => window.location.hash.replace(/^#/, '') || '/';

export function useRoute(): string {
  return useSyncExternalStore(subscribe, getPath);
}

export function navigate(path: string): void {
  window.location.hash = path;
}
