/**
 * 오프라인 동기화 큐
 * 로컬 우선 저장 후, 온라인 시 원격 백업/동기화를 수행한다.
 */
import { Network } from '@capacitor/network';
import storage from '../adapters/storage';
import { getAPIAdapter } from '../adapters/api';
import { getSourceDeviceId } from '../sync/metadata';
import logger from '../utils/logger';
import SentryAdapter from '../adapters/analytics/sentry';

const QUEUE_KEY = 'sync_queue';
const MAX_RETRIES = 3;

const EMPTY_STATUS = {
  status: 'idle',
  isOnline: true,
  pendingCount: 0,
  lastSyncedAt: null,
  lastError: null,
};

/** @type {{ items: Array, listeners: Set<Function>, networkListener: any, initialized: boolean, status: typeof EMPTY_STATUS }} */
const state = {
  items: [],
  listeners: new Set(),
  networkListener: null,
  initialized: false,
  status: { ...EMPTY_STATUS },
};

let isFlushing = false;

function notify() {
  const snapshot = getSyncStatusSnapshot();
  for (const listener of state.listeners) {
    listener(snapshot);
  }
}

function updateStatus(partial) {
  state.status = {
    ...state.status,
    ...partial,
    pendingCount: state.items.length,
  };
  notify();
}

async function persist() {
  await storage.set(QUEUE_KEY, state.items);
}

function parseLegacyType(type = '') {
  const [rawEntity = 'unknown', rawAction = 'upsert'] = String(type).split(':');
  const entityMap = {
    dream: 'dreams',
    dreams: 'dreams',
    checkin: 'daily_logs',
    checkins: 'daily_logs',
    forecast: 'forecasts',
    symbol: 'personal_symbols',
    coach: 'coach_plans',
  };
  const opMap = {
    create: 'upsert',
    add: 'upsert',
    update: 'upsert',
    upsert: 'upsert',
    delete: 'delete',
    remove: 'delete',
  };

  return {
    entity: entityMap[rawEntity] || rawEntity,
    op: opMap[rawAction] || 'upsert',
  };
}

function normalizeQueueItem(input = {}) {
  if (input.entity && input.op) {
    const payload = input.payload || {};
    const updatedAt = input.clientUpdatedAt || payload.updatedAt || new Date().toISOString();
    return {
      id: input.id || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      entity: input.entity,
      op: input.op,
      recordId: input.recordId || payload.id,
      payload,
      clientUpdatedAt: updatedAt,
      sourceDeviceId: input.sourceDeviceId || payload.sourceDeviceId || getSourceDeviceId(),
      retries: typeof input.retries === 'number' ? input.retries : 0,
      createdAt: input.createdAt || new Date().toISOString(),
    };
  }

  const { entity, op } = parseLegacyType(input.type);
  const payload = input.payload || {};
  return {
    id: input.id || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    entity,
    op,
    recordId: payload.id || input.recordId,
    payload,
    clientUpdatedAt: payload.updatedAt || new Date().toISOString(),
    sourceDeviceId: payload.sourceDeviceId || getSourceDeviceId(),
    retries: typeof input.retries === 'number' ? input.retries : 0,
    createdAt: input.createdAt || new Date().toISOString(),
  };
}

function getCurrentBatch() {
  return [...state.items].sort((a, b) => {
    return new Date(a.clientUpdatedAt).getTime() - new Date(b.clientUpdatedAt).getTime();
  });
}

async function processBatch(batch) {
  const api = getAPIAdapter();

  if (!api || typeof api.processSyncBatch !== 'function') {
    return { processed: batch.length };
  }

  if (api.name === 'local') {
    return { processed: batch.length };
  }

  if (typeof api.isConfigured === 'function' && !api.isConfigured()) {
    throw new Error('원격 동기화 설정이 완료되지 않았습니다.');
  }

  return await api.processSyncBatch(batch);
}

export async function initSyncQueue() {
  if (state.initialized) return;

  const saved = await storage.get(QUEUE_KEY);
  if (Array.isArray(saved)) {
    state.items = saved.map(normalizeQueueItem);
  }

  const status = await Network.getStatus();
  state.status = {
    ...state.status,
    isOnline: status.connected,
    pendingCount: state.items.length,
  };

  if (state.status.isOnline && state.items.length > 0) {
    await flush();
  } else {
    notify();
  }

  state.networkListener = await Network.addListener('networkStatusChange', async (nextStatus) => {
    const wasOffline = !state.status.isOnline;
    updateStatus({ isOnline: nextStatus.connected });

    if (wasOffline && nextStatus.connected) {
      await flush();
    }
  });

  state.initialized = true;
}

export async function disposeSyncQueue() {
  if (state.networkListener && typeof state.networkListener.remove === 'function') {
    await state.networkListener.remove();
  }
  state.networkListener = null;
  state.initialized = false;
}

export async function enqueue(input) {
  const item = normalizeQueueItem(input);
  state.items.push(item);
  await persist();
  updateStatus({
    status: state.status.isOnline ? 'syncing' : 'offline',
    lastError: null,
  });

  if (state.status.isOnline) {
    await flush();
  }
}

export async function flush() {
  if (isFlushing || state.items.length === 0) {
    if (state.items.length === 0) {
      updateStatus({ status: state.status.isOnline ? 'idle' : 'offline' });
    }
    return;
  }

  isFlushing = true;
  updateStatus({
    status: state.status.isOnline ? 'syncing' : 'offline',
    lastError: null,
  });

  try {
    const batch = getCurrentBatch();
    await processBatch(batch);
    state.items = [];
    await persist();
    updateStatus({
      status: state.status.isOnline ? 'idle' : 'offline',
      lastSyncedAt: new Date().toISOString(),
      lastError: null,
    });
  } catch (error) {
    logger.error('[SyncQueue] flush failed:', error);
    SentryAdapter.setTag('sync_status', 'error');
    SentryAdapter.captureException(error, {
      queue_size: state.items.length,
      queue_entities: state.items.map(item => item.entity).join(','),
    });

    const failed = [];
    for (const item of state.items) {
      const nextRetries = (item.retries || 0) + 1;
      if (nextRetries < MAX_RETRIES) {
        failed.push({ ...item, retries: nextRetries });
      }
    }
    state.items = failed;
    await persist();
    updateStatus({
      status: state.status.isOnline ? 'error' : 'offline',
      lastError: error?.message || '동기화에 실패했습니다.',
    });
  } finally {
    isFlushing = false;
  }
}

export function getSyncStatusSnapshot() {
  return {
    ...state.status,
    pendingCount: state.items.length,
  };
}

export function isOnline() {
  return state.status.isOnline;
}

export function getPendingCount() {
  return state.items.length;
}

export function subscribe(listener) {
  state.listeners.add(listener);
  listener(getSyncStatusSnapshot());
  return () => state.listeners.delete(listener);
}

export async function clearQueue() {
  state.items = [];
  await persist();
  updateStatus({
    status: state.status.isOnline ? 'idle' : 'offline',
    lastError: null,
  });
}
