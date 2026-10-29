// Browser adapter wrapping chrome.bookmarks with a normalized interface.

export const BrowserAdapter = {
  async getTree() {
    if (typeof chrome === 'undefined' || !chrome.bookmarks)
      throw new Error('bookmarks API unavailable');
    return new Promise((resolve, reject) => {
      chrome.bookmarks.getTree((tree) => {
        if (chrome.runtime.lastError) reject(new Error(chrome.runtime.lastError.message));
        else resolve(tree);
      });
    });
  },
  async getChildren(id) {
    return new Promise((resolve, reject) => {
      chrome.bookmarks.getChildren(id, (nodes) => {
        if (chrome.runtime.lastError) reject(new Error(chrome.runtime.lastError.message));
        else resolve(nodes);
      });
    });
  },
  async create(input) {
    return new Promise((resolve, reject) => {
      chrome.bookmarks.create(input, (node) => {
        if (chrome.runtime.lastError) reject(new Error(chrome.runtime.lastError.message));
        else resolve(node);
      });
    });
  },
  async update(id, changes) {
    return new Promise((resolve, reject) => {
      chrome.bookmarks.update(id, changes, (node) => {
        if (chrome.runtime.lastError) reject(new Error(chrome.runtime.lastError.message));
        else resolve(node);
      });
    });
  },
  async move(id, destination) {
    return new Promise((resolve, reject) => {
      chrome.bookmarks.move(id, destination, (node) => {
        if (chrome.runtime.lastError) reject(new Error(chrome.runtime.lastError.message));
        else resolve(node);
      });
    });
  },
  async remove(id) {
    return new Promise((resolve, reject) => {
      chrome.bookmarks.remove(id, () => {
        if (chrome.runtime.lastError) reject(new Error(chrome.runtime.lastError.message));
        else resolve();
      });
    });
  },
  async removeTree(id) {
    return new Promise((resolve, reject) => {
      chrome.bookmarks.removeTree(id, () => {
        if (chrome.runtime.lastError) reject(new Error(chrome.runtime.lastError.message));
        else resolve();
      });
    });
  },
  async search(query) {
    return new Promise((resolve, reject) => {
      chrome.bookmarks.search(query, (nodes) => {
        if (chrome.runtime.lastError) reject(new Error(chrome.runtime.lastError.message));
        else resolve(nodes);
      });
    });
  },
  onChange(cb) {
    if (chrome.bookmarks && chrome.bookmarks.onChanged) chrome.bookmarks.onChanged.addListener(cb);
    if (chrome.bookmarks && chrome.bookmarks.onCreated) chrome.bookmarks.onCreated.addListener(cb);
    if (chrome.bookmarks && chrome.bookmarks.onRemoved) chrome.bookmarks.onRemoved.addListener(cb);
    if (chrome.bookmarks && chrome.bookmarks.onMoved) chrome.bookmarks.onMoved.addListener(cb);
  },
};

export function flattenTree(nodes, path = []) {
  const out = [];
  for (const n of nodes || []) {
    const p = [...path, n.title];
    out.push({ ...n, path: path.join(' / '), folderPath: path });
    if (n.children) out.push(...flattenTree(n.children, [...path, n.title]));
  }
  return out;
}

export function findNode(tree, id) {
  for (const n of tree || []) {
    if (n.id === id) return n;
    if (n.children) {
      const r = findNode(n.children, id);
      if (r) return r;
    }
  }
  return null;
}

export function parentOf(tree, id) {
  for (const n of tree || []) {
    if (n.children && n.children.some((c) => c.id === id)) return n;
    if (n.children) {
      const r = parentOf(n.children, id);
      if (r) return r;
    }
  }
  return null;
}

export function isDescendant(tree, ancestorId, nodeId) {
  const anc = findNode(tree, ancestorId);
  if (!anc || !anc.children) return false;
  // BFS
  const stack = [...(anc.children || [])];
  while (stack.length) {
    const cur = stack.pop();
    if (cur.id === nodeId) return true;
    if (cur.children) stack.push(...cur.children);
  }
  return false;
}
