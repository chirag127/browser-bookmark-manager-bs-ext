import { send } from '../lib/messages.js';
import { flattenTree } from '../lib/browser-adapter.js';

async function init() {
  const treeRes = await send({ type: 'getTree' });
  const tree = treeRes.tree || [];
  const flat = flattenTree(tree);
  const folders = flat.filter((n) => !n.url);
  const dest = document.getElementById('destFolder');
  dest.innerHTML = folders
    .map((f) => '<option value="' + f.id + '">' + escapeHtml(f.path || f.title) + '</option>')
    .join('');

  const recent = flat
    .filter((n) => n.url)
    .sort((a, b) => (b.dateAdded || 0) - (a.dateAdded || 0))
    .slice(0, 8);
  document.getElementById('recent').innerHTML = recent
    .map(
      (n) =>
        '<li><a href="' + n.url + '" target="_blank">' + escapeHtml(n.title || n.url) + '</a></li>'
    )
    .join('');

  const settingsRes = await send({ type: 'getSettings' });
  const s = settingsRes.settings || {};
  document.getElementById('aiStatus').textContent = 'AI: ' + (s.aiEnabled ? 'enabled' : 'disabled');

  document.getElementById('openDashboard').onclick = () =>
    chrome.tabs.create({ url: chrome.runtime.getURL('dashboard/dashboard.html') });
  document.getElementById('openSettings').onclick = () => chrome.runtime.openOptionsPage();
  document.getElementById('savePage').onclick = savePage;
  document.getElementById('quickSort').onclick = quickSort;
  document.getElementById('dupScan').onclick = dupScan;

  document.getElementById('search').addEventListener('input', (e) => {
    const q = e.target.value.toLowerCase();
    const items = flat.filter((n) => n.url && (n.title || '').toLowerCase().includes(q));
    document.getElementById('recent').innerHTML = items
      .slice(0, 8)
      .map(
        (n) =>
          '<li><a href="' +
          n.url +
          '" target="_blank">' +
          escapeHtml(n.title || n.url) +
          '</a></li>'
      )
      .join('');
  });
}

async function savePage() {
  const tabRes = await send({ type: 'activeTab' });
  const tab = tabRes.tab;
  if (!tab || !tab.url) {
    alert('No active tab');
    return;
  }
  const dest = document.getElementById('destFolder').value;
  await send({ type: 'createBookmark', parentId: dest, title: tab.title, url: tab.url });
  alert('Saved');
}

function quickSort() {
  alert('Use dashboard for sorting. Opening dashboard.');
  chrome.tabs.create({ url: chrome.runtime.getURL('dashboard/dashboard.html') });
}

function dupScan() {
  chrome.tabs.create({ url: chrome.runtime.getURL('dashboard/dashboard.html#duplicates') });
}

function escapeHtml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

init().catch((e) => console.error(e));
