import { normalizeUrl } from './url.js';

export const NORMALIZE_PROFILES = ['strict', 'safe', 'tracking', 'domain'];

export function urlKey(url, profile) {
  return normalizeUrl(url, profile);
}

export function findDuplicates(flatNodes, profile, extra) {
  profile = profile || 'safe';
  extra = extra || {};
  const groups = new Map();
  for (const n of flatNodes) {
    if (!n.url) continue;
    const key = normalizeUrl(n.url, profile);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(n);
  }
  const dupGroups = [];
  for (const entry of groups) {
    const key = entry[0];
    const items = entry[1];
    if (items.length > 1) {
      dupGroups.push({
        key: key,
        reason: profile === 'strict' ? 'exact-url' : 'normalized-url (' + profile + ')',
        confidence: profile === 'strict' ? 1 : 0.8,
        items: items.map((n) => ({
          id: n.id,
          title: n.title,
          url: n.url,
          parentId: n.parentId,
          path: n.path,
        })),
      });
    }
  }
  if (extra.similarTitles) {
    const byTitle = new Map();
    for (const n of flatNodes) {
      if (!n.url) continue;
      const t = (n.title || '').toLowerCase().trim();
      if (!t) continue;
      if (!byTitle.has(t)) byTitle.set(t, []);
      byTitle.get(t).push(n);
    }
    for (const entry of byTitle) {
      const t = entry[0];
      const items = entry[1];
      if (items.length > 1) {
        const urls = new Set(items.map((i) => i.url));
        if (urls.size > 1) {
          dupGroups.push({
            key: 'title:' + t,
            reason: 'same-title-different-url',
            confidence: 0.5,
            items: items.map((n) => ({
              id: n.id,
              title: n.title,
              url: n.url,
              parentId: n.parentId,
              path: n.path,
            })),
          });
        }
      }
    }
  }
  return dupGroups;
}

export function emptyFolders(tree) {
  const out = [];
  function walk(n, path) {
    path = path || [];
    if (!n.children) return;
    if (n.children.length === 0) {
      out.push({ id: n.id, title: n.title, path: path.join(' / ') });
      return;
    }
    for (const c of n.children) walk(c, path.concat([n.title]));
  }
  for (const r of tree || []) walk(r, []);
  return out;
}
