// Shared by the background worker, popup and app pages: where releases come from, and
// the latest release as last seen by the update check (in chrome.storage.local).

export const REPO = 'tombouquet/github-tweaks';
export const RELEASES_URL = `https://github.com/${REPO}/releases`;
export const UPDATE_KEY = 'update';

export interface UpdateInfo {
  latestVersion?: string;
  releaseUrl?: string;
  checkedAt?: number;
  /** The version a desktop notification was already shown for. */
  notifiedVersion?: string;
}

export const currentVersion = () => chrome.runtime.getManifest().version;

/** Numeric x.y.z compare: is `latest` newer than `current`? */
export function isNewer(latest: string | undefined, current: string): boolean {
  if (!latest) return false;
  const a = latest.split('.').map(Number);
  const b = current.split('.').map(Number);
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const diff = (a[i] ?? 0) - (b[i] ?? 0);
    if (diff) return diff > 0;
  }
  return false;
}

export async function getUpdateInfo(): Promise<UpdateInfo | undefined> {
  return (await chrome.storage.local.get(UPDATE_KEY))[UPDATE_KEY] as UpdateInfo | undefined;
}
