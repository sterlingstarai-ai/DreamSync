/**
 * 온보딩 페이지
 */
import { useState } from 'react';
import { Moon, Sun, Sparkles, Check, ChevronRight, Bell, Heart } from 'lucide-react';
import { Button } from '../components/common';
import useAuth from '../hooks/useAuth';
import useNotifications from '../hooks/useNotifications';

const STEPS = [
  {
    id: 'welcome',
    icon: Moon,
    title: 'DreamSync에\n오신 것을 환영해요',
    description: '꿈과 감정의 패턴을 분석하여\n더 나은 하루를 예측해드려요',
    color: '#7c3aed',
  },
  {
    id: 'dream',
    icon: Moon,
    title: '아침에 꿈을 기록해요',
    description: 'AI가 꿈 속 심볼과 감정을 분석하고\n개인화된 의미를 찾아줘요',
    color: '#8b5cf6',
  },
  {
    id: 'checkin',
    icon: Sun,
    title: '저녁에 30초 체크인',
    description: '오늘의 컨디션과 감정을 기록하면\n패턴을 발견할 수 있어요',
    color: '#f59e0b',
  },
  {
    id: 'forecast',
    icon: Sparkles,
    title: '맞춤형 예보를 받아요',
    description: '쌓인 데이터로 내일의 컨디션을 예측하고\n행동 가이드를 제안해드려요',
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
  const { completeOnboarding } = useAuth();
  const { requestPermission, scheduleMorningReminder, scheduleEveningReminder } = useNotifications();

  const [currentStep, setCurrentStep] = useState(0);
  const [notificationEnabled, setNotificationEnabled] = useState(false);

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
      setNotificationEnabled(true);
    }
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
