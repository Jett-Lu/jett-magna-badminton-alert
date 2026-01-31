const startBtn      = document.getElementById('start');
const stopBtn       = document.getElementById('stop');
const intervalInput = document.getElementById('interval');
const linkInput     = document.getElementById('linkInput');
const addBtn        = document.getElementById('add');
const removeAllBtn  = document.getElementById('removeAll');
const monitorCount  = document.getElementById('monitorCount');
const linksDiv      = document.getElementById('links');
const statusP       = document.getElementById('status');
const lastCheckedP  = document.getElementById('lastChecked');

const api = (typeof browser !== 'undefined') ? browser : chrome;

function renderState(state) {
  const links = state.links || [];
  const labels = state.labels || {};
  const active = !!state.active;
  const lastChecked = state.lastChecked ? new Date(state.lastChecked).toLocaleString() : 'Never';

  monitorCount.textContent = `Now monitoring (${links.length}/4):`;
  linksDiv.innerHTML = '';

  links.forEach(url => {
    const row = document.createElement('div');
    const label = labels[url] || 'Unknown';

    row.style.display = 'flex';
    row.style.justifyContent = 'space-between';
    row.style.alignItems = 'center';
    row.style.gap = '8px';
    row.style.margin = '4px 0';

    const text = document.createElement('div');
    text.textContent = label;
    text.style.flex = '1';
    text.style.fontSize = '12px';
    text.style.whiteSpace = 'nowrap';
    text.style.overflow = 'hidden';
    text.style.textOverflow = 'ellipsis';
    text.title = url;

    const removeBtn = document.createElement('button');
    removeBtn.textContent = 'Remove';
    removeBtn.style.flex = '0 0 auto';
    removeBtn.addEventListener('click', () => removeLink(url));

    row.appendChild(text);
    row.appendChild(removeBtn);
    linksDiv.appendChild(row);
  });

  statusP.textContent = `Monitoring: ${active ? 'ON' : 'OFF'}`;
  lastCheckedP.textContent = lastChecked;

  intervalInput.value = (state.intervalMinutes || 1);
}

function loadState() {
  api.storage.local.get(['links','labels','active','intervalMinutes','lastChecked'], (state) => {
    renderState(state || {});
  });
}

function saveIntervalMinutes() {
  const minutes = Math.max(1, parseInt(intervalInput.value || '1', 10));
  intervalInput.value = minutes;
  api.storage.local.set({ intervalMinutes: minutes });
}

function addLink() {
  const url = (linkInput.value || '').trim();
  if (!url) return;

  api.storage.local.get(['links'], (data) => {
    const links = data.links || [];
    if (links.includes(url)) return;

    if (links.length >= 4) {
      alert('Maximum 4 links allowed.');
      return;
    }

    links.push(url);
    api.storage.local.set({ links }, () => {
      linkInput.value = '';
      loadState();
    });
  });
}

function removeLink(url) {
  api.storage.local.get(['links','labels','lastOpenByUrl'], (data) => {
    const links = (data.links || []).filter(u => u !== url);
    const labels = data.labels || {};
    const lastOpenByUrl = data.lastOpenByUrl || {};
    delete labels[url];
    delete lastOpenByUrl[url];

    api.storage.local.set({ links, labels, lastOpenByUrl }, () => loadState());
  });
}

function removeAll() {
  api.storage.local.set({ links: [], labels: {}, lastOpenByUrl: {} }, () => loadState());
}

function startMonitoring() {
  saveIntervalMinutes();
  api.storage.local.set({ active: true }, () => {
    api.runtime.sendMessage({ type: 'start' }, () => loadState());
  });
}

function stopMonitoring() {
  api.storage.local.set({ active: false }, () => {
    api.runtime.sendMessage({ type: 'stop' }, () => loadState());
  });
}

intervalInput.addEventListener('change', saveIntervalMinutes);
addBtn.addEventListener('click', addLink);
removeAllBtn.addEventListener('click', removeAll);
startBtn.addEventListener('click', startMonitoring);
stopBtn.addEventListener('click', stopMonitoring);

loadState();
api.storage.onChanged.addListener(loadState);


});


function updateStartStopVisibility(isActive) {
  const startBtn = document.getElementById('start');
  const stopBtn = document.getElementById('stop');
  if (!startBtn || !stopBtn) return;

  if (isActive) {
    startBtn.style.display = 'none';
    stopBtn.style.display = 'inline-block';
  } else {
    stopBtn.style.display = 'none';
    startBtn.style.display = 'inline-block';
  }
}

function refreshActiveUI() {
  api.storage.local.get(['active'], (data) => {
    updateStartStopVisibility(!!data.active);
  });
}

document.addEventListener('DOMContentLoaded', () => {
  refreshActiveUI();
});

document.getElementById('start')?.addEventListener('click', () => {
  updateStartStopVisibility(true);
});
document.getElementById('stop')?.addEventListener('click', () => {
  updateStartStopVisibility(false);
});
