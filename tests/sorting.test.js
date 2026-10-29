import { describe, it, expect } from 'vitest';
import { makeComparator, sortArray } from '../extension/lib/sorting.js';

describe('sorting', () => {
  const items = [
    { id: '1', title: 'Banana', url: 'https://b.com', dateAdded: 2 },
    { id: '2', title: 'apple', url: 'https://a.com', dateAdded: 1 },
    { id: '3', title: 'Cherry', url: 'https://a.com/x', dateAdded: 3 },
  ];
  it('sorts title asc natural', () => {
    const s = sortArray(items, [{ key: 'title', direction: 'asc' }]);
    expect(s.map((x) => x.title)).toEqual(['apple', 'Banana', 'Cherry']);
  });
  it('multi-key domain then title', () => {
    const s = sortArray(items, [
      { key: 'hostname', direction: 'asc' },
      { key: 'title', direction: 'asc' },
    ]);
    expect(s[0].url).toBe('https://a.com');
  });
  it('deterministic repeated', () => {
    const a = sortArray(items, [{ key: 'title', direction: 'asc' }])
      .map((x) => x.id)
      .join();
    const b = sortArray(items, [{ key: 'title', direction: 'asc' }])
      .map((x) => x.id)
      .join();
    expect(a).toBe(b);
  });
  it('folders first', () => {
    const mixed = [
      { id: 'f', title: 'Z', url: null },
      { id: 'b', title: 'A', url: 'https://x.com' },
    ];
    const s = sortArray(mixed, [{ key: 'foldersFirst', direction: 'asc' }]);
    expect(s[0].id).toBe('f');
  });
  it('numeric url length', () => {
    const s = sortArray(items, [{ key: 'urlLength', direction: 'asc' }]);
    expect(s[0].url.length).toBeLessThanOrEqual(s[s.length - 1].url.length);
  });
});
