// Version helpers shared by the background worker, popup and changelog page.
// `update` in chrome.storage.local holds the latest release, written by src/updates.js.
globalThis.GH_TWEAKS_UPDATE_KEY = 'update';

// Numeric x.y.z compare: is `latest` newer than `current`?
globalThis.GH_TWEAKS_IS_NEWER = (latest, current) => {
  if (!latest) return false;
  const a = String(latest).split('.').map(Number);
  const b = String(current).split('.').map(Number);
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const diff = (a[i] || 0) - (b[i] || 0);
    if (diff) return diff > 0;
  }
  return false;
};
