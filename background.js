// background.js

let alarmName = 'poll';

// Clear active monitoring state when the extension is installed or Firefox starts
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

// Listen for messages from popup.js
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.action === 'start') {
    // Start the polling alarm
    chrome.alarms.clear(alarmName);
    chrome.alarms.create(alarmName, { periodInMinutes: msg.interval / 60 });
    chrome.browserAction.setBadgeText({ text: 'ON' });
  }
  else if (msg.action === 'stop') {
    // Stop polling
    chrome.alarms.clear(alarmName);
    chrome.browserAction.setBadgeText({ text: '' });
  }
  else if (msg.action === 'getLabels') {
    // Immediately scrape all URLs and return labels
    scrapeAll(msg.urls, labels => {
      sendResponse({ labels });
    });
    return true; // Keep the message channel open for sendResponse
  }
});

// Alarm handler: run on each tick
chrome.alarms.onAlarm.addListener(alarm => {
  if (alarm.name !== alarmName) return;
  chrome.storage.local.get('urls', data => {
    const urls = data.urls || [];
    scrapeAll(urls, labels => {
      // Send new labels to popup
      chrome.runtime.sendMessage({ lastChecked: Date.now(), labels });
    }, /* notifyOnOpen = */ true);
  });
});

/**
 * Scrape each URL by opening it in a hidden tab, extracting session info,
 * then closing the tab. When all are done, call cb(labels).
 * If notifyOnOpen is true, send a desktop notification for any open spot.
 */
function scrapeAll(urls, cb, notifyOnOpen = false) {
  let done = 0;
  const labels = [];
  if (!urls.length) {
    cb(labels);
    return;
  }

  urls.forEach(url => {
    chrome.tabs.create({ url: url, active: false }, tab => {
      // Give the page time to load its content
      setTimeout(() => {
        chrome.tabs.executeScript(tab.id, {
          code: '(' + function() {
            // In-page script:
            var availEl = document.querySelector('.availability, .class-status');
            var availability = availEl ? availEl.textContent.trim() : '';

            var titleEl = document.querySelector('h1');
            var title = titleEl ? titleEl.textContent.trim() : '';

            var dateEl = document.querySelector('.occurrence-date, .occurrenceDate, .date');
            var dateText = dateEl ? dateEl.textContent.trim() : '';

            // Convert "DD/MM/YYYY" to weekday name
            function parseWeekday(s) {
              var m = s.match(/(\d{2})\/(\d{2})\/(\d{4})/);
              if (!m) return 'Unknown';
              var d = new Date(m[3] + '-' + m[2] + '-' + m[1]);
              return d.toLocaleDateString('en-US', { weekday: 'long' });
            }

            var day = parseWeekday(dateText);
            var tmMatch = title.match(/\(([^)]+)\)/);
            var timeMatch = tmMatch ? tmMatch[1] : '';
            var nameOnly = title.split('(')[0].trim();

            return { availability: availability, label: nameOnly + ' - ' + day + ' - (' + timeMatch + ')' };
          } + ')();'
        }, results => {
          done++;
          var info = (results && results[0]) || { availability: '', label: '' };

          if (info.label) {
            labels.push(info.label);
          }

          if (notifyOnOpen && info.availability && !/full/i.test(info.availability)) {
            // Notify the user
            chrome.notifications.create({
              type:    'basic',
              iconUrl: 'icon.png',
              title:   '🏸 Spot Open!',
              message: info.label + '\nStatus: ' + info.availability
            });
          }

          // Close the tab
          chrome.tabs.remove(tab.id);

          // When all URLs have been processed, invoke callback
          if (done === urls.length) {
            cb(labels);
          }
        });
      }, 3000); // delay for loading
    });
  });
}
