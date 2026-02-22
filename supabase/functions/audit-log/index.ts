/**
 * Audit Log Edge Function
 * AI 호출 메타데이터 로깅 (원문 저장 절대 금지)
 *
 * 입력: { userId, action, contentLength, contentHash, latencyMs, success, errorCode? }
 * Phase 2에서 supabase.from('audit_logs').insert() 전환 예정
 */

// ─── 보안: 민감 필드 목록 ──────────────────────────

const SENSITIVE_FIELDS = [
  'content',
  'dreamContent',
  'dream',
  'text',
  'interpretation',
  'meaning',
  'personalMeaning',
  'emotions',
  'emotionDetails',
  'feelings',
  'note',
  'healthData',
  'sleepData',
  'hrvData',
];

/**
 * 민감 필드 strip + 경고
 * 테스트 가능하도록 export
 */
export function stripSensitiveFields(
  data: Record<string, unknown>,
): { cleaned: Record<string, unknown>; warnings: string[] } {
  const cleaned: Record<string, unknown> = {};
  const warnings: string[] = [];

  for (const [key, value] of Object.entries(data)) {
    if (SENSITIVE_FIELDS.includes(key)) {
      warnings.push(`Sensitive field "${key}" stripped from audit log`);
      continue;
    }
    cleaned[key] = value;
  }

  return { cleaned, warnings };
}

// ─── 허용 필드 검증 ─────────────────────────────────

const ALLOWED_FIELDS = [
  'userId',
  'action',
  'contentLength',
  'contentHash',
  'latencyMs',
  'success',
  'errorCode',
  'timestamp',
];

function validateAuditEntry(data: Record<string, unknown>): string | null {
  if (!data.userId || typeof data.userId !== 'string') {
    return 'userId required';
  }
  if (!data.action || typeof data.action !== 'string') {
    return 'action required';
  }
  if (typeof data.contentLength !== 'number') {
    return 'contentLength must be a number';
  }
  if (typeof data.success !== 'boolean') {
    return 'success must be a boolean';
  }
  return null;
}

// ─── HTTP 핸들러 ────────────────────────────────────

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-Audit-Log-Secret',
};

function hasValidSharedSecret(req: Request): boolean {
  const expected = Deno.env.get('AUDIT_LOG_SHARED_SECRET');
  if (!expected) return true;
  const received = req.headers.get('X-Audit-Log-Secret');
  return received === expected;
}

export async function handleRequest(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'POST only' }), {
      status: 405,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }

  if (!hasValidSharedSecret(req)) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }

  try {
    const body = await req.json();
    const { cleaned, warnings } = stripSensitiveFields(body);

    // 경고 로그 (민감 필드 전송 시도)
    for (const w of warnings) {
      console.warn(`[audit-log] ${w}`);
    }

    const validationError = validateAuditEntry(cleaned);
    if (validationError) {
      return new Response(JSON.stringify({ error: validationError }), {
        status: 400,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }

    // 허용 필드만 추출
    const entry: Record<string, unknown> = {};
    for (const field of ALLOWED_FIELDS) {
      if (cleaned[field] !== undefined) {
        entry[field] = cleaned[field];
      }
    }

    // Phase 1: console.log (Phase 2: supabase.from('audit_logs').insert())
    console.log('[audit-log]', JSON.stringify(entry));

    return new Response(JSON.stringify({ logged: true }), {
      status: 200,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid request' }), {
      status: 400,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }
}

if (import.meta.main) {
  Deno.serve(handleRequest);
}
