/**
 * 오프라인 동기화 큐
 * 네트워크 연결이 없을 때 데이터 변경을 큐에 저장하고,
 * 온라인 복귀 시 자동으로 동기화
 *
 * Phase 1: 로컬 전용이므로 큐만 구성 (실제 sync는 Phase 2에서 Supabase 연동)
 */
import { Network } from '@capacitor/network';
import storage from '../adapters/storage';

const QUEUE_KEY = 'sync_queue';

/** @type {{ items: Array, isOnline: boolean, listeners: Set }} */
const state = {
  items: [],
  isOnline: true,
  listeners: new Set(),
};

/**
 * 큐 초기화 - 앱 시작 시 호출
 */
export async function initSyncQueue() {
  // 저장된 큐 로드
  const saved = await storage.get(QUEUE_KEY);
  if (Array.isArray(saved)) {
    state.items = saved;
  }

  // 네트워크 상태 감시
  const status = await Network.getStatus();
  state.isOnline = status.connected;

  // 온라인 상태에서 대기 큐가 있으면 즉시 플러시
  if (state.isOnline && state.items.length > 0) {
    await flush();
  }

  Network.addListener('networkStatusChange', async (newStatus) => {
    const wasOffline = !state.isOnline;
    state.isOnline = newStatus.connected;

    // 오프라인→온라인 전환 시 큐 플러시
    if (wasOffline && newStatus.connected) {
      await flush();
    }

    notify();
  });
}

/**
 * 변경사항을 큐에 추가
 * @param {Object} operation
 * @param {string} operation.type - 작업 유형 (예: 'dream:create', 'checkin:add')
 * @param {Object} operation.payload - 작업 데이터
 * @param {number} [operation.retries=0] - 재시도 횟수
 */
export async function enqueue({ type, payload }) {
  const item = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    type,
    payload,
    retries: 0,
    createdAt: new Date().toISOString(),
  };

  state.items.push(item);
  await persist();
  notify();

  // 온라인이면 즉시 플러시 시도
  if (state.isOnline) {
    await flush();
  }
}

let isFlushing = false;

/**
 * 큐 플러시 - 모든 대기 중인 작업 실행
 * Phase 2: 여기에 Supabase 동기화 로직 추가
 */
async function flush() {
  if (isFlushing || state.items.length === 0) return;
  isFlushing = true;
  try {

  const pending = [...state.items];
  const failed = [];

  for (const item of pending) {
    try {
      await processItem(item);
    } catch {
      item.retries++;
      if (item.retries < 3) {
        failed.push(item);
      }
      // 3회 실패 시 버림
    }
  }

  state.items = failed;
  await persist();
  notify();
  } finally {
    isFlushing = false;
  }
}

/**
 * 개별 작업 처리
 * Phase 1: 로컬 전용이므로 즉시 완료 처리
 * Phase 2: Supabase API 호출로 교체
 * @param {Object} _item
 */
async function processItem(_item) {
  // Phase 1: 모든 데이터는 이미 Zustand persist로 로컬 저장됨
  // Phase 2에서 이 함수를 확장하여 Supabase에 동기화
  //
  // switch (item.type) {
  //   case 'dream:create':
  //     await supabase.from('dreams').insert(item.payload);
  //     break;
  //   case 'checkin:add':
  //     await supabase.from('daily_logs').upsert(item.payload);
  //     break;
  //   default:
  //     console.warn('[SyncQueue] Unknown type:', item.type);
  // }

  return Promise.resolve();
}

/**
 * 큐를 스토리지에 저장
 */
async function persist() {
  await storage.set(QUEUE_KEY, state.items);
}

/**
 * 상태 변경 리스너에게 알림
 */
function notify() {
  for (const listener of state.listeners) {
    listener({
      isOnline: state.isOnline,
      pendingCount: state.items.length,
    });
  }
}

/**
 * 현재 네트워크 상태
 * @returns {boolean}
 */
export function isOnline() {
  return state.isOnline;
}

/**
 * 대기 중인 작업 수
 * @returns {number}
 */
export function getPendingCount() {
  return state.items.length;
}

/**
 * 상태 변경 구독
 * @param {function} listener
 * @returns {function} unsubscribe
 */
export function subscribe(listener) {
  state.listeners.add(listener);
  return () => state.listeners.delete(listener);
}

/**
 * 큐 초기화 (개발용)
 */
export async function clearQueue() {
  state.items = [];
  await persist();
  notify();
}
