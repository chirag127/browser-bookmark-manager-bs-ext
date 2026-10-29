// Backup and recovery records.

export function createRecoveryRecord(opId, type, items) {
  return {
    id: opId,
    type,
    createdAt: Date.now(),
    items: items.map((it) => ({
      bookmarkId: it.id,
      originalParentId: it.parentId,
      originalTitle: it.title,
      originalUrl: it.url,
      originalIndex: it.index,
    })),
    status: 'pending',
  };
}

export function markRecoveryApplied(record, results) {
  return { ...record, status: 'applied', results, appliedAt: Date.now() };
}

export async function saveRecovery(store, record) {
  const list = (await store.get('recovery', [])) || [];
  list.unshift(record);
  // keep last 50
  await store.set('recovery', list.slice(0, 50));
}

export async function listRecovery(store) {
  return (await store.get('recovery', [])) || [];
}
