// background.js

const api = (typeof browser !== 'undefined') ? browser : chrome;
const alarmName = 'poll';

let ringAudio = null;

function startRing() {
  try {
    if (!ringAudio) {
      ringAudio = new Audio(api.runtime.getURL('audio.mp3'));
      ringAudio.loop = true;
    }
    ringAudio.currentTime = 0;
    ringAudio.play().catch(() => {});
  } catch (e) {}
}

function stopRing() {
  try {
    if (ringAudio) {
      ringAudio.pause();
      ringAudio.currentTime = 0;
    }
  } catch (e) {}
}


function setOnBadge(isOn) {
  const text = isOn ? 'ON' : '';
  api.browserAction.setBadgeText({ text });
  if (isOn) {
    api.browserAction.setBadgeBackgroundColor({ color: '#d40000' });
  }
}

function syncBadgeFromStorage() {
  api.storage.local.get(['active'], (data) => {
    setOnBadge(!!data.active);
  });
}

function ensureDefaults(cb) {
  api.storage.local.get(['links','labels','active','intervalMinutes','lastOpenByUrl'], (data) => {
    const updates = {};
    if (!Array.isArray(data.links)) updates.links = [];
    if (!data.labels || typeof data.labels !== 'object') updates.labels = {};
    if (typeof data.active !== 'boolean') updates.active = false;
    if (!Number.isInteger(data.intervalMinutes) || data.intervalMinutes < 1) updates.intervalMinutes = 1;
    if (!data.lastOpenByUrl || typeof data.lastOpenByUrl !== 'object') updates.lastOpenByUrl = {};
    if (Object.keys(updates).length) {
      api.storage.local.set(updates, () => cb && cb());
    } else {
      cb && cb();
    }
  });
}

function createOrUpdateAlarm() {
  api.storage.local.get(['active','intervalMinutes'], (data) => {
    if (!data.active) return;
    const minutes = Math.max(1, parseInt(data.intervalMinutes || 1, 10));
    api.alarms.create(alarmName, { periodInMinutes: minutes });
  });
}

api.runtime.onInstalled.addListener(() => {
  ensureDefaults(() => {
    api.alarms.clear(alarmName);
    syncBadgeFromStorage();
  });
});
api.runtime.onStartup.addListener(() => {
  ensureDefaults(() => {
    api.alarms.clear(alarmName, () => createOrUpdateAlarm());
    syncBadgeFromStorage();
  });
});
api.runtime.onMessage.addListener((msg) => {
  if (!msg || !msg.type) return;
  if (msg.type === 'start') {
    createOrUpdateAlarm();
    setOnBadge(true);
    checkLinks();
  }
  if (msg.type === 'stop') {
    api.alarms.clear(alarmName);
    setOnBadge(false);
    stopRing();
  }
});

api.alarms.onAlarm.addListener((alarm) => {
  if (alarm && alarm.name === alarmName) {
    pollAll();
  }
});

async function pollAll() {
  ensureDefaults(() => {
    api.storage.local.get(['links'], async (data) => {
      const links = data.links || [];
      if (!links.length) {
        api.storage.local.set({ lastChecked: Date.now() });
        return;
      }

      for (const url of links) {
        try {
          await checkOne(url);
        } catch (e) {
          // swallow per-url errors
        }
      }

      api.storage.local.set({ lastChecked: Date.now() });
    });
  });
}

function executeInTab(tabId, code) {
  return new Promise((resolve, reject) => {
    api.tabs.executeScript(tabId, { code }, (res) => {
      const err = api.runtime.lastError;
      if (err) return reject(err);
      resolve(res && res[0]);
    });
  });
}

function waitForTabComplete(tabId, timeoutMs = 25000) {
  return new Promise((resolve, reject) => {
    const start = Date.now();

    function onUpdated(updatedTabId, info) {
      if (updatedTabId !== tabId) return;
      if (info.status === 'complete') {
        api.tabs.onUpdated.removeListener(onUpdated);
        resolve();
      }
    }

    api.tabs.onUpdated.addListener(onUpdated);

    const timer = setInterval(() => {
      if (Date.now() - start > timeoutMs) {
        clearInterval(timer);
        api.tabs.onUpdated.removeListener(onUpdated);
        reject(new Error('tab load timeout'));
      }
    }, 500);
  });
}

async function checkOne(url) {
  const tab = await new Promise((resolve, reject) => {
    api.tabs.create({ url, active: false }, (t) => {
      const err = api.runtime.lastError;
      if (err) return reject(err);
      resolve(t);
    });
  });

  try {
    await waitForTabComplete(tab.id);

    const scrapeFn = function () {
      function waitFor(selector, timeout) {
        timeout = timeout || 15000;
        return new Promise((resolve, reject) => {
          const start = Date.now();
          const timer = setInterval(() => {
            const el = document.querySelector(selector);
            if (el) {
              clearInterval(timer);
              resolve(el);
            }
            if (Date.now() - start > timeout) {
              clearInterval(timer);
              reject('timeout');
            }
          }, 250);
        });
      }

      function parseDdMmYyyy(s) {
        if (!s) return null;
        const parts = s.split('/');
        if (parts.length !== 3) return null;
        const dd = parts[0], mm = parts[1], yyyy = parts[2];
        const d = new Date(`${yyyy}-${mm}-${dd}`);
        if (isNaN(d.getTime())) return null;
        return d;
      }

      return (async () => {
        try {
          await waitFor('h1.bm-course-primary-event-name', 15000);
        } catch (e) {
          // continue with fallbacks
        }

        const titleEl = document.querySelector('h1.bm-course-primary-event-name') ||
                        document.querySelector('h1.bm-event-name-h1') ||
                        document.querySelector('h1');

        const dateEl = document.querySelector('span[aria-label^="Event date"]');

        const title = (titleEl && titleEl.textContent || '').trim() || 'Unknown';
        const dateStr = (dateEl && dateEl.textContent || '').trim() || '';
        const d = parseDdMmYyyy(dateStr);
        const weekday = d ? d.toLocaleDateString('en-CA', { weekday: 'long' }) : 'Unknown';

        const bodyText = (document.body && document.body.innerText || '');

        /*
          Preferred signal: "1 spot(s) left" on PerfectMind pages.
          Fallbacks: "Full", "Waitlist", and presence of purchase/registration actions.
        */
        let spotsLeft = null;
        const spotMatch = bodyText.match(/(\d+)\s*spot\(s\)\s*left/i);
        if (spotMatch) {
          spotsLeft = parseInt(spotMatch[1], 10);
        }

        const lower = bodyText.toLowerCase();

        let availability = 'Unknown';
        if (Number.isInteger(spotsLeft)) {
          availability = `Spots:${spotsLeft}`;
        } else if (lower.includes('full')) {
          availability = 'Full';
        } else if (lower.includes('waitlist')) {
          availability = 'Waitlist';
        } else if (lower.includes('add to cart') || lower.includes('register') || lower.includes('add to basket')) {
          availability = 'Open';
        }

        return { title, dateStr, weekday, availability, spotsLeft };
      })();
    };

    const result = await executeInTab(tab.id, `(${scrapeFn.toString()})()`);

    await new Promise((resolve) => api.tabs.remove(tab.id, () => resolve()));

    const label = `${result.title} - ${result.weekday} (${result.dateStr || 'Unknown date'})`;
    const isOpen = Number.isInteger(result.spotsLeft) ? (result.spotsLeft > 0) : (result.availability === 'Open');

    await new Promise((resolve) => {
      api.storage.local.get(['labels','lastOpenByUrl'], (data) => {
        const labels = data.labels || {};
        const lastOpenByUrl = data.lastOpenByUrl || {};

        labels[url] = label;

        const wasOpen = !!lastOpenByUrl[url];
        lastOpenByUrl[url] = isOpen;

        api.storage.local.set({ labels, lastOpenByUrl }, () => {
          if (isOpen && !wasOpen) {
            api.notifications.create({
              type: 'basic',
              iconUrl: 'icon.png',
              title: 'Spots available',
              message: Number.isInteger(result.spotsLeft) ? `${label} | ${result.spotsLeft} spot(s) left` : label
            });
              startRing();
          }
          resolve();
        });
      });
    });

  } catch (e) {
    try { api.tabs.remove(tab.id); } catch (_) {}
  }
}


api.notifications.onClicked.addListener(() => {
  stopRing();
});
