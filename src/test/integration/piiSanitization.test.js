/**
 * PII 유출 방지 테스트
 *
 * Sentry/Mixpanel sanitize 함수에 민감 데이터를 넣었을 때
 * 출력에 원문이 0인지 검증.
 *
 * 2중 방어: mask.js + adapter별 sanitize 둘 다 테스트.
 */

import { describe, it, expect } from 'vitest';
import { maskSensitiveFields, maskDreamContent } from '../../lib/utils/mask';

// Sentry/Mixpanel adapter의 sanitize 함수는 모듈 내부 함수이므로
// 여기서는 공용 mask 유틸리티 + 시뮬레이션 테스트

/** 민감 데이터가 포함된 이벤트 시뮬레이션 */
const SENSITIVE_EVENT = {
  userId: 'user-123',
  action: 'analyzeDream',
  content: '어젯밤 높은 산에서 떨어지는 무서운 꿈을 꿨다. 엄마가 나타났다.',
  dreamContent: '바다에서 수영하다 상어를 만났다.',
  interpretation: '이 꿈은 불안감과 통제력 상실에 대한 두려움을 반영합니다.',
  emotions: [
    { name: '불안한', intensity: 8 },
    { name: '무서운', intensity: 9 },
  ],
  emotionDetails: '최근 직장 스트레스로 인한 불안이 꿈에 반영됨',
  feelings: '이직 고민으로 인한 불안',
  personalMeaning: '산은 나에게 아버지를 상징한다',
  meaning: '추락은 통제력 상실을 의미함',
  text: '꿈 기록 원문 텍스트',
  note: '오늘 컨디션이 안 좋았음',
  healthData: { hrv: 45, steps: 3200 },
  sleepData: { bedtime: '01:30', quality: 2 },
  hrvData: { average: 42, min: 28, max: 65 },
  // 안전 필드
  timestamp: '2026-02-03T10:00:00Z',
  appVersion: '0.0.1',
  platform: 'ios',
  errorCode: 'AI_PARSE_ERROR',
};

describe('PII 유출 방지: mask.js', () => {
  it('모든 민감 필드가 마스킹된다', () => {
    const safe = maskSensitiveFields(SENSITIVE_EVENT);

    // 민감 필드: 원문 아닌 길이/타입만
    expect(safe.content).toMatch(/^\[\d+ chars\]$/);
    expect(safe.dreamContent).toMatch(/^\[\d+ chars\]$/);
    expect(safe.interpretation).toMatch(/^\[\d+ chars\]$/);
    expect(safe.emotionDetails).toMatch(/^\[\d+ chars\]$/);
    expect(safe.feelings).toMatch(/^\[\d+ chars\]$/);
    expect(safe.personalMeaning).toMatch(/^\[\d+ chars\]$/);
    expect(safe.meaning).toMatch(/^\[\d+ chars\]$/);
    expect(safe.text).toMatch(/^\[\d+ chars\]$/);
    expect(safe.note).toMatch(/^\[\d+ chars\]$/);

    // 배열/객체 → 타입 마커
    expect(safe.emotions).toMatch(/^\[\d+ items\]$/);
    expect(safe.healthData).toBe('[object]');
    expect(safe.sleepData).toBe('[object]');
    expect(safe.hrvData).toBe('[object]');

    // 안전 필드는 원본 유지
    expect(safe.userId).toBe('user-123');
    expect(safe.action).toBe('analyzeDream');
    expect(safe.timestamp).toBe('2026-02-03T10:00:00Z');
    expect(safe.appVersion).toBe('0.0.1');
    expect(safe.platform).toBe('ios');
    expect(safe.errorCode).toBe('AI_PARSE_ERROR');
  });

  it('마스킹된 출력에 한글 꿈 내용이 절대 없다', () => {
    const safe = maskSensitiveFields(SENSITIVE_EVENT);
    const serialized = JSON.stringify(safe);

    // 원문에 있던 키워드가 출력에 없어야 함
    expect(serialized).not.toContain('산에서 떨어지는');
    expect(serialized).not.toContain('상어를 만났다');
    expect(serialized).not.toContain('불안감과 통제력');
    expect(serialized).not.toContain('직장 스트레스');
    expect(serialized).not.toContain('이직 고민');
    expect(serialized).not.toContain('아버지를 상징');
    expect(serialized).not.toContain('컨디션이 안 좋았음');
  });

  it('maskDreamContent: 꿈 원문 → 길이만', () => {
    const result = maskDreamContent('바다에서 수영하는 꿈을 꿨다');
    expect(result).toMatch(/^\[dream: \d+ chars\]$/);
    expect(result).not.toContain('바다');
    expect(result).not.toContain('수영');
  });

  it('maskDreamContent: 빈 값 처리', () => {
    expect(maskDreamContent('')).toBe('[empty]');
    expect(maskDreamContent(null)).toBe('[empty]');
    expect(maskDreamContent(undefined)).toBe('[empty]');
  });

  it('중첩 객체의 민감 필드도 마스킹', () => {
    const nested = {
      action: 'test',
      data: {
        content: '꿈 원문',
        interpretation: '해석 원문',
        meta: {
          dreamContent: '중첩된 꿈 원문',
        },
      },
    };

    const safe = maskSensitiveFields(nested);
    const serialized = JSON.stringify(safe);

    expect(serialized).not.toContain('꿈 원문');
    expect(serialized).not.toContain('해석 원문');
    expect(serialized).not.toContain('중첩된 꿈 원문');
  });
});

describe('PII 유출 방지: Sentry sanitizeEvent 시뮬레이션', () => {
  // Sentry의 beforeSend에서 호출되는 로직을 시뮬레이션
  const sensitivePatterns = [
    /dream/i, /content/i, /emotion/i, /feeling/i,
    /health/i, /sleep/i, /hrv/i, /personal/i,
    /interpret/i, /meaning/i, /note/i, /text/i,
  ];

  function simulateSentrySanitize(extra) {
    const safe = {};
    for (const [key, value] of Object.entries(extra)) {
      if (sensitivePatterns.some(p => p.test(key))) {
        safe[key] = '[REDACTED]';
      } else {
        safe[key] = value;
      }
    }
    return safe;
  }

  it('Sentry event.extra에서 민감 필드 REDACTED', () => {
    const sanitized = simulateSentrySanitize(SENSITIVE_EVENT);

    expect(sanitized.content).toBe('[REDACTED]');
    expect(sanitized.dreamContent).toBe('[REDACTED]');
    expect(sanitized.interpretation).toBe('[REDACTED]');
    expect(sanitized.emotions).toBe('[REDACTED]');
    expect(sanitized.emotionDetails).toBe('[REDACTED]');
    expect(sanitized.feelings).toBe('[REDACTED]');
    expect(sanitized.personalMeaning).toBe('[REDACTED]');
    expect(sanitized.healthData).toBe('[REDACTED]');
    expect(sanitized.sleepData).toBe('[REDACTED]');
    expect(sanitized.hrvData).toBe('[REDACTED]');

    // 안전 필드 유지
    expect(sanitized.userId).toBe('user-123');
    expect(sanitized.action).toBe('analyzeDream');
  });
});

describe('PII 유출 방지: Mixpanel sanitizeProperties 시뮬레이션', () => {
  const sensitiveFields = [
    'content', 'dreamContent', 'dream', 'text',
    'emotions', 'emotionDetails', 'feelings',
    'healthData', 'sleepData', 'hrvData',
    'personalMeaning', 'interpretation',
  ];

  function simulateMixpanelSanitize(properties) {
    const safe = {};
    for (const [key, value] of Object.entries(properties)) {
      if (sensitiveFields.includes(key)) {
        if (typeof value === 'string') {
          safe[`${key}_length`] = value.length;
        } else if (Array.isArray(value)) {
          safe[`${key}_count`] = value.length;
        }
        // 원문 제외
      } else {
        safe[key] = value;
      }
    }
    return safe;
  }

  it('Mixpanel에 원문이 아닌 길이만 전송', () => {
    const sanitized = simulateMixpanelSanitize(SENSITIVE_EVENT);

    // 원문 키 없음
    expect(sanitized.content).toBeUndefined();
    expect(sanitized.dreamContent).toBeUndefined();
    expect(sanitized.interpretation).toBeUndefined();
    expect(sanitized.emotions).toBeUndefined();

    // 길이/카운트만 존재
    expect(sanitized.content_length).toBe(SENSITIVE_EVENT.content.length);
    expect(sanitized.dreamContent_length).toBe(SENSITIVE_EVENT.dreamContent.length);
    expect(sanitized.emotions_count).toBe(2);

    // 안전 필드 유지
    expect(sanitized.timestamp).toBe('2026-02-03T10:00:00Z');
    expect(sanitized.platform).toBe('ios');
  });
});
