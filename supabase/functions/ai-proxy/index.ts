/**
 * AI Proxy Edge Function
 * 클라이언트 → Edge Function → LLM (Phase 2+)
 *
 * 보안 원칙: LLM API Key는 서버에만 존재. 클라이언트 번들 노출 0.
 *
 * 요청: POST { type: 'analyzeDream'|'generateForecast', payload: {...} }
 * 응답: { success, data?, error?, meta: { requestId, latencyMs } }
 */

import {
  validateAnalyzeDreamRequest,
  validateForecastRequest,
  validateAnalysisResponse,
  validateForecastResponse,
} from './schemas.ts';
import type { AIProxyResponse, DreamAnalysis, ForecastPrediction } from './schemas.ts';

// ─── CORS ──────────────────────────────────────────

const BASE_CORS_HEADERS = {
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Rate-Limit-Secret, X-Audit-Log-Secret',
  'Access-Control-Max-Age': '86400',
};

const ALLOWED_ORIGINS = (Deno.env.get('ALLOWED_ORIGINS') || '')
  .split(',')
  .map(v => v.trim())
  .filter(Boolean);

function getCorsHeaders(origin: string | null): HeadersInit {
  if (ALLOWED_ORIGINS.length === 0) {
    return {
      ...BASE_CORS_HEADERS,
      'Access-Control-Allow-Origin': '*',
    };
  }
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    return {
      ...BASE_CORS_HEADERS,
      'Access-Control-Allow-Origin': origin,
      'Vary': 'Origin',
    };
  }
  return {
    ...BASE_CORS_HEADERS,
    'Access-Control-Allow-Origin': 'null',
    'Vary': 'Origin',
  };
}

function corsResponse(origin: string | null, status = 204): Response {
  return new Response(null, { status, headers: getCorsHeaders(origin) });
}

function jsonResponse<T>(
  body: AIProxyResponse<T>,
  status = 200,
  origin: string | null = null,
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...getCorsHeaders(origin), 'Content-Type': 'application/json' },
  });
}

// ─── 유틸 ──────────────────────────────────────────

function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

async function resolveUserId(authHeader: string): Promise<string | null> {
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  if (!token) return null;

  const supabaseUrl = Deno.env.get('SUPABASE_URL') || Deno.env.get('VITE_SUPABASE_URL');
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') || Deno.env.get('VITE_SUPABASE_ANON_KEY');
  if (!supabaseUrl || !supabaseAnonKey) return null;

  try {
    const response = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: {
        'apikey': supabaseAnonKey,
        'Authorization': `Bearer ${token}`,
      },
    });
    if (!response.ok) return null;

    const user = await response.json().catch(() => null);
    return typeof user?.id === 'string' ? user.id : null;
  } catch {
    return null;
  }
}

async function checkRateLimit(userId: string, authHeader: string): Promise<{ allowed: boolean; payload?: any }> {
  const rateLimitUrl = Deno.env.get('RATE_LIMIT_URL');
  if (!rateLimitUrl) return { allowed: true };

  const sharedSecret = Deno.env.get('RATE_LIMIT_SHARED_SECRET');
  const response = await fetch(rateLimitUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(sharedSecret ? { 'X-Rate-Limit-Secret': sharedSecret } : {}),
      Authorization: authHeader,
    },
    body: JSON.stringify({ userId }),
  });

  const payload = await response.json().catch(() => null);
  if (response.status === 429) {
    return { allowed: false, payload };
  }
  if (!response.ok) {
    throw new Error('Rate limit service unavailable');
  }
  return { allowed: true, payload };
}

// ─── 스텁 핸들러 (Phase 2에서 실제 LLM 호출로 교체) ──────

/**
 * 꿈 분석 스텁 — 스키마를 만족하는 하드코딩 응답
 */
function handleAnalyzeDream(_content: string): DreamAnalysis {
  // TODO: Phase 2 — Anthropic API 호출
  // const _apiKey = Deno.env.get('ANTHROPIC_API_KEY');
  return {
    symbols: [
      { name: '물', meaning: '감정의 흐름, 무의식의 깊이를 상징합니다.', frequency: 1 },
    ],
    emotions: [
      { name: '평온한', intensity: 6 },
    ],
    themes: ['자아 탐색', '내면의 성장'],
    intensity: 5,
    interpretation:
      '이 꿈은 내면의 감정 흐름을 탐색하려는 무의식의 신호입니다. 최근 경험과 연결해 생각해보세요.',
    actionSuggestion: '오늘 잠시 명상이나 일기 쓰기로 마음을 정리해보세요.',
  };
}

/**
 * 예보 생성 스텁
 */
function handleGenerateForecast(): ForecastPrediction {
  // TODO: Phase 2 — Anthropic API 호출
  return {
    condition: 3,
    confidence: 55,
    summary: '평범한 하루가 될 것 같습니다. 무리하지 않고 꾸준히 진행하세요.',
    risks: [],
    suggestions: ['가벼운 스트레칭으로 몸을 깨워보세요.', '충분한 수분 섭취를 챙기세요.'],
  };
}

// ─── audit-log fire-and-forget ──────────────────────

async function fireAuditLog(meta: {
  userId: string;
  action: string;
  contentLength: number;
  contentHash: string;
  latencyMs: number;
  success: boolean;
  errorCode?: string;
}): Promise<void> {
  try {
    const auditUrl = Deno.env.get('AUDIT_LOG_URL');
    if (!auditUrl) return;
    const auditSecret = Deno.env.get('AUDIT_LOG_SHARED_SECRET');

    await fetch(auditUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(auditSecret ? { 'X-Audit-Log-Secret': auditSecret } : {}),
      },
      body: JSON.stringify({ ...meta, timestamp: new Date().toISOString() }),
    });
  } catch {
    // fire-and-forget: 실패해도 메인 응답에 영향 없음
  }
}

async function simpleHash(text: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 16);
}

// ─── 메인 핸들러 ────────────────────────────────────

Deno.serve(async (req: Request): Promise<Response> => {
  const origin = req.headers.get('Origin');

  if (ALLOWED_ORIGINS.length > 0 && origin && !ALLOWED_ORIGINS.includes(origin)) {
    return jsonResponse(
      { success: false, error: { code: 'CORS_FORBIDDEN', message: 'Origin is not allowed' }, meta: { requestId: generateRequestId(), latencyMs: 0 } },
      403,
      origin,
    );
  }

  // CORS preflight
  if (req.method === 'OPTIONS') {
    return corsResponse(origin);
  }

  if (req.method !== 'POST') {
    return jsonResponse(
      { success: false, error: { code: 'METHOD_NOT_ALLOWED', message: 'POST only' }, meta: { requestId: generateRequestId(), latencyMs: 0 } },
      405,
      origin,
    );
  }

  const requestId = generateRequestId();
  const start = performance.now();

  try {
    // Authorization + JWT 검증
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return jsonResponse(
        { success: false, error: { code: 'AUTH_REQUIRED', message: 'Bearer token required' }, meta: { requestId, latencyMs: performance.now() - start } },
        401,
        origin,
      );
    }
    const userId = await resolveUserId(authHeader);
    if (!userId) {
      return jsonResponse(
        { success: false, error: { code: 'AUTH_INVALID', message: 'Invalid or expired token' }, meta: { requestId, latencyMs: performance.now() - start } },
        401,
        origin,
      );
    }

    const body = await req.json();
    const { type, payload } = body;

    if (!type || !payload) {
      return jsonResponse(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'type and payload required' }, meta: { requestId, latencyMs: performance.now() - start } },
        400,
        origin,
      );
    }

    const rateLimit = await checkRateLimit(userId, authHeader);
    if (!rateLimit.allowed) {
      return jsonResponse(
        { success: false, error: { code: 'AI_RATE_LIMIT', message: 'Too many requests' }, meta: { requestId, latencyMs: performance.now() - start } },
        429,
        origin,
      );
    }

    let data: unknown;
    let contentForHash = '';

    if (type === 'analyzeDream') {
      const validation = validateAnalyzeDreamRequest(payload);
      if (!validation.valid) {
        return jsonResponse(
          { success: false, error: { code: 'VALIDATION_ERROR', message: validation.error }, meta: { requestId, latencyMs: performance.now() - start } },
          400,
          origin,
        );
      }
      contentForHash = payload.content;
      data = handleAnalyzeDream(payload.content);
      const responseValidation = validateAnalysisResponse(data);
      if (!responseValidation.valid) {
        return jsonResponse(
          { success: false, error: { code: 'AI_PARSE_ERROR', message: responseValidation.error }, meta: { requestId, latencyMs: performance.now() - start } },
          500,
          origin,
        );
      }
    } else if (type === 'generateForecast') {
      const validation = validateForecastRequest(payload);
      if (!validation.valid) {
        return jsonResponse(
          { success: false, error: { code: 'VALIDATION_ERROR', message: validation.error }, meta: { requestId, latencyMs: performance.now() - start } },
          400,
          origin,
        );
      }
      contentForHash = JSON.stringify(payload);
      data = handleGenerateForecast();
      const responseValidation = validateForecastResponse(data);
      if (!responseValidation.valid) {
        return jsonResponse(
          { success: false, error: { code: 'AI_PARSE_ERROR', message: responseValidation.error }, meta: { requestId, latencyMs: performance.now() - start } },
          500,
          origin,
        );
      }
    } else {
      return jsonResponse(
        { success: false, error: { code: 'VALIDATION_ERROR', message: `Unknown type: ${type}` }, meta: { requestId, latencyMs: performance.now() - start } },
        400,
        origin,
      );
    }

    const latencyMs = Math.round(performance.now() - start);

    // audit log (fire-and-forget)
    fireAuditLog({
      userId,
      action: type,
      contentLength: contentForHash.length,
      contentHash: await simpleHash(contentForHash),
      latencyMs,
      success: true,
    });

    return jsonResponse({ success: true, data, meta: { requestId, latencyMs } }, 200, origin);
  } catch (err) {
    const latencyMs = Math.round(performance.now() - start);
    const message = err instanceof Error ? err.message : 'Internal server error';
    return jsonResponse(
      { success: false, error: { code: 'SERVER_ERROR', message }, meta: { requestId, latencyMs } },
      500,
      origin,
    );
  }
});
