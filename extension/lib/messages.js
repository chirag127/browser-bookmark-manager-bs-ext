// Simple message helpers for runtime messaging.

export function send(msg) {
  return new Promise((resolve) => {
    try {
      chrome.runtime.sendMessage(msg, (res) => {
        if (chrome.runtime.lastError)
          resolve({ ok: false, error: chrome.runtime.lastError.message });
        else resolve(res);
      });
    } catch (e) {
      resolve({ ok: false, error: String(e) });
    }
  });
}

export function onMessage(handler) {
  if (chrome.runtime && chrome.runtime.onMessage) {
    chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
      const r = handler(msg, sender);
      if (r && typeof r.then === 'function') {
        r.then(sendResponse);
        return true;
      }
      sendResponse(r);
      return false;
    });
  }
}
