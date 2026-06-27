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
const DEAD_LETTER_KEY = 'sync_queue_dead';
const MAX_RETRIES = 3;

const EMPTY_STATUS = {
  status: 'idle',
  isOnline: true,
  pendingCount: 0,
  lastSyncedAt: null,
  lastError: null,
};

/** @type {{ items: Array, deadItems: Array, listeners: Set<Function>, networkListener: any, initialized: boolean, status: typeof EMPTY_STATUS }} */
const state = {
  items: [],
  deadItems: [],
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

async function persistDead() {
  await storage.set(DEAD_LETTER_KEY, state.deadItems);
}

function toDeadLetter(item, errorMessage) {
  return {
    ...item,
    lastError: errorMessage || '동기화에 실패했습니다.',
    deadLetteredAt: new Date().toISOString(),
  };
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

  const savedDead = await storage.get(DEAD_LETTER_KEY);
  if (Array.isArray(savedDead)) {
    state.deadItems = savedDead;
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

  // Snapshot the items we are about to send. Anything enqueued AFTER this point
  // (queueUpsert fires enqueue() un-awaited) is NOT part of this batch and must
  // survive the flush — never clear the whole queue.
  const batch = getCurrentBatch();
  const batchIds = new Set(batch.map((item) => item.id));
  let madeProgress = false;

  try {
    const result = await processBatch(batch);

    // Per-item contract: { succeeded: [itemId], failed: [{ id, error }] }.
    // Legacy adapters return { processed } with no per-item detail → treat the
    // whole batch as succeeded.
    const succeeded = Array.isArray(result?.succeeded)
      ? new Set(result.succeeded)
      : new Set(batchIds);
    const failedById = new Map(
      (Array.isArray(result?.failed) ? result.failed : []).map((entry) => [entry.id, entry]),
    );

    const { remaining, newlyDead } = partitionAfterFlush(succeeded, failedById);
    madeProgress = succeeded.size > 0;

    state.items = remaining;
    await persist();
    await commitDeadLetter(newlyDead);

    const hadFailures = failedById.size > 0 || newlyDead.length > 0;
    updateStatus({
      status: hadFailures
        ? (state.status.isOnline ? 'error' : 'offline')
        : (state.status.isOnline ? 'idle' : 'offline'),
      lastSyncedAt: succeeded.size > 0 ? new Date().toISOString() : state.status.lastSyncedAt,
      lastError: hadFailures ? '일부 항목 동기화에 실패했습니다.' : null,
    });
  } catch (error) {
    // Total failure (e.g. client/config error): the whole batch failed atomically.
    logger.error('[SyncQueue] flush failed:', error);
    SentryAdapter.setTag('sync_status', 'error');
    SentryAdapter.captureException(error, {
      queue_size: state.items.length,
      queue_entities: state.items.map((item) => item.entity).join(','),
    });

    const failedById = new Map(batch.map((item) => [item.id, { id: item.id, error }]));
    const { remaining, newlyDead } = partitionAfterFlush(new Set(), failedById);
    state.items = remaining;
    await persist();
    await commitDeadLetter(newlyDead);

    updateStatus({
      status: state.status.isOnline ? 'error' : 'offline',
      lastError: error?.message || '동기화에 실패했습니다.',
    });
  } finally {
    isFlushing = false;
  }

  // Drain items that arrived mid-flight, but only if this flush made progress
  // (prevents a hot loop when nothing can currently be synced).
  if (madeProgress && state.status.isOnline && state.items.length > 0) {
    await flush();
  }
}

/**
 * Reconcile state.items after a flush attempt.
 * - succeeded items are removed from the queue
 * - failed items get their retry counter bumped; at MAX_RETRIES they move to the
 *   dead-letter store instead of being silently dropped
 * - items that were not part of the processed batch (enqueued mid-flight) are kept untouched
 */
function partitionAfterFlush(succeeded, failedById) {
  const remaining = [];
  const newlyDead = [];

  for (const item of state.items) {
    if (succeeded.has(item.id)) {
      continue;
    }
    if (failedById.has(item.id)) {
      const nextRetries = (item.retries || 0) + 1;
      if (nextRetries >= MAX_RETRIES) {
        newlyDead.push(toDeadLetter({ ...item, retries: nextRetries }, failedById.get(item.id)?.error?.message));
      } else {
        remaining.push({ ...item, retries: nextRetries });
      }
      continue;
    }
    // Item enqueued mid-flight (not part of the processed batch) or under-reported
    // by the adapter → keep it queued without penalty so it is never lost.
    remaining.push(item);
  }

  return { remaining, newlyDead };
}

async function commitDeadLetter(newlyDead) {
  if (newlyDead.length === 0) return;
  state.deadItems = [...state.deadItems, ...newlyDead];
  await persistDead();
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

export function getDeadLetterCount() {
  return state.deadItems.length;
}

export function subscribe(listener) {
  state.listeners.add(listener);
  listener(getSyncStatusSnapshot());
  return () => state.listeners.delete(listener);
}

export async function clearQueue() {
  state.items = [];
  state.deadItems = [];
  await persist();
  await persistDead();
  updateStatus({
    status: state.status.isOnline ? 'idle' : 'offline',
    lastError: null,
  });
}

/**
 * Dead-letter 항목 목록 (읽기 전용 스냅숏).
 * @returns {Array}
 */
export function getDeadLetterItems() {
  return [...state.deadItems];
}

/**
 * 특정 dead-letter 항목을 활성 큐로 복원(재시도).
 * 재시도 카운터를 0으로 초기화하여 MAX_RETRIES 예산을 새로 부여한다.
 * @param {string} id - dead letter 항목의 id
 */
export async function retryDeadLetterItem(id) {
  const idx = state.deadItems.findIndex((item) => item.id === id);
  if (idx === -1) return;

  const [dead] = state.deadItems.splice(idx, 1);
  await persistDead();

  // dead letter 메타데이터 제거 + retries 초기화
  const { lastError: _err, deadLetteredAt: _ts, ...rest } = dead;
  const revived = { ...rest, retries: 0 };
  state.items.push(revived);
  await persist();

  updateStatus({
    status: state.status.isOnline ? 'syncing' : 'offline',
    lastError: null,
  });

  if (state.status.isOnline) {
    await flush();
  }
}

/**
 * 특정 dead-letter 항목을 영구 삭제 (수동 폐기).
 * @param {string} id
 */
export async function removeDeadLetterItem(id) {
  const before = state.deadItems.length;
  state.deadItems = state.deadItems.filter((item) => item.id !== id);
  if (state.deadItems.length === before) return; // not found — no-op

  await persistDead();
  notify();
}

/**
 * 모든 dead-letter 항목을 활성 큐로 복원(전체 재시도).
 */
export async function retryAllDeadLetters() {
  if (state.deadItems.length === 0) return;

  const toRetry = state.deadItems.map(({ lastError: _e, deadLetteredAt: _t, ...rest }) => ({
    ...rest,
    retries: 0,
  }));
  state.deadItems = [];
  await persistDead();

  state.items.push(...toRetry);
  await persist();

  updateStatus({
    status: state.status.isOnline ? 'syncing' : 'offline',
    lastError: null,
  });

  if (state.status.isOnline) {
    await flush();
  }
}

/**
 * 모든 dead-letter 항목을 영구 삭제 (전체 수동 폐기).
 */
export async function clearAllDeadLetters() {
  if (state.deadItems.length === 0) return;
  state.deadItems = [];
  await persistDead();
  notify();
}
