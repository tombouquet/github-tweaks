// The extension's service worker. Shows desktop notifications for the content script
// (pages can't use chrome.notifications) and brings the PR's tab forward when one is
// clicked. Also runs the update check, and opens the changelog after installs and
// version changes.
import type { AppMessage } from '@/lib/messages';
import { CHECK_ALARM, applyBadge, checkForUpdate, checkIfStale, openUpdateNotification, scheduleChecks } from '@/lib/updates';
import { currentVersion } from '@/lib/version';

const TABS_KEY = 'notificationTabs';

type NotificationTabs = Record<string, { tabId: number; windowId: number }>;

const changelogUrl = () => chrome.runtime.getURL('/app.html#/changelog');

async function getNotificationTabs(): Promise<NotificationTabs> {
  return ((await chrome.storage.session.get(TABS_KEY))[TABS_KEY] as NotificationTabs | undefined) ?? {};
}

async function notify(message: Extract<AppMessage, { type: 'notify' }>, tab: chrome.tabs.Tab): Promise<void> {
  const id = `${message.tag}-${Date.now()}`;
  chrome.notifications.create(id, {
    type: 'basic',
    iconUrl: chrome.runtime.getURL('/icon/128.png'),
    title: message.title,
    message: message.message,
    contextMessage: message.context,
  });
  // The worker can be shut down between the notification and the click, so the tab is kept in session storage.
  if (tab.id === undefined) return;
  const tabs = await getNotificationTabs();
  tabs[id] = { tabId: tab.id, windowId: tab.windowId };
  await chrome.storage.session.set({ [TABS_KEY]: tabs });
}

async function onNotificationClicked(id: string): Promise<void> {
  if (await openUpdateNotification(id, changelogUrl())) return;
  const tabs = await getNotificationTabs();
  const target = tabs[id];
  chrome.notifications.clear(id);
  if (!target) return;
  delete tabs[id];
  await chrome.storage.session.set({ [TABS_KEY]: tabs });
  try {
    await chrome.tabs.update(target.tabId, { active: true });
    await chrome.windows.update(target.windowId, { focused: true });
  } catch {
    // The tab was closed since.
  }
}

export default defineBackground(() => {
  chrome.runtime.onMessage.addListener((message: AppMessage, sender) => {
    if (message?.type === 'checkForUpdate') void checkIfStale();
    else if (message?.type === 'notify' && sender.tab) void notify(message, sender.tab);
  });

  chrome.notifications.onClicked.addListener((id) => void onNotificationClicked(id));

  chrome.runtime.onInstalled.addListener(({ reason, previousVersion }) => {
    // Reloading an unpacked extension also fires 'update' with the same version, so only a real change counts.
    if (reason === 'install' || (reason === 'update' && previousVersion !== currentVersion())) {
      void chrome.tabs.create({ url: changelogUrl() });
    }
    // Right away from the last stored release, in case the fresh check fails.
    void applyBadge();
    scheduleChecks();
  });

  chrome.runtime.onStartup.addListener(() => {
    void applyBadge();
    scheduleChecks();
  });

  chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === CHECK_ALARM) void checkForUpdate();
  });
});
