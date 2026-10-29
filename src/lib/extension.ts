// Links between the extension's own pages: the popup, and app.html with its hash routes.

export type AppRoute = '/' | '/prompts' | '/changelog';

export const appUrl = (route: AppRoute = '/') => chrome.runtime.getURL(`/app.html#${route}`);

/** Opens an app page in a new tab and closes the popup. */
export function openFromPopup(url: string): void {
  void chrome.tabs.create({ url });
  window.close();
}
