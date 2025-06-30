// background.js

let alarmName = 'poll';

// Reset monitoring state on install or startup
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.set({ active: false });
  chrome.alarms.clear(alarmName);
  chrome.browserAction.setBadgeText({ text: '' });
});
chrome.runtime.onStartup.addListener(() => {
  chrome.storage.local.set({ active: false });
  chrome.alarms.clear(alarmName);
  chrome.browserAction.setBadgeText({ text: '' });
});

// Handle messages from popup.js
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.action === 'start') {
    chrome.alarms.clear(alarmName);
    chrome.alarms.create(alarmName, { periodInMinutes: msg.interval / 60 });
    chrome.browserAction.setBadgeText({ text: 'ON' });
  }
  else if (msg.action === 'stop') {
    chrome.alarms.clear(alarmName);
    chrome.browserAction.setBadgeText({ text: '' });
  }
  else if (msg.action === 'getLabels') {
    scrapeAll(msg.urls, labels => sendResponse({ labels }));
    return true;  // keep message channel open
  }
});

// On each alarm, re-scrape and notify popup + on-open
chrome.alarms.onAlarm.addListener(alarm => {
  if (alarm.name !== alarmName) return;
  chrome.storage.local.get('urls', ({ urls = [] }) => {
    scrapeAll(urls, labels => {
      chrome.runtime.sendMessage({ lastChecked: Date.now(), labels });
    }, true);
  });
});

/**
 * Opens each URL in a hidden tab, scrapes the page for:
 *  • Title via <h1 class="bm-course-primary-event-name">
 *  • Date via <span aria-label^="Event date">
 *  • Time via <span aria-label^="Event time">
 *  • Availability via <label class="spots"><span>…</span>
 * Converts the date to weekday, builds "Title – Weekday – (Time)" labels,
 * optionally notifies, then closes the tab.
 */
function scrapeAll(urls, cb, notifyOnOpen = false) {
  let done = 0;
  const labels = [];

  if (!urls.length) {
    cb(labels);
    return;
  }

  urls.forEach(url => {
    chrome.tabs.create({ url, active: false }, tab => {
      // wait for the page to load
      setTimeout(() => {
        chrome.tabs.executeScript(tab.id, {
          code: '(' + function() {
            // 1) Title
            const h1 = document.querySelector('h1.bm-course-primary-event-name');
            const title = h1 ? h1.textContent.trim() : '';

            // 2) Date string (DD/MM/YYYY)
            const dateSpan = document.querySelector('span[aria-label^="Event date"]');
            const dateStr = dateSpan ? dateSpan.textContent.trim() : '';

            // 3) Time string
            const timeSpan = document.querySelector('span[aria-label^="Event time"]');
            const timeStr = timeSpan ? timeSpan.textContent.trim() : '';

            // 4) Availability
            const spotSpan = document.querySelector('label.spots span');
            const availability = spotSpan ? spotSpan.textContent.trim() : '';

            // Convert DD/MM/YYYY to weekday name
            function toWeekday(s) {
              const m = s.match(/(\d{2})\/(\d{2})\/(\d{4})/);
              if (!m) return 'Unknown';
              const d = new Date(`${m[3]}-${m[2]}-${m[1]}`);
              return d.toLocaleDateString('en-US', { weekday: 'long' });
            }

            const weekday = toWeekday(dateStr);
            const nameOnly = title.split('(')[0].trim();
            const label = `${nameOnly} - ${weekday} - (${timeStr})`;

            return { availability, label };
          } + ')();'
        }, results => {
          done++;
          const info = (results && results[0]) || { availability:'', label:'' };
          if (info.label) {
            labels.push(info.label);
          }
          if (notifyOnOpen && info.availability && !/full/i.test(info.availability)) {
            chrome.notifications.create({
              type: 'basic',
              iconUrl: 'icon.png',
              title: '🏸 Spot Open!',
              message: `${info.label}\nStatus: ${info.availability}`
            });
          }
          chrome.tabs.remove(tab.id);
          if (done === urls.length) {
            cb(labels);
          }
        });
      }, 3000);
    });
  });
}
