/**
 * 온보딩 페이지
 */
import { useState } from 'react';
import { Moon, Sparkles, Check, ChevronRight, Bell } from 'lucide-react';
import { Button } from '../components/common';
import useAuth from '../hooks/useAuth';
import useNotifications from '../hooks/useNotifications';
import useSettingsStore from '../store/useSettingsStore';
import { loadSampleData } from '../lib/utils/sampleData';

const STEPS = [
  {
    id: 'welcome',
    icon: Moon,
    title: 'DreamSync에\n오신 것을 환영해요',
    description: '꿈과 감정의 패턴을 분석하여\n더 나은 하루를 예측해드려요',
    color: '#7c3aed',
  },
  {
    id: 'how',
    icon: Sparkles,
    title: '꿈 기록 → 체크인 → 예보',
    description: '아침에 꿈을 기록하고, 저녁에 30초 체크인\nAI가 패턴을 분석해 내일을 예측해요',
    color: '#3b82f6',
  },
  {
    id: 'notification',
    icon: Bell,
    title: '알림을 설정할까요?',
    description: '아침 꿈 기록과 저녁 체크인\n리마인더를 받아보세요',
    color: '#10b981',
    isAction: true,
  },
];

export default function Onboarding() {
  const { user, completeOnboarding } = useAuth();
  const { requestPermission, scheduleMorningReminder, scheduleEveningReminder, scheduleWeeklyReportReminder } = useNotifications();
  const updateNotifications = useSettingsStore(state => state.updateNotifications);

  const [currentStep, setCurrentStep] = useState(0);
  const [notificationEnabled, setNotificationEnabled] = useState(false);
  const [sampleStatus, setSampleStatus] = useState('idle');

  const step = STEPS[currentStep];
  const isLastStep = currentStep === STEPS.length - 1;

  const handleNext = () => {
    if (isLastStep) {
      completeOnboarding();
    } else {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleSkip = () => {
    completeOnboarding();
  };

  const handleEnableNotification = async () => {
    const granted = await requestPermission();
    if (granted) {
      await scheduleMorningReminder('07:00');
      await scheduleEveningReminder('21:00');
      await scheduleWeeklyReportReminder();
      updateNotifications({
        enabled: true,
        morningReminder: true,
        morningTime: '07:00',
        eveningReminder: true,
        eveningTime: '21:00',
        weeklyReport: true,
      });
      setNotificationEnabled(true);
      return;
    }

    updateNotifications({ enabled: false });
  };

  const Icon = step.icon;

  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg-primary)]">
      {/* Progress Dots */}
      <div className="safe-area-top px-6 pt-4">
        <div className="flex justify-center gap-2">
          {STEPS.map((_, i) => (
            <div
              key={i}
              className={`
                h-1 rounded-full transition-all duration-300
                ${i === currentStep ? 'w-8 bg-violet-500' : 'w-2 bg-[var(--bg-tertiary)]'}
              `}
            />
          ))}
        </div>
      </div>

      {/* Skip Button */}
      <div className="flex justify-end px-6 pt-4">
        <button
          onClick={handleSkip}
          className="text-[var(--text-muted)] text-sm hover:text-[var(--text-secondary)]"
        >
          건너뛰기
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-8 py-12">
        {/* Icon */}
        <div
          className="w-24 h-24 rounded-3xl flex items-center justify-center mb-8 shadow-lg animate-fade-in"
          style={{
            backgroundColor: `${step.color}20`,
            boxShadow: `0 8px 32px ${step.color}30`,
          }}
        >
          <Icon className="w-12 h-12" style={{ color: step.color }} />
        </div>

        {/* Title */}
        <h1 className="text-2xl font-bold text-[var(--text-primary)] text-center mb-4 whitespace-pre-line animate-fade-in-up">
          {step.title}
        </h1>

        {/* Description */}
        <p className="text-[var(--text-secondary)] text-center whitespace-pre-line mb-8 animate-fade-in-up">
          {step.description}
        </p>

        {/* Action (Notification Step) */}
        {step.isAction && (
          <div className="w-full max-w-sm space-y-3 animate-fade-in-up">
            {notificationEnabled ? (
              <div className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-emerald-500/20 text-emerald-400">
                <Check className="w-5 h-5" />
                <span>알림이 설정되었어요!</span>
              </div>
            ) : (
              <Button
                fullWidth
                size="lg"
                onClick={handleEnableNotification}
              >
                <Bell className="w-5 h-5" />
                알림 허용하기
              </Button>
            )}

            {/* 샘플 데이터 로드 */}
            {sampleStatus === 'idle' ? (
              <button
                onClick={() => {
                  const result = loadSampleData(user?.id || 'local-user');
                  setSampleStatus(result.added ? 'added' : 'existing');
                }}
                className="w-full text-sm text-[var(--text-muted)] hover:text-[var(--text-secondary)] py-2"
              >
                데모 데이터로 시작하기
              </button>
            ) : (
              <p
                className={`text-sm text-center py-2 ${
                  sampleStatus === 'added' ? 'text-emerald-400' : 'text-[var(--text-muted)]'
                }`}
              >
                {sampleStatus === 'added'
                  ? '샘플 데이터가 추가되었어요'
                  : '이미 데모 데이터가 적용되어 있어요'}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-6 pb-8 safe-area-bottom">
        <Button
          fullWidth
          size="lg"
          onClick={handleNext}
        >
          {isLastStep ? (
            <>
              <Sparkles className="w-5 h-5" />
              시작하기
            </>
          ) : (
            <>
              다음
              <ChevronRight className="w-5 h-5" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
