// Link Status - Chrome/Edge extension
// Copyright 2boom, 2026

console.log("Content script loaded");

let hoverTimer = null;
let currentTooltip = null;
const cache = new Map();
const CACHE_TTL = 5 * 60 * 1000;
let isEnabledForDomain = false;

function getDomain(url) {
  try {
    return new URL(url).hostname;
  } catch (e) {
    return "";
  }
}

function checkIsEnabled(domain) {
  return new Promise((resolve) => {
    if (!domain) return resolve(false);
    try {
      if (chrome.storage && chrome.storage.local) {
        chrome.storage.local.get(["enabledDomains"], (result) => {
          const domains = result.enabledDomains || {};
          isEnabledForDomain = domains[domain] !== undefined ? domains[domain] : false;
          resolve(isEnabledForDomain);
        });
      } else {
        resolve(false);
      }
    } catch (e) {
      resolve(false);
    }
  });
}

function getCached(url) {
  const entry = cache.get(url);
  if (entry && Date.now() - entry.timestamp < CACHE_TTL) return entry.data;
  return null;
}

function setCache(url, data) {
  cache.set(url, { data: data, timestamp: Date.now() });
}

function getStatusIconUrl(status) {
  try {
    if (chrome.runtime && chrome.runtime.id) {
      if (status >= 200 && status < 300) {
        return chrome.runtime.getURL("/icons/status-200.svg");
      } else if (status >= 300 && status < 400) {
        return chrome.runtime.getURL("/icons/status-300.svg");
      } else if (status >= 400 && status < 600) {
        return chrome.runtime.getURL("/icons/status-400.svg");
      }
    }
  } catch (e) {}
  return "";
}

function showTooltip(x, y, result) {
  removeTooltip();

  const isDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  const bg = isDark ? "#0d1117" : "#f9fbfe";
  const textClr = isDark ? "#f5f5f5" : "#1a1a1a";
  const shadow = isDark ? "rgba(0,0,0,0.6)" : "rgba(0,0,0,0.2)";

  const statusColor = result.status >= 200 && result.status < 300 ? "#4CAF50" :
                      result.status >= 300 && result.status < 400 ? "#FF9800" :
                      result.status >= 400 && result.status < 600 ? "#f44336" : "#9E9E9E";

  const iconUrl = getStatusIconUrl(result.status);

  const tooltip = document.createElement("div");
  tooltip.id = "link-status-tooltip";
  tooltip.style.cssText = `
    position: fixed;
    background: ${bg};
    color: ${textClr};
    padding: 8px 6px 8px 12px;
    border-radius: 4px;
    font-family: Arial, sans-serif;
    font-size: 13px;
    z-index: 999999;
    max-width: 200px;
    overflow: hidden;
    box-shadow: 0 4px 12px ${shadow};
    pointer-events: none;
    border-left: 4px solid ${statusColor};
    line-height: 1.4;
  `;

  const urlDisplay = result.finalUrl.length > 50 ? result.finalUrl.substring(0, 50) + "..." : result.finalUrl;

  tooltip.innerHTML = `
    <div style="word-break: break-all; margin-bottom: 4px; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; max-width: 176px; padding-right: 4px;">${urlDisplay}</div>
    <div style="display: flex; align-items: center; gap: 6px;">
      <span style="display: inline-flex; align-items: center; width:16px; height:16px; flex-shrink:0; background-image: url('${iconUrl}'); background-size: contain; background-repeat: no-repeat; background-position: center;"></span>
      <span style="font-weight: 400;">
        ${result.status} ${result.time > 0 ? `— ${result.time} ms` : ""}
      </span>
    </div>
  `;

  document.body.appendChild(tooltip);

  const tooltipRect = tooltip.getBoundingClientRect();
  const tooltipWidth = tooltipRect.width;
  const tooltipHeight = tooltipRect.height;
  const winWidth = window.innerWidth;
  const winHeight = window.innerHeight;

  let left = x + 10;
  let top = y + 10;

  if (left + tooltipWidth > winWidth) {
    left = x - tooltipWidth - 10;
  }
  if (top + tooltipHeight > winHeight) {
    top = y - tooltipHeight - 10;
  }
  if (left < 10) left = 10;
  if (top < 10) top = 10;

  tooltip.style.left = left + "px";
  tooltip.style.top = top + "px";

  currentTooltip = tooltip;
}

function removeTooltip() {
  if (currentTooltip) {
    currentTooltip.remove();
    currentTooltip = null;
  }
}

function cleanup() {
  clearTimeout(hoverTimer);
  removeTooltip();
}

function safeSendMessage(message, callback) {
  try {
    if (chrome.runtime && chrome.runtime.id) {
      chrome.runtime.sendMessage(message, callback);
    } else {
      if (callback) callback(null);
    }
  } catch (e) {
    if (callback) callback(null);
  }
}

if (!window.linkStatusInitialized) {
  window.linkStatusInitialized = true;

  const currentDomain = getDomain(window.location.href);
  if (currentDomain) checkIsEnabled(currentDomain);

  document.addEventListener("mouseover", (event) => {
    const link = event.target.closest("a");
    if (!link || !link.href || !isEnabledForDomain) {
      clearTimeout(hoverTimer);
      removeTooltip();
      return;
    }
    clearTimeout(hoverTimer);
    hoverTimer = setTimeout(() => {
      const url = link.href;
      try {
        const urlObj = new URL(url);
        if (urlObj.protocol === 'chrome:' || urlObj.protocol === 'edge:' || urlObj.protocol === 'about:' || urlObj.protocol === 'chrome-extension:') {
          return;
        }
      } catch (e) {
        return;
      }
      const cached = getCached(url);
      if (cached) {
        showTooltip(event.clientX, event.clientY, cached);
        return;
      }
      safeSendMessage({ type: "fetchLink", url: url }, (response) => {
        if (!response) return;
        setCache(url, response);
        showTooltip(event.clientX, event.clientY, response);
      });
    }, 400);
  });

  document.addEventListener("mouseout", (event) => {
    const link = event.target.closest("a");
    if (link) {
      clearTimeout(hoverTimer);
      setTimeout(removeTooltip, 200);
    }
  });

  try {
    if (chrome.runtime && chrome.runtime.id) {
      chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        if (message.type === "checkLink") {
          const url = message.url;
          try {
            const urlObj = new URL(url);
            if (urlObj.protocol === 'chrome:' || urlObj.protocol === 'edge:' || urlObj.protocol === 'about:' || urlObj.protocol === 'chrome-extension:') {
              sendResponse({ success: false });
              return;
            }
          } catch (e) {
            sendResponse({ success: false });
            return;
          }
          const cached = getCached(url);
          if (cached) {
            showTooltip(10, 10, cached);
            sendResponse({ success: true });
            return;
          }
          safeSendMessage({ type: "fetchLink", url: url }, (response) => {
            if (!response) {
              sendResponse({ success: false });
              return;
            }
            setCache(url, response);
            showTooltip(10, 10, response);
            sendResponse({ success: true });
          });
          return true;
        }
        if (message.type === "domainToggled") {
          isEnabledForDomain = message.enabled;
          if (!message.enabled) removeTooltip();
          sendResponse({ success: true });
        }
      });
    }
  } catch (e) {}

  window.addEventListener("beforeunload", cleanup);
}