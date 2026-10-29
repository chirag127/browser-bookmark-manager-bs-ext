import { buildPrompt, validateCategorizationResponse } from './provider-registry.js';
import { createProvider } from './providers/index.js';

export async function categorizeBookmarks(bookmarks, settings, opts = {}) {
  const provider = createProvider(settings?.providerConfig);
  if (!provider) throw new Error('No AI provider configured');
  const taxonomy = settings?.taxonomy || [
    'General',
    'Development',
    'Research',
    'Personal',
    'Unsorted',
  ];
  const policy = settings?.dataPolicy || 'title-host';
  const prompt = buildPrompt(bookmarks, taxonomy, policy);
  const signal = opts.signal;
  const { parsed } = await provider.categorize({ prompt }, signal);
  const validated = validateCategorizationResponse(parsed);
  if (!validated) throw new Error('Invalid AI response');
  return validated.items;
}

export function applySuggestions(bookmarks, suggestions, mode = 'suggest') {
  const byId = new Map(suggestions.map((s) => [s.id, s]));
  return bookmarks.map((b) => {
    const s = byId.get(String(b.id));
    if (!s) return b;
    return {
      ...b,
      aiSuggestion: {
        category: s.category,
        tags: s.tags,
        confidence: s.confidence,
        reason: s.reason,
        suggestedTitle: s.suggestedTitle,
        suggestedDescription: s.suggestedDescription,
      },
    };
  });
}
