// Import/export for Netscape HTML bookmark format and JSON backup.

export function bookmarksToHtml(tree, title) {
  title = title || 'Bookmarks';
  let out = '<!DOCTYPE NETSCAPE-Bookmark-file-1>\n';
  out += '<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">\n';
  out += '<TITLE>' + escapeHtml(title) + '</TITLE>\n';
  out += '<H1>' + escapeHtml(title) + '</H1>\n';
  out += '<DL><p>\n';
  function walk(nodes, indent) {
    indent = indent || '';
    for (const n of nodes || []) {
      if (n.url) {
        out +=
          indent +
          '<DT><A HREF="' +
          escapeAttr(n.url) +
          '">' +
          escapeHtml(n.title || '') +
          '</A>\n';
      } else {
        out += indent + '<DT><H3>' + escapeHtml(n.title || '') + '</H3>\n';
        out += indent + '<DL><p>\n';
        walk(n.children || [], indent + '    ');
        out += indent + '</DL><p>\n';
      }
    }
  }
  const roots = Array.isArray(tree) ? tree : [tree];
  for (const r of roots) {
    if (r.children) walk(r.children, '    ');
    else if (r.url) walk([r], '    ');
  }
  out += '</DL><p>\n';
  return out;
}

export function parseHtmlBookmarks(html) {
  const result = { title: 'Imported', children: [] };
  const stack = [result];
  const lines = html.split(/\n/);
  for (const line of lines) {
    const h3 = line.match(/<H3[^>]*>(.*?)<\/H3>/i);
    const a = line.match(/<A\s+HREF="([^"]*)"[^>]*>(.*?)<\/A>/i);
    const dlClose = /<\/DL>/i.test(line);
    if (h3) {
      const folder = { title: unescapeHtml(h3[1]), children: [] };
      stack[stack.length - 1].children.push(folder);
      stack.push(folder);
    } else if (a) {
      const bm = { title: unescapeHtml(a[2]), url: a[1] };
      stack[stack.length - 1].children.push(bm);
    } else if (dlClose) {
      if (stack.length > 1) stack.pop();
    }
  }
  return result;
}

export function toJsonBackup(data) {
  return JSON.stringify(
    Object.assign({ version: 1, exportedAt: new Date().toISOString() }, data || {}),
    null,
    2
  );
}

export function fromJsonBackup(text) {
  let obj;
  try {
    obj = JSON.parse(text);
  } catch (e) {
    return { ok: false, error: 'invalid json' };
  }
  if (!obj || typeof obj !== 'object') return { ok: false, error: 'invalid backup' };
  if (!obj.version) return { ok: false, error: 'missing version' };
  return { ok: true, data: obj };
}

function escapeHtml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
function escapeAttr(s) {
  return String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;');
}
function unescapeHtml(s) {
  return String(s)
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"');
}
