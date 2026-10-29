// AI provider registry and adapters.

export class AIProvider {
  constructor(config) {
    this.config = config || {};
  }
  get id() {
    return this.config.id;
  }
  get displayName() {
    return this.config.displayName || this.config.id;
  }
  async testConnection() {
    throw new Error('not implemented');
  }
  async listModels() {
    return [];
  }
  async categorize(input, signal) {
    throw new Error('not implemented');
  }
  async generateDescription(input, signal) {
    throw new Error('not implemented');
  }
}

export function redactKey(s) {
  if (!s) return '';
  if (s.length <= 8) return '****';
  return s.slice(0, 4) + '...' + s.slice(-4);
}

export function validateCategorizationResponse(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const items = Array.isArray(raw.items) ? raw.items : Array.isArray(raw) ? raw : null;
  if (!items) return null;
  const out = [];
  for (const it of items) {
    if (!it || typeof it !== 'object') continue;
    if (typeof it.id !== 'string' && typeof it.id !== 'number') continue;
    out.push({
      id: String(it.id),
      category: typeof it.category === 'string' ? it.category : 'Unsorted',
      tags: Array.isArray(it.tags) ? it.tags.filter((t) => typeof t === 'string') : [],
      confidence: typeof it.confidence === 'number' ? Math.max(0, Math.min(1, it.confidence)) : 0.5,
      reason: typeof it.reason === 'string' ? it.reason : '',
      suggestedTitle: typeof it.suggestedTitle === 'string' ? it.suggestedTitle : undefined,
      suggestedDescription:
        typeof it.suggestedDescription === 'string' ? it.suggestedDescription : undefined,
    });
  }
  return { items: out };
}

export function buildPrompt(bookmarks, taxonomy, policy) {
  policy = policy || 'title-host';
  const items = bookmarks.map((b) => {
    const o = { id: b.id, title: b.title };
    if (policy !== 'title-only') {
      try {
        o.host = new URL(b.url).hostname;
      } catch (e) {
        o.host = '';
      }
    }
    if (policy === 'title-url' || policy === 'full') o.url = b.url;
    if (policy === 'full' && b._meta && b._meta.description) o.description = b._meta.description;
    return o;
  });
  return {
    system:
      'You are a bookmark categorization assistant. Return strict JSON: {"items":[{"id":string,"category":string,"tags":string[],"confidence":number 0-1,"reason":string}]}. Categories must come from the provided taxonomy. Never include executable code.',
    user:
      'Taxonomy: ' +
      JSON.stringify(taxonomy) +
      '\nBookmarks: ' +
      JSON.stringify(items) +
      '\nReturn JSON only.',
  };
}
