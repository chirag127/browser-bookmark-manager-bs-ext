import { describe, it, expect } from 'vitest';
import { evaluateCondition, runRules } from '../extension/lib/rules.js';
import { validateCategorizationResponse } from '../extension/lib/ai/provider-registry.js';
import {
  parseHtmlBookmarks,
  fromJsonBackup,
  toJsonBackup,
} from '../extension/lib/import-export.js';

describe('rules', () => {
  it('condition contains', () => {
    const bm = { id: '1', title: 'React docs', url: 'https://react.dev', _meta: {} };
    expect(
      evaluateCondition({ condition: { field: 'title', op: 'contains', value: 'react' } }, bm)
    ).toBe(true);
  });
  it('runRules matches', () => {
    const rules = [
      {
        id: 'r1',
        name: 'Dev',
        enabled: true,
        priority: 1,
        condition: { field: 'hostname', op: 'contains', value: 'react.dev' },
        actions: [{ type: 'category', value: 'Development' }],
      },
    ];
    const bms = [{ id: '1', title: 'X', url: 'https://react.dev/learn' }];
    const res = runRules(rules, bms);
    expect(res.length).toBe(1);
  });
});

describe('provider validation', () => {
  it('validates response', () => {
    const r = validateCategorizationResponse({
      items: [{ id: '1', category: 'Dev', tags: ['a'], confidence: 1.5, reason: 'x' }],
    });
    expect(r.items[0].confidence).toBe(1);
    expect(r.items[0].category).toBe('Dev');
  });
  it('rejects malformed', () => {
    expect(validateCategorizationResponse(null)).toBeNull();
    expect(validateCategorizationResponse({ foo: 1 })).toBeNull();
  });
});

describe('import/export', () => {
  it('parses html bookmarks', () => {
    const html =
      '<DL><p>\n<DT><H3>Folder</H3>\n<DL><p>\n<DT><A HREF="https://x.com">X</A>\n</DL><p>\n</DL><p>';
    const r = parseHtmlBookmarks(html);
    expect(r.children.length).toBe(1);
    expect(r.children[0].children.length).toBe(1);
    expect(r.children[0].children[0].url).toBe('https://x.com');
  });
  it('json backup roundtrip', () => {
    const j = toJsonBackup({ tree: [1, 2] });
    const r = fromJsonBackup(j);
    expect(r.ok).toBe(true);
    expect(r.data.tree).toEqual([1, 2]);
  });
  it('invalid json', () => {
    expect(fromJsonBackup('{bad').ok).toBe(false);
  });
});
