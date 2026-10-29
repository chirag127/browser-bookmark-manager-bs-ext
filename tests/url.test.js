import { describe, it, expect } from 'vitest';
import * as U from '../extension/lib/url.js';

describe('url', () => {
  it('parses basic url', () => {
    expect(U.hostnameOf('https://Example.com:443/path?q=1#frag')).toBe('example.com');
  });
  it('registrable domain handles co.uk', () => {
    expect(U.registrableDomain('https://www.bbc.co.uk/news')).toBe('bbc.co.uk');
    expect(U.registrableDomain('https://sub.example.com')).toBe('example.com');
  });
  it('normalizes tracking params', () => {
    const n = U.normalizeUrl('https://example.com/p?utm_source=x&a=1', 'tracking');
    expect(n).toContain('a=1');
    expect(n).not.toContain('utm_source');
  });
  it('domain-only profile', () => {
    expect(U.normalizeUrl('https://example.com/a/b?x=1', 'domain')).toBe('https://example.com');
  });
  it('invalid url returns null parse', () => {
    expect(U.parseUrl('not a url :::')).toBeNull();
  });
  it('tld extraction', () => {
    expect(U.tldOf('https://example.co.uk')).toBe('uk');
  });
});
