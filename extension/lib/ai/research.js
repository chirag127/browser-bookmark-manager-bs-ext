// Optional web research with sanitization and consent gating.

export async function fetchMetadata(url, opts = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), opts.timeout || 8000);
  try {
    const res = await fetch(url, { signal: controller.signal, mode: 'cors' });
    if (!res.ok) return { ok: false, status: res.status };
    const text = await res.text();
    const titleMatch = text.match(/<title[^>]*>([^<]*)<\/title>/i);
    const descMatch =
      text.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["']/i) ||
      text.match(/<meta[^>]+content=["']([^"']*)["'][^>]+name=["']description["']/i);
    return {
      ok: true,
      status: res.status,
      title: titleMatch ? titleMatch[1].trim() : '',
      description: descMatch ? descMatch[1].trim() : '',
    };
  } catch (e) {
    return { ok: false, message: String(e && e.message ? e.message : e) };
  } finally {
    clearTimeout(timeout);
  }
}

export function sanitizeText(s) {
  if (typeof s !== 'string') return '';
  return s
    .replace(/<[^>]*>/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 500);
}
