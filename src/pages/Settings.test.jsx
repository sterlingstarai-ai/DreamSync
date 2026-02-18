/**
 * Settings 페이지 테스트
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Settings from './Settings';

const mockState = vi.hoisted(() => ({
  notifications: {
    enabled: true,
    morningReminder: true,
    morningTime: '07:00',
    eveningReminder: true,
    eveningTime: '21:00',
    weeklyReport: true,
  },
  privacy: {
    analytics: true,
    crashReports: true,
  },
  updateNotifications: vi.fn(),
  updatePrivacy: vi.fn(),
  getAllSettings: vi.fn(() => ({})),
  resetSettings: vi.fn(),
  requestPermission: vi.fn().mockResolvedValue(true),
  applyNotificationSettings: vi.fn().mockResolvedValue(undefined),
  scheduleTestNotification: vi.fn().mockResolvedValue(true),
  toastSuccess: vi.fn(),
  toastWarning: vi.fn(),
}));

vi.mock('../hooks/useAuth', () => ({
  default: () => ({
    user: { id: 'user-1', name: '테스터', email: 'test@example.com' },
    signOut: vi.fn(),
    isLoading: false,
  }),
}));

vi.mock('../store/useSettingsStore', () => {
  const store = (selector) => {
    const state = {
      notifications: mockState.notifications,
      privacy: mockState.privacy,
      updateNotifications: mockState.updateNotifications,
      updatePrivacy: mockState.updatePrivacy,
      getAllSettings: mockState.getAllSettings,
      resetSettings: mockState.resetSettings,
    };
    return selector ? selector(state) : state;
  };
  store.getState = () => ({
    notifications: mockState.notifications,
    privacy: mockState.privacy,
    updateNotifications: mockState.updateNotifications,
    updatePrivacy: mockState.updatePrivacy,
    getAllSettings: mockState.getAllSettings,
    resetSettings: mockState.resetSettings,
  });
  return { default: store };
});

vi.mock('../hooks/useFeatureFlags', () => ({
  default: () => ({
    isEnabled: () => false,
    toggleFlag: vi.fn(),
    getAvailableFlags: () => [],
    isNative: true,
    isIOS: false,
    isAndroid: true,
  }),
}));

vi.mock('../hooks/useNotifications', () => ({
  default: () => ({
    hasPermission: true,
    requestPermission: mockState.requestPermission,
    applyNotificationSettings: mockState.applyNotificationSettings,
    scheduleTestNotification: mockState.scheduleTestNotification,
  }),
}));

vi.mock('../store/useDreamStore', () => ({
  default: { getState: () => ({ dreams: [], reset: vi.fn() }) },
}));
vi.mock('../store/useCheckInStore', () => ({
  default: { getState: () => ({ logs: [], reset: vi.fn() }) },
}));
vi.mock('../store/useSymbolStore', () => ({
  default: { getState: () => ({ symbols: [], reset: vi.fn() }) },
}));
vi.mock('../store/useForecastStore', () => ({
  default: { getState: () => ({ forecasts: [], reset: vi.fn() }) },
}));
vi.mock('../lib/adapters/storage', () => ({
  default: { clear: vi.fn() },
}));

vi.mock('../components/common', () => ({
  PageContainer: ({ children, className }) => <div className={className}>{children}</div>,
  PageHeader: ({ title }) => <h1>{title}</h1>,
  Card: ({ children }) => <div>{children}</div>,
  Button: ({ children, onClick, disabled }) => <button onClick={onClick} disabled={disabled}>{children}</button>,
  Modal: ({ isOpen, children, footer }) => (isOpen ? <div>{children}{footer}</div> : null),
  useToast: () => ({
    success: mockState.toastSuccess,
    warning: mockState.toastWarning,
  }),
}));

vi.mock('../components/common/BottomNav', () => ({
  default: () => null,
}));

function renderSettings() {
  return render(
    <MemoryRouter>
      <Settings />
    </MemoryRouter>,
  );
}

describe('Settings', () => {
  beforeEach(() => {
    mockState.updateNotifications.mockReset();
    mockState.applyNotificationSettings.mockReset();
    mockState.scheduleTestNotification.mockReset();
    mockState.scheduleTestNotification.mockResolvedValue(true);
    mockState.applyNotificationSettings.mockResolvedValue(undefined);
    mockState.toastSuccess.mockReset();
    mockState.toastWarning.mockReset();
  });

  it('renders detailed notification controls when enabled', () => {
    renderSettings();
    expect(screen.getByText('아침 꿈 기록 알림')).toBeInTheDocument();
    expect(screen.getByLabelText('아침 알림 시간')).toBeInTheDocument();
    expect(screen.getByText('주간 리포트 알림')).toBeInTheDocument();
  });

  it('toggles morning reminder and syncs schedules', async () => {
    renderSettings();
    fireEvent.click(screen.getByRole('switch', { name: '아침 꿈 기록 알림' }));

    await waitFor(() => {
      expect(mockState.updateNotifications).toHaveBeenCalledWith({ morningReminder: false });
    });
    expect(mockState.applyNotificationSettings).toHaveBeenCalledWith(
      expect.objectContaining({
        enabled: true,
        morningReminder: false,
      }),
    );
  });

  it('updates morning reminder time and applies settings', async () => {
    renderSettings();
    fireEvent.change(screen.getByLabelText('아침 알림 시간'), {
      target: { value: '06:30' },
    });

    await waitFor(() => {
      expect(mockState.updateNotifications).toHaveBeenCalledWith({ morningTime: '06:30' });
    });
    expect(mockState.applyNotificationSettings).toHaveBeenCalledWith(
      expect.objectContaining({
        morningTime: '06:30',
      }),
    );
  });

  it('sends test notification', async () => {
    renderSettings();
    fireEvent.click(screen.getByText('테스트 알림 보내기'));

    await waitFor(() => {
      expect(mockState.scheduleTestNotification).toHaveBeenCalledWith(1);
      expect(mockState.toastSuccess).toHaveBeenCalledWith('1분 후 테스트 알림이 예약되었습니다');
    });
  });
});
