let alarmName = 'poll';

// Start/stop messages from popup.js
chrome.runtime.onMessage.addListener(function(message) {
  if (message.action === 'start') {
    chrome.alarms.clear(alarmName);
    chrome.alarms.create(alarmName, { periodInMinutes: message.interval / 60 });
  } else if (message.action === 'stop') {
    chrome.alarms.clear(alarmName);
  }
});

// On each alarm tick, query the active tab for availability text
chrome.alarms.onAlarm.addListener(function(alarm) {
  if (alarm.name !== alarmName) return;

  chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
    if (!tabs[0]) return;

    checkAvailabilityOnTab(tabs[0].id, function(status) {
      // Update the popup UI
      chrome.runtime.sendMessage({ lastChecked: Date.now() });

      // If not “Full”, notify + stop
      if (!/full/i.test(status)) {
        chrome.notifications.create({
          type: 'basic',
          iconUrl: 'icon.png',
          title: '🥳 Spot Open!',
          message: `Status: ${status}`
        });
        chrome.alarms.clear(alarmName);
      }
    });
  });
});

// Helper that runs code in the page to grab the availability text
function checkAvailabilityOnTab(tabId, callback) {
  chrome.tabs.executeScript(tabId, {
    code: `
      (() => {
        const el = document.querySelector('.availability, .class-status');
        return el ? el.textContent.trim() : '';
      })();
    `
  }, function(results) {
    callback(results && results[0] ? results[0] : '');
  });
}
