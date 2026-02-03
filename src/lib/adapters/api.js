/**
 * API Adapter Interface
 * Local API ↔ Supabase API 전환 가능한 구조
 *
 * 어댑터 패턴:
 * - LocalAPIAdapter: 로컬 스토리지 기반 (Phase 1)
 * - SupabaseAPIAdapter: Supabase 연동 (Phase 2+)
 */

import storage from './storage';

/**
 * API Adapter 인터페이스
 * @typedef {Object} APIAdapter
 * @property {Object} dreams - 꿈 관련 API
 * @property {Object} dailyLogs - 체크인 관련 API
 * @property {Object} forecasts - 예보 관련 API
 * @property {Object} symbols - 심볼 관련 API
 */

/**
 * Local API Adapter (Phase 1)
 * Zustand persist와 함께 동작
 * 이 어댑터는 직접 사용하지 않고, Zustand store를 통해 접근
 */
const LocalAPIAdapter = {
  name: 'local',

  dreams: {
    async getAll(userId) {
      const dreams = await storage.get('dreams') || [];
      return dreams.filter(d => d.userId === userId);
    },
    async create(dream) {
      const dreams = await storage.get('dreams') || [];
      dreams.unshift(dream);
      await storage.set('dreams', dreams);
      return dream;
    },
    async update(dreamId, updates) {
      const dreams = await storage.get('dreams') || [];
      const index = dreams.findIndex(d => d.id === dreamId);
      if (index !== -1) {
        dreams[index] = { ...dreams[index], ...updates };
        await storage.set('dreams', dreams);
        return dreams[index];
      }
      return null;
    },
    async delete(dreamId) {
      const dreams = await storage.get('dreams') || [];
      const filtered = dreams.filter(d => d.id !== dreamId);
      await storage.set('dreams', filtered);
    },
  },

  dailyLogs: {
    async getAll(userId) {
      const logs = await storage.get('dailyLogs') || [];
      return logs.filter(l => l.userId === userId);
    },
    async getByDate(userId, date) {
      const logs = await storage.get('dailyLogs') || [];
      return logs.find(l => l.userId === userId && l.date === date);
    },
    async create(log) {
      const logs = await storage.get('dailyLogs') || [];
      logs.unshift(log);
      await storage.set('dailyLogs', logs);
      return log;
    },
    async update(logId, updates) {
      const logs = await storage.get('dailyLogs') || [];
      const index = logs.findIndex(l => l.id === logId);
      if (index !== -1) {
        logs[index] = { ...logs[index], ...updates };
        await storage.set('dailyLogs', logs);
        return logs[index];
      }
      return null;
    },
  },

  forecasts: {
    async getAll(userId) {
      const forecasts = await storage.get('forecasts') || [];
      return forecasts.filter(f => f.userId === userId);
    },
    async getByDate(userId, date) {
      const forecasts = await storage.get('forecasts') || [];
      return forecasts.find(f => f.userId === userId && f.date === date);
    },
    async create(forecast) {
      const forecasts = await storage.get('forecasts') || [];
      forecasts.unshift(forecast);
      await storage.set('forecasts', forecasts);
      return forecast;
    },
    async update(forecastId, updates) {
      const forecasts = await storage.get('forecasts') || [];
      const index = forecasts.findIndex(f => f.id === forecastId);
      if (index !== -1) {
        forecasts[index] = { ...forecasts[index], ...updates };
        await storage.set('forecasts', forecasts);
        return forecasts[index];
      }
      return null;
    },
  },

  symbols: {
    async getAll(userId) {
      const symbols = await storage.get('symbols') || [];
      return symbols.filter(s => s.userId === userId);
    },
    async create(symbol) {
      const symbols = await storage.get('symbols') || [];
      symbols.push(symbol);
      await storage.set('symbols', symbols);
      return symbol;
    },
    async update(symbolId, updates) {
      const symbols = await storage.get('symbols') || [];
      const index = symbols.findIndex(s => s.id === symbolId);
      if (index !== -1) {
        symbols[index] = { ...symbols[index], ...updates };
        await storage.set('symbols', symbols);
        return symbols[index];
      }
      return null;
    },
    async delete(symbolId) {
      const symbols = await storage.get('symbols') || [];
      const filtered = symbols.filter(s => s.id !== symbolId);
      await storage.set('symbols', filtered);
    },
  },
};

/**
 * Supabase API Adapter (Phase 2+)
 */
const SupabaseAPIAdapter = {
  name: 'supabase',

  // TODO: Phase 2에서 Supabase 클라이언트로 구현
  dreams: {
    async getAll(userId) {
      // return supabase.from('dreams').select('*').eq('user_id', userId);
      throw new Error('Supabase API not implemented');
    },
    async create(dream) {
      throw new Error('Supabase API not implemented');
    },
    async update(dreamId, updates) {
      throw new Error('Supabase API not implemented');
    },
    async delete(dreamId) {
      throw new Error('Supabase API not implemented');
    },
  },

  dailyLogs: {
    async getAll(userId) {
      throw new Error('Supabase API not implemented');
    },
    async getByDate(userId, date) {
      throw new Error('Supabase API not implemented');
    },
    async create(log) {
      throw new Error('Supabase API not implemented');
    },
    async update(logId, updates) {
      throw new Error('Supabase API not implemented');
    },
  },

  forecasts: {
    async getAll(userId) {
      throw new Error('Supabase API not implemented');
    },
    async getByDate(userId, date) {
      throw new Error('Supabase API not implemented');
    },
    async create(forecast) {
      throw new Error('Supabase API not implemented');
    },
    async update(forecastId, updates) {
      throw new Error('Supabase API not implemented');
    },
  },

  symbols: {
    async getAll(userId) {
      throw new Error('Supabase API not implemented');
    },
    async create(symbol) {
      throw new Error('Supabase API not implemented');
    },
    async update(symbolId, updates) {
      throw new Error('Supabase API not implemented');
    },
    async delete(symbolId) {
      throw new Error('Supabase API not implemented');
    },
  },
};

/**
 * API Adapter 레지스트리
 */
const adapters = {
  local: LocalAPIAdapter,
  supabase: SupabaseAPIAdapter,
};

/**
 * 현재 활성 어댑터
 */
let currentAdapter = LocalAPIAdapter;

/**
 * API Adapter 설정
 * @param {'local' | 'supabase'} type
 */
export function setAPIAdapter(type) {
  const adapter = adapters[type];
  if (!adapter) {
    console.warn(`Unknown API adapter: ${type}, falling back to local`);
    currentAdapter = LocalAPIAdapter;
  } else {
    currentAdapter = adapter;
  }
}

/**
 * 현재 API Adapter 가져오기
 * @returns {APIAdapter}
 */
export function getAPIAdapter() {
  return currentAdapter;
}

export default {
  setAPIAdapter,
  getAPIAdapter,
};
