/**
 * AI 응답 Zod 스키마
 * 실제 AI 및 Mock 응답 검증에 사용
 */
import { z } from 'zod';

/**
 * 심볼 스키마
 */
export const SymbolSchema = z.object({
  name: z.string().min(1),
  meaning: z.string().min(1),
  personalMeaning: z.string().optional(),
  frequency: z.number().int().min(1).default(1),
});

/**
 * 감정 스키마
 */
export const EmotionSchema = z.object({
  name: z.string().min(1),
  intensity: z.number().min(1).max(10),
  color: z.string().optional(),
});

/**
 * 꿈 분석 결과 스키마
 */
export const DreamAnalysisSchema = z.object({
  symbols: z.array(SymbolSchema).min(1).max(10),
  emotions: z.array(EmotionSchema).min(1).max(5),
  themes: z.array(z.string()).min(1).max(5),
  intensity: z.number().min(1).max(10),
  interpretation: z.string().min(10).max(500),
  actionSuggestion: z.string().optional(),
  reflectionQuestions: z.array(z.string()).optional(),
});

/**
 * 예보 예측 스키마
 */
export const ForecastPredictionSchema = z.object({
  condition: z.number().min(1).max(5),
  confidence: z.number().min(0).max(100),
  summary: z.string().min(10).max(300),
  risks: z.array(z.string()).max(3),
  suggestions: z.array(z.string()).min(1).max(4),
});

// Alias for backward compatibility
export const ForecastSchema = ForecastPredictionSchema;

/**
 * 주간 리포트 인사이트 스키마
 */
export const PatternInsightSchema = z.object({
  type: z.enum(['emotion', 'symbol', 'sleep', 'event']),
  description: z.string().min(10).max(200),
  confidence: z.number().min(0).max(100),
  suggestion: z.string().optional(),
});

/**
 * UHS 스코어 분석 스키마
 */
export const UHSBreakdownSchema = z.object({
  sleep: z.number().min(0).max(100),
  emotion: z.number().min(0).max(100),
  dream: z.number().min(0).max(100),
  stress: z.number().min(0).max(100),
});

/**
 * 안전하게 스키마 파싱 (에러 시 null 반환)
 * @param {z.ZodSchema} schema
 * @param {unknown} data
 * @returns {{ success: boolean, data?: any, error?: z.ZodError }}
 */
export function safeParse(schema, data) {
  const result = schema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, error: result.error };
}

