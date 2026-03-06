/**
 * Supabase Storage Adapter
 *
 * Supabase를 서버 원본이 아닌 계정/백업/멀티디바이스 동기화 계층으로 사용한다.
 * 앱 내부 모델은 camelCase를 유지하고, 테이블 컬럼은 snake_case로 매핑한다.
 *
 * 환경변수:
 * - VITE_SUPABASE_URL
 * - VITE_SUPABASE_ANON_KEY
 */

import { createClient } from '@supabase/supabase-js';
import logger from '../../utils/logger';

let supabase = null;

function isValidDate(value) {
  return Number.isFinite(new Date(value).getTime());
}

function toIsoString(value, fallbackToNow = false) {
  if (value && isValidDate(value)) {
    return new Date(value).toISOString();
  }
  return fallbackToNow ? new Date().toISOString() : null;
}

function toDateString(value, fallback = null) {
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value;
  }

  if (value && isValidDate(value)) {
    return new Date(value).toISOString().slice(0, 10);
  }

  if (fallback && isValidDate(fallback)) {
    return new Date(fallback).toISOString().slice(0, 10);
  }

  return null;
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function asObject(value, fallback = null) {
  if (!value || Array.isArray(value) || typeof value !== 'object') {
    return fallback;
  }
  return value;
}

function asNumber(value, fallback = 0) {
  return typeof value === 'number' && Number.isFinite(value)
    ? value
    : Number.isFinite(Number(value))
      ? Number(value)
      : fallback;
}

function mapDreamToRow(dream = {}) {
  return {
    id: dream.id,
    user_id: dream.userId,
    dream_date: toDateString(dream.date, dream.createdAt) || toDateString(new Date()),
    content: String(dream.content || ''),
    voice_url: dream.voiceUrl || null,
    analysis: asObject(dream.analysis),
    created_at: toIsoString(dream.createdAt, true),
    updated_at: toIsoString(dream.updatedAt, true),
    deleted_at: toIsoString(dream.deletedAt),
    source_device_id: dream.sourceDeviceId || 'unknown-device',
  };
}

function mapRowToDream(row = {}) {
  return {
    id: row.id,
    userId: row.user_id,
    date: row.dream_date || toDateString(row.created_at),
    content: row.content || '',
    voiceUrl: row.voice_url || null,
    analysis: asObject(row.analysis),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at,
    sourceDeviceId: row.source_device_id || null,
  };
}

function mapDailyLogToRow(log = {}) {
  return {
    id: log.id,
    user_id: log.userId,
    log_date: toDateString(log.date, log.createdAt) || toDateString(new Date()),
    condition: asNumber(log.condition, 3),
    emotions: asArray(log.emotions),
    stress_level: asNumber(log.stressLevel, 3),
    events: asArray(log.events),
    note: log.note || null,
    sleep: asObject(log.sleep),
    created_at: toIsoString(log.createdAt, true),
    updated_at: toIsoString(log.updatedAt, true),
    deleted_at: toIsoString(log.deletedAt),
    source_device_id: log.sourceDeviceId || 'unknown-device',
  };
}

function mapRowToDailyLog(row = {}) {
  return {
    id: row.id,
    userId: row.user_id,
    date: row.log_date || toDateString(row.created_at),
    condition: asNumber(row.condition, 3),
    emotions: asArray(row.emotions),
    stressLevel: asNumber(row.stress_level, 3),
    events: asArray(row.events),
    note: row.note || null,
    sleep: asObject(row.sleep),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at,
    sourceDeviceId: row.source_device_id || null,
  };
}

function mapForecastToRow(forecast = {}) {
  return {
    id: forecast.id,
    user_id: forecast.userId,
    forecast_date: toDateString(forecast.date, forecast.createdAt) || toDateString(new Date()),
    prediction: asObject(forecast.prediction, {}),
    actual: asObject(forecast.actual),
    accuracy: forecast.accuracy == null ? null : asNumber(forecast.accuracy, 0),
    experiment: asObject(forecast.experiment, {}),
    created_at: toIsoString(forecast.createdAt, true),
    updated_at: toIsoString(forecast.updatedAt, true),
    deleted_at: toIsoString(forecast.deletedAt),
    source_device_id: forecast.sourceDeviceId || 'unknown-device',
  };
}

function mapRowToForecast(row = {}) {
  return {
    id: row.id,
    userId: row.user_id,
    date: row.forecast_date || toDateString(row.created_at),
    prediction: asObject(row.prediction, {}),
    actual: asObject(row.actual),
    accuracy: row.accuracy == null ? null : asNumber(row.accuracy, 0),
    experiment: asObject(row.experiment, {}),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at,
    sourceDeviceId: row.source_device_id || null,
  };
}

function mapSymbolToRow(symbol = {}) {
  return {
    id: symbol.id,
    user_id: symbol.userId,
    name: String(symbol.name || '').trim(),
    meaning: symbol.meaning || null,
    count: asNumber(symbol.count, 0),
    dream_ids: asArray(symbol.dreamIds),
    first_seen: toDateString(symbol.firstSeen),
    last_seen: toDateString(symbol.lastSeen),
    category: symbol.category || null,
    notes: symbol.notes || null,
    created_at: toIsoString(symbol.createdAt, true),
    updated_at: toIsoString(symbol.updatedAt, true),
    deleted_at: toIsoString(symbol.deletedAt),
    source_device_id: symbol.sourceDeviceId || 'unknown-device',
  };
}

function mapRowToSymbol(row = {}) {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name || '',
    meaning: row.meaning || '',
    count: asNumber(row.count, 0),
    dreamIds: asArray(row.dream_ids),
    firstSeen: row.first_seen || null,
    lastSeen: row.last_seen || null,
    category: row.category || null,
    notes: row.notes || null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at,
    sourceDeviceId: row.source_device_id || null,
  };
}

function mapCoachPlanToRow(plan = {}) {
  return {
    id: plan.id,
    user_id: plan.userId,
    plan_date: toDateString(plan.date, plan.createdAt) || toDateString(new Date()),
    tasks: asArray(plan.tasks),
    completion_rate: asNumber(plan.completionRate, 0),
    created_at: toIsoString(plan.createdAt, true),
    updated_at: toIsoString(plan.updatedAt, true),
    deleted_at: toIsoString(plan.deletedAt),
    source_device_id: plan.sourceDeviceId || 'unknown-device',
  };
}

function mapRowToCoachPlan(row = {}) {
  return {
    id: row.id,
    userId: row.user_id,
    date: row.plan_date || toDateString(row.created_at),
    tasks: asArray(row.tasks),
    completionRate: asNumber(row.completion_rate, 0),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at,
    sourceDeviceId: row.source_device_id || null,
  };
}

const ENTITY_DEFINITIONS = {
  dreams: {
    table: 'dreams',
    toRow: mapDreamToRow,
    fromRow: mapRowToDream,
  },
  daily_logs: {
    table: 'daily_logs',
    toRow: mapDailyLogToRow,
    fromRow: mapRowToDailyLog,
  },
  forecasts: {
    table: 'forecasts',
    toRow: mapForecastToRow,
    fromRow: mapRowToForecast,
  },
  personal_symbols: {
    table: 'personal_symbols',
    toRow: mapSymbolToRow,
    fromRow: mapRowToSymbol,
  },
  coach_plans: {
    table: 'coach_plans',
    toRow: mapCoachPlanToRow,
    fromRow: mapRowToCoachPlan,
  },
};

const TABLE_TO_ENTITY = Object.fromEntries(
  Object.entries(ENTITY_DEFINITIONS).map(([entity, definition]) => [definition.table, entity]),
);

export function serializeEntityRecord(entity, record) {
  const definition = ENTITY_DEFINITIONS[entity];
  if (!definition) {
    throw new Error(`Unknown entity: ${entity}`);
  }
  return definition.toRow(record);
}

export function deserializeEntityRecord(entity, row) {
  const definition = ENTITY_DEFINITIONS[entity];
  if (!definition) {
    throw new Error(`Unknown entity: ${entity}`);
  }
  return definition.fromRow(row);
}

export function isConfigured() {
  return Boolean(
    import.meta.env.VITE_SUPABASE_URL &&
    import.meta.env.VITE_SUPABASE_ANON_KEY,
  );
}

function getClient() {
  if (supabase) return supabase;

  const url = import.meta.env.VITE_SUPABASE_URL;
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error('Supabase credentials not configured');
  }

  supabase = createClient(url, key);
  return supabase;
}

function applyDeletedFilter(query, includeDeleted = false) {
  return includeDeleted ? query : query.is('deleted_at', null);
}

function resolveEntityFromTable(table) {
  const entity = TABLE_TO_ENTITY[table];
  if (!entity) {
    throw new Error(`Unknown Supabase table: ${table}`);
  }
  return entity;
}

async function signUp(email, password) {
  const client = getClient();
  const { data, error } = await client.auth.signUp({ email, password });
  if (error) throw error;
  return data;
}

async function signIn(email, password) {
  const client = getClient();
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

async function signOut() {
  const client = getClient();
  const { error } = await client.auth.signOut();
  if (error) throw error;
}

async function getSession() {
  const client = getClient();
  const { data, error } = await client.auth.getSession();
  if (error) throw error;
  return data.session;
}

async function saveDream(dream) {
  const client = getClient();
  const row = serializeEntityRecord('dreams', dream);
  const { data, error } = await client
    .from('dreams')
    .upsert(row)
    .select('*')
    .single();
  if (error) throw error;
  return deserializeEntityRecord('dreams', data);
}

async function getDreams(userId, options = {}) {
  const client = getClient();
  let query = applyDeletedFilter(
    client.from('dreams').select('*').eq('user_id', userId),
    options.includeDeleted,
  ).order('created_at', { ascending: false });

  if (options.limit) {
    query = query.limit(options.limit);
  }
  if (options.startDate) {
    query = query.gte('dream_date', toDateString(options.startDate));
  }
  if (options.endDate) {
    query = query.lte('dream_date', toDateString(options.endDate));
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data || []).map((row) => deserializeEntityRecord('dreams', row));
}

async function getDream(id, options = {}) {
  const client = getClient();
  let query = client
    .from('dreams')
    .select('*')
    .eq('id', id);

  query = applyDeletedFilter(query, options.includeDeleted);

  const { data, error } = await query.single();
  if (error) throw error;
  return deserializeEntityRecord('dreams', data);
}

async function deleteDream(id) {
  const client = getClient();
  const { error } = await client
    .from('dreams')
    .update({
      deleted_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);
  if (error) throw error;
}

async function saveDailyLog(log) {
  const client = getClient();
  const row = serializeEntityRecord('daily_logs', log);
  const { data, error } = await client
    .from('daily_logs')
    .upsert(row)
    .select('*')
    .single();
  if (error) throw error;
  return deserializeEntityRecord('daily_logs', data);
}

async function getDailyLogs(userId, options = {}) {
  const client = getClient();
  let query = applyDeletedFilter(
    client.from('daily_logs').select('*').eq('user_id', userId),
    options.includeDeleted,
  ).order('log_date', { ascending: false });

  if (options.limit) {
    query = query.limit(options.limit);
  }
  if (options.startDate) {
    query = query.gte('log_date', toDateString(options.startDate));
  }
  if (options.endDate) {
    query = query.lte('log_date', toDateString(options.endDate));
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data || []).map((row) => deserializeEntityRecord('daily_logs', row));
}

async function saveForecast(forecast) {
  const client = getClient();
  const row = serializeEntityRecord('forecasts', forecast);
  const { data, error } = await client
    .from('forecasts')
    .upsert(row)
    .select('*')
    .single();
  if (error) throw error;
  return deserializeEntityRecord('forecasts', data);
}

async function getForecasts(userId, options = {}) {
  const client = getClient();
  let query = applyDeletedFilter(
    client.from('forecasts').select('*').eq('user_id', userId),
    options.includeDeleted,
  ).order('forecast_date', { ascending: false });

  if (options.limit) {
    query = query.limit(options.limit);
  }
  if (options.startDate) {
    query = query.gte('forecast_date', toDateString(options.startDate));
  }
  if (options.endDate) {
    query = query.lte('forecast_date', toDateString(options.endDate));
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data || []).map((row) => deserializeEntityRecord('forecasts', row));
}

async function saveSymbol(symbol) {
  const client = getClient();
  const row = serializeEntityRecord('personal_symbols', symbol);
  const { data, error } = await client
    .from('personal_symbols')
    .upsert(row)
    .select('*')
    .single();
  if (error) throw error;
  return deserializeEntityRecord('personal_symbols', data);
}

async function getSymbols(userId, options = {}) {
  const client = getClient();
  let query = applyDeletedFilter(
    client.from('personal_symbols').select('*').eq('user_id', userId),
    options.includeDeleted,
  ).order('count', { ascending: false });

  if (options.limit) {
    query = query.limit(options.limit);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data || []).map((row) => deserializeEntityRecord('personal_symbols', row));
}

async function getCoachPlans(userId, options = {}) {
  const client = getClient();
  let query = applyDeletedFilter(
    client.from('coach_plans').select('*').eq('user_id', userId),
    options.includeDeleted,
  ).order('plan_date', { ascending: false });

  if (options.limit) {
    query = query.limit(options.limit);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data || []).map((row) => deserializeEntityRecord('coach_plans', row));
}

async function syncPendingChanges(changes) {
  const client = getClient();

  for (const change of changes) {
    try {
      const entity = change.entity || resolveEntityFromTable(change.table);
      const definition = ENTITY_DEFINITIONS[entity];
      if (!definition) continue;

      const payload = {
        ...(change.payload || change.data || {}),
        id: change.recordId || change.payload?.id || change.data?.id,
        updatedAt: change.clientUpdatedAt || change.payload?.updatedAt || change.data?.updatedAt,
        sourceDeviceId: change.sourceDeviceId || change.payload?.sourceDeviceId || change.data?.sourceDeviceId,
      };

      if ((change.op || change.operation) === 'delete' && !payload.deletedAt) {
        payload.deletedAt = payload.updatedAt || new Date().toISOString();
      }

      const row = definition.toRow(payload);
      const { error } = await client.from(definition.table).upsert(row);
      if (error) throw error;
    } catch (error) {
      logger.error(`[Supabase] Sync failed for ${change.entity || change.table}:`, error);
      throw error;
    }
  }
}

async function pullBootstrapData(userId) {
  if (!userId) {
    return {
      dreams: [],
      daily_logs: [],
      forecasts: [],
      personal_symbols: [],
      coach_plans: [],
    };
  }

  const [dreams, dailyLogs, forecasts, personalSymbols, coachPlans] = await Promise.all([
    getDreams(userId, { includeDeleted: true }),
    getDailyLogs(userId, { includeDeleted: true }),
    getForecasts(userId, { includeDeleted: true }),
    getSymbols(userId, { includeDeleted: true }),
    getCoachPlans(userId, { includeDeleted: true }),
  ]);

  return {
    dreams,
    daily_logs: dailyLogs,
    forecasts,
    personal_symbols: personalSymbols,
    coach_plans: coachPlans,
  };
}

export const SupabaseStorageAdapter = {
  name: 'supabase',
  isConfigured,

  signUp,
  signIn,
  signOut,
  getSession,

  saveDream,
  getDreams,
  getDream,
  deleteDream,

  saveDailyLog,
  getDailyLogs,

  saveForecast,
  getForecasts,

  saveSymbol,
  getSymbols,
  getCoachPlans,

  syncPendingChanges,
  pullBootstrapData,
};

export default SupabaseStorageAdapter;
