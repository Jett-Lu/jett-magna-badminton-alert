const startBtn      = document.getElementById('start');
const stopBtn       = document.getElementById('stop');
const intervalInput = document.getElementById('interval');
const linkInput     = document.getElementById('linkInput');
const addBtn        = document.getElementById('add');
const removeAllBtn  = document.getElementById('removeAll');
const monitorCount  = document.getElementById('monitorCount');
const monitorList   = document.getElementById('monitorList');
const statusEl      = document.getElementById('status');
const lastCheckedEl = document.getElementById('lastChecked');
const errorEl       = document.getElementById('error');

function showError(msg) {
  errorEl.textContent = msg;
  errorEl.style.display = 'block';
  setTimeout(() => {
    errorEl.style.display = 'none';
  }, 3000);
}

function renderList(labels) {
  monitorCount.textContent = `Now monitoring (${labels.length}/4):`;
  monitorList.innerHTML = '';
  labels.forEach((lbl, i) => {
    const li = document.createElement('li');
    const span = document.createElement('span');
    span.textContent = lbl;
    const btn = document.createElement('button');
    btn.textContent = '✕';
    btn.addEventListener('click', () => removeUrl(i));
    li.appendChild(span);
    li.appendChild(btn);
    monitorList.appendChild(li);
  });
}

function refreshLabels(callback) {
  chrome.storage.local.get('urls', ({ urls = [] }) => {
    if (!urls.length) {
      renderList([]);
      return;
    }
    chrome.runtime.sendMessage(
      { action: 'getLabels', urls },
      response => {
        renderList(response.labels || []);
        if (typeof callback === 'function') callback();
      }
    );
  });
}

function updateUI() {
  chrome.storage.local.get(['urls', 'active', 'interval'], ({ urls = [], active, interval }) => {
    intervalInput.value = interval || 60;
    startBtn.disabled = active;
    stopBtn.disabled = !active;
    statusEl.textContent = active ? 'Monitoring...' : 'Not monitoring';
    lastCheckedEl.textContent = '';
    refreshLabels();
  });
}

function addUrl() {
  const url = linkInput.value.trim();
  if (!url) return;
  chrome.storage.local.get('urls', ({ urls = [] }) => {
    if (urls.length >= 4) {
      showError('Limit is 4 links.');
      return;
    }
    if (urls.includes(url)) {
      showError('Already monitored.');
      return;
    }
    urls.push(url);
    chrome.storage.local.set({ urls }, () => {
      linkInput.value = '';
      refreshLabels();
    });
  });
}

function removeUrl(index) {
  chrome.storage.local.get('urls', ({ urls = [] }) => {
    urls.splice(index, 1);
    chrome.storage.local.set({ urls }, () => {
      refreshLabels();
    });
  });
}

function removeAll() {
  chrome.storage.local.set({ urls: [] }, () => {
    refreshLabels();
  });
}

addBtn.addEventListener('click', addUrl);
removeAllBtn.addEventListener('click', removeAll);

startBtn.addEventListener('click', () => {
  const interval = parseInt(intervalInput.value, 10);
  if (isNaN(interval) || interval < 10) {
    showError('Interval must be at least 10 seconds.');
    return;
  }
  chrome.storage.local.set({ active: true, interval }, () => {
    chrome.runtime.sendMessage({ action: 'start', interval });
    updateUI();
  });
});

stopBtn.addEventListener('click', () => {
  chrome.storage.local.set({ active: false }, () => {
    chrome.runtime.sendMessage({ action: 'stop' });
    updateUI();
  });
});

chrome.runtime.onMessage.addListener(msg => {
  if (msg.lastChecked) {
    lastCheckedEl.textContent = `Last checked: ${new Date(msg.lastChecked).toLocaleTimeString()}`;
  }
});

document.addEventListener('DOMContentLoaded', updateUI);
