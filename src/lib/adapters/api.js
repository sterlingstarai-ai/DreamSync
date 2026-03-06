/**
 * API Adapter Interface
 * Local-first 저장 구조 위에 원격 백업/동기화를 추가한다.
 */
import logger from '../utils/logger';
import SupabaseStorageAdapter from './storage/supabase';

const LocalAPIAdapter = {
  name: 'local',
  isConfigured() {
    return true;
  },
  async processSyncBatch(batch = []) {
    return { processed: batch.length };
  },
  async pullBootstrapData(_userId) {
    return {
      dreams: [],
      daily_logs: [],
      forecasts: [],
      personal_symbols: [],
      coach_plans: [],
    };
  },
};

const SupabaseAPIAdapter = {
  name: 'supabase',
  isConfigured() {
    return SupabaseStorageAdapter.isConfigured();
  },
  async signUp(email, password) {
    return await SupabaseStorageAdapter.signUp(email, password);
  },
  async signIn(email, password) {
    return await SupabaseStorageAdapter.signIn(email, password);
  },
  async signOut() {
    return await SupabaseStorageAdapter.signOut();
  },
  async getSession() {
    return await SupabaseStorageAdapter.getSession();
  },
  async processSyncBatch(batch = []) {
    const changes = batch.filter((item) => item?.entity && item?.recordId);

    if (changes.length === 0) {
      return { processed: 0 };
    }

    await SupabaseStorageAdapter.syncPendingChanges(changes);
    return { processed: changes.length };
  },
  async pullBootstrapData(userId) {
    return await SupabaseStorageAdapter.pullBootstrapData(userId);
  },
};

const adapters = {
  local: LocalAPIAdapter,
  supabase: SupabaseAPIAdapter,
};

let currentAdapter = LocalAPIAdapter;

export function setAPIAdapter(type) {
  const adapter = adapters[type];
  if (!adapter) {
    logger.warn(`Unknown API adapter: ${type}, falling back to local`);
    currentAdapter = LocalAPIAdapter;
    return;
  }
  currentAdapter = adapter;
}

export function getAPIAdapter() {
  return currentAdapter;
}

export default {
  setAPIAdapter,
  getAPIAdapter,
};
