# Jett’s Magna Badminton Alert

A lightweight browser extension that monitors your PerfectMind badminton class page and alerts you when a class is no longer full.

<img width="256" height="256" alt="icon" src="https://github.com/user-attachments/assets/f922e7c3-cf06-4346-a952-f575637a3e45" />

## What it does
- Periodically checks your target PerfectMind class page
- Detects when the page indicates the class is no longer “full”
- Plays a ring sound and shows a browser notification :contentReference

## Key features

<img width="284" height="361" alt="image" src="https://github.com/user-attachments/assets/9e88a937-3d98-44b2-9f54-49fe526be8e6" />

- Simple popup UI (start/stop style workflow)
- Audible alert (ring.mp3) plus browser notification
- Designed for “set it and forget it” monitoring during booking windows :contentReference[oaicite:2]{index=2}

## Install (developer mode)
This repo is currently set up to be loaded as an unpacked extension.

### Chrome / Edge (Chromium)
1. Download this repo (Code button on GitHub) and unzip it.
2. Open `chrome://extensions/`
3. Enable **Developer mode**
4. Click **Load unpacked**
5. Select the project folder (the one containing `manifest.json`)

### Firefox (temporary add-on)
1. Download this repo and unzip it.
2. Open `about:debugging#/runtime/this-firefox`
3. Click **Load Temporary Add-on**
4. Select `manifest.json`

Note: Firefox temporary add-ons reset after browser restart unless you package/sign it.

## Configure and use
1. Open your PerfectMind badminton class page in a tab.
2. Click the extension icon to open the popup.
3. Start monitoring.
4. Leave the PerfectMind tab open (recommended) and keep your browser running.
5. When the class becomes available, you should hear the ring and see a notification. :contentReference

## Customization
Common tweaks are usually in the JavaScript files (for example, the check interval, which text indicates “full”, and which page URL to monitor).
- `checker.js`, `check.js`: page checking logic
- `background.js`: background orchestration and notifications
- `popup.html` / `popup.js` / `popup.css`: popup UI

If you want, tell me:
- the exact PerfectMind page URL you monitor
- what the page shows when it is full vs available (copy 2 to 3 lines of the relevant text)
and I will rewrite the detection logic to be more robust.

## Privacy
This extension is intended to run locally in your browser. It should only access the page(s) you configure/allow, and it does not need any account credentials beyond what you already use in your browser session.

## Troubleshooting
- **No notifications:** make sure browser notifications are allowed for your browser and not blocked by Focus/Do Not Disturb settings.
- **No ring sound:** verify your system audio is on and the browser is allowed to play audio.
- **It never detects availability:** the site may have changed wording or markup. Update the detection conditions in the checker logic.

## Development notes
Project files (from the repo root):
- `manifest.json`
- `background.js`
- `check.js`, `checker.js`
- `popup.html`, `popup.js`, `popup.css`
- `ring.mp3`
- `icon.png` :contentReference

## License
Add a license file if you plan to distribute this publicly (MIT is a common default).
