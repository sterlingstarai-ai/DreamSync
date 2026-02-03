/**
 * Feature Flag 관련 훅
 */
import { useCallback } from 'react';
import useFeatureFlagStore from '../store/useFeatureFlagStore';

/**
 * Feature Flag 훅
 * @returns {Object}
 */
export default function useFeatureFlags() {
  const {
    flags,
    platform,
    getFlag,
    setFlag,
    setFlags,
    toggleFlag,
    getFlagInfo,
    getAvailableFlags,
    resetFlags,
  } = useFeatureFlagStore();

  /**
   * 특정 플래그가 활성화되어 있는지 확인
   */
  const isEnabled = useCallback((key) => {
    return getFlag(key);
  }, [getFlag]);

  /**
   * HealthKit 활성화 여부
   */
  const isHealthKitEnabled = isEnabled('healthkit');

  /**
   * 사주 분석 활성화 여부
   */
  const isSajuEnabled = isEnabled('saju');

  /**
   * UHS 스코어 활성화 여부
   */
  const isUHSEnabled = isEnabled('uhs');

  /**
   * B2B 모드 활성화 여부
   */
  const isB2BEnabled = isEnabled('b2b');

  /**
   * 개발자 모드 활성화 여부
   */
  const isDevMode = isEnabled('devMode');

  /**
   * Mock AI 사용 여부
   */
  const useMockAI = isEnabled('mockAI');

  /**
   * iOS 플랫폼 여부
   */
  const isIOS = platform === 'ios';

  /**
   * Android 플랫폼 여부
   */
  const isAndroid = platform === 'android';

  /**
   * 네이티브 플랫폼 여부
   */
  const isNative = isIOS || isAndroid;

  return {
    // 상태
    flags,
    platform,
    isIOS,
    isAndroid,
    isNative,

    // 편의 플래그
    isHealthKitEnabled,
    isSajuEnabled,
    isUHSEnabled,
    isB2BEnabled,
    isDevMode,
    useMockAI,

    // 액션
    isEnabled,
    setFlag,
    setFlags,
    toggleFlag,
    getFlagInfo,
    getAvailableFlags,
    resetFlags,
  };
}
