import { BrowserAdapter, flattenTree } from '../lib/browser-adapter.js';
import { makeStore } from '../lib/storage.js';

const store = makeStore();

chrome.runtime.onInstalled.addListener(() => {
  console.log('BS-EXT installed');
});

chrome.commands.onCommand.addListener((cmd) => {
  if (cmd === 'open-dashboard') {
    chrome.tabs.create({ url: chrome.runtime.getURL('dashboard/dashboard.html') });
  }
});

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  (async () => {
    try {
      switch (msg && msg.type) {
        case 'getTree': {
          const tree = await BrowserAdapter.getTree();
          sendResponse({ ok: true, tree });
          break;
        }
        case 'flatten': {
          const tree = await BrowserAdapter.getTree();
          sendResponse({ ok: true, flat: flattenTree(tree) });
          break;
        }
        case 'createFolder': {
          const node = await BrowserAdapter.create({ parentId: msg.parentId, title: msg.title });
          sendResponse({ ok: true, node });
          break;
        }
        case 'rename': {
          const node = await BrowserAdapter.update(msg.id, { title: msg.title });
          sendResponse({ ok: true, node });
          break;
        }
        case 'move': {
          const node = await BrowserAdapter.move(msg.id, {
            parentId: msg.parentId,
            index: msg.index,
          });
          sendResponse({ ok: true, node });
          break;
        }
        case 'remove': {
          if (msg.tree) await BrowserAdapter.removeTree(msg.id);
          else await BrowserAdapter.remove(msg.id);
          sendResponse({ ok: true });
          break;
        }
        case 'createBookmark': {
          const node = await BrowserAdapter.create({
            parentId: msg.parentId,
            title: msg.title,
            url: msg.url,
          });
          sendResponse({ ok: true, node });
          break;
        }
        case 'updateBookmark': {
          const node = await BrowserAdapter.update(msg.id, msg.changes || {});
          sendResponse({ ok: true, node });
          break;
        }
        case 'getSettings': {
          const s = await store.get('settings', defaultSettings());
          sendResponse({ ok: true, settings: s });
          break;
        }
        case 'setSettings': {
          await store.set('settings', msg.settings);
          sendResponse({ ok: true });
          break;
        }
        case 'getMeta': {
          const m = await store.get('meta', {});
          sendResponse({ ok: true, meta: m });
          break;
        }
        case 'setMeta': {
          const m = await store.get('meta', {});
          m[msg.id] = msg.meta;
          await store.set('meta', m);
          sendResponse({ ok: true });
          break;
        }
        case 'getMetaAll': {
          const m = await store.get('meta', {});
          sendResponse({ ok: true, meta: m });
          break;
        }
        case 'activeTab': {
          chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            const t = tabs && tabs[0];
            sendResponse({ ok: true, tab: t ? { url: t.url, title: t.title } : null });
          });
          return; // async response
        }
        default:
          sendResponse({ ok: false, error: 'unknown message type' });
      }
    } catch (e) {
      sendResponse({ ok: false, error: String(e && e.message ? e.message : e) });
    }
  })();
  return true;
});

function defaultSettings() {
  return {
    theme: 'system',
    density: 'comfortable',
    defaultSort: [
      { key: 'foldersFirst', direction: 'asc' },
      { key: 'title', direction: 'asc' },
    ],
    recursiveDefault: false,
    dataPolicy: 'title-host',
    aiEnabled: false,
    providerConfig: null,
    duplicateProfile: 'safe',
    taxonomy: [
      'Development',
      'Programming Languages',
      'Web Development',
      'Documentation',
      'Research',
      'Education',
      'Productivity',
      'Business',
      'Finance',
      'Shopping',
      'Travel',
      'Health',
      'Entertainment',
      'Social',
      'Reference',
      'Personal',
      'Unsorted',
      'Other',
    ],
    maxFolderDepth: 4,
    maxRootFolders: 12,
  };
}
