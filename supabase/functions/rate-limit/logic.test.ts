/**
 * Rate Limit 로직 Deno 테스트
 * 실행: deno test supabase/functions/rate-limit/logic.test.ts
 *
 * npm run verify에는 포함되지 않음 (Deno 런타임 전용)
 */

import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { checkRateLimit, resetStore } from './index.ts';

Deno.test('rate-limit: 첫 요청은 허용', () => {
  resetStore();
  const result = checkRateLimit('user1');
  assertEquals(result.allowed, true);
  assertEquals(result.remaining.minute, 9);
  assertEquals(result.remaining.day, 99);
});

Deno.test('rate-limit: 분당 10회 초과 시 차단', () => {
  resetStore();
  const now = Date.now();

  for (let i = 0; i < 10; i++) {
    const r = checkRateLimit('user2', now);
    assertEquals(r.allowed, true);
  }

  const blocked = checkRateLimit('user2', now);
  assertEquals(blocked.allowed, false);
  assertEquals(blocked.remaining.minute, 0);
});

Deno.test('rate-limit: 분 윈도우 리셋 후 다시 허용', () => {
  resetStore();
  const now = Date.now();

  for (let i = 0; i < 10; i++) {
    checkRateLimit('user3', now);
  }

  // 1분 후
  const afterMinute = now + 60_001;
  const result = checkRateLimit('user3', afterMinute);
  assertEquals(result.allowed, true);
});

Deno.test('rate-limit: 일당 100회 초과 시 차단', () => {
  resetStore();
  const now = Date.now();

  // 100회 요청 (분 윈도우를 리셋하며)
  for (let i = 0; i < 100; i++) {
    const minuteOffset = Math.floor(i / 10) * 60_001;
    checkRateLimit('user4', now + minuteOffset);
  }

  // 101번째 (새 분 윈도우이지만 일당 초과)
  const blocked = checkRateLimit('user4', now + 11 * 60_001);
  assertEquals(blocked.allowed, false);
  assertEquals(blocked.remaining.day, 0);
});

Deno.test('rate-limit: 서로 다른 userId는 독립적', () => {
  resetStore();
  const now = Date.now();

  for (let i = 0; i < 10; i++) {
    checkRateLimit('userA', now);
  }

  const blockedA = checkRateLimit('userA', now);
  assertEquals(blockedA.allowed, false);

  const allowedB = checkRateLimit('userB', now);
  assertEquals(allowedB.allowed, true);
});
