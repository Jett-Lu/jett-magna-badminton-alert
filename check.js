(() => {
  const INTERVAL_MS = 60 * 1000;
  const RING_SRC   = chrome.runtime.getURL('ring.mp3');
  const ICON_SRC   = chrome.runtime.getURL('icon.png');
  let intervalId;
  const audio = new Audio(RING_SRC);

  // 1) Inject a status badge
  function createBadge() {
    const badge = document.createElement('div');
    badge.id = 'badminton-status-badge';
    badge.style.position        = 'fixed';
    badge.style.top             = '10px';
    badge.style.right           = '10px';
    badge.style.padding         = '6px 12px';
    badge.style.backgroundColor = 'rgba(0,0,0,0.7)';
    badge.style.color           = 'white';
    badge.style.fontSize        = '14px';
    badge.style.borderRadius    = '4px';
    badge.style.zIndex          = 9999;
    badge.textContent = '🏸 Monitoring…';
    document.body.appendChild(badge);
  }

  // 2) Update badge text
  function updateBadge(text) {
    const badge = document.getElementById('badminton-status-badge');
    if (badge) badge.textContent = text;
  }

  // Unified notification helper
  function sendNotification(title, message) {
    if (Notification.permission === 'granted') {
      new Notification(title, { body: message, icon: ICON_SRC });
    } else {
      Notification.requestPermission().then(p => {
        if (p === 'granted') {
          new Notification(title, { body: message, icon: ICON_SRC });
        }
      });
    }
  }

  // One-time “started” alert
  function notifyStarted() {
    sendNotification(
      "🏸 Jett’s Magna Badminton Alert",
      "Monitoring active on this page"
    );
  }

  // Alert when spot opens
  function notifyOpen(statusText) {
    sendNotification("🏸 Spot Open!", `Status: ${statusText}`);
    audio.play();
  }

  // Core check: anything other than “Full” triggers notifyOpen
  function checkAvailability() {
    const elem = document.querySelector('.availability, .class-status');
    if (!elem) {
      updateBadge('❓ Loading…');
      return;
    }
    const txt = elem.textContent.trim();
    console.log('Checked availability:', txt);
    updateBadge(`Checked: ${txt}`);
    if (!/full/i.test(txt)) {
      updateBadge('🎉 Open!');
      notifyOpen(txt);
      clearInterval(intervalId);
    }
  }

  // Kick things off once the page’s DOM is ready
  document.addEventListener('DOMContentLoaded', () => {
    createBadge();

    // Fire the startup notification
    if (Notification.permission === 'granted') {
      notifyStarted();
    } else {
      Notification.requestPermission().then(p => {
        if (p === 'granted') notifyStarted();
      });
