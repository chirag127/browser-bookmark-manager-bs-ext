import { describe, it, expect } from 'vitest';
import { findDuplicates } from '../extension/lib/duplicates.js';

describe('duplicates', () => {
  const nodes = [
    { id: '1', title: 'A', url: 'https://example.com/x?utm_source=y', parentId: '0' },
    { id: '2', title: 'A2', url: 'https://example.com/x', parentId: '0' },
    { id: '3', title: 'B', url: 'https://other.com', parentId: '0' },
  ];
  it('detects normalized duplicates', () => {
    const g = findDuplicates(nodes, 'tracking');
    expect(g.length).toBeGreaterThan(0);
  });
  it('exact duplicates strict', () => {
    const n2 = [
      { id: '1', title: 'A', url: 'https://x.com', parentId: '0' },
      { id: '2', title: 'A', url: 'https://x.com', parentId: '0' },
    ];
    const g = findDuplicates(n2, 'strict');
    expect(g.length).toBe(1);
  });
  it('no duplicates returns empty', () => {
    const g = findDuplicates(
      [{ id: '1', title: 'A', url: 'https://x.com', parentId: '0' }],
      'safe'
    );
    expect(g.length).toBe(0);
  });
});
