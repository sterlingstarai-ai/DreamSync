/**
 * 설정 페이지
 */
import { useCallback, useState } from 'react';
import {
  User, Bell, Moon, Shield, Info, LogOut, ChevronRight,
  Smartphone, Heart, Database, Code, ToggleLeft, ToggleRight,
  Download, Trash2, Sunrise, Clock3
} from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';
import {
  PageContainer, PageHeader, Card, Button, Modal, useToast
} from '../components/common';
import BottomNav from '../components/common/BottomNav';
import useAuth from '../hooks/useAuth';
import useSettingsStore from '../store/useSettingsStore';
import useFeatureFlags from '../hooks/useFeatureFlags';
import useNotifications from '../hooks/useNotifications';
import { FEATURE_FLAG_INFO } from '../constants/featureFlags';
import useDreamStore from '../store/useDreamStore';
import useCheckInStore from '../store/useCheckInStore';
import useSymbolStore from '../store/useSymbolStore';
import useForecastStore from '../store/useForecastStore';
import storage from '../lib/adapters/storage';
import analytics from '../lib/adapters/analytics';

export default function Settings() {
  const toast = useToast();
  const { user, signOut, isLoading } = useAuth();
  const { notifications, privacy } = useSettingsStore(useShallow(state => ({
    notifications: state.notifications,
    privacy: state.privacy,
  })));
  const updateNotifications = useSettingsStore(state => state.updateNotifications);
  const updatePrivacy = useSettingsStore(state => state.updatePrivacy);
  const getAllSettings = useSettingsStore(state => state.getAllSettings);
  const resetSettings = useSettingsStore(state => state.resetSettings);
  const { isEnabled, toggleFlag, getAvailableFlags, isNative, isIOS, isAndroid } = useFeatureFlags();
  const {
    hasPermission,
    requestPermission,
    applyNotificationSettings,
    scheduleTestNotification,
  } = useNotifications();

  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showDevMode, setShowDevMode] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteText, setDeleteText] = useState('');

  const trackSettingChange = useCallback((settingKey, newValue) => {
    analytics.track(analytics.events.SETTINGS_CHANGE, {
      setting_key: settingKey,
      new_value: typeof newValue === 'object' ? JSON.stringify(newValue) : String(newValue),
    });
  }, []);

  const handleLogout = async () => {
    await signOut();
    toast.success('로그아웃되었습니다');
  };

  const handleExportData = () => {
    const data = {
      exportedAt: new Date().toISOString(),
      version: '1.0',
      dreams: useDreamStore.getState().dreams,
      checkIns: useCheckInStore.getState().logs,
      symbols: useSymbolStore.getState().symbols,
      forecasts: useForecastStore.getState().forecasts,
      settings: getAllSettings(),
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dreamsync-export-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('데이터를 내보냈습니다');
  };

  const handleDeleteAllData = async () => {
    if (deleteText !== '삭제') return;
    useDreamStore.getState().reset();
    useCheckInStore.getState().reset();
    useSymbolStore.getState().reset();
    useForecastStore.getState().reset();
    resetSettings();
    // 스토리지 어댑터 레벨도 완전 삭제 (Capacitor Preferences 잔류 방지)
    await storage.clear();
    setShowDeleteConfirm(false);
    setDeleteText('');
    toast.success('모든 데이터가 삭제되었습니다');
  };

  const applyNotificationChanges = useCallback(async (partial, shouldSync = notifications.enabled) => {
    const next = { ...notifications, ...partial };
    updateNotifications(partial);
    for (const [key, value] of Object.entries(partial)) {
      trackSettingChange(`notifications.${key}`, value);
    }
    if (shouldSync) {
      await applyNotificationSettings(next);
    }
  }, [notifications, updateNotifications, applyNotificationSettings, trackSettingChange]);

  const handlePrivacyChange = useCallback((key, value) => {
    updatePrivacy({ [key]: value });
    trackSettingChange(`privacy.${key}`, value);
  }, [updatePrivacy, trackSettingChange]);

  const handleFeatureFlagToggle = useCallback((flagKey) => {
    const nextValue = !isEnabled(flagKey);
    toggleFlag(flagKey);
    trackSettingChange(`feature.${flagKey}`, nextValue);
  }, [isEnabled, toggleFlag, trackSettingChange]);

  const handleNotificationToggle = async (enabled) => {
    if (enabled && !hasPermission) {
      const granted = await requestPermission();
      if (!granted) {
        toast.warning('알림 권한이 필요합니다');
        return;
      }
    }
    await applyNotificationChanges({ enabled }, true);
  };

  const handleReminderToggle = async (key, enabled) => {
    const shouldSync = notifications.enabled;
    await applyNotificationChanges({ [key]: enabled }, shouldSync);
  };

  const handleReminderTimeChange = async (key, value) => {
    const isValidTime = /^\d{2}:\d{2}$/.test(value);
    if (!isValidTime) return;
    const shouldSync = notifications.enabled;
    await applyNotificationChanges({ [key]: value }, shouldSync);
  };

  const handleTestNotification = async () => {
    const ok = await scheduleTestNotification(1);
    if (ok) {
      toast.success('1분 후 테스트 알림이 예약되었습니다');
    } else {
      toast.warning('테스트 알림을 보낼 수 없습니다');
    }
  };

  return (
    <>
      <PageContainer className="pb-24">
        <PageHeader title="설정" />

        {/* 프로필 섹션 */}
        <section className="mb-6">
          <Card padding="lg">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-violet-600 to-blue-500 flex items-center justify-center">
                <User className="w-8 h-8 text-white" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-[var(--text-primary)]">
                  {user?.name || '사용자'}
                </p>
                <p className="text-sm text-[var(--text-muted)]">
                  {user?.email}
                </p>
              </div>
            </div>
          </Card>
        </section>

        {/* 설정 목록 */}
        <div className="space-y-4">
          {/* 알림 */}
          <SettingSection title="알림">
            <SettingToggle
              icon={Bell}
              label="알림 활성화"
              description="리마인더 및 주간 리포트 알림"
              enabled={notifications.enabled}
              onChange={handleNotificationToggle}
            />
            {notifications.enabled && (
              <>
                <SettingToggle
                  icon={Sunrise}
                  label="아침 꿈 기록 알림"
                  description="기상 후 꿈 기록 리마인더"
                  enabled={notifications.morningReminder}
                  onChange={(enabled) => handleReminderToggle('morningReminder', enabled)}
                />
                {notifications.morningReminder && (
                  <SettingTimeInput
                    icon={Clock3}
                    label="아침 알림 시간"
                    value={notifications.morningTime}
                    onChange={(value) => handleReminderTimeChange('morningTime', value)}
                  />
                )}

                <SettingToggle
                  icon={Moon}
                  label="저녁 체크인 알림"
                  description="하루 마무리 체크인 리마인더"
                  enabled={notifications.eveningReminder}
                  onChange={(enabled) => handleReminderToggle('eveningReminder', enabled)}
                />
                {notifications.eveningReminder && (
                  <SettingTimeInput
                    icon={Clock3}
                    label="저녁 알림 시간"
                    value={notifications.eveningTime}
                    onChange={(value) => handleReminderTimeChange('eveningTime', value)}
                  />
                )}

                <SettingToggle
                  icon={Bell}
                  label="주간 리포트 알림"
                  description="매주 일요일 오전 리포트 알림"
                  enabled={notifications.weeklyReport}
                  onChange={(enabled) => handleReminderToggle('weeklyReport', enabled)}
                />

                {isNative && (
                  <SettingItem
                    icon={Bell}
                    label="테스트 알림 보내기"
                    value="1분 후"
                    onClick={handleTestNotification}
                  />
                )}

                <div className="px-4 py-2 text-xs text-[var(--text-muted)]">
                  알림 권한: {hasPermission ? '허용됨' : '미허용'}
                </div>
              </>
            )}
          </SettingSection>

          {/* 개인정보 */}
          <SettingSection title="개인정보">
            <SettingToggle
              icon={Database}
              label="사용 데이터 분석"
              description="앱 개선을 위한 익명 데이터 수집"
              enabled={privacy.analytics}
              onChange={(v) => handlePrivacyChange('analytics', v)}
            />
            <SettingToggle
              icon={Shield}
              label="오류 보고"
              description="앱 안정성 향상을 위한 오류 보고"
              enabled={privacy.crashReports}
              onChange={(v) => handlePrivacyChange('crashReports', v)}
            />
          </SettingSection>

          {/* Feature Flags (웨어러블 연동, UHS 등) */}
          {isNative && (
            <SettingSection title="실험 기능">
              <SettingToggle
                icon={Heart}
                label="웨어러블 연동"
                description={isIOS
                  ? 'Apple Health에서 수면 데이터 자동 수집'
                  : isAndroid
                    ? 'Health Connect에서 수면 데이터 자동 수집'
                    : '건강 앱에서 수면 데이터 자동 수집'}
                enabled={isEnabled('healthkit')}
                onChange={() => handleFeatureFlagToggle('healthkit')}
              />
              <SettingToggle
                icon={Smartphone}
                label="UHS 스코어"
                description="통합 건강 점수 표시 (베타)"
                enabled={isEnabled('uhs')}
                onChange={() => handleFeatureFlagToggle('uhs')}
              />
            </SettingSection>
          )}

          {/* 데이터 관리 */}
          <SettingSection title="데이터 관리">
            <SettingItem
              icon={Download}
              label="데이터 내보내기"
              value="JSON"
              onClick={handleExportData}
            />
            <SettingItem
              icon={Trash2}
              label="모든 데이터 삭제"
              onClick={() => setShowDeleteConfirm(true)}
            />
          </SettingSection>

          {/* 정보 */}
          <SettingSection title="정보">
            <SettingItem
              icon={Info}
              label="버전"
              value="0.0.1"
            />
            <SettingItem
              icon={Code}
              label="개발자 모드"
              onClick={() => setShowDevMode(true)}
            />
          </SettingSection>

          {/* 로그아웃 */}
          <Button
            variant="danger"
            fullWidth
            onClick={() => setShowLogoutConfirm(true)}
          >
            <LogOut className="w-4 h-4" />
            로그아웃
          </Button>
        </div>

        {/* 로그아웃 확인 모달 */}
        <Modal
          isOpen={showLogoutConfirm}
          onClose={() => setShowLogoutConfirm(false)}
          title="로그아웃"
          size="sm"
          footer={
            <>
              <Button variant="ghost" onClick={() => setShowLogoutConfirm(false)}>
                취소
              </Button>
              <Button variant="danger" onClick={handleLogout} loading={isLoading}>
                로그아웃
              </Button>
            </>
          }
        >
          <p className="text-[var(--text-secondary)]">
            정말 로그아웃하시겠어요?
          </p>
        </Modal>

        {/* 개발자 모드 모달 */}
        <Modal
          isOpen={showDevMode}
          onClose={() => setShowDevMode(false)}
          title="개발자 모드"
          size="md"
        >
          <div className="space-y-4">
            <p className="text-sm text-[var(--text-muted)]">
              현재 활성화된 Feature Flags
            </p>
            <div className="space-y-2">
              {getAvailableFlags().map((key) => (
                <div
                  key={key}
                  className="flex items-center justify-between p-3 rounded-lg bg-[var(--bg-tertiary)]"
                >
                  <div>
                    <p className="text-sm font-medium text-[var(--text-primary)]">
                      {FEATURE_FLAG_INFO[key]?.name || key}
                    </p>
                    <p className="text-xs text-[var(--text-muted)]">
                      Phase {FEATURE_FLAG_INFO[key]?.phase || '?'}
                    </p>
                  </div>
                  <button
                    onClick={() => handleFeatureFlagToggle(key)}
                    className="text-violet-400"
                  >
                    {isEnabled(key) ? (
                      <ToggleRight className="w-8 h-8" />
                    ) : (
                      <ToggleLeft className="w-8 h-8 text-[var(--text-muted)]" />
                    )}
                  </button>
                </div>
              ))}
            </div>

            <div className="pt-4 border-t border-[var(--border-color)]">
              <p className="text-xs text-[var(--text-muted)]">
                User ID: {user?.id?.slice(0, 8)}...
              </p>
              <p className="text-xs text-[var(--text-muted)]">
                Platform: {isIOS ? 'iOS' : isNative ? 'Android' : 'Web'}
              </p>
            </div>
          </div>
        </Modal>
        {/* 데이터 삭제 확인 모달 */}
        <Modal
          isOpen={showDeleteConfirm}
          onClose={() => { setShowDeleteConfirm(false); setDeleteText(''); }}
          title="모든 데이터 삭제"
          size="sm"
          footer={
            <>
              <Button variant="ghost" onClick={() => { setShowDeleteConfirm(false); setDeleteText(''); }}>
                취소
              </Button>
              <Button
                variant="danger"
                disabled={deleteText !== '삭제'}
                onClick={handleDeleteAllData}
              >
                삭제
              </Button>
            </>
          }
        >
          <div className="space-y-3">
            <p className="text-[var(--text-secondary)]">
              모든 꿈 기록, 체크인, 심볼, 예보 데이터가 영구 삭제됩니다.
              이 작업은 되돌릴 수 없습니다.
            </p>
            <p className="text-sm text-[var(--text-muted)]">
              확인하려면 아래에 <strong className="text-red-400">삭제</strong>를 입력하세요.
            </p>
            <input
              type="text"
              value={deleteText}
              onChange={(e) => setDeleteText(e.target.value)}
              placeholder="삭제"
              className="w-full px-3 py-2 rounded-lg bg-[var(--bg-tertiary)] text-[var(--text-primary)] border border-[var(--border-color)] focus:outline-none focus:border-red-500"
            />
          </div>
        </Modal>
      </PageContainer>

      <BottomNav />
    </>
  );
}

/**
 * 설정 섹션
 */
function SettingSection({ title, children }) {
  return (
    <section>
      <h2 className="text-sm font-medium text-[var(--text-muted)] mb-2 px-1">
        {title}
      </h2>
      <Card padding="none">
        <div className="divide-y divide-[var(--border-color)]">
          {children}
        </div>
      </Card>
    </section>
  );
}

/**
 * 설정 아이템
 */
function SettingItem({ icon: ItemIcon, label, value = '', onClick = null }) {
  return (
    <button
      onClick={onClick}
      disabled={!onClick}
      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[var(--bg-tertiary)] transition-colors disabled:cursor-default"
    >
      <ItemIcon className="w-5 h-5 text-[var(--text-muted)]" />
      <span className="flex-1 text-left text-[var(--text-primary)]">
        {label}
      </span>
      {value && (
        <span className="text-[var(--text-muted)]">{value}</span>
      )}
      {onClick && (
        <ChevronRight className="w-5 h-5 text-[var(--text-muted)]" />
      )}
    </button>
  );
}

/**
 * 설정 토글
 */
function SettingToggle({ icon: ToggleIcon, label, description, enabled, onChange }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <ToggleIcon className="w-5 h-5 text-[var(--text-muted)]" />
      <div className="flex-1">
        <p className="text-[var(--text-primary)]">{label}</p>
        {description && (
          <p className="text-xs text-[var(--text-muted)]">{description}</p>
        )}
      </div>
      <button
        role="switch"
        aria-checked={enabled}
        aria-label={label}
        onClick={() => onChange(!enabled)}
        className="text-violet-400"
      >
        {enabled ? (
          <ToggleRight className="w-8 h-8" />
        ) : (
          <ToggleLeft className="w-8 h-8 text-[var(--text-muted)]" />
        )}
      </button>
    </div>
  );
}

function SettingTimeInput({ icon: TimeIcon, label, value, onChange }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <TimeIcon className="w-5 h-5 text-[var(--text-muted)]" />
      <span className="flex-1 text-[var(--text-primary)]">{label}</span>
      <input
        aria-label={label}
        type="time"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="px-2.5 py-1.5 rounded-lg bg-[var(--bg-tertiary)] text-[var(--text-primary)] border border-[var(--border-color)] text-sm"
      />
    </div>
  );
}
