let alarmName = 'poll';

chrome.runtime.onMessage.addListener(({ action, interval }) => {
  if (action === 'start') {
    chrome.alarms.clear(alarmName);
    chrome.alarms.create(alarmName, { periodInMinutes: interval / 60 });
  } else if (action === 'stop') {
    chrome.alarms.clear(alarmName);
  }
});

chrome.alarms.onAlarm.addListener(() => {
  chrome.storage.local.get(['urls'], ({ urls }) => {
    if (!urls || !urls.length) return;
    let labels = [];

    urls.forEach((url) => {
      chrome.tabs.create({ url, active: false }, (tab) => {
        setTimeout(() => {
          chrome.tabs.executeScript(tab.id, {
            code: `
              (() => {
                const availability = document.querySelector('.availability, .class-status')?.textContent.trim();
                const title = document.querySelector('h1')?.textContent.trim();
                const dateText = document.querySelector('.occurrence-date, .occurrenceDate, .date')?.textContent.trim();

                function parseDateToWeekday(dateStr) {
                  const parts = dateStr?.match(/(\\d{2})\\/(\\d{2})\\/(\\d{4})/);
                  if (!parts) return null;
                  const [_, day, month, year] = parts;
                  const date = new Date(\`\${year}-\${month}-\${day}\`);
                  return date.toLocaleDateString('en-US', { weekday: 'long' });
                }

                const dayOfWeek = parseDateToWeekday(dateText);
                const timeMatch = title?.match(/\\(([^)]+)\\)/)?.[1] || '';
                return {
                  availability: availability || '',
                  label: \`\${title?.split('(')[0].trim() || 'Unknown'} - \${dayOfWeek || 'Unknown'} - (\${timeMatch})\`
                };
              })();
            `
          }, (results) => {
            const { availability, label } = results?.[0] || {};
            labels.push(label);
            chrome.runtime.sendMessage({ lastChecked: Date.now(), labels });

            if (availability && !/full/i.test(availability)) {
              chrome.notifications.create({
                type: 'basic',
                iconUrl: 'icon.png',
                title: '🏸 Spot Open!',
                message: `${label}\nStatus: ${availability}`
              });
            }
            chrome.tabs.remove(tab.id);
          });
        }, 3000); // wait for page to load
      });
    });
  });
});