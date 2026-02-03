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

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Max-Age': '86400',
};

function corsResponse(status = 204): Response {
  return new Response(null, { status, headers: CORS_HEADERS });
}

function jsonResponse<T>(body: AIProxyResponse<T>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  });
}

// ─── 유틸 ──────────────────────────────────────────

function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
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

    await fetch(auditUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
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
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return corsResponse();
  }

  if (req.method !== 'POST') {
    return jsonResponse(
      { success: false, error: { code: 'METHOD_NOT_ALLOWED', message: 'POST only' }, meta: { requestId: generateRequestId(), latencyMs: 0 } },
      405,
    );
  }

  const requestId = generateRequestId();
  const start = performance.now();

  try {
    // Authorization 확인 (JWT 검증은 TODO)
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return jsonResponse(
        { success: false, error: { code: 'AUTH_REQUIRED', message: 'Bearer token required' }, meta: { requestId, latencyMs: performance.now() - start } },
        401,
      );
    }

    const body = await req.json();
    const { type, payload } = body;

    if (!type || !payload) {
      return jsonResponse(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'type and payload required' }, meta: { requestId, latencyMs: performance.now() - start } },
        400,
      );
    }

    // TODO: rate-limit 호출
    // const rateLimitUrl = Deno.env.get('RATE_LIMIT_URL');

    const userId = 'anonymous'; // TODO: JWT에서 추출

    let data: unknown;
    let contentForHash = '';

    if (type === 'analyzeDream') {
      const validation = validateAnalyzeDreamRequest(payload);
      if (!validation.valid) {
        return jsonResponse(
          { success: false, error: { code: 'VALIDATION_ERROR', message: validation.error }, meta: { requestId, latencyMs: performance.now() - start } },
          400,
        );
      }
      contentForHash = payload.content;
      data = handleAnalyzeDream(payload.content);
      const responseValidation = validateAnalysisResponse(data);
      if (!responseValidation.valid) {
        return jsonResponse(
          { success: false, error: { code: 'AI_PARSE_ERROR', message: responseValidation.error }, meta: { requestId, latencyMs: performance.now() - start } },
          500,
        );
      }
    } else if (type === 'generateForecast') {
      const validation = validateForecastRequest(payload);
      if (!validation.valid) {
        return jsonResponse(
          { success: false, error: { code: 'VALIDATION_ERROR', message: validation.error }, meta: { requestId, latencyMs: performance.now() - start } },
          400,
        );
      }
      contentForHash = JSON.stringify(payload);
      data = handleGenerateForecast();
      const responseValidation = validateForecastResponse(data);
      if (!responseValidation.valid) {
        return jsonResponse(
          { success: false, error: { code: 'AI_PARSE_ERROR', message: responseValidation.error }, meta: { requestId, latencyMs: performance.now() - start } },
          500,
        );
      }
    } else {
      return jsonResponse(
        { success: false, error: { code: 'VALIDATION_ERROR', message: `Unknown type: ${type}` }, meta: { requestId, latencyMs: performance.now() - start } },
        400,
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

    return jsonResponse({ success: true, data, meta: { requestId, latencyMs } });
  } catch (err) {
    const latencyMs = Math.round(performance.now() - start);
    const message = err instanceof Error ? err.message : 'Internal server error';
    return jsonResponse(
      { success: false, error: { code: 'SERVER_ERROR', message }, meta: { requestId, latencyMs } },
      500,
    );
  }
});
