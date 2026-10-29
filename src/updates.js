// Unpacked extensions don't auto-update, so this checks the latest GitHub release and
// flags when it's newer than what's installed: a toolbar badge, one desktop notification
// per version, and a banner in the popup and changelog page (they read the stored `update`).
// Also opens the changelog on install and whenever the installed version changes.
const UPDATE_KEY = GH_TWEAKS_UPDATE_KEY;
const RELEASES_URL = 'https://api.github.com/repos/tombouquet/github-tweaks/releases/latest';
const CHECK_ALARM = 'update-check';
const CHECK_EVERY_MINUTES = 60;
// The popup asks for a fresh check when it opens, but not more often than this.
const POPUP_CHECK_AFTER_MS = 60 * 60 * 1000;

const currentVersion = () => chrome.runtime.getManifest().version;

async function checkForUpdate() {
  let release;
  try {
    const response = await fetch(RELEASES_URL, { headers: { Accept: 'application/vnd.github+json' } });
    // 404 means no release yet; rate limits and network errors keep the last result.
    if (!response.ok) return;
    release = await response.json();
  } catch {
    return;
  }
  const stored = (await chrome.storage.local.get(UPDATE_KEY))[UPDATE_KEY] || {};
  const update = {
    ...stored,
    latestVersion: String(release.tag_name || '').replace(/^v/, ''),
    releaseUrl: release.html_url,
    checkedAt: Date.now(),
  };
  if (GH_TWEAKS_IS_NEWER(update.latestVersion, currentVersion()) && update.notifiedVersion !== update.latestVersion) {
    chrome.notifications.create(`update-${update.latestVersion}`, {
      type: 'basic',
      iconUrl: chrome.runtime.getURL('images/icon-128.png'),
      title: `GitHub Tweaks v${update.latestVersion} is out`,
      message: `You're on v${currentVersion()}. Click to see what's new.`,
    });
    update.notifiedVersion = update.latestVersion;
  }
  await chrome.storage.local.set({ [UPDATE_KEY]: update });
  await applyBadge(update);
}

async function applyBadge(update) {
  update ??= (await chrome.storage.local.get(UPDATE_KEY))[UPDATE_KEY];
  const newer = update && GH_TWEAKS_IS_NEWER(update.latestVersion, currentVersion());
  await chrome.action.setBadgeText({ text: newer ? '↑' : '' });
  if (newer) {
    await chrome.action.setBadgeBackgroundColor({ color: '#1f883d' });
    await chrome.action.setBadgeTextColor({ color: '#ffffff' });
  }
  await chrome.action.setTitle({ title: newer ? `GitHub Tweaks: v${update.latestVersion} available` : 'GitHub Tweaks' });
}

function scheduleChecks() {
  chrome.alarms.create(CHECK_ALARM, { periodInMinutes: CHECK_EVERY_MINUTES });
  checkForUpdate();
}

chrome.runtime.onInstalled.addListener(({ reason, previousVersion }) => {
  // Reloading an unpacked extension also fires 'update', with the same version, so only a real change counts.
  if (reason === 'install' || (reason === 'update' && previousVersion !== currentVersion())) {
    chrome.tabs.create({ url: chrome.runtime.getURL('changelog.html') });
  }
  // Right away from the last stored release, in case the fresh check fails.
  applyBadge();
  scheduleChecks();
});

chrome.runtime.onStartup.addListener(() => {
  applyBadge();
  scheduleChecks();
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === CHECK_ALARM) checkForUpdate();
});

async function checkIfStale() {
  const update = (await chrome.storage.local.get(UPDATE_KEY))[UPDATE_KEY];
  if (!update?.checkedAt || Date.now() - update.checkedAt > POPUP_CHECK_AFTER_MS) await checkForUpdate();
}

// Returns true when it handled the notification click.
async function openUpdateNotification(id) {
  if (!id.startsWith('update-')) return false;
  chrome.notifications.clear(id);
  const update = (await chrome.storage.local.get(UPDATE_KEY))[UPDATE_KEY];
  chrome.tabs.create({ url: update?.releaseUrl || chrome.runtime.getURL('changelog.html') });
  return true;
}
