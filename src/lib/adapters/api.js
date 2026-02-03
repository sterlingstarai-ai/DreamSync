/**
 * API Adapter Interface
 * Local (Zustand persist) ↔ Supabase API 전환 가능한 구조
 *
 * Phase 1: Zustand persist가 소스 오브 트루스 (별도 API 레이어 불필요)
 * Phase 2+: Supabase 연동 시 이 어댑터를 통해 전환
 *
 * ⚠️ 저장소 원칙: 소스 오브 트루스는 하나만 존재한다.
 *    Phase 1에서는 Zustand persist가 유일한 저장소.
 */
import logger from '../utils/logger';

/**
 * Local Adapter (Phase 1)
 * Zustand persist가 직접 데이터를 관리하므로,
 * 이 어댑터는 no-op 패스스루 역할만 함.
 */
const LocalAPIAdapter = {
  name: 'local',
  // Phase 1: 모든 데이터 접근은 Zustand store를 통해 수행
  // 이 어댑터는 앱 부팅 시 설정 확인용으로만 존재
};

/**
 * Supabase API Adapter (Phase 2+)
 */
const SupabaseAPIAdapter = {
  name: 'supabase',
  // TODO: Phase 2에서 Supabase 클라이언트로 구현
  // import { supabase } from '../supabase';
};

/**
 * API Adapter 레지스트리
 */
const adapters = {
  local: LocalAPIAdapter,
  supabase: SupabaseAPIAdapter,
};

/**
 * 현재 활성 어댑터
 */
let currentAdapter = LocalAPIAdapter;

/**
 * API Adapter 설정
 * @param {'local' | 'supabase'} type
 */
export function setAPIAdapter(type) {
  const adapter = adapters[type];
  if (!adapter) {
    logger.warn(`Unknown API adapter: ${type}, falling back to local`);
    currentAdapter = LocalAPIAdapter;
  } else {
    currentAdapter = adapter;
  }
}

/**
 * 현재 API Adapter 가져오기
 * @returns {Object}
 */
export function getAPIAdapter() {
  return currentAdapter;
}

export default {
  setAPIAdapter,
  getAPIAdapter,
};
