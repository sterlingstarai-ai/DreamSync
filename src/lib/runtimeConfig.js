const SUPPORTED_AI_MODES = new Set(['mock', 'edge']);
const SUPPORTED_ANALYTICS_MODES = new Set(['mock', 'mixpanel']);
const SUPPORTED_API_MODES = new Set(['local', 'supabase']);
const SUPPORTED_FLAG_MODES = new Set(['local', 'remote']);

function normalizeMode(value, fallback) {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

function isPresent(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

export function getRuntimeConfig() {
  return {
    ai: normalizeMode(import.meta.env.VITE_AI, 'mock'),
    analytics: normalizeMode(import.meta.env.VITE_ANALYTICS, 'mock'),
    api: normalizeMode(import.meta.env.VITE_BACKEND, 'local'),
    flags: normalizeMode(import.meta.env.VITE_FLAGS, 'local'),
    supabaseUrl: normalizeMode(import.meta.env.VITE_SUPABASE_URL, ''),
    supabaseAnonKey: normalizeMode(import.meta.env.VITE_SUPABASE_ANON_KEY, ''),
    edgeFunctionUrl: normalizeMode(import.meta.env.VITE_EDGE_FUNCTION_URL, ''),
  };
}

export function validateRuntimeConfig(config = getRuntimeConfig()) {
  const issues = [];
  const supabaseConfigured = isPresent(config.supabaseUrl) && isPresent(config.supabaseAnonKey);

  if (!SUPPORTED_AI_MODES.has(config.ai)) {
    issues.push(`VITE_AI="${config.ai}" 는 지원되지 않습니다. mock 또는 edge만 사용할 수 있습니다.`);
  }
  if (!SUPPORTED_ANALYTICS_MODES.has(config.analytics)) {
    issues.push(`VITE_ANALYTICS="${config.analytics}" 는 지원되지 않습니다. mock 또는 mixpanel만 사용할 수 있습니다.`);
  }
  if (!SUPPORTED_API_MODES.has(config.api)) {
    issues.push(`VITE_BACKEND="${config.api}" 는 지원되지 않습니다. local 또는 supabase만 사용할 수 있습니다.`);
  }
  if (!SUPPORTED_FLAG_MODES.has(config.flags)) {
    issues.push(`VITE_FLAGS="${config.flags}" 는 지원되지 않습니다. local 또는 remote만 사용할 수 있습니다.`);
  }

  if (config.api === 'supabase' && !supabaseConfigured) {
    issues.push('VITE_BACKEND=supabase 인데 VITE_SUPABASE_URL 또는 VITE_SUPABASE_ANON_KEY 가 비어 있습니다.');
  }
  if (config.ai === 'edge' && !isPresent(config.edgeFunctionUrl)) {
    issues.push('VITE_AI=edge 인데 VITE_EDGE_FUNCTION_URL 이 비어 있습니다.');
  }
  if (config.ai === 'edge' && config.api !== 'supabase') {
    issues.push('VITE_AI=edge 는 VITE_BACKEND=supabase 와 함께 사용해야 합니다.');
  }
  if (config.flags === 'remote' && !supabaseConfigured) {
    issues.push('VITE_FLAGS=remote 인데 VITE_SUPABASE_URL 또는 VITE_SUPABASE_ANON_KEY 가 비어 있습니다.');
  }

  return {
    valid: issues.length === 0,
    issues,
    config,
  };
}

export function createRuntimeConfigError(issues) {
  const error = /** @type {Error & { issues: string[] }} */ (
    new Error(`잘못된 런타임 설정:\n- ${issues.join('\n- ')}`)
  );
  error.name = 'RuntimeConfigError';
  error.issues = issues;
  return error;
}
