const startBtn      = document.getElementById('start');
const stopBtn       = document.getElementById('stop');
const removeAllBtn  = document.getElementById('removeAll');
const intervalInput = document.getElementById('interval');
const linkInput     = document.getElementById('linkInput');
const addBtn        = document.getElementById('add');
const monitorCount  = document.getElementById('monitorCount');
const monitorList   = document.getElementById('monitorList');
const statusEl      = document.getElementById('status');
const lastCheckedEl = document.getElementById('lastChecked');
const errorEl       = document.getElementById('error');

function showError(msg) {
  errorEl.textContent = msg;
  errorEl.style.display = 'block';
  setTimeout(() => { errorEl.style.display = 'none'; }, 3000);
}

function renderList(urls) {
  monitorCount.textContent = `Now monitoring (${urls.length}/4):`;
  monitorList.innerHTML = '';
  urls.forEach((url, i) => {
    const li = document.createElement('li');
    const span = document.createElement('span');
    span.textContent = url;
    const btn = document.createElement('button');
    btn.textContent = '✕';
    btn.addEventListener('click', () => removeUrl(i));
    li.appendChild(span);
    li.appendChild(btn);
    monitorList.appendChild(li);
  });
}

function updateUI() {
  chrome.storage.local.get(['urls','active','interval'], ({ urls = [], active, interval }) => {
    renderList(urls);
    intervalInput.value = interval || 60;
    startBtn.disabled = active;
    stopBtn.disabled  = !active;
    statusEl.textContent = active ? 'Monitoring...' : 'Not monitoring';
    lastCheckedEl.textContent = '';
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
      showError('Already monitoring this link.');
      return;
    }
    urls.push(url);
    chrome.storage.local.set({ urls }, () => {
      linkInput.value = '';
      renderList(urls);
    });
  });
}

function removeUrl(index) {
  chrome.storage.local.get('urls', ({ urls = [] }) => {
    urls.splice(index,1);
    chrome.storage.local.set({ urls }, () => renderList(urls));
  });
}

function removeAll() {
  chrome.storage.local.set({ urls: [] }, () => renderList([]));
}

addBtn.addEventListener('click', addUrl);
removeAllBtn.addEventListener('click', removeAll);

startBtn.addEventListener('click', () => {
  const interval = parseInt(intervalInput.value, 10);
  if (isNaN(interval) || interval < 10) {
    showError('Enter interval ≥10s');
    return;
  }
  chrome.storage.local.set({ active:true, interval }, () => {
    chrome.runtime.sendMessage({ action:'start', interval });
    updateUI();
  });
});

stopBtn.addEventListener('click', () => {
  chrome.storage.local.set({ active:false }, () => {
    chrome.runtime.sendMessage({ action:'stop' });
    updateUI();
  });
});

chrome.runtime.onMessage.addListener(msg => {
  if (msg.lastChecked) {
    lastCheckedEl.textContent = `Last checked: ${new Date(msg.lastChecked).toLocaleTimeString()}`;
  }
});

document.addEventListener('DOMContentLoaded', updateUI);
