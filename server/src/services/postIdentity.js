export function toUnifiedLocalId(localId) {
  return `local_${Number.parseInt(localId, 10)}`;
}

export function toUnifiedApiId(apiId) {
  return String(apiId).startsWith('api_') ? String(apiId) : `api_${apiId}`;
}

export function parsePostIdentity(input) {
  if (input === null || input === undefined) return { sourceType: null, localId: null, apiId: null, unifiedId: null };

  const raw = String(input).trim();
  if (!raw) return { sourceType: null, localId: null, apiId: null, unifiedId: null };

  if (raw.startsWith('local_')) {
    const localId = Number.parseInt(raw.slice(6), 10);
    if (!Number.isFinite(localId)) return { sourceType: null, localId: null, apiId: null, unifiedId: null };
    return { sourceType: 'local', localId, apiId: null, unifiedId: toUnifiedLocalId(localId) };
  }

  if (raw.startsWith('api_')) {
    return { sourceType: 'api', localId: null, apiId: raw, unifiedId: raw };
  }

  const maybeLocal = Number.parseInt(raw, 10);
  if (Number.isFinite(maybeLocal) && String(maybeLocal) === raw) {
    return { sourceType: 'local', localId: maybeLocal, apiId: null, unifiedId: toUnifiedLocalId(maybeLocal) };
  }

  return { sourceType: 'api', localId: null, apiId: toUnifiedApiId(raw), unifiedId: toUnifiedApiId(raw) };
}

export function parseTags(tagValue) {
  if (!tagValue) return [];
  if (Array.isArray(tagValue)) return tagValue.map((t) => String(t).trim()).filter(Boolean);
  return String(tagValue)
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean);
}