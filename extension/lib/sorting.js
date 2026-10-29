import { hostnameOf, registrableDomain, tldOf, pathOf } from './url.js';

function str(v) {
  return v == null ? '' : String(v);
}
function lower(v) {
  return str(v).toLowerCase();
}

function cmpStr(a, b, { caseSensitive = false, natural = false, locale = false } = {}) {
  const sa = str(a);
  const sb = str(b);
  if (natural) {
    return sa.localeCompare(sb, undefined, {
      numeric: true,
      sensitivity: caseSensitive ? 'case' : 'base',
    });
  }
  if (locale) {
    return sa.localeCompare(sb, undefined, { sensitivity: caseSensitive ? 'case' : 'base' });
  }
  const A = caseSensitive ? sa : sa.toLowerCase();
  const B = caseSensitive ? sb : sb.toLowerCase();
  if (A < B) return -1;
  if (A > B) return 1;
  return 0;
}

function cmpNum(a, b) {
  const na = Number(a);
  const nb = Number(b);
  const aNaN = isNaN(na);
  const bNaN = isNaN(nb);
  if (aNaN && bNaN) return 0;
  if (aNaN) return 1;
  if (bNaN) return -1;
  return na - nb;
}

// key extractors
const EXTRACTORS = {
  title: (n) => n.title,
  titleReverse: (n) => n.title,
  url: (n) => n.url || '',
  hostname: (n) => (n.url ? hostnameOf(n.url) : ''),
  registrableDomain: (n) => (n.url ? registrableDomain(n.url) : ''),
  tld: (n) => (n.url ? tldOf(n.url) : ''),
  path: (n) => (n.url ? pathOf(n.url) : ''),
  folderTitle: (n) => (n.isFolder ? n.title : ''),
  folderPath: (n) => (n.folderPath ? n.folderPath.join(' / ') : ''),
  depth: (n) => (n.folderPath ? n.folderPath.length : 0),
  dateAdded: (n) => n.dateAdded,
  dateModified: (n) => n.dateGroupModified,
  category: (n) => n.category || n._meta?.category || '',
  tag: (n) => (n.tags && n.tags.length ? n.tags.join(',') : (n._meta?.tags || []).join(',')),
  description: (n) => n.description || n._meta?.description || '',
  urlLength: (n) => (n.url ? n.url.length : 0),
  titleLength: (n) => (n.title ? n.title.length : 0),
  hostnameLength: (n) => (n.url ? hostnameOf(n.url).length : 0),
  aiCategory: (n) => n.aiSuggestion?.category || '',
  aiConfidence: (n) => n.aiSuggestion?.confidence ?? 0,
  urlQuery: (n) => {
    const u = n.url || '';
    try {
      return new URL(u).search;
    } catch {
      return '';
    }
  },
  scheme: (n) => (n.url ? n.url.split(':')[0] || '' : ''),
};

export const SORT_KEYS = Object.keys(EXTRACTORS);

export function makeComparator(keys, opts = {}) {
  // keys: array of { key, direction: 'asc'|'desc', ... } or strings
  const normalized = keys.map((k) => (typeof k === 'string' ? { key: k, direction: 'asc' } : k));
  return (a, b) => {
    for (const spec of normalized) {
      const key = spec.key;
      // special: folder-first / bookmark-first
      if (key === 'foldersFirst') {
        const af = a.url ? 1 : 0;
        const bf = b.url ? 1 : 0;
        if (af !== bf) return af - bf;
        continue;
      }
      if (key === 'bookmarksFirst') {
        const af = a.url ? 0 : 1;
        const bf = b.url ? 0 : 1;
        if (af !== bf) return af - bf;
        continue;
      }
      if (key === 'uncategorizedFirst') {
        const ac = a.category || a._meta?.category ? 1 : 0;
        const bc = b.category || b._meta?.category ? 1 : 0;
        if (ac !== bc) return ac - bc; // unclassified(0) first
        continue;
      }
      const extract = EXTRACTORS[key];
      if (!extract) continue;
      let va = extract(a);
      let vb = extract(b);
      // numeric-ish keys
      const numericKeys = new Set([
        'depth',
        'urlLength',
        'titleLength',
        'hostnameLength',
        'aiConfidence',
        'dateAdded',
        'dateModified',
      ]);
      let res;
      if (numericKeys.has(key)) {
        res = cmpNum(va, vb);
      } else {
        res = cmpStr(va, vb, {
          caseSensitive: !!spec.caseSensitive,
          natural: !!spec.natural,
          locale: !!spec.locale,
        });
      }
      if (spec.direction === 'desc') res = -res;
      if (res !== 0) return res;
    }
    // final tie-breaker by id then title
    if (a.id !== b.id) return String(a.id).localeCompare(String(b.id));
    return String(a.title || '').localeCompare(String(b.title || ''));
  };
}

export function sortArray(arr, keys, opts) {
  const copy = [...arr];
  copy.sort(makeComparator(keys, opts));
  return copy;
}

export function sortTree(node, keys, scope = 'current', opts = {}) {
  // scope: 'current' sorts node's children; 'recursive' sorts all descendants
  if (!node || !node.children) return node;
  const clone = JSON.parse(JSON.stringify(node));
  const sorter = (n) => {
    if (n.children && n.children.length) {
      n.children = sortArray(n.children, keys, opts);
      if (scope === 'recursive') n.children.forEach(sorter);
    }
  };
  if (scope === 'recursive') clone.children.forEach(sorter);
  clone.children = sortArray(clone.children, keys, opts);
  return clone;
}
