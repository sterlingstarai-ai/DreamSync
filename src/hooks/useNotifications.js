/**
 * 알림 관련 훅
 * Capacitor Local Notifications 사용
 */
import { useState, useCallback, useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import logger from '../lib/utils/logger';
import analytics from '../lib/adapters/analytics';

/**
 * 알림 ID 상수
 */
const NOTIFICATION_IDS = {
  MORNING_REMINDER: 1,
  EVENING_REMINDER: 2,
  WEEKLY_REPORT: 3,
  TEST_NOTIFICATION: 9000,
};

/**
 * 알림 훅
 * @returns {Object}
 */
export default function useNotifications() {
  const [hasPermission, setHasPermission] = useState(false);
  const [isNative, setIsNative] = useState(false);

  /**
   * 권한 확인
   */
  const checkPermission = useCallback(async () => {
    if (!Capacitor.isNativePlatform()) {
      return false;
    }

    try {
      const status = await LocalNotifications.checkPermissions();
      const granted = status.display === 'granted';
      setHasPermission(granted);
      return granted;
    } catch (error) {
      logger.error('Failed to check notification permission:', error);
      return false;
    }
  }, []);

  /**
   * 초기화
   */
  useEffect(() => {
    const init = async () => {
      const native = Capacitor.isNativePlatform();
      setIsNative(native);

      if (native) {
        await checkPermission();
      }
    };

    init();
  }, [checkPermission]);

  useEffect(() => {
    if (!isNative) return;

    let listenerHandle = null;
    let disposed = false;

    LocalNotifications.addListener('localNotificationActionPerformed', (event) => {
      const notificationType = event?.notification?.actionTypeId
        || event?.actionId
        || event?.notification?.id
        || 'unknown';
      analytics.track(analytics.events.NOTIFICATION_CLICK, {
        notification_type: String(notificationType),
      });
    })
      .then((handle) => {
        if (disposed) {
          handle.remove().catch(() => {});
          return;
        }
        listenerHandle = handle;
      })
      .catch((error) => {
        logger.error('Failed to register notification click listener:', error);
      });

    return () => {
      disposed = true;
      if (listenerHandle) {
        listenerHandle.remove().catch(() => {});
      }
    };
  }, [isNative]);

  /**
   * 권한 요청
   */
  const requestPermission = useCallback(async () => {
    if (!Capacitor.isNativePlatform()) {
      return false;
    }

    try {
      const status = await LocalNotifications.requestPermissions();
      const granted = status.display === 'granted';
      setHasPermission(granted);
      return granted;
    } catch (error) {
      logger.error('Failed to request notification permission:', error);
      return false;
    }
  }, []);

  /**
   * 아침 알림 설정 (꿈 기록 리마인더)
   * @param {string} time - HH:mm 형식
   */
  const scheduleMorningReminder = useCallback(async (time) => {
    if (!hasPermission) {
      const granted = await requestPermission();
      if (!granted) return false;
    }

    try {
      const [hours, minutes] = time.split(':').map(Number);

      await LocalNotifications.schedule({
        notifications: [
          {
            id: NOTIFICATION_IDS.MORNING_REMINDER,
            title: '어젯밤 꿈을 기억하시나요? 🌙',
            body: '잊기 전에 꿈을 기록해보세요.',
            schedule: {
              on: {
                hour: hours,
                minute: minutes,
              },
              repeats: true,
            },
            sound: 'default',
            actionTypeId: 'DREAM_REMINDER',
          },
        ],
      });

      return true;
    } catch (error) {
      logger.error('Failed to schedule morning reminder:', error);
      return false;
    }
  }, [hasPermission, requestPermission]);

  /**
   * 저녁 알림 설정 (체크인 리마인더)
   * @param {string} time - HH:mm 형식
   */
  const scheduleEveningReminder = useCallback(async (time) => {
    if (!hasPermission) {
      const granted = await requestPermission();
      if (!granted) return false;
    }

    try {
      const [hours, minutes] = time.split(':').map(Number);

      await LocalNotifications.schedule({
        notifications: [
          {
            id: NOTIFICATION_IDS.EVENING_REMINDER,
            title: '오늘 하루는 어땠나요? ✨',
            body: '30초 체크인으로 하루를 마무리해보세요.',
            schedule: {
              on: {
                hour: hours,
                minute: minutes,
              },
              repeats: true,
            },
            sound: 'default',
            actionTypeId: 'CHECKIN_REMINDER',
          },
        ],
      });

      return true;
    } catch (error) {
      logger.error('Failed to schedule evening reminder:', error);
      return false;
    }
  }, [hasPermission, requestPermission]);

  /**
   * 주간 리포트 알림 설정 (일요일)
   */
  const scheduleWeeklyReportReminder = useCallback(async () => {
    if (!hasPermission) {
      const granted = await requestPermission();
      if (!granted) return false;
    }

    try {
      await LocalNotifications.schedule({
        notifications: [
          {
            id: NOTIFICATION_IDS.WEEKLY_REPORT,
            title: '이번 주 리포트가 준비되었어요 📊',
            body: '지난 한 주의 패턴을 확인해보세요.',
            schedule: {
              on: {
                weekday: 1, // 일요일
                hour: 10,
                minute: 0,
              },
              repeats: true,
            },
            sound: 'default',
            actionTypeId: 'WEEKLY_REPORT',
          },
        ],
      });

      return true;
    } catch (error) {
      logger.error('Failed to schedule weekly report reminder:', error);
      return false;
    }
  }, [hasPermission, requestPermission]);

  /**
   * 특정 알림 취소
   * @param {number} id
   */
  const cancelNotification = useCallback(async (id) => {
    try {
      await LocalNotifications.cancel({ notifications: [{ id }] });
      return true;
    } catch (error) {
      logger.error('Failed to cancel notification:', error);
      return false;
    }
  }, []);

  /**
   * 모든 알림 취소
   */
  const cancelAllNotifications = useCallback(async () => {
    try {
      const pending = await LocalNotifications.getPending();
      if (pending.notifications.length > 0) {
        await LocalNotifications.cancel(pending);
      }
      return true;
    } catch (error) {
      logger.error('Failed to cancel all notifications:', error);
      return false;
    }
  }, []);

  /**
   * 테스트 알림 예약
   * @param {number} [delayMinutes=1]
   */
  const scheduleTestNotification = useCallback(async (delayMinutes = 1) => {
    if (!Capacitor.isNativePlatform()) return false;

    if (!hasPermission) {
      const granted = await requestPermission();
      if (!granted) return false;
    }

    try {
      const at = new Date(Date.now() + Math.max(1, delayMinutes) * 60 * 1000);

      await LocalNotifications.schedule({
        notifications: [
          {
            id: NOTIFICATION_IDS.TEST_NOTIFICATION,
            title: 'DreamSync 테스트 알림',
            body: '알림 설정이 정상적으로 동작하고 있어요.',
            schedule: {
              at,
              allowWhileIdle: true,
            },
            sound: 'default',
            actionTypeId: 'TEST_NOTIFICATION',
          },
        ],
      });
      return true;
    } catch (error) {
      logger.error('Failed to schedule test notification:', error);
      return false;
    }
  }, [hasPermission, requestPermission]);

  /**
   * 알림 설정 일괄 적용
   * @param {Object} settings
   */
  const applyNotificationSettings = useCallback(async ({
    enabled,
    morningReminder,
    morningTime,
    eveningReminder,
    eveningTime,
    weeklyReport,
  }) => {
    if (!enabled) {
      await cancelAllNotifications();
      return;
    }

    if (morningReminder) {
      await scheduleMorningReminder(morningTime);
    } else {
      await cancelNotification(NOTIFICATION_IDS.MORNING_REMINDER);
    }

    if (eveningReminder) {
      await scheduleEveningReminder(eveningTime);
    } else {
      await cancelNotification(NOTIFICATION_IDS.EVENING_REMINDER);
    }

    if (weeklyReport) {
      await scheduleWeeklyReportReminder();
    } else {
      await cancelNotification(NOTIFICATION_IDS.WEEKLY_REPORT);
    }
  }, [
    cancelAllNotifications,
    scheduleMorningReminder,
    scheduleEveningReminder,
    scheduleWeeklyReportReminder,
    cancelNotification,
  ]);

  return {
    // 상태
    hasPermission,
    isNative,

    // 액션
    checkPermission,
    requestPermission,
    scheduleMorningReminder,
    scheduleEveningReminder,
    scheduleWeeklyReportReminder,
    cancelNotification,
    cancelAllNotifications,
    scheduleTestNotification,
    applyNotificationSettings,

    // 상수
    NOTIFICATION_IDS,
  };
}
