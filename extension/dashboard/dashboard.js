import { send } from '../lib/messages.js';
import { flattenTree, findNode } from '../lib/browser-adapter.js';
import { searchNodes } from '../lib/search.js';
import { makeComparator, sortArray, SORT_KEYS } from '../lib/sorting.js';
import { findDuplicates } from '../lib/duplicates.js';
import {
  bookmarksToHtml,
  parseHtmlBookmarks,
  toJsonBackup,
  fromJsonBackup,
} from '../lib/import-export.js';
import { createRecoveryRecord, saveRecovery, listRecovery } from '../lib/backup.js';

let tree = [];
let flat = [];
let currentFolderId = null;
let selected = new Set();
let view = 'all';
let searchQuery = '';
let filters = {};
let settings = null;
let sortKeys = [
  { key: 'foldersFirst', direction: 'asc' },
  { key: 'title', direction: 'asc' },
];

const content = document.getElementById('content');
const details = document.getElementById('details');
const breadcrumbs = document.getElementById('breadcrumbs');

async function init() {
  const t = await send({ type: 'getTree' });
  tree = t.tree || [];
  flat = flattenTree(tree);
  const s = await send({ type: 'getSettings' });
  settings = s.settings || {};
  sortKeys = settings.defaultSort || sortKeys;
  bindNav();
  bindToolbar();
  bindDialogs();
  bindSearch();
  render();
  if (chrome.bookmarks) {
    chrome.bookmarks.onChanged && chrome.bookmarks.onChanged.addListener(refresh);
    chrome.bookmarks.onCreated && chrome.bookmarks.onCreated.addListener(refresh);
    chrome.bookmarks.onRemoved && chrome.bookmarks.onRemoved.addListener(refresh);
    chrome.bookmarks.onMoved && chrome.bookmarks.onMoved.addListener(refresh);
  }
}

async function refresh() {
  const t = await send({ type: 'getTree' });
  tree = t.tree || [];
  flat = flattenTree(tree);
  render();
}

function bindNav() {
  document.querySelectorAll('#nav button').forEach((b) => {
    b.onclick = () => {
      document.querySelectorAll('#nav button').forEach((x) => x.classList.remove('active'));
      b.classList.add('active');
      view = b.dataset.view;
      render();
    };
  });
}

function bindSearch() {
  document.getElementById('search').addEventListener('input', (e) => {
    searchQuery = e.target.value;
    render();
  });
}

function bindToolbar() {
  document.getElementById('sortBtn').onclick = () =>
    document.getElementById('sortDialog').showModal();
  document.getElementById('moveBtn').onclick = moveSelected;
  document.getElementById('newFolderBtn').onclick = newFolder;
  document.getElementById('newBookmarkBtn').onclick = newBookmark;
  document.getElementById('dupBtn').onclick = () => {
    view = 'duplicates';
    render();
  };
  document.getElementById('exportBtn').onclick = exportData;
  document.getElementById('importBtn').onclick = () =>
    document.getElementById('importFile').click();
  document.getElementById('backupBtn').onclick = createBackup;
  document.getElementById('undoBtn').onclick = undo;
  const fi = document.createElement('input');
  fi.type = 'file';
  fi.id = 'importFile';
  fi.accept = '.html,.json';
  fi.style.display = 'none';
  fi.onchange = importFile;
  document.body.appendChild(fi);
}

function bindDialogs() {
  const sk = document.getElementById('sortKeys');
  function renderSortKeys() {
    sk.innerHTML = sortKeys
      .map((k, i) => {
        return (
          '<div class="sort-key">' +
          '<select data-i="' +
          i +
          '" class="sk-key">' +
          SORT_KEYS.map(
            (x) =>
              '<option value="' + x + '"' + (x === k.key ? ' selected' : '') + '>' + x + '</option>'
          ).join('') +
          '</select>' +
          '<select data-i="' +
          i +
          '" class="sk-dir">' +
          ['asc', 'desc']
            .map(
              (d) =>
                '<option value="' +
                d +
                '"' +
                (d === k.direction ? ' selected' : '') +
                '>' +
                d +
                '</option>'
            )
            .join('') +
          '</select>' +
          '<button data-i="' +
          i +
          '" class="sk-rm">x</button>' +
          '</div>'
        );
      })
      .join('');
    sk.querySelectorAll('.sk-key').forEach((el) => {
      el.onchange = (e) => {
        sortKeys[+e.target.dataset.i].key = e.target.value;
      };
    });
    sk.querySelectorAll('.sk-dir').forEach((el) => {
      el.onchange = (e) => {
        sortKeys[+e.target.dataset.i].direction = e.target.value;
      };
    });
    sk.querySelectorAll('.sk-rm').forEach((el) => {
      el.onclick = (e) => {
        sortKeys.splice(+e.target.dataset.i, 1);
        renderSortKeys();
      };
    });
  }
  renderSortKeys();
  document.getElementById('addSortKey').onclick = () => {
    sortKeys.push({ key: 'title', direction: 'asc' });
    renderSortKeys();
  };
  document.getElementById('sortDialog').addEventListener('close', (e) => {
    const dlg = e.target;
    if (dlg.returnValue === 'apply' || dlg.returnValue === 'preview') {
      const recursive = document.getElementById('recursiveSort').checked;
      const folderFirst = document.getElementById('folderFirst').checked;
      const keys = [...sortKeys];
      if (folderFirst && !keys.find((k) => k.key === 'foldersFirst'))
        keys.unshift({ key: 'foldersFirst', direction: 'asc' });
      if (dlg.returnValue === 'preview') {
        showSortPreview(keys, recursive);
      } else {
        applySort(keys, recursive);
      }
    }
  });
  document.getElementById('moveDialog').addEventListener('close', (e) => {
    if (e.target.returnValue === 'apply') {
      const dest = document.getElementById('moveDest').value;
      doMoveSelected(dest);
    }
  });
  document.getElementById('previewDialog').addEventListener('close', (e) => {
    if (e.target.returnValue === 'apply' && window._pendingOp) {
      window._pendingOp();
      window._pendingOp = null;
    }
  });
}

function render() {
  updateBreadcrumbs();
  let html = '';
  switch (view) {
    case 'overview':
      html = renderOverview();
      break;
    case 'all':
      html = renderBookmarkTable(getFilteredNodes());
      break;
    case 'bar':
      html = renderBookmarkTable(
        getFilteredNodes().filter((n) => (n.folderPath || []).some((p) => /bookmark bar/i.test(p)))
      );
      break;
    case 'folders':
      html = renderFolderTree();
      break;
    case 'duplicates':
      html = renderDuplicates();
      break;
    case 'domains':
      html = renderDomains();
      break;
    case 'tags':
      html = renderTags();
      break;
    case 'rules':
      html = renderRules();
      break;
    case 'ai':
      html = renderAI();
      break;
    case 'importexport':
      html = renderImportExport();
      break;
    case 'backups':
      html = renderBackups();
      break;
    case 'activity':
      html = renderActivity();
      break;
    case 'settings':
      html = renderSettings();
      break;
    default:
      html = renderOverview();
  }
  content.innerHTML = html;
  attachTableHandlers();
  if (view === 'backups') loadRecoveryList();
}

function updateBreadcrumbs() {
  if (currentFolderId) {
    const node = findNode(tree, currentFolderId);
    breadcrumbs.textContent = node ? node.title || 'Folder' : 'Folder';
  } else {
    breadcrumbs.textContent = 'All bookmarks';
  }
}

function getFilteredNodes() {
  let nodes = flat.filter((n) => n.url);
  if (currentFolderId) {
    const folder = findNode(tree, currentFolderId);
    if (folder) {
      const ids = new Set();
      const collect = (n) => {
        if (n.url) ids.add(n.id);
        (n.children || []).forEach(collect);
      };
      collect(folder);
      nodes = nodes.filter((n) => ids.has(n.id));
    }
  }
  if (searchQuery) {
    nodes = searchNodes(nodes, searchQuery, filters);
  }
  return sortArray(nodes, sortKeys);
}

function renderOverview() {
  const total = flat.filter((n) => n.url).length;
  const folders = flat.filter((n) => !n.url).length;
  const dups = findDuplicates(
    flat.filter((n) => n.url),
    (settings && settings.duplicateProfile) || 'safe'
  );
  return (
    '<div class="card"><h3>Overview</h3>' +
    '<p>Total bookmarks: ' +
    total +
    '</p>' +
    '<p>Total folders: ' +
    folders +
    '</p>' +
    '<p>Duplicate groups: ' +
    dups.length +
    '</p>' +
    '<p>AI: ' +
    (settings && settings.aiEnabled ? 'enabled' : 'disabled') +
    '</p>' +
    '</div>'
  );
}

function renderBookmarkTable(nodes) {
  if (!nodes.length) return '<div class="empty">No bookmarks</div>';
  const rows = nodes
    .map((n) => {
      return (
        '<tr data-id="' +
        n.id +
        '" class="' +
        (selected.has(n.id) ? 'selected' : '') +
        '">' +
        '<td><input type="checkbox" class="sel" data-id="' +
        n.id +
        '"' +
        (selected.has(n.id) ? ' checked' : '') +
        '/></td>' +
        '<td>' +
        escapeHtml(n.title || '') +
        '</td>' +
        '<td><a href="' +
        escapeAttr(n.url) +
        '" target="_blank">' +
        escapeHtml(shorten(n.url)) +
        '</a></td>' +
        '<td>' +
        escapeHtml((n.folderPath || []).join(' / ')) +
        '</td>' +
        '<td>' +
        escapeHtml((n._meta && n._meta.category) || n.category || '') +
        '</td>' +
        '</tr>'
      );
    })
    .join('');
  return (
    '<table><thead><tr><th></th><th>Title</th><th>URL</th><th>Folder</th><th>Category</th></tr></thead><tbody>' +
    rows +
    '</tbody></table>' +
    '<div style="margin-top:8px;font-size:12px;color:#6b7280">Selected: ' +
    selected.size +
    '</div>'
  );
}

function attachTableHandlers() {
  document.querySelectorAll('.sel').forEach((cb) => {
    cb.onchange = (e) => {
      const id = e.target.dataset.id;
      if (e.target.checked) selected.add(id);
      else selected.delete(id);
      render();
    };
  });
  document.querySelectorAll('tbody tr').forEach((tr) => {
    tr.onclick = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'A') return;
      const id = tr.dataset.id;
      const node = flat.find((n) => n.id === id);
      details.innerHTML = renderDetails(node);
    };
  });
}

function renderDetails(n) {
  if (!n) return '';
  return (
    '<h3>' +
    escapeHtml(n.title || '') +
    '</h3>' +
    '<p><a href="' +
    escapeAttr(n.url) +
    '" target="_blank">' +
    escapeHtml(n.url || '') +
    '</a></p>' +
    '<p>Folder: ' +
    escapeHtml((n.folderPath || []).join(' / ')) +
    '</p>' +
    '<p>Category: ' +
    escapeHtml((n._meta && n._meta.category) || n.category || '') +
    '</p>' +
    '<p>Tags: ' +
    escapeHtml((n.tags || (n._meta && n._meta.tags) || []).join(', ')) +
    '</p>'
  );
}

function renderFolderTree() {
  function walk(nodes, depth) {
    depth = depth || 0;
    return (
      '<ul class="folder-tree">' +
      (nodes || [])
        .filter((n) => !n.url)
        .map((n) => {
          return (
            '<li data-id="' +
            n.id +
            '" style="padding-left:' +
            depth * 12 +
            'px">' +
            '<span class="fname">' +
            escapeHtml(n.title || '(untitled)') +
            '</span>' +
            (n.children ? walk(n.children, depth + 1) : '') +
            '</li>'
          );
        })
        .join('') +
      '</ul>'
    );
  }
  const html =
    walk(tree) +
    '<div style="margin-top:10px"><button onclick="window._clearFolder()">Show all</button></div>';
  setTimeout(() => {
    document.querySelectorAll('.folder-tree li').forEach((li) => {
      li.onclick = (e) => {
        e.stopPropagation();
        currentFolderId = li.dataset.id;
        view = 'all';
        render();
      };
    });
  }, 0);
  return html;
}
window._clearFolder = () => {
  currentFolderId = null;
  view = 'all';
  render();
};

function renderDuplicates() {
  const dups = findDuplicates(
    flat.filter((n) => n.url),
    (settings && settings.duplicateProfile) || 'safe',
    { similarTitles: true }
  );
  if (!dups.length) return '<div class="empty">No duplicate candidates found</div>';
  return dups
    .map((g) => {
      return (
        '<div class="card">' +
        '<h3>' +
        escapeHtml(g.reason) +
        ' (confidence ' +
        g.confidence +
        ')</h3>' +
        '<p>Key: ' +
        escapeHtml(g.key) +
        '</p>' +
        '<ul>' +
        g.items
          .map(
            (it) =>
              '<li><input type="checkbox" class="dup-sel" data-id="' +
              it.id +
              '"> ' +
              escapeHtml(it.title) +
              ' — ' +
              escapeHtml(it.url) +
              ' <small>' +
              escapeHtml(it.path || '') +
              '</small></li>'
          )
          .join('') +
        '</ul>' +
        '<button onclick="window._removeDup(\'' +
        g.items.map((i) => i.id).join(',') +
        '\')">Remove selected (keep first)</button>' +
        '</div>'
      );
    })
    .join('');
}
window._removeDup = async (ids) => {
  const idArr = ids.split(',');
  if (!confirm('Remove ' + (idArr.length - 1) + ' duplicate(s)?')) return;
  for (let i = 1; i < idArr.length; i++) {
    try {
      await send({ type: 'remove', id: idArr[i] });
    } catch (e) {
      console.error(e);
    }
  }
  await refresh();
};

function renderDomains() {
  const groups = new Map();
  for (const n of flat.filter((n) => n.url)) {
    let host = '';
    try {
      host = new URL(n.url).hostname;
    } catch (e) {
      host = '';
    }
    const dom = host.split('.').slice(-2).join('.');
    if (!groups.has(dom)) groups.set(dom, []);
    groups.get(dom).push(n);
  }
  const sorted = [...groups.entries()].sort((a, b) => b[1].length - a[1].length);
  return (
    sorted
      .map(([d, items]) => {
        return (
          '<div class="card">' +
          '<h3>' +
          escapeHtml(d || '(unknown)') +
          ' <small>(' +
          items.length +
          ')</small></h3>' +
          '<details><summary>Show</summary><ul>' +
          items
            .map((n) => '<li>' + escapeHtml(n.title) + ' — ' + escapeHtml(n.url) + '</li>')
            .join('') +
          '</ul></details>' +
          '</div>'
        );
      })
      .join('') || '<div class="empty">No domains</div>'
  );
}

function renderTags() {
  const tags = new Map();
  for (const n of flat.filter((n) => n.url)) {
    for (const t of n.tags || (n._meta && n._meta.tags) || []) {
      if (!tags.has(t)) tags.set(t, []);
      tags.get(t).push(n);
    }
  }
  if (!tags.size) return '<div class="empty">No tags</div>';
  return [...tags.entries()]
    .map(
      ([t, items]) =>
        '<div class="card"><h3>' + escapeHtml(t) + ' (' + items.length + ')</h3></div>'
    )
    .join('');
}

function renderRules() {
  return (
    '<div class="card">' +
    '<h3>Rules</h3>' +
    '<p>Deterministic rules run locally.</p>' +
    '<textarea id="rulesJson" style="width:100%;height:200px">' +
    escapeHtml(JSON.stringify((settings && settings.rules) || [], null, 2)) +
    '</textarea>' +
    '<button onclick="window._saveRules()">Save rules</button>' +
    '<button onclick="window._runRules()">Preview rule matches</button>' +
    '<div id="rulesResult"></div>' +
    '</div>'
  );
}
window._saveRules = async () => {
  try {
    const rules = JSON.parse(document.getElementById('rulesJson').value);
    settings.rules = rules;
    await send({ type: 'setSettings', settings });
    alert('Saved');
  } catch (e) {
    alert('Invalid JSON');
  }
};
window._runRules = async () => {
  const mod = await import('../lib/rules.js');
  let rules = [];
  try {
    rules = JSON.parse(document.getElementById('rulesJson').value);
  } catch (e) {
    /* ignore */
  }
  const res = mod.runRules(
    rules,
    flat.filter((n) => n.url)
  );
  document.getElementById('rulesResult').innerHTML =
    '<p>' +
    res.length +
    ' bookmarks matched</p>' +
    res
      .slice(0, 50)
      .map(
        (r) =>
          '<div>' +
          escapeHtml(r.bookmark.title) +
          ' — ' +
          r.matched.map((m) => m.ruleName).join(', ') +
          '</div>'
      )
      .join('');
};

function renderAI() {
  return (
    '<div class="card">' +
    '<h3>AI workspace</h3>' +
    '<p>AI enabled: ' +
    (settings && settings.aiEnabled ? 'yes' : 'no') +
    ' (configure in Settings)</p>' +
    '<label>Data policy: <select id="dataPolicy">' +
    '<option value="title-only"' +
    (settings && settings.dataPolicy === 'title-only' ? ' selected' : '') +
    '>Title only</option>' +
    '<option value="title-host"' +
    (settings && settings.dataPolicy === 'title-host' ? ' selected' : '') +
    '>Title + host</option>' +
    '<option value="title-url"' +
    (settings && settings.dataPolicy === 'title-url' ? ' selected' : '') +
    '>Title + URL</option>' +
    '</select></label>' +
    '<div style="margin-top:8px"><button onclick="window._runAI()">Categorize selected with AI</button></div>' +
    '<div id="aiResult"></div>' +
    '</div>'
  );
}
window._runAI = async () => {
  const ids = [...selected];
  if (!ids.length) {
    alert('Select bookmarks first');
    return;
  }
  const bms = ids.map((id) => flat.find((n) => n.id === id)).filter(Boolean);
  const mod = await import('../lib/ai/categorizer.js');
  let suggestions;
  if (settings && settings.providerConfig) {
    try {
      suggestions = await mod.categorizeBookmarks(bms, settings);
    } catch (e) {
      document.getElementById('aiResult').innerHTML =
        '<p style="color:red">' + escapeHtml(String(e)) + '</p>';
      return;
    }
  } else {
    suggestions = bms.map((b) => ({
      id: String(b.id),
      category: 'Unsorted',
      tags: [],
      confidence: 0.3,
      reason: 'mock (no provider)',
    }));
  }
  const updated = mod.applySuggestions(bms, suggestions);
  for (const u of updated) {
    if (u.aiSuggestion)
      await send({ type: 'setMeta', id: u.id, meta: { aiSuggestion: u.aiSuggestion } });
  }
  document.getElementById('aiResult').innerHTML =
    '<p>' +
    suggestions.length +
    ' suggestions generated</p>' +
    suggestions
      .map(
        (s) =>
          '<div>' +
          escapeHtml(s.id) +
          ' → ' +
          escapeHtml(s.category) +
          ' (' +
          s.confidence +
          ')</div>'
      )
      .join('');
  await refresh();
};

function renderImportExport() {
  return (
    '<div class="card">' +
    '<h3>Import / Export</h3>' +
    '<button onclick="window._exportHtml()">Export HTML</button>' +
    '<button onclick="window._exportJson()">Export JSON backup</button>' +
    '<p>Import via file picker (toolbar Import) or paste below.</p>' +
    '<textarea id="importText" style="width:100%;height:120px" placeholder="Paste HTML or JSON backup"></textarea>' +
    '<button onclick="window._importText()">Import pasted</button>' +
    '</div>'
  );
}
window._exportHtml = () => {
  const html = bookmarksToHtml(tree, 'BS-EXT Bookmarks');
  download('bookmarks.html', html, 'text/html');
};
window._exportJson = async () => {
  const meta = await send({ type: 'getMetaAll' });
  const json = toJsonBackup({ tree, meta: meta.meta, settings });
  download('bs-ext-backup.json', json, 'application/json');
};
window._importText = async () => {
  const text = document.getElementById('importText').value;
  if (!text.trim()) return;
  const j = fromJsonBackup(text);
  if (j.ok) {
    alert('JSON backup detected. Use Backups view.');
    return;
  }
  const parsed = parseHtmlBookmarks(text);
  const root = await send({
    type: 'createFolder',
    parentId: tree[0] && tree[0].id,
    title: 'Imported ' + new Date().toISOString().slice(0, 10),
  });
  async function walk(parentId, node) {
    for (const c of node.children || []) {
      if (c.url) await send({ type: 'createBookmark', parentId, title: c.title, url: c.url });
      else {
        const f = await send({ type: 'createFolder', parentId, title: c.title });
        await walk(f.node.id, c);
      }
    }
  }
  await walk(root.node.id, parsed);
  await refresh();
  alert('Imported');
};

async function importFile(e) {
  const file = e.target.files[0];
  if (!file) return;
  const text = await file.text();
  document.getElementById('importText').value = text;
  await window._importText();
}

function renderBackups() {
  return (
    '<div class="card"><h3>Recovery / Backups</h3>' +
    '<p>Create a backup from toolbar. Recovery records:</p>' +
    '<div id="recList">Loading...</div>' +
    '</div>'
  );
}
async function loadRecoveryList() {
  const list = await listRecovery({
    get: async (k, fb) =>
      new Promise((res) => {
        chrome.storage.local.get(['bs-ext:' + k], (r) =>
          res(r && r['bs-ext:' + k] != null ? r['bs-ext:' + k] : fb)
        );
      }),
    set: async (k, v) =>
      new Promise((res) => {
        chrome.storage.local.set({ ['bs-ext:' + k]: v }, () => res());
      }),
  });
  const el = document.getElementById('recList');
  if (!el) return;
  el.innerHTML = list.length
    ? list
        .map(
          (r) =>
            '<div class="card">' +
            escapeHtml(r.type) +
            ' — ' +
            new Date(r.createdAt).toLocaleString() +
            ' — ' +
            r.status +
            ' (' +
            r.items.length +
            ' items)</div>'
        )
        .join('')
    : '<div class="empty">No recovery records</div>';
}

function renderActivity() {
  return '<div class="card"><h3>Activity</h3><p>Activity log stored in recovery records.</p></div>';
}

function renderSettings() {
  return (
    '<div class="card">' +
    '<h3>Settings</h3>' +
    '<p>Theme: <select id="theme"><option value="system">System</option><option value="light">Light</option><option value="dark">Dark</option></select></p>' +
    '<p>Density: <select id="density"><option value="compact">Compact</option><option value="comfortable">Comfortable</option><option value="spacious">Spacious</option></select></p>' +
    '<p><label><input type="checkbox" id="aiEnabled"> AI enabled</label></p>' +
    '<p><label>Provider type: <select id="ptype"><option value="custom">Custom OpenAI-compatible</option><option value="gemini">Gemini</option><option value="openrouter">OpenRouter</option><option value="groq">Groq</option><option value="mistral">Mistral</option><option value="local">Local</option></select></label></p>' +
    '<p>Base URL: <input id="baseUrl" style="width:100%" value="' +
    escapeAttr((settings && settings.providerConfig && settings.providerConfig.baseUrl) || '') +
    '"></p>' +
    '<p>API key: <input id="apiKey" type="password" style="width:100%" value="' +
    escapeAttr((settings && settings.providerConfig && settings.providerConfig.apiKey) || '') +
    '"></p>' +
    '<p>Model: <input id="model" style="width:100%" value="' +
    escapeAttr((settings && settings.providerConfig && settings.providerConfig.model) || '') +
    '"></p>' +
    '<button onclick="window._saveSettings()">Save settings</button>' +
    '<button onclick="window._testConn()">Test connection</button>' +
    '<div id="connResult"></div>' +
    '</div>'
  );
}
window._saveSettings = async () => {
  const pc = {
    type: document.getElementById('ptype').value,
    baseUrl: document.getElementById('baseUrl').value,
    apiKey: document.getElementById('apiKey').value,
    model: document.getElementById('model').value,
  };
  settings.theme = document.getElementById('theme').value;
  settings.density = document.getElementById('density').value;
  settings.aiEnabled = document.getElementById('aiEnabled').checked;
  if (document.getElementById('baseUrl').value || document.getElementById('apiKey').value)
    settings.providerConfig = pc;
  await send({ type: 'setSettings', settings });
  alert('Saved');
};
window._testConn = async () => {
  const mod = await import('../lib/ai/providers/index.js');
  const pc = {
    type: document.getElementById('ptype').value,
    baseUrl: document.getElementById('baseUrl').value,
    apiKey: document.getElementById('apiKey').value,
    model: document.getElementById('model').value,
  };
  const p = mod.createProvider(pc);
  const r = await p.testConnection();
  document.getElementById('connResult').innerHTML =
    '<pre>' + escapeHtml(JSON.stringify(r, null, 2)) + '</pre>';
};

async function applySort(keys, recursive) {
  const targetFolder = currentFolderId ? findNode(tree, currentFolderId) : null;
  const roots = targetFolder ? [targetFolder] : tree;
  for (const r of roots) {
    await applyOrderToBrowser(r, keys, recursive);
  }
  await refresh();
}
async function applyOrderToBrowser(node, keys, recursive) {
  if (!node.children) return;
  const sorted = sortArray(node.children, keys);
  for (let i = 0; i < sorted.length; i++) {
    try {
      await send({ type: 'move', id: sorted[i].id, parentId: node.id, index: i });
    } catch (e) {
      console.error(e);
    }
  }
  if (recursive) for (const c of node.children) await applyOrderToBrowser(c, keys, true);
}

function showSortPreview(keys, recursive) {
  const targetFolder = currentFolderId ? findNode(tree, currentFolderId) : null;
  const roots = targetFolder ? [targetFolder] : tree;
  let html = '';
  for (const r of roots) {
    const sorted = sortArray(r.children || [], keys);
    html +=
      '<h4>' +
      escapeHtml(r.title || 'root') +
      '</h4><ol>' +
      sorted.map((n) => '<li>' + escapeHtml(n.title || n.url || '') + '</li>').join('') +
      '</ol>';
  }
  document.getElementById('previewBody').innerHTML = html;
  document.getElementById('previewDialog').showModal();
  window._pendingOp = () => applySort(keys, recursive);
}

async function moveSelected() {
  const dests = flat.filter((n) => !n.url);
  const sel = document.getElementById('moveDest');
  sel.innerHTML = dests
    .map((f) => '<option value="' + f.id + '">' + escapeHtml(f.path || f.title) + '</option>')
    .join('');
  document.getElementById('moveDialog').showModal();
}
async function doMoveSelected(dest) {
  const ids = [...selected];
  for (const id of ids) {
    try {
      await send({ type: 'move', id, parentId: dest });
    } catch (e) {
      console.error(e);
    }
  }
  selected.clear();
  await refresh();
}

async function newFolder() {
  const title = prompt('Folder name?');
  if (!title) return;
  const parentId = currentFolderId || (tree[0] && tree[0].id);
  await send({ type: 'createFolder', parentId, title });
  await refresh();
}
async function newBookmark() {
  const title = prompt('Title?');
  const url = prompt('URL?');
  if (!url) return;
  const parentId = currentFolderId || (tree[0] && tree[0].id);
  await send({ type: 'createBookmark', parentId, title: title || url, url });
  await refresh();
}

async function createBackup() {
  const meta = await send({ type: 'getMetaAll' });
  const json = toJsonBackup({ tree, meta: meta.meta, settings });
  download('bs-ext-backup.json', json, 'application/json');
}

function undo() {
  alert('Undo: restore from Backups view (recovery records available).');
}

function exportData() {
  const html = bookmarksToHtml(tree, 'BS-EXT Bookmarks');
  download('bookmarks.html', html, 'text/html');
}

async function importData() {
  document.getElementById('importFile').click();
}

function download(name, content, type) {
  const blob = new Blob([content], { type });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  URL.revokeObjectURL(a.href);
}

function escapeHtml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
function escapeAttr(s) {
  return String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;');
}
function shorten(u) {
  return u && u.length > 50 ? u.slice(0, 47) + '...' : u || '';
}

init().catch((e) => {
  console.error(e);
  content.innerHTML = '<div class="empty">Error: ' + escapeHtml(String(e)) + '</div>';
});
