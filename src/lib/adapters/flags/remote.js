/**
 * Remote Feature Flags Adapter (Phase 2+)
 *
 * 서버에서 Feature Flags 가져오기
 * Supabase 또는 별도 플래그 서비스 연동
 *
 * localStorage 대신 Capacitor Preferences 기반 storage adapter 사용
 */

import { DEFAULT_FLAGS } from '../../../constants/featureFlags';
import logger from '../../utils/logger';
import storage from '../storage';

const CACHE_TTL = 5 * 60 * 1000; // 5분
const REQUEST_TIMEOUT_MS = 5000;
const MAX_RETRIES = 1;
const RETRY_DELAY_MS = 250;

const memoryCache = new Map();

function toUserKey(userId) {
  return String(userId || 'anonymous');
}

function cacheKey(userId) {
  return `remote_flags:${toUserKey(userId)}`;
}

async function fetchWithTimeout(url, options, timeoutMs = REQUEST_TIMEOUT_MS) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * 원격 플래그 가져오기
 */
async function fetchRemoteFlags(userId) {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    logger.warn('[RemoteFlags] Supabase not configured, using defaults');
    return DEFAULT_FLAGS;
  }

  let lastError = null;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      // TODO: Phase 2 — RLS 적용 후 user_id 쿼리 제거, JWT에서 자동 필터링
      const query = userId
        ? `?select=*&user_id=eq.${encodeURIComponent(userId)}`
        : '?select=*';
      const response = await fetchWithTimeout(
        `${supabaseUrl}/rest/v1/feature_flags${query}`,
        {
          headers: {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`,
            ...(userId ? { 'x-user-id': userId } : {}),
          },
        },
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();

      if (data && data.length > 0) {
        return {
          ...DEFAULT_FLAGS,
          ...data[0].flags,
        };
      }

      return DEFAULT_FLAGS;
    } catch (error) {
      lastError = error;
      if (attempt < MAX_RETRIES) {
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS * (attempt + 1)));
        continue;
      }
    }
  }

  logger.error('[RemoteFlags] Fetch failed:', lastError);
  return DEFAULT_FLAGS;
}

/**
 * 플래그 가져오기 (캐시 사용)
 */
async function getFlags(userId) {
  const key = toUserKey(userId);
  const now = Date.now();

  // 메모리 캐시 유효성 확인
  const memory = memoryCache.get(key);
  if (memory && (now - memory.timestamp) < CACHE_TTL) {
    return memory.flags;
  }

  // Preferences 캐시 확인
  try {
    const localCache = await storage.get(cacheKey(userId));
    if (localCache) {
      const { flags, timestamp } = localCache;
      if ((now - timestamp) < CACHE_TTL) {
        memoryCache.set(key, { flags, timestamp });
        return flags;
      }
    }
  } catch {
    // 캐시 읽기 실패 무시
  }

  // 원격에서 가져오기
  const flags = await fetchRemoteFlags(userId);

  // 캐시 업데이트
  memoryCache.set(key, { flags, timestamp: now });

  try {
    await storage.set(cacheKey(userId), { flags, timestamp: now });
  } catch {
    // 캐시 저장 실패 무시
  }

  return flags;
}

/**
 * 특정 플래그 확인
 */
async function isEnabled(userId, flagName) {
  const flags = await getFlags(userId);
  return flags[flagName] ?? DEFAULT_FLAGS[flagName] ?? false;
}

/**
 * 플래그 업데이트 (서버에)
 */
async function updateFlag(userId, flagName, value) {
  if (!userId) {
    logger.warn('[RemoteFlags] Cannot update without userId');
    return false;
  }

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    logger.warn('[RemoteFlags] Cannot update - Supabase not configured');
    return false;
  }

  try {
    // 현재 플래그 가져오기
    const currentFlags = await getFlags(userId);
    const updatedFlags = { ...currentFlags, [flagName]: value };

    // 서버 업데이트
    const response = await fetch(
      `${supabaseUrl}/rest/v1/feature_flags`,
      {
        method: 'POST',
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
          'Prefer': 'resolution=merge-duplicates',
          'x-user-id': userId,
        },
        body: JSON.stringify({
          user_id: userId,
          flags: updatedFlags,
          updated_at: new Date().toISOString(),
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    // 캐시 무효화
    memoryCache.delete(toUserKey(userId));
    await storage.remove(cacheKey(userId));

    return true;
  } catch (error) {
    logger.error('[RemoteFlags] Update failed:', error);
    return false;
  }
}

/**
 * 캐시 클리어
 */
async function clearCache(userId) {
  if (userId) {
    memoryCache.delete(toUserKey(userId));
    await storage.remove(cacheKey(userId));
    return;
  }

  memoryCache.clear();
  if (typeof storage.keys === 'function') {
    const keys = await storage.keys();
    const target = keys.filter(key => key.startsWith('remote_flags:'));
    await Promise.all(target.map(key => storage.remove(key)));
  } else {
    await storage.remove(cacheKey());
    await storage.remove('remote_flags'); // 레거시 키 정리
  }
}

/**
 * 내부 상태 리셋 (테스트용)
 */
function _resetForTest() {
  memoryCache.clear();
}

export const RemoteFlagsAdapter = {
  name: 'remote',
  getFlags,
  isEnabled,
  updateFlag,
  clearCache,
  _resetForTest,
};

export default RemoteFlagsAdapter;
