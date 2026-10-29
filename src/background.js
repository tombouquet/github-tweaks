// Shows desktop notifications for the content scripts (pages can't use
// chrome.notifications), and brings the PR's tab forward when one is clicked.
// Update checks and the changelog-on-update live in updates.js.
importScripts('version.js', 'updates.js');

const TABS_KEY = 'notificationTabs';

chrome.runtime.onMessage.addListener((message, sender) => {
  if (message?.type === 'checkForUpdate') {
    checkIfStale();
    return;
  }
  if (message?.type !== 'notify' || !sender.tab) return;
  const id = `${message.tag}-${Date.now()}`;
  chrome.notifications.create(id, {
    type: 'basic',
    iconUrl: chrome.runtime.getURL('images/icon-128.png'),
    title: message.title,
    message: message.message,
    contextMessage: message.context,
  });
  // The worker can be shut down between the notification and the click, so the tab is kept in session storage.
  chrome.storage.session.get({ [TABS_KEY]: {} }).then((stored) => {
    stored[TABS_KEY][id] = { tabId: sender.tab.id, windowId: sender.tab.windowId };
    chrome.storage.session.set(stored);
  });
});

chrome.notifications.onClicked.addListener(async (id) => {
  if (await openUpdateNotification(id)) return;
  const stored = await chrome.storage.session.get({ [TABS_KEY]: {} });
  const target = stored[TABS_KEY][id];
  chrome.notifications.clear(id);
  if (!target) return;
  delete stored[TABS_KEY][id];
  chrome.storage.session.set(stored);
  try {
    await chrome.tabs.update(target.tabId, { active: true });
    await chrome.windows.update(target.windowId, { focused: true });
  } catch {
    // The tab was closed since.
  }
});
