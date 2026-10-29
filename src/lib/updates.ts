// Unpacked extensions don't auto-update, so the background worker checks the latest
// GitHub release and flags when it's newer than what's installed: a toolbar badge, one
// desktop notification per version, and a banner in the popup and changelog page (they
// read the stored info).
import { REPO, UPDATE_KEY, currentVersion, getUpdateInfo, isNewer, type UpdateInfo } from './version';

const LATEST_RELEASE_API = `https://api.github.com/repos/${REPO}/releases/latest`;
export const CHECK_ALARM = 'update-check';
const CHECK_EVERY_MINUTES = 60;
// The popup asks for a fresh check when it opens, but not more often than this.
const POPUP_CHECK_AFTER_MS = 60 * 60 * 1000;
const NOTIFICATION_PREFIX = 'update-';

export async function checkForUpdate(): Promise<void> {
  let release: { tag_name?: string; html_url?: string };
  try {
    const response = await fetch(LATEST_RELEASE_API, { headers: { Accept: 'application/vnd.github+json' } });
    // 404 means no release yet; rate limits and network errors keep the last result.
    if (!response.ok) return;
    release = await response.json();
  } catch {
    return;
  }
  const update: UpdateInfo = {
    ...(await getUpdateInfo()),
    latestVersion: String(release.tag_name ?? '').replace(/^v/, ''),
    releaseUrl: release.html_url,
    checkedAt: Date.now(),
  };
  if (isNewer(update.latestVersion, currentVersion()) && update.notifiedVersion !== update.latestVersion) {
    chrome.notifications.create(`${NOTIFICATION_PREFIX}${update.latestVersion}`, {
      type: 'basic',
      iconUrl: chrome.runtime.getURL('/icon/128.png'),
      title: `GitHub Tweaks v${update.latestVersion} is out`,
      message: `You're on v${currentVersion()}. Click to see what's new.`,
    });
    update.notifiedVersion = update.latestVersion;
  }
  await chrome.storage.local.set({ [UPDATE_KEY]: update });
  await applyBadge(update);
}

export async function applyBadge(update?: UpdateInfo): Promise<void> {
  update ??= await getUpdateInfo();
  const newer = isNewer(update?.latestVersion, currentVersion());
  await chrome.action.setBadgeText({ text: newer ? '↑' : '' });
  if (newer) {
    await chrome.action.setBadgeBackgroundColor({ color: '#1f883d' });
    await chrome.action.setBadgeTextColor({ color: '#ffffff' });
  }
  await chrome.action.setTitle({ title: newer ? `GitHub Tweaks: v${update!.latestVersion} available` : 'GitHub Tweaks' });
}

export function scheduleChecks(): void {
  void chrome.alarms.create(CHECK_ALARM, { periodInMinutes: CHECK_EVERY_MINUTES });
  void checkForUpdate();
}

export async function checkIfStale(): Promise<void> {
  const update = await getUpdateInfo();
  if (!update?.checkedAt || Date.now() - update.checkedAt > POPUP_CHECK_AFTER_MS) await checkForUpdate();
}

/** Returns true when it handled the notification click. */
export async function openUpdateNotification(id: string, fallbackUrl: string): Promise<boolean> {
  if (!id.startsWith(NOTIFICATION_PREFIX)) return false;
  chrome.notifications.clear(id);
  const update = await getUpdateInfo();
  await chrome.tabs.create({ url: update?.releaseUrl || fallbackUrl });
  return true;
}
