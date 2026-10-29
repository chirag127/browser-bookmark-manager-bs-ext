// URL utilities: parsing, normalization, domain extraction, public suffix handling.

const MULTI_PART_SUFFIXES = new Set([
  'co.uk',
  'org.uk',
  'ac.uk',
  'gov.uk',
  'net.uk',
  'sch.uk',
  'me.uk',
  'com.au',
  'net.au',
  'org.au',
  'edu.au',
  'gov.au',
  'asn.au',
  'id.au',
  'co.nz',
  'net.nz',
  'org.nz',
  'gov.nz',
  'ac.nz',
  'geek.nz',
  'maori.nz',
  'co.jp',
  'or.jp',
  'ne.jp',
  'ac.jp',
  'go.jp',
  'ed.jp',
  'co.kr',
  'or.kr',
  'ne.kr',
  'go.kr',
  're.kr',
  'pe.kr',
  'com.br',
  'net.br',
  'org.br',
  'gov.br',
  'edu.br',
  'co.in',
  'net.in',
  'org.in',
  'gov.in',
  'ac.in',
  'res.in',
  'edu.in',
  'com.cn',
  'net.cn',
  'org.cn',
  'gov.cn',
  'edu.cn',
  'co.za',
  'web.za',
  'org.za',
  'net.za',
  'gov.za',
  'com.mx',
  'net.mx',
  'org.mx',
  'gob.mx',
  'edu.mx',
  'com.ar',
  'net.ar',
  'org.ar',
  'gov.ar',
  'edu.ar',
  'com.tr',
  'net.tr',
  'org.tr',
  'gov.tr',
  'edu.tr',
  'gen.tr',
  'web.tr',
  'co.il',
  'org.il',
  'net.il',
  'ac.il',
  'gov.il',
  'com.sg',
  'net.sg',
  'org.sg',
  'gov.sg',
  'edu.sg',
  'com.hk',
  'net.hk',
  'org.hk',
  'gov.hk',
  'edu.hk',
  'com.tw',
  'net.tw',
  'org.tw',
  'gov.tw',
  'edu.tw',
  'com.my',
  'net.my',
  'org.my',
  'gov.my',
  'edu.my',
  'co.th',
  'or.th',
  'in.th',
  'ac.th',
  'go.th',
  'com.ph',
  'net.ph',
  'org.ph',
  'gov.ph',
  'edu.ph',
  'com.pk',
  'net.pk',
  'org.pk',
  'gov.pk',
  'edu.pk',
  'com.eg',
  'net.eg',
  'org.eg',
  'gov.eg',
  'edu.eg',
  'com.ng',
  'net.ng',
  'org.ng',
  'gov.ng',
  'edu.ng',
  'com.ua',
  'net.ua',
  'org.ua',
  'gov.ua',
  'edu.ua',
  'com.ru',
  'net.ru',
  'org.ru',
  'gov.ru',
  'edu.ru',
  'com.pl',
  'net.pl',
  'org.pl',
  'gov.pl',
  'edu.pl',
  'co.id',
  'or.id',
  'net.id',
  'ac.id',
  'go.id',
  'sch.id',
  'web.id',
  'com.vn',
  'net.vn',
  'org.vn',
  'gov.vn',
  'edu.vn',
  'com.bd',
  'net.bd',
  'org.bd',
  'gov.bd',
  'edu.bd',
  'com.pe',
  'net.pe',
  'org.pe',
  'gob.pe',
  'edu.pe',
  'com.co',
  'net.co',
  'org.co',
  'gov.co',
  'edu.co',
  'com.ve',
  'net.ve',
  'org.ve',
  'gov.ve',
  'edu.ve',
  'com.ec',
  'net.ec',
  'org.ec',
  'gov.ec',
  'edu.ec',
  'com.uy',
  'net.uy',
  'org.uy',
  'gub.uy',
  'edu.uy',
  'com.py',
  'net.py',
  'org.py',
  'gov.py',
  'edu.py',
  'com.bo',
  'net.bo',
  'org.bo',
  'gov.bo',
  'edu.bo',
  'com.cl',
  'net.cl',
  'org.cl',
  'gov.cl',
  'edu.cl',
]);

export function parseUrl(raw) {
  if (typeof raw !== 'string' || raw.trim() === '') return null;
  try {
    return new URL(raw.trim());
  } catch (e) {
    try {
      return new URL('https://' + raw.trim());
    } catch (e2) {
      return null;
    }
  }
}

export function hostnameOf(raw) {
  const u = parseUrl(raw);
  if (!u) return '';
  return u.hostname.toLowerCase();
}

export function registrableDomain(raw) {
  const host = hostnameOf(raw);
  if (!host) return '';
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) return host;
  if (host.includes(':')) return host;
  if (host === 'localhost') return host;
  const parts = host.split('.');
  if (parts.length <= 1) return host;
  if (parts.length >= 3) {
    const last2 = parts.slice(-2).join('.');
    if (MULTI_PART_SUFFIXES.has(last2)) {
      return parts.slice(-3).join('.');
    }
  }
  return parts.slice(-2).join('.');
}

export function tldOf(raw) {
  const host = hostnameOf(raw);
  const parts = host.split('.');
  return parts.length ? parts[parts.length - 1] : '';
}

export function normalizeUrl(raw, profile) {
  profile = profile || 'safe';
  const u = parseUrl(raw);
  if (!u) return raw;
  let host = u.hostname.toLowerCase();
  let path = u.pathname;
  let search = u.search;
  let hash = u.hash;

  if (profile === 'strict') {
    return u.href;
  }

  const trackingParams = new Set([
    'utm_source',
    'utm_medium',
    'utm_campaign',
    'utm_term',
    'utm_content',
    'fbclid',
    'gclid',
    'mc_cid',
    'mc_eid',
    'ref',
    'source',
  ]);

  if (profile === 'tracking') {
    const params = new URLSearchParams(search);
    for (const k of [...params.keys()]) {
      if (trackingParams.has(k.toLowerCase()) || k.toLowerCase().startsWith('utm_')) {
        params.delete(k);
      }
    }
    const sorted = [...params.entries()].sort((a, b) => a[0].localeCompare(b[0]));
    search = sorted.length
      ? '?' +
        sorted
          .map((pair) => encodeURIComponent(pair[0]) + '=' + encodeURIComponent(pair[1]))
          .join('&')
      : '';
  }

  if (profile === 'safe' || profile === 'tracking') {
    hash = '';
    if (path === '/') path = '';
  }

  if (profile === 'domain') {
    return u.protocol + '//' + host;
  }

  const port = u.port ? ':' + u.port : '';
  return u.protocol + '//' + host + port + path + search + hash;
}

export function urlKey(raw, profile) {
  return normalizeUrl(raw, profile);
}

export function isValidUrl(raw) {
  return parseUrl(raw) !== null;
}

export function schemeOf(raw) {
  const u = parseUrl(raw);
  return u ? u.protocol.replace(':', '') : '';
}

export function pathOf(raw) {
  const u = parseUrl(raw);
  return u ? u.pathname : '';
}
