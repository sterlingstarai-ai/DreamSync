/**
 * Audit Log 보안 테스트
 * 실행: deno test supabase/functions/audit-log/audit.test.ts
 *
 * npm run verify에는 포함되지 않음 (Deno 런타임 전용)
 */

import { assertEquals, assert } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { stripSensitiveFields } from './index.ts';

Deno.test('audit-log: 민감 필드가 strip된다', () => {
  const input = {
    userId: 'user1',
    action: 'analyzeDream',
    contentLength: 150,
    contentHash: 'abc123',
    content: '어젯밤 바다에서 수영하는 꿈을 꿨다',
    interpretation: '이 꿈은 무의식의 신호입니다',
    latencyMs: 200,
    success: true,
  };

  const { cleaned, warnings } = stripSensitiveFields(input);

  // content, interpretation이 제거됨
  assertEquals(cleaned.content, undefined);
  assertEquals(cleaned.interpretation, undefined);

  // 다른 필드는 유지
  assertEquals(cleaned.userId, 'user1');
  assertEquals(cleaned.action, 'analyzeDream');
  assertEquals(cleaned.contentLength, 150);
  assertEquals(cleaned.contentHash, 'abc123');

  // 경고 2개 (content, interpretation)
  assertEquals(warnings.length, 2);
  assert(warnings.some(w => w.includes('content')));
  assert(warnings.some(w => w.includes('interpretation')));
});

Deno.test('audit-log: 민감 필드 없으면 경고 0', () => {
  const input = {
    userId: 'user1',
    action: 'generateForecast',
    contentLength: 50,
    contentHash: 'def456',
    latencyMs: 100,
    success: true,
  };

  const { cleaned, warnings } = stripSensitiveFields(input);

  assertEquals(warnings.length, 0);
  assertEquals(Object.keys(cleaned).length, Object.keys(input).length);
});

Deno.test('audit-log: 모든 민감 필드가 감지된다', () => {
  const sensitiveFields = [
    'content', 'dreamContent', 'text', 'interpretation',
    'meaning', 'personalMeaning', 'emotions', 'emotionDetails',
    'feelings', 'note',
  ];

  const input: Record<string, unknown> = { userId: 'user1', action: 'test', contentLength: 0, success: true };
  for (const field of sensitiveFields) {
    input[field] = 'sensitive data';
  }

  const { cleaned, warnings } = stripSensitiveFields(input);

  assertEquals(warnings.length, sensitiveFields.length);
  for (const field of sensitiveFields) {
    assertEquals(cleaned[field], undefined, `${field} should be stripped`);
  }
});

Deno.test('audit-log: 빈 객체도 처리 가능', () => {
  const { cleaned, warnings } = stripSensitiveFields({});
  assertEquals(Object.keys(cleaned).length, 0);
  assertEquals(warnings.length, 0);
});
