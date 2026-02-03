/**
 * Rate Limit Edge Function
 * userId 기준 분당/일당 요청 제한
 *
 * 인메모리 Map 사용 — 콜드스타트 시 리셋됨
 * 프로덕션은 KV/Redis 전환 예정 (Phase 3+)
 */

// ─── 설정 ──────────────────────────────────────────

const LIMITS = {
  perMinute: 10,
  perDay: 100,
};

const MINUTE_MS = 60_000;
const DAY_MS = 86_400_000;

// ─── 타입 ──────────────────────────────────────────

interface Window {
  count: number;
  start: number;
}

interface UserBucket {
  minute: Window;
  day: Window;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: { minute: number; day: number };
  resetAt: { minute: string; day: string };
}

// ─── 인메모리 스토어 ────────────────────────────────

const store = new Map<string, UserBucket>();

/**
 * Rate limit 확인 및 카운트 증가
 * 테스트 가능하도록 export
 */
export function checkRateLimit(userId: string, now = Date.now()): RateLimitResult {
  let bucket = store.get(userId);

  if (!bucket) {
    bucket = {
      minute: { count: 0, start: now },
      day: { count: 0, start: now },
    };
    store.set(userId, bucket);
  }

  // 윈도우 리셋
  if (now - bucket.minute.start >= MINUTE_MS) {
    bucket.minute = { count: 0, start: now };
  }
  if (now - bucket.day.start >= DAY_MS) {
    bucket.day = { count: 0, start: now };
  }

  const minuteRemaining = LIMITS.perMinute - bucket.minute.count;
  const dayRemaining = LIMITS.perDay - bucket.day.count;

  const allowed = minuteRemaining > 0 && dayRemaining > 0;

  if (allowed) {
    bucket.minute.count++;
    bucket.day.count++;
  }

  return {
    allowed,
    remaining: {
      minute: Math.max(0, allowed ? minuteRemaining - 1 : minuteRemaining),
      day: Math.max(0, allowed ? dayRemaining - 1 : dayRemaining),
    },
    resetAt: {
      minute: new Date(bucket.minute.start + MINUTE_MS).toISOString(),
      day: new Date(bucket.day.start + DAY_MS).toISOString(),
    },
  };
}

/**
 * 스토어 초기화 (테스트용)
 */
export function resetStore(): void {
  store.clear();
}

// ─── HTTP 핸들러 ────────────────────────────────────

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'POST only' }), {
      status: 405,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }

  try {
    const { userId } = await req.json();

    if (!userId || typeof userId !== 'string') {
      return new Response(JSON.stringify({ error: 'userId required' }), {
        status: 400,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }

    const result = checkRateLimit(userId);

    return new Response(JSON.stringify(result), {
      status: result.allowed ? 200 : 429,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid request' }), {
      status: 400,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }
});
