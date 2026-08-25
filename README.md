<div align="center">  
    <img src="https://github.com/2boom-ua/linkstatus/blob/main/icons/icon-128.png?raw=true" alt="" width="128" height="128">
</div>

# Link Status

**Link Status** is a lightweight Google Chrome and Microsoft Edge extension that displays the HTTP status code and response time of hyperlinks when hovering over them or clicking the extension icon.

![Version](https://img.shields.io/badge/version-1.0-green.svg)

## Features

* **Instant Hover Tooltip**: Displays target URL, HTTP status code (e.g., `200`, `301`, `404`), and request execution time in milliseconds upon hovering over links.
* **SVG Status Indicators**: Visual status icons dynamically rendered using inline SVG graphics.
* **Dark / Light Mode**: Automatically adapts tooltip and popup styling according to your system theme (`prefers-color-scheme`).
* **Domain Toggle**: Enable or disable status checks for specific domains via the context menu.
* **Popup Inspector**: View status details for the current active tab directly from the extension toolbar icon.
* **Context Menu Integration**: Right-click any link to explicitly inspect its response status.
* **Response Caching**: Caches response metadata locally for 5 minutes to reduce redundant network operations.

### Manual Installation (Developer Mode)
1. Download or clone this repository
2. Open Chrome and go to `chrome://extensions/`
3. Enable **Developer mode** (top right)
4. Click **Load unpacked**
5. Select the extension folder

## Browser Support
Chrome (Manifest V3)
Edge (Chromium-based)

## License
© 2026 2boom. All rights reserved.
