/**
 * B2B API 서비스 스텁
 *
 * Phase 4: 기업용 API
 * Feature Flag: b2b
 *
 * 구조:
 * - API Key 인증
 * - 요청 쿼터 관리
 * - 요청/응답 로깅
 */

/**
 * B2B API 클라이언트 스텁
 */
class B2BClient {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.baseUrl = import.meta.env.VITE_B2B_API_URL || '/api/v1';
    this.quota = {
      limit: 1000,
      used: 0,
      resetAt: null,
    };
  }

  /**
   * API 키 검증 (스텁)
   */
  async validateApiKey() {
    // Phase 4: 실제 서버 검증
    console.log('[B2B] API 키 검증 (스텁)');

    if (!this.apiKey) {
      return { valid: false, error: 'API 키가 필요합니다.' };
    }

    // 스텁: 항상 유효
    return {
      valid: true,
      organization: 'Test Organization',
      plan: 'enterprise',
      quotaLimit: 1000,
      quotaUsed: 0,
    };
  }

  /**
   * 쿼터 확인 (스텁)
   */
  async checkQuota() {
    console.log('[B2B] 쿼터 확인 (스텁)');

    // Phase 4: 실제 서버에서 조회
    return {
      limit: this.quota.limit,
      used: this.quota.used,
      remaining: this.quota.limit - this.quota.used,
      resetAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    };
  }

  /**
   * 쿼터 차감 (스텁)
   * @param {number} amount
   */
  async deductQuota(amount = 1) {
    console.log(`[B2B] 쿼터 차감: ${amount} (스텁)`);

    this.quota.used += amount;

    return {
      success: true,
      remaining: this.quota.limit - this.quota.used,
    };
  }

  /**
   * 요청 로깅 (스텁)
   * @param {Object} logData
   */
  async logRequest(logData) {
    console.log('[B2B] 요청 로그:', logData);

    // Phase 4: 실제 로깅 서버로 전송
    return { logged: true };
  }

  /**
   * 집계 데이터 조회 API (스텁)
   * @param {Object} params
   * @param {string} params.startDate
   * @param {string} params.endDate
   * @param {string[]} params.metrics
   */
  async getAggregatedData({ startDate, endDate, metrics }) {
    console.log('[B2B] 집계 데이터 조회 (스텁):', { startDate, endDate, metrics });

    // 쿼터 차감
    await this.deductQuota(1);

    // 로깅
    await this.logRequest({
      endpoint: '/aggregated',
      params: { startDate, endDate, metrics },
      timestamp: new Date().toISOString(),
    });

    // 스텁 응답
    return {
      success: true,
      data: {
        period: { startDate, endDate },
        metrics: {
          totalUsers: 0,
          activeUsers: 0,
          avgUHS: 0,
          avgSleepQuality: 0,
          avgStress: 0,
        },
        notice: '이것은 스텁 데이터입니다. Phase 4에서 실제 데이터로 대체됩니다.',
      },
    };
  }

  /**
   * 익명화된 인사이트 조회 API (스텁)
   */
  async getAnonymizedInsights() {
    console.log('[B2B] 익명화 인사이트 조회 (스텁)');

    await this.deductQuota(1);

    return {
      success: true,
      data: {
        insights: [
          {
            type: 'trend',
            description: '스텁 인사이트: 수면 품질 트렌드',
            value: 'stable',
          },
        ],
        notice: '이것은 스텁 데이터입니다.',
      },
    };
  }
}

/**
 * B2B 서비스 싱글톤
 */
let b2bClient = null;

/**
 * B2B 클라이언트 초기화
 * @param {string} apiKey
 */
export function initB2BClient(apiKey) {
  b2bClient = new B2BClient(apiKey);
  return b2bClient;
}

/**
 * B2B 클라이언트 가져오기
 */
export function getB2BClient() {
  if (!b2bClient) {
    throw new Error('B2B 클라이언트가 초기화되지 않았습니다. initB2BClient()를 먼저 호출하세요.');
  }
  return b2bClient;
}

/**
 * B2B 클라이언트 리셋 (테스트용)
 */
export function resetB2BClient() {
  b2bClient = null;
}

/**
 * B2B API 키 검증
 */
export async function validateB2BApiKey(apiKey) {
  const client = new B2BClient(apiKey);
  return client.validateApiKey();
}

export default {
  B2BClient,
  initB2BClient,
  getB2BClient,
  resetB2BClient,
  validateB2BApiKey,
};
