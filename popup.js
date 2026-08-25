// Link Status - Chrome/Edge extension
// Copyright 2boom, 2026

(function() {
  function getStatusIconUrl(status) {
    if (status >= 200 && status < 300) {
      return chrome.runtime.getURL("/icons/status-200.svg");
    } else if (status >= 300 && status < 400) {
      return chrome.runtime.getURL("/icons/status-300.svg");
    } else if (status >= 400 && status < 600) {
      return chrome.runtime.getURL("/icons/status-400.svg");
    }
    return "";
  }

  function updateIconAndTheme(status) {
    const icon = document.getElementById("statusIcon");
    const body = document.body;

    body.className = "";

    const iconUrl = getStatusIconUrl(status);

    if (iconUrl) {
      icon.style.backgroundImage = `url('${iconUrl}')`;
      icon.style.backgroundSize = "contain";
      icon.style.backgroundRepeat = "no-repeat";
      icon.style.backgroundPosition = "center";
      icon.style.width = "16px";
      icon.style.height = "16px";
      icon.style.display = "inline-block";
      icon.innerHTML = "";
    } else {
      icon.style.backgroundImage = "";
      icon.style.width = "";
      icon.style.height = "";
      icon.style.display = "";
      icon.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#9E9E9E" style="width:16px; height:16px; display:block;"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>`;
    }

    if (status >= 200 && status < 300) {
      body.classList.add("border-200");
    } else if (status >= 300 && status < 400) {
      body.classList.add("border-300");
    } else if (status >= 400 && status < 600) {
      body.classList.add("border-400");
    } else {
      body.classList.add("border-default");
    }
  }

  function render(domain, statusResult) {
    const urlEl = document.getElementById("urlDisplay");
    const statusInfoEl = document.getElementById("statusInfo");

    urlEl.textContent = domain || "—";

    if (statusResult && statusResult.status) {
      updateIconAndTheme(statusResult.status);
      statusInfoEl.innerHTML = `<span class="code">${statusResult.status}</span><span class="separator">—</span><span class="time">${statusResult.time || 0} ms</span>`;
    } else {
      updateIconAndTheme(null);
      statusInfoEl.textContent = "Ready";
    }
  }

  document.addEventListener("DOMContentLoaded", () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (!tabs || !tabs[0] || !tabs[0].url) {
        render(null, null);
        return;
      }

      const rawUrl = tabs[0].url;
      if (rawUrl.startsWith("chrome://") || rawUrl.startsWith("edge://") || rawUrl.startsWith("about:")) {
        render("System Page", null);
        return;
      }

      try {
        const urlObj = new URL(rawUrl);
        const domain = urlObj.hostname;

        chrome.storage.local.get(["enabledDomains"], (res) => {
          const domains = res.enabledDomains || {};
          const isEnabled = domains[domain] !== undefined ? domains[domain] : true;

          if (!isEnabled) {
            render(domain, null);
            return;
          }

          chrome.runtime.sendMessage({ type: "fetchLink", url: rawUrl }, (response) => {
            if (chrome.runtime.lastError || !response) {
              render(domain, null);
            } else {
              render(domain, response);
            }
          });
        });
      } catch (e) {
        render(null, null);
      }
    });
  });
})();