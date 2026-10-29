// Storage abstraction over chrome.storage.local with in-memory fallback.

const memory = new Map();

function hasChromeStorage() {
  return typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local;
}

export async function get(key, fallback) {
  fallback = fallback === undefined ? null : fallback;
  if (hasChromeStorage()) {
    return new Promise((resolve) => {
      chrome.storage.local.get([key], (res) => {
        resolve(res && Object.prototype.hasOwnProperty.call(res, key) ? res[key] : fallback);
      });
    });
  }
  return memory.has(key) ? memory.get(key) : fallback;
}

export async function set(key, value) {
  if (hasChromeStorage()) {
    return new Promise((resolve) => {
      chrome.storage.local.set({ [key]: value }, () => resolve());
    });
  }
  memory.set(key, value);
}

export async function remove(key) {
  if (hasChromeStorage()) {
    return new Promise((resolve) => {
      chrome.storage.local.remove(key, () => resolve());
    });
  }
  memory.delete(key);
}

export async function getAll() {
  if (hasChromeStorage()) {
    return new Promise((resolve) => {
      chrome.storage.local.get(null, (res) => resolve(res || {}));
    });
  }
  return Object.fromEntries(memory);
}

export function makeStore(prefix) {
  prefix = prefix || 'bs-ext';
  return {
    async get(k, fb) {
      return get(prefix + ':' + k, fb);
    },
    async set(k, v) {
      return set(prefix + ':' + k, v);
    },
    async remove(k) {
      return remove(prefix + ':' + k);
    },
  };
}
