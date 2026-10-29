// Deterministic rules engine.

export function evaluateCondition(rule, bookmark, ctx = {}) {
  const c = rule.condition || {};
  const field = c.field;
  const op = c.op;
  let val;
  if (field === 'hostname') val = bookmark.url ? new URL(bookmark.url).hostname : '';
  else if (field === 'url') val = bookmark.url || '';
  else if (field === 'title') val = bookmark.title || '';
  else if (field === 'category') val = bookmark._meta?.category || bookmark.category || '';
  else if (field === 'folder') val = (bookmark.folderPath || []).join('/');
  else val = bookmark[field];
  const target = c.value;
  switch (op) {
    case 'equals':
      return String(val) === String(target);
    case 'contains':
      return String(val).toLowerCase().includes(String(target).toLowerCase());
    case 'startsWith':
      return String(val).toLowerCase().startsWith(String(target).toLowerCase());
    case 'endsWith':
      return String(val).toLowerCase().endsWith(String(target).toLowerCase());
    case 'matches': {
      try {
        return new RegExp(target).test(String(val));
      } catch {
        return false;
      }
    }
    case 'in':
      return Array.isArray(target) && target.includes(val);
    case 'isEmpty':
      return !val;
    case 'isNotEmpty':
      return !!val;
    default:
      return false;
  }
}

export function runRules(rules, bookmarks, ctx = {}) {
  const enabled = (rules || [])
    .filter((r) => r.enabled !== false)
    .sort((a, b) => (a.priority || 0) - (b.priority || 0));
  const results = [];
  for (const bm of bookmarks) {
    const actions = [];
    for (const rule of enabled) {
      if (rule.scope && rule.scope !== 'all' && rule.scope !== ctx.scope) continue;
      let ok = true;
      if (Array.isArray(rule.conditions)) {
        ok = rule.conditions.every((c) => evaluateCondition({ condition: c }, bm, ctx));
      } else if (rule.condition) {
        ok = evaluateCondition(rule, bm, ctx);
      }
      if (ok) {
        actions.push({ ruleId: rule.id, ruleName: rule.name, actions: rule.actions || [] });
      }
    }
    if (actions.length) results.push({ bookmark: bm, matched: actions });
  }
  return results;
}

export function applyRuleActions(matched, dryRun = true) {
  const ops = [];
  for (const m of matched) {
    for (const r of m.matched) {
      for (const a of r.actions) {
        ops.push({ bookmarkId: m.bookmark.id, action: a, dryRun });
      }
    }
  }
  return ops;
}
