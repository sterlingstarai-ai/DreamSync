/**
 * AI Proxy 요청/응답 검증 (Deno 런타임용)
 * 클라이언트 Zod 스키마의 TypeScript 미러
 *
 * Zod를 사용하지 않고 인라인 검증 — Edge Function 콜드스타트 최소화
 */

// ─── 타입 ──────────────────────────────────────────

export interface Symbol {
  name: string;
  meaning: string;
  personalMeaning?: string;
  frequency: number;
}

export interface Emotion {
  name: string;
  intensity: number;
  color?: string;
}

export interface DreamAnalysis {
  symbols: Symbol[];
  emotions: Emotion[];
  themes: string[];
  intensity: number;
  interpretation: string;
  actionSuggestion?: string;
}

export interface ForecastPrediction {
  condition: number;
  confidence: number;
  summary: string;
  risks: string[];
  suggestions: string[];
}

export interface AnalyzeDreamRequest {
  type: 'analyzeDream';
  payload: { content: string };
}

export interface GenerateForecastRequest {
  type: 'generateForecast';
  payload: {
    recentDreams?: unknown[];
    recentCheckIns?: unknown[];
    avgCondition?: number;
    avgStress?: number;
  };
}

export type AIProxyRequest = AnalyzeDreamRequest | GenerateForecastRequest;

export interface AIProxyResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: { code: string; message: string };
  meta: { requestId: string; latencyMs: number };
}

// ─── 검증 함수 ──────────────────────────────────────

function isString(v: unknown): v is string {
  return typeof v === 'string';
}

function isNumber(v: unknown): v is number {
  return typeof v === 'number' && !Number.isNaN(v);
}

function inRange(v: number, min: number, max: number): boolean {
  return v >= min && v <= max;
}

/**
 * analyzeDream 요청 검증
 */
export function validateAnalyzeDreamRequest(
  payload: unknown,
): { valid: true } | { valid: false; error: string } {
  if (!payload || typeof payload !== 'object') {
    return { valid: false, error: 'payload must be an object' };
  }
  const p = payload as Record<string, unknown>;
  if (!isString(p.content) || p.content.length === 0) {
    return { valid: false, error: 'payload.content must be a non-empty string' };
  }
  if (p.content.length > 5000) {
    return { valid: false, error: 'payload.content exceeds 5000 chars' };
  }
  return { valid: true };
}

/**
 * generateForecast 요청 검증
 */
export function validateForecastRequest(
  payload: unknown,
): { valid: true } | { valid: false; error: string } {
  if (!payload || typeof payload !== 'object') {
    return { valid: false, error: 'payload must be an object' };
  }
  return { valid: true };
}

/**
 * DreamAnalysis 응답 검증
 */
export function validateAnalysisResponse(
  data: unknown,
): { valid: true } | { valid: false; error: string } {
  if (!data || typeof data !== 'object') {
    return { valid: false, error: 'response must be an object' };
  }
  const d = data as Record<string, unknown>;

  if (!Array.isArray(d.symbols) || d.symbols.length < 1 || d.symbols.length > 10) {
    return { valid: false, error: 'symbols must be array(1..10)' };
  }
  for (const s of d.symbols as Record<string, unknown>[]) {
    if (!isString(s.name) || !isString(s.meaning)) {
      return { valid: false, error: 'each symbol needs name and meaning strings' };
    }
  }

  if (!Array.isArray(d.emotions) || d.emotions.length < 1 || d.emotions.length > 5) {
    return { valid: false, error: 'emotions must be array(1..5)' };
  }
  for (const e of d.emotions as Record<string, unknown>[]) {
    if (!isString(e.name) || !isNumber(e.intensity) || !inRange(e.intensity, 1, 10)) {
      return { valid: false, error: 'each emotion needs name(string) and intensity(1-10)' };
    }
  }

  if (!Array.isArray(d.themes) || d.themes.length < 1 || d.themes.length > 5) {
    return { valid: false, error: 'themes must be array(1..5)' };
  }

  if (!isNumber(d.intensity) || !inRange(d.intensity, 1, 10)) {
    return { valid: false, error: 'intensity must be number(1-10)' };
  }

  if (!isString(d.interpretation) || d.interpretation.length < 10 || d.interpretation.length > 500) {
    return { valid: false, error: 'interpretation must be string(10..500)' };
  }

  return { valid: true };
}

/**
 * ForecastPrediction 응답 검증
 */
export function validateForecastResponse(
  data: unknown,
): { valid: true } | { valid: false; error: string } {
  if (!data || typeof data !== 'object') {
    return { valid: false, error: 'response must be an object' };
  }
  const d = data as Record<string, unknown>;

  if (!isNumber(d.condition) || !inRange(d.condition, 1, 5)) {
    return { valid: false, error: 'condition must be number(1-5)' };
  }
  if (!isNumber(d.confidence) || !inRange(d.confidence, 0, 100)) {
    return { valid: false, error: 'confidence must be number(0-100)' };
  }
  if (!isString(d.summary) || d.summary.length < 10 || d.summary.length > 300) {
    return { valid: false, error: 'summary must be string(10..300)' };
  }
  if (!Array.isArray(d.risks) || d.risks.length > 3) {
    return { valid: false, error: 'risks must be array(0..3)' };
  }
  if (!Array.isArray(d.suggestions) || d.suggestions.length < 1 || d.suggestions.length > 4) {
    return { valid: false, error: 'suggestions must be array(1..4)' };
  }

  return { valid: true };
}
