// Link Status - Chrome/Edge extension
// Copyright 2boom, 2026

console.log("Background script loaded");

function createContextMenus() {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: "checkLink",
      title: "Check this link",
      contexts: ["link"]
    });
    chrome.contextMenus.create({
      id: "toggleDomain",
      title: "Enable on this domain",
      contexts: ["page"]
    });
  });
}

function updateToggleMenuTitle(tabId) {
  chrome.tabs.get(tabId, (tab) => {
    if (chrome.runtime.lastError || !tab || !tab.url) return;
    try {
      const domain = new URL(tab.url).hostname;
      chrome.storage.local.get(["enabledDomains"], (result) => {
        const domains = result.enabledDomains || {};
        const isEnabled = domains[domain] !== undefined ? domains[domain] : false;
        const title = isEnabled ? "Disable on this domain" : "Enable on this domain";
        chrome.contextMenus.update("toggleDomain", { title: title });
      });
    } catch (e) {}
  });
}

chrome.runtime.onInstalled.addListener(createContextMenus);
chrome.runtime.onStartup.addListener(createContextMenus);

chrome.tabs.onActivated.addListener((activeInfo) => updateToggleMenuTitle(activeInfo.tabId));
chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (changeInfo.status === "complete") updateToggleMenuTitle(tabId);
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "checkLink") {
    chrome.tabs.sendMessage(tab.id, { type: "checkLink", url: info.linkUrl }, () => {
      if (chrome.runtime.lastError) {
        // Tab is closed or not available
        return;
      }
    });
  }
  if (info.menuItemId === "toggleDomain") {
    try {
      const domain = new URL(tab.url).hostname;
      chrome.storage.local.get(["enabledDomains"], (result) => {
        const domains = result.enabledDomains || {};
        const currentStatus = domains[domain] !== undefined ? domains[domain] : false;
        domains[domain] = !currentStatus;
        chrome.storage.local.set({ enabledDomains: domains }, () => {
          updateToggleMenuTitle(tab.id);
          chrome.tabs.sendMessage(tab.id, {
            type: "domainToggled",
            domain: domain,
            enabled: domains[domain]
          }, () => {
            if (chrome.runtime.lastError) {
              // Tab is closed or not available
              return;
            }
          });
        });
      });
    } catch (e) {}
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "fetchLink") {
    const startTime = Date.now();
    try {
      const urlObj = new URL(message.url);
      if (urlObj.protocol === 'chrome:' || urlObj.protocol === 'edge:' || urlObj.protocol === 'about:' || urlObj.protocol === 'chrome-extension:' || urlObj.hostname === 'chromewebstore.google.com') {
        sendResponse({
          status: 0,
          statusText: 'Cannot check this URL',
          finalUrl: message.url,
          time: 0
        });
        return true;
      }
    } catch (e) {
      sendResponse({
        status: 0,
        statusText: 'Invalid URL',
        finalUrl: message.url,
        time: 0
      });
      return true;
    }
    fetch(message.url, { method: "HEAD" })
      .then(response => {
        sendResponse({
          status: response.status,
          statusText: response.statusText,
          finalUrl: response.url,
          time: Date.now() - startTime
        });
      })
      .catch(error => {
        sendResponse({
          status: 0,
          statusText: error.message,
          finalUrl: message.url,
          time: 0
        });
      });
    return true;
  }
});