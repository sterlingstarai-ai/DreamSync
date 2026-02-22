/**
 * 온보딩 페이지
 */
import { useState, useEffect, useMemo, useRef } from 'react';
import { Moon, Sparkles, Check, ChevronRight, Bell, Activity, Target } from 'lucide-react';
import { Button } from '../components/common';
import useAuth from '../hooks/useAuth';
import useNotifications from '../hooks/useNotifications';
import useSettingsStore from '../store/useSettingsStore';
import { loadSampleData } from '../lib/utils/sampleData';
import analytics from '../lib/adapters/analytics';
import { getTimestampMs } from '../lib/utils/date';
import useGoalStore from '../store/useGoalStore';

const STEPS = [
  {
    id: 'welcome',
    icon: Moon,
    title: '"꿈이 알려주는 내일의 나"',
    description: '매일 30초, 내 무의식과 대화해보세요',
    color: '#7c3aed',
  },
  {
    id: 'mini-checkin',
    icon: Activity,
    title: '미니 체크인 체험',
    description: '오늘 컨디션을 선택하면 바로 결과를 보여드려요',
    color: '#0ea5e9',
    isMiniCheckIn: true,
  },
  {
    id: 'notification',
    icon: Bell,
    title: '알림을 설정할까요?',
    description: '알림을 받으면 습관 형성 확률이 더 높아져요',
    color: '#10b981',
    isNotificationAction: true,
  },
  {
    id: 'goal',
    icon: Target,
    title: '주간 목표 선택',
    description: '나에게 맞는 시작 강도를 고르세요',
    color: '#f59e0b',
    isGoalStep: true,
  },
];

const MINI_CHECKIN_LABELS = {
  1: '많이 지침',
  2: '조금 지침',
  3: '보통',
  4: '좋음',
  5: '아주 좋음',
};

const GOAL_PRESETS = {
  easy: {
    label: '가볍게 시작',
    description: '주 3회 체크인, 꿈 2개',
    values: { checkInDays: 3, dreamCount: 2, avgSleepHours: 7 },
  },
  balanced: {
    label: '균형 있게',
    description: '주 5회 체크인, 꿈 4개',
    values: { checkInDays: 5, dreamCount: 4, avgSleepHours: 7 },
  },
  focused: {
    label: '집중 모드',
    description: '주 7회 체크인, 꿈 5개',
    values: { checkInDays: 7, dreamCount: 5, avgSleepHours: 7.5 },
  },
};

export default function Onboarding() {
  const { user, completeOnboarding } = useAuth();
  const { requestPermission, scheduleMorningReminder, scheduleEveningReminder, scheduleWeeklyReportReminder } = useNotifications();
  const updateNotifications = useSettingsStore(state => state.updateNotifications);
  const updateGoals = useGoalStore(state => state.updateGoals);

  const [currentStep, setCurrentStep] = useState(0);
  const [notificationEnabled, setNotificationEnabled] = useState(false);
  const [miniCondition, setMiniCondition] = useState(3);
  const [selectedGoalPreset, setSelectedGoalPreset] = useState('balanced');
  const startedAtRef = useRef(0);
  const trackedStepsRef = useRef(new Set());

  const step = STEPS[currentStep];
  const isLastStep = currentStep === STEPS.length - 1;
  const selectedGoal = useMemo(
    () => GOAL_PRESETS[selectedGoalPreset] || GOAL_PRESETS.balanced,
    [selectedGoalPreset],
  );

  useEffect(() => {
    startedAtRef.current = getTimestampMs();
  }, []);

  useEffect(() => {
    const stepNumber = currentStep + 1;
    if (trackedStepsRef.current.has(stepNumber)) return;
    trackedStepsRef.current.add(stepNumber);
    analytics.track(analytics.events.ONBOARDING_STEP, { step: stepNumber });
  }, [currentStep]);

  const handleNext = () => {
    if (step.id === 'mini-checkin') {
      analytics.track(analytics.events.ONBOARDING_MINI_CHECKIN, {
        condition: miniCondition,
      });
    }

    if (isLastStep) {
      loadSampleData(user?.id || 'local-user');
      if (user?.id) {
        updateGoals(user.id, selectedGoal.values);
      }
      analytics.track(analytics.events.ONBOARDING_COMPLETE, {
        duration_sec: Math.max(1, Math.round((getTimestampMs() - startedAtRef.current) / 1000)),
      });
      completeOnboarding();
    } else {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleSkip = () => {
    analytics.track(analytics.events.ONBOARDING_SKIP, {
      step: currentStep + 1,
    });
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

        {/* 미니 체크인 */}
        {step.isMiniCheckIn && (
          <div className="w-full max-w-sm space-y-4 animate-fade-in-up">
            <div className="rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-color)] p-5">
              <p className="text-sm text-[var(--text-muted)] mb-4">오늘 컨디션</p>
              <input
                type="range"
                min="1"
                max="5"
                step="1"
                value={miniCondition}
                aria-label="미니 체크인 컨디션"
                onChange={(event) => setMiniCondition(Number(event.target.value))}
              />
              <div className="mt-4 flex items-center justify-between text-sm">
                <span className="text-[var(--text-muted)]">결과</span>
                <span className="font-semibold text-violet-300">
                  {miniCondition}/5 · {MINI_CHECKIN_LABELS[miniCondition]}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* 알림 설정 */}
        {step.isNotificationAction && (
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

        {/* 목표 선택 */}
        {step.isGoalStep && (
          <div className="w-full max-w-sm space-y-3 animate-fade-in-up">
            {Object.entries(GOAL_PRESETS).map(([presetKey, preset]) => {
              const selected = selectedGoalPreset === presetKey;
              return (
                <button
                  key={presetKey}
                  onClick={() => setSelectedGoalPreset(presetKey)}
                  className={`w-full text-left rounded-2xl border p-4 transition-colors ${
                    selected
                      ? 'border-violet-500 bg-violet-500/10'
                      : 'border-[var(--border-color)] bg-[var(--bg-secondary)]'
                  }`}
                >
                  <p className="font-semibold text-[var(--text-primary)]">{preset.label}</p>
                  <p className="text-sm text-[var(--text-secondary)] mt-1">{preset.description}</p>
                </button>
              );
            })}
            <p className="text-xs text-[var(--text-muted)] text-center">
              완료하면 샘플 꿈/체크인/예보 데이터가 자동 준비됩니다.
            </p>
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
