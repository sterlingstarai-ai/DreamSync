/**
 * Supabase Storage Adapter (Phase 2+)
 *
 * Supabase 연동 스토리지
 * 환경변수: VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY
 */

import { createClient } from '@supabase/supabase-js';

let supabase = null;

/**
 * Supabase 클라이언트 초기화
 */
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

/**
 * 인증
 */
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

/**
 * Dreams CRUD
 */
async function saveDream(dream) {
  const client = getClient();
  const { data, error } = await client
    .from('dreams')
    .upsert(dream)
    .select()
    .single();
  if (error) throw error;
  return data;
}

async function getDreams(userId, options = {}) {
  const client = getClient();
  let query = client
    .from('dreams')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (options.limit) {
    query = query.limit(options.limit);
  }
  if (options.startDate) {
    query = query.gte('created_at', options.startDate);
  }
  if (options.endDate) {
    query = query.lte('created_at', options.endDate);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data;
}

async function getDream(id) {
  const client = getClient();
  const { data, error } = await client
    .from('dreams')
    .select('*')
    .eq('id', id)
    .single();
  if (error) throw error;
  return data;
}

async function deleteDream(id) {
  const client = getClient();
  const { error } = await client
    .from('dreams')
    .delete()
    .eq('id', id);
  if (error) throw error;
}

/**
 * DailyLogs CRUD
 */
async function saveDailyLog(log) {
  const client = getClient();
  const { data, error } = await client
    .from('daily_logs')
    .upsert(log)
    .select()
    .single();
  if (error) throw error;
  return data;
}

async function getDailyLogs(userId, options = {}) {
  const client = getClient();
  let query = client
    .from('daily_logs')
    .select('*')
    .eq('user_id', userId)
    .order('date', { ascending: false });

  if (options.limit) {
    query = query.limit(options.limit);
  }
  if (options.startDate) {
    query = query.gte('date', options.startDate);
  }
  if (options.endDate) {
    query = query.lte('date', options.endDate);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data;
}

/**
 * Forecasts CRUD
 */
async function saveForecast(forecast) {
  const client = getClient();
  const { data, error } = await client
    .from('forecasts')
    .upsert(forecast)
    .select()
    .single();
  if (error) throw error;
  return data;
}

async function getForecasts(userId, options = {}) {
  const client = getClient();
  let query = client
    .from('forecasts')
    .select('*')
    .eq('user_id', userId)
    .order('date', { ascending: false });

  if (options.limit) {
    query = query.limit(options.limit);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data;
}

/**
 * Symbols CRUD
 */
async function saveSymbol(symbol) {
  const client = getClient();
  const { data, error } = await client
    .from('personal_symbols')
    .upsert(symbol)
    .select()
    .single();
  if (error) throw error;
  return data;
}

async function getSymbols(userId) {
  const client = getClient();
  const { data, error } = await client
    .from('personal_symbols')
    .select('*')
    .eq('user_id', userId)
    .order('frequency', { ascending: false });
  if (error) throw error;
  return data;
}

/**
 * Sync Queue (오프라인 지원)
 */
async function syncPendingChanges(changes) {
  const client = getClient();

  for (const change of changes) {
    try {
      const { table, operation, data } = change;

      if (operation === 'upsert') {
        await client.from(table).upsert(data);
      } else if (operation === 'delete') {
        await client.from(table).delete().eq('id', data.id);
      }
    } catch (error) {
      console.error(`[Supabase] Sync failed for ${change.table}:`, error);
      throw error;
    }
  }
}

export const SupabaseStorageAdapter = {
  name: 'supabase',

  // Auth
  signUp,
  signIn,
  signOut,
  getSession,

  // Dreams
  saveDream,
  getDreams,
  getDream,
  deleteDream,

  // DailyLogs
  saveDailyLog,
  getDailyLogs,

  // Forecasts
  saveForecast,
  getForecasts,

  // Symbols
  saveSymbol,
  getSymbols,

  // Sync
  syncPendingChanges,
};

export default SupabaseStorageAdapter;
