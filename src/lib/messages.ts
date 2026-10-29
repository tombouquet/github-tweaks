// Messages from the popup and content script to the background worker.
export type AppMessage =
  | { type: 'checkForUpdate' }
  /** Notify when ready: content scripts can't use chrome.notifications themselves. */
  | { type: 'notify'; tag: string; title: string; message: string; context?: string };
