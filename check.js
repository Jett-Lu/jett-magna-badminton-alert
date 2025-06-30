(() => {
  const INTERVAL_MS = 60 * 1000;
  const RING_SRC = chrome.runtime.getURL('ring.mp3');
  const audio = new Audio(RING_SRC);

  function notifyOpen(statusText) {
    if (Notification.permission === 'granted') {
      new Notification('🏸 Spot Open!', {
        body: `Status: ${statusText.trim()}`,
        icon: chrome.runtime.getURL('icon.png')
      });
    } else {
      Notification.requestPermission();
    }
    audio.play();
  }

  function checkAvailability() {
    const elem = document.querySelector('.availability, .class-status');
    if (!elem) return;
    const txt = elem.textContent;
    console.log('Checked availability:', txt);
    if (!/full/i.test(txt)) {
      notifyOpen(txt);
      clearInterval(intervalId);
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    checkAvailability();
    intervalId = setInterval(checkAvailability, INTERVAL_MS);
  });
})();
