import { send } from '../lib/messages.js';
(async () => {
  const r = await send({ type: 'getSettings' });
  const s = r.settings || {};
  const cb = document.getElementById('aiEnabled');
  cb.checked = !!s.aiEnabled;
  cb.onchange = async () => {
    s.aiEnabled = cb.checked;
    await send({ type: 'setSettings', settings: s });
  };
  document.getElementById('openDash').onclick = () =>
    chrome.tabs.create({ url: chrome.runtime.getURL('dashboard/dashboard.html') });
})();
