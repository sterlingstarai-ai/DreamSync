/**
 * Remote Feature Flags Adapter (Phase 2+)
 *
 * 서버에서 Feature Flags 가져오기
 * Supabase 또는 별도 플래그 서비스 연동
 */

import { DEFAULT_FLAGS } from '../../../constants/featureFlags';

const CACHE_KEY = 'dreamsync_remote_flags';
const CACHE_TTL = 5 * 60 * 1000; // 5분

let cachedFlags = null;
let cacheTimestamp = 0;

/**
 * 원격 플래그 가져오기
 */
async function fetchRemoteFlags(userId) {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.warn('[RemoteFlags] Supabase not configured, using defaults');
    return DEFAULT_FLAGS;
  }

  try {
    const response = await fetch(
      `${supabaseUrl}/rest/v1/feature_flags?user_id=eq.${userId}&select=*`,
      {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
        },
      }
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
    console.error('[RemoteFlags] Fetch failed:', error);
    return DEFAULT_FLAGS;
  }
}

/**
 * 플래그 가져오기 (캐시 사용)
 */
async function getFlags(userId) {
  const now = Date.now();

  // 캐시 유효성 확인
  if (cachedFlags && (now - cacheTimestamp) < CACHE_TTL) {
    return cachedFlags;
  }

  // 로컬 캐시 확인
  try {
    const localCache = localStorage.getItem(CACHE_KEY);
    if (localCache) {
      const { flags, timestamp } = JSON.parse(localCache);
      if ((now - timestamp) < CACHE_TTL) {
        cachedFlags = flags;
        cacheTimestamp = timestamp;
        return flags;
      }
    }
  } catch {
    // 로컬 캐시 무시
  }

  // 원격에서 가져오기
  const flags = await fetchRemoteFlags(userId);

  // 캐시 업데이트
  cachedFlags = flags;
  cacheTimestamp = now;

  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({
      flags,
      timestamp: now,
    }));
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
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.warn('[RemoteFlags] Cannot update - Supabase not configured');
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
    cachedFlags = null;
    cacheTimestamp = 0;
    localStorage.removeItem(CACHE_KEY);

    return true;
  } catch (error) {
    console.error('[RemoteFlags] Update failed:', error);
    return false;
  }
}

/**
 * 캐시 클리어
 */
function clearCache() {
  cachedFlags = null;
  cacheTimestamp = 0;
  localStorage.removeItem(CACHE_KEY);
}

export const RemoteFlagsAdapter = {
  name: 'remote',
  getFlags,
  isEnabled,
  updateFlag,
  clearCache,
};

export default RemoteFlagsAdapter;
