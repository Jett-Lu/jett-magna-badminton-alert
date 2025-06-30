(() => {
  const INTERVAL_MS = 60 * 1000;
  const RING_SRC   = chrome.runtime.getURL('ring.mp3');
  const ICON_SRC   = chrome.runtime.getURL('icon.png');
  let intervalId;
  const audio = new Audio(RING_SRC);

  // Inject a small status badge
  function createBadge() {
    const badge = document.createElement('div');
    badge.id = 'badminton-status-badge';
    Object.assign(badge.style, {
      position: 'fixed',
      top: '10px',
      right: '10px',
      padding: '6px 12px',
      backgroundColor: 'rgba(0,0,0,0.7)',
      color: 'white',
      fontSize: '14px',
      borderRadius: '4px',
      zIndex: 9999
    });
    badge.textContent = '🏸 Monitoring…';
    document.body.appendChild(badge);
  }

  // Update that badge’s text
  function updateBadge(text) {
    const badge = document.getElementById('badminton-status-badge');
    if (badge) badge.textContent = text;
  }

  // Fire desktop notifications
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

  // “Started” alert
  function notifyStarted() {
    sendNotification(
      "🏸 Jett’s Magna Badminton Alert",
      "Monitoring active on this page"
    );
  }

  // “Open!” alert
  function notifyOpen(statusText) {
    sendNotification("🏸 Spot Open!", `Status: ${statusText}`);
    audio.play();
  }

  // The polling check
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

  // Wire it all up on DOMContentLoaded
  document.addEventListener('DOMContentLoaded', () => {
    createBadge();
    // Ask for notification rights and send the “started” ping
    if (Notification.permission === 'granted') {
      notifyStarted();
    } else {
      Notification.requestPermission().then(p => {
        if (p === 'granted') notifyStarted();
      });
    }
    checkAvailability();
    intervalId = setInterval(checkAvailability, INTERVAL_MS);
  });
})();