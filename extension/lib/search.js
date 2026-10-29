import { hostnameOf, registrableDomain } from './url.js';

function norm(s) {
  return (s == null ? '' : String(s)).toLowerCase();
}

export function buildIndex(nodes) {
  // nodes: flat list of bookmark nodes with path
  return nodes.map((n) => {
    const meta = n._meta || {};
    const tags = n.tags || meta.tags || [];
    const haystack = [
      n.title,
      n.url,
      n.path,
      n.folderPath && n.folderPath.join(' '),
      meta.description,
      meta.category,
      (meta.tags || []).join(' '),
      tags.join(' '),
    ]
      .map(norm)
      .join(' \u0001 ');
    return { node: n, haystack };
  });
}

export function matches(node, query, filters = {}) {
  const q = (query || '').trim();
  const terms = parseQuery(q);
  const text = [
    node.title,
    node.url,
    node.path,
    node.folderPath && node.folderPath.join(' '),
    node._meta?.description,
    node._meta?.category,
    (node.tags || node._meta?.tags || []).join(' '),
  ]
    .map((x) => (x == null ? '' : String(x)))
    .join(' ');
  const low = text.toLowerCase();
  // term matching
  for (const t of terms.include) {
    if (t.type === 'phrase') {
      if (!low.includes(t.value.toLowerCase())) return false;
    } else if (t.type === 'exclude') {
      if (low.includes(t.value.toLowerCase())) return false;
    } else {
      if (!low.includes(t.value.toLowerCase())) return false;
    }
  }
  // filters
  if (filters.domain && !hostnameOf(node.url || '').includes(filters.domain.toLowerCase()))
    return false;
  if (filters.category && (node._meta?.category || node.category) !== filters.category)
    return false;
  if (filters.hasDescription === true && !(node._meta?.description || node.description))
    return false;
  if (filters.hasDescription === false && (node._meta?.description || node.description))
    return false;
  if (filters.hasTags === true && !(node.tags || node._meta?.tags || []).length) return false;
  if (filters.hasTags === false && (node.tags || node._meta?.tags || []).length) return false;
  if (filters.folder && node.parentId !== filters.folder && node.path !== filters.folder)
    return false;
  if (filters.duplicateCandidate && !node.duplicateCandidate) return false;
  return true;
}

export function parseQuery(q) {
  const include = [];
  const regex = /"([^"]+)"|(-)(\S+)|(\S+)/g;
  let m;
  while ((m = regex.exec(q)) !== null) {
    if (m[1]) include.push({ type: 'phrase', value: m[1] });
    else if (m[2] && m[3]) include.push({ type: 'exclude', value: m[3] });
    else if (m[4]) include.push({ type: 'term', value: m[4] });
  }
  return { include };
}

export function searchNodes(flatNodes, query, filters, scopeFolderId) {
  let candidates = flatNodes;
  if (scopeFolderId) {
    // only descendants of folder
    candidates = flatNodes.filter(
      (n) => (n.folderPath || []).includes(scopeFolderId) || n.parentId === scopeFolderId
    );
  }
  return candidates.filter((n) => matches(n, query, filters));
}
