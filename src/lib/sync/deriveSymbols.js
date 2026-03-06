import { generateId } from '../utils/id';

function normalizeName(value) {
  return String(value || '').trim();
}

function toDateOnly(value) {
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value;
  }

  const parsed = new Date(value);
  if (!Number.isFinite(parsed.getTime())) {
    return null;
  }

  return parsed.toISOString().slice(0, 10);
}

export function rebuildPersonalSymbols({ userId, dreams = [], existingSymbols = [] }) {
  if (!userId) return [];

  const existingByName = new Map(
    existingSymbols
      .filter((symbol) => symbol?.userId === userId && !symbol?.deletedAt && normalizeName(symbol.name))
      .map((symbol) => [normalizeName(symbol.name), symbol]),
  );

  const derived = new Map();

  for (const dream of dreams) {
    if (!dream || dream.userId !== userId || dream.deletedAt) continue;

    const dreamDate = toDateOnly(dream.date || dream.createdAt);
    const symbols = Array.isArray(dream.analysis?.symbols) ? dream.analysis.symbols : [];

    for (const analyzedSymbol of symbols) {
      const name = normalizeName(analyzedSymbol?.name);
      if (!name) continue;

      const existing = existingByName.get(name);
      const current = derived.get(name) || {
        id: existing?.id || generateId(),
        userId,
        name,
        meaning: existing?.meaning || analyzedSymbol?.personalMeaning || analyzedSymbol?.meaning || '',
        dreamIds: [],
        count: 0,
        firstSeen: dreamDate,
        lastSeen: dreamDate,
        createdAt: existing?.createdAt || dream.createdAt || new Date().toISOString(),
        updatedAt: existing?.updatedAt || dream.updatedAt || new Date().toISOString(),
        deletedAt: null,
        sourceDeviceId: existing?.sourceDeviceId || dream.sourceDeviceId || 'derived-symbols',
        category: existing?.category || null,
        notes: existing?.notes || null,
      };

      if (!current.dreamIds.includes(dream.id)) {
        current.dreamIds.push(dream.id);
      }

      current.count = current.dreamIds.length;
      current.firstSeen = [current.firstSeen, dreamDate].filter(Boolean).sort()[0] || null;
      current.lastSeen = [current.lastSeen, dreamDate].filter(Boolean).sort().slice(-1)[0] || null;
      current.updatedAt = dream.updatedAt || current.updatedAt || new Date().toISOString();

      derived.set(name, current);
    }
  }

  return Array.from(derived.values()).sort((a, b) => {
    if (b.count !== a.count) {
      return b.count - a.count;
    }
    return a.name.localeCompare(b.name, 'ko');
  });
}

export default rebuildPersonalSymbols;
