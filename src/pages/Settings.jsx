/**
 * 설정 페이지
 */
import { useState } from 'react';
import {
  User, Bell, Moon, Shield, Info, LogOut, ChevronRight,
  Smartphone, Heart, Database, Code, ToggleLeft, ToggleRight,
  Download, Trash2
} from 'lucide-react';
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

export default function Settings() {
  const toast = useToast();
  const { user, signOut, isLoading } = useAuth();
  const settings = useSettingsStore();
  const { isEnabled, toggleFlag, getAvailableFlags, isNative, isIOS } = useFeatureFlags();
  const { hasPermission, requestPermission, applyNotificationSettings } = useNotifications();

  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showDevMode, setShowDevMode] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteText, setDeleteText] = useState('');

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
      settings: settings.getAllSettings(),
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

  const handleDeleteAllData = () => {
    if (deleteText !== '삭제') return;
    useDreamStore.getState().reset();
    useCheckInStore.getState().reset();
    useSymbolStore.getState().reset();
    useForecastStore.getState().reset();
    settings.resetSettings();
    setShowDeleteConfirm(false);
    setDeleteText('');
    toast.success('모든 데이터가 삭제되었습니다');
  };

  const handleNotificationToggle = async (enabled) => {
    if (enabled && !hasPermission) {
      const granted = await requestPermission();
      if (!granted) {
        toast.warning('알림 권한이 필요합니다');
        return;
      }
    }
    settings.updateNotifications({ enabled });
    await applyNotificationSettings({ ...settings.notifications, enabled });
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
              enabled={settings.notifications.enabled}
              onChange={handleNotificationToggle}
            />
            {settings.notifications.enabled && (
              <>
                <SettingItem
                  icon={Moon}
                  label="아침 알림"
                  value={settings.notifications.morningTime}
                />
                <SettingItem
                  icon={Moon}
                  label="저녁 알림"
                  value={settings.notifications.eveningTime}
                />
              </>
            )}
          </SettingSection>

          {/* 개인정보 */}
          <SettingSection title="개인정보">
            <SettingToggle
              icon={Database}
              label="사용 데이터 분석"
              description="앱 개선을 위한 익명 데이터 수집"
              enabled={settings.privacy.analytics}
              onChange={(v) => settings.updatePrivacy({ analytics: v })}
            />
            <SettingToggle
              icon={Shield}
              label="오류 보고"
              description="앱 안정성 향상을 위한 오류 보고"
              enabled={settings.privacy.crashReports}
              onChange={(v) => settings.updatePrivacy({ crashReports: v })}
            />
          </SettingSection>

          {/* Feature Flags (iOS용 HealthKit 등) */}
          {isNative && (
            <SettingSection title="실험 기능">
              {isIOS && (
                <SettingToggle
                  icon={Heart}
                  label="HealthKit 연동"
                  description="Apple Health에서 수면 데이터 자동 수집"
                  enabled={isEnabled('healthkit')}
                  onChange={() => toggleFlag('healthkit')}
                />
              )}
              <SettingToggle
                icon={Smartphone}
                label="UHS 스코어"
                description="통합 건강 점수 표시 (베타)"
                enabled={isEnabled('uhs')}
                onChange={() => toggleFlag('uhs')}
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
                    onClick={() => toggleFlag(key)}
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
