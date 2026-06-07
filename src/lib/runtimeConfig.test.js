import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  getRuntimeConfig,
  validateRuntimeConfig,
  createRuntimeConfigError,
} from './runtimeConfig';

describe('runtimeConfig', () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
  });

  it('local mock 기본 조합은 유효하다', () => {
    const validation = validateRuntimeConfig(getRuntimeConfig());
    expect(validation.valid).toBe(true);
    expect(validation.issues).toHaveLength(0);
  });

  it('edge AI는 supabase backend 없이 허용되지 않는다', () => {
    vi.stubEnv('VITE_AI', 'edge');
    vi.stubEnv('VITE_BACKEND', 'local');
    vi.stubEnv('VITE_EDGE_FUNCTION_URL', 'https://example.supabase.co/functions/v1/ai-proxy');

    const validation = validateRuntimeConfig(getRuntimeConfig());

    expect(validation.valid).toBe(false);
    expect(validation.issues.join(' ')).toContain('VITE_BACKEND=supabase');
  });

  it('remote flags는 supabase 자격 증명이 없으면 차단된다', () => {
    vi.stubEnv('VITE_FLAGS', 'remote');
    vi.stubEnv('VITE_SUPABASE_URL', '');
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', '');

    const validation = validateRuntimeConfig(getRuntimeConfig());

    expect(validation.valid).toBe(false);
    expect(validation.issues.join(' ')).toContain('VITE_FLAGS=remote');
  });

  it('집계된 설정 오류를 사용자용 메시지로 만든다', () => {
    const error = createRuntimeConfigError([
      'VITE_AI=edge 인데 VITE_EDGE_FUNCTION_URL 이 비어 있습니다.',
      'VITE_BACKEND=supabase 인데 VITE_SUPABASE_URL 또는 VITE_SUPABASE_ANON_KEY 가 비어 있습니다.',
    ]);

    expect(error.name).toBe('RuntimeConfigError');
    expect(error.issues).toHaveLength(2);
    expect(error.message).toContain('잘못된 런타임 설정');
  });
});
