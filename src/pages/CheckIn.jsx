/**
 * 체크인 페이지
 * 30초 완료 목표
 */
import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, ChevronRight, Sparkles } from 'lucide-react';
import {
  PageContainer, PageHeader, Card, Button, useToast
} from '../components/common';
import BottomNav from '../components/common/BottomNav';
import useCheckIn from '../hooks/useCheckIn';
import useForecast from '../hooks/useForecast';
import useFeatureFlags from '../hooks/useFeatureFlags';
import useSleepStore from '../store/useSleepStore';
import { EMOTIONS, getEmotionById } from '../constants/emotions';
import { EVENTS, getEventsByCategory, EVENT_CATEGORIES } from '../constants/events';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { Capacitor } from '@capacitor/core';
import { getTodayString, getTimestampMs } from '../lib/utils/date';
import { Moon, Sun, Clock } from 'lucide-react';
import analytics from '../lib/adapters/analytics';

export default function CheckIn() {
  const navigate = useNavigate();
  const toast = useToast();
  const { checkedInToday, todayLog, submitCheckIn, isLoading, error: checkInError, clearError: clearCheckInError } = useCheckIn();
  const { todayForecast, recordActualFromCheckIn, reviewTodayExperiment } = useForecast();
  const { isEnabled } = useFeatureFlags();
  const getTodaySummary = useSleepStore(state => state.getTodaySummary);
  const setSleepSummary = useSleepStore(state => state.setSleepSummary);

  const healthkitEnabled = isEnabled('healthkit');

  // 단계 구성: healthkit 플래그 on이면 수면 단계 추가
  const STEPS = healthkitEnabled
    ? ['condition', 'emotion', 'stress', 'sleep', 'events']
    : ['condition', 'emotion', 'stress', 'events'];

  // 에러 발생 시 토스트 표시
  useEffect(() => {
    if (checkInError) {
      toast.error(checkInError);
      clearCheckInError();
    }
  }, [checkInError, toast, clearCheckInError]);

  const [step, setStep] = useState(0);
  const [condition, setCondition] = useState(3);
  const [selectedEmotions, setSelectedEmotions] = useState([]);
  const [stressLevel, setStressLevel] = useState(3);
  const [selectedEvents, setSelectedEvents] = useState([]);
  const selectedActions = useMemo(() => {
    return todayForecast?.experiment?.selectedActions?.length
      ? todayForecast.experiment.selectedActions
      : [];
  }, [todayForecast]);
  const [experimentReview, setExperimentReview] = useState({});
  const resolvedExperimentReview = useMemo(() => {
    if (selectedActions.length === 0) return experimentReview;

    return selectedActions.reduce((acc, action) => {
      acc[action] = experimentReview[action] || { completed: false, feedback: null };
      return acc;
    }, {});
  }, [selectedActions, experimentReview]);

  // 수면 데이터 상태
  const [sleepData, setSleepData] = useState({
    bedTime: '23:00',
    wakeTime: '07:00',
    quality: 3,
    duration: 480,
    source: 'manual',
  });
  const [hasManualSleepEdit, setHasManualSleepEdit] = useState(false);
  const checkInStartedAtRef = useRef(0);
  const stepStartedAtRef = useRef(0);
  const currentStepRef = useRef(0);
  const completedRef = useRef(false);

  useEffect(() => {
    if (checkedInToday) return;
    analytics.track(analytics.events.CHECKIN_START);
    checkInStartedAtRef.current = getTimestampMs();
    stepStartedAtRef.current = getTimestampMs();
  }, [checkedInToday]);

  useEffect(() => {
    currentStepRef.current = step;
  }, [step]);

  useEffect(() => () => {
    if (checkedInToday || completedRef.current) return;
    if (currentStepRef.current <= 0) return;
    analytics.track(analytics.events.CHECKIN_ABANDON, {
      abandoned_step: currentStepRef.current + 1,
    });
  }, [checkedInToday]);

  const wearableSleepData = useMemo(() => {
    if (!healthkitEnabled) return null;
    const summary = getTodaySummary();
    if (!summary || !summary.totalSleepMinutes) return null;
    return {
      bedTime: summary.bedTime || '23:00',
      wakeTime: summary.wakeTime || '07:00',
      quality: summary.sleepQualityScore != null ? Math.round(summary.sleepQualityScore / 2) : 3,
      duration: summary.totalSleepMinutes,
      source: summary.source === 'healthconnect' ? 'healthconnect' : 'healthkit',
    };
  }, [healthkitEnabled, getTodaySummary]);

  const resolvedSleepData = useMemo(() => {
    if (!healthkitEnabled) return sleepData;
    if (hasManualSleepEdit) return sleepData;
    return wearableSleepData || sleepData;
  }, [healthkitEnabled, hasManualSleepEdit, sleepData, wearableSleepData]);

  const handleSleepChange = (nextSleepData) => {
    setHasManualSleepEdit(true);
    setSleepData(nextSleepData);
  };

  const triggerHaptic = async () => {
    if (Capacitor.isNativePlatform()) {
      try {
        await Haptics.impact({ style: ImpactStyle.Light });
      } catch {
        // 웹에서는 무시
      }
    }
  };

  const handleNext = async () => {
    await triggerHaptic();
    const durationSec = Math.max(1, Math.round((getTimestampMs() - stepStartedAtRef.current) / 1000));
    analytics.track(analytics.events.CHECKIN_STEP, {
      step: step + 1,
      duration_sec: durationSec,
    });
    if (step < STEPS.length - 1) {
      setStep(step + 1);
      stepStartedAtRef.current = getTimestampMs();
    } else {
      handleSubmit();
    }
  };

  const handleBack = () => {
    if (step > 0) {
      setStep(step - 1);
    }
  };

  const handleSubmit = async () => {
    // 수면 데이터 저장 (healthkit 플래그 on일 때)
    if (healthkitEnabled) {
      const today = getTodayString();
      setSleepSummary({
        date: today,
        totalSleepMinutes: resolvedSleepData.duration,
        sleepQualityScore: resolvedSleepData.quality * 2, // 1-5 → 2-10
        remMinutes: null,
        deepMinutes: null,
        hrvMs: null,
        bedTime: resolvedSleepData.bedTime,
        wakeTime: resolvedSleepData.wakeTime,
        source: resolvedSleepData.source,
        fetchedAt: new Date().toISOString(),
      });
    }

    const result = await submitCheckIn({
      condition,
      emotions: selectedEmotions,
      stressLevel,
      events: selectedEvents,
      sleep: healthkitEnabled ? resolvedSleepData : undefined,
      durationSec: Math.max(1, Math.round((getTimestampMs() - checkInStartedAtRef.current) / 1000)),
    });

    if (result) {
      if (selectedActions.length > 0) {
        reviewTodayExperiment({
          completedActions: selectedActions.filter(action => resolvedExperimentReview[action]?.completed),
          actionFeedback: Object.fromEntries(
            selectedActions
              .filter(action => resolvedExperimentReview[action]?.completed && resolvedExperimentReview[action]?.feedback)
              .map(action => [action, resolvedExperimentReview[action].feedback]),
          ),
        });
      }
      completedRef.current = true;
      toast.success('체크인 완료!', '오늘 하루도 수고했어요');
      // 예보 정확도 기록
      recordActualFromCheckIn();
      // 대시보드로 이동
      setTimeout(() => navigate('/'), 1000);
    }
  };

  const currentStep = STEPS[step];
  const progress = ((step + 1) / STEPS.length) * 100;
  const displayCondition = todayLog?.condition ?? condition;
  const displayStressLevel = todayLog?.stressLevel ?? stressLevel;
  const displayEmotions = todayLog?.emotions ?? selectedEmotions;

  if (checkedInToday) {
    return (
      <>
        <PageContainer className="pb-24">
          <PageHeader title="저녁 체크인" />

          <div className="flex flex-col items-center justify-center min-h-[60vh]">
            <div className="w-20 h-20 rounded-full bg-emerald-500/20 flex items-center justify-center mb-4">
              <CheckCircle2 className="w-10 h-10 text-emerald-400" />
            </div>
            <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-2">
              오늘 체크인 완료!
            </h2>
            <p className="text-[var(--text-secondary)] text-center mb-6">
              오늘 하루도 수고했어요.
              <br />
              내일 또 만나요!
            </p>

            <Card padding="lg" className="w-full max-w-sm">
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-[var(--text-muted)]">컨디션</span>
                  <span className="font-medium">
                    {['😫', '😔', '😐', '😊', '🤩'][displayCondition - 1]}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--text-muted)]">스트레스</span>
                  <span className="font-medium">{displayStressLevel}/5</span>
                </div>
                <div>
                  <span className="text-[var(--text-muted)]">감정</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {displayEmotions.map(id => {
                      const emotion = getEmotionById(id);
                      return (
                        <span
                          key={id}
                          className="text-xs px-2 py-1 rounded-full bg-[var(--bg-tertiary)]"
                        >
                          {emotion?.emoji} {emotion?.name}
                        </span>
                      );
                    })}
                  </div>
                </div>
              </div>
            </Card>

            <Button
              variant="secondary"
              className="mt-6"
              onClick={() => navigate('/')}
            >
              홈으로 돌아가기
            </Button>
          </div>
        </PageContainer>
        <BottomNav />
      </>
    );
  }

  return (
    <>
      <PageContainer className="pb-24">
        <PageHeader
          title="저녁 체크인"
          subtitle="30초면 끝나요"
        />

        {/* Progress Bar */}
        <div className="mb-6">
          <div
            className="h-1 bg-[var(--bg-tertiary)] rounded-full overflow-hidden"
            role="progressbar"
            aria-valuenow={Math.round(progress)}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`체크인 진행률 ${Math.round(progress)}%`}
          >
            <div
              className="h-full bg-gradient-to-r from-violet-600 to-blue-500 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex justify-between mt-2 text-xs text-[var(--text-muted)]">
            <span>단계 {step + 1}/{STEPS.length}</span>
            <span>{Math.round(progress)}%</span>
          </div>
        </div>

        {/* Step Content */}
        <div className="min-h-[50vh]">
          {currentStep === 'condition' && (
            <ConditionStep
              value={condition}
              onChange={(v) => { setCondition(v); triggerHaptic(); }}
            />
          )}

          {currentStep === 'emotion' && (
            <EmotionStep
              selected={selectedEmotions}
              onChange={setSelectedEmotions}
            />
          )}

          {currentStep === 'stress' && (
            <StressStep
              value={stressLevel}
              onChange={(v) => { setStressLevel(v); triggerHaptic(); }}
            />
          )}

          {currentStep === 'sleep' && (
            <SleepStep
              data={resolvedSleepData}
              onChange={handleSleepChange}
            />
          )}

          {currentStep === 'events' && (
            <div className="space-y-4">
              <EventsStep
                selected={selectedEvents}
                onChange={setSelectedEvents}
              />
              {selectedActions.length > 0 && (
                <ExperimentReviewCard
                  actions={selectedActions}
                  review={resolvedExperimentReview}
                  onUpdate={(action, nextValue) => {
                    setExperimentReview((prev) => ({
                      ...prev,
                      [action]: {
                        ...(prev[action] || { completed: false, feedback: null }),
                        ...nextValue,
                      },
                    }));
                  }}
                />
              )}
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="flex gap-3 mt-6">
          {step > 0 && (
            <Button variant="secondary" onClick={handleBack}>
              이전
            </Button>
          )}
          <Button
            fullWidth
            onClick={handleNext}
            loading={isLoading}
            disabled={currentStep === 'emotion' && selectedEmotions.length === 0}
          >
            {step < STEPS.length - 1 ? (
              <>
                다음
                <ChevronRight className="w-4 h-4" />
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                체크인 완료
              </>
            )}
          </Button>
        </div>
      </PageContainer>

      <BottomNav />
    </>
  );
}

function ExperimentReviewCard({ actions, review, onUpdate }) {
  return (
    <Card padding="lg">
      <div className="mb-3">
        <p className="text-sm font-medium text-[var(--text-primary)]">행동 실험 회수</p>
        <p className="text-xs text-[var(--text-secondary)] mt-1">
          아침에 선택한 행동이 실제로 도움이 됐는지 기록해보세요.
        </p>
      </div>

      <div className="space-y-3">
        {actions.map((action) => {
          const state = review[action] || { completed: false, feedback: null };
          return (
            <div key={action} className="rounded-xl border border-[var(--border-color)] p-3">
              <p className="text-sm text-[var(--text-primary)]">{action}</p>
              <div className="flex flex-wrap gap-2 mt-3">
                <button
                  type="button"
                  onClick={() => onUpdate(action, { completed: false, feedback: null })}
                  className={`text-xs px-2.5 py-1.5 rounded-full border ${
                    !state.completed
                      ? 'border-[var(--border-color-hover)] bg-[var(--bg-tertiary)] text-[var(--text-primary)]'
                      : 'border-[var(--border-color)] text-[var(--text-muted)]'
                  }`}
                >
                  실행 안 함
                </button>
                <button
                  type="button"
                  onClick={() => onUpdate(action, { completed: true, feedback: 'neutral' })}
                  className={`text-xs px-2.5 py-1.5 rounded-full border ${
                    state.completed && state.feedback === 'neutral'
                      ? 'border-blue-500/40 bg-blue-500/15 text-blue-300'
                      : 'border-[var(--border-color)] text-[var(--text-muted)]'
                  }`}
                >
                  했어요
                </button>
                <button
                  type="button"
                  onClick={() => onUpdate(action, { completed: true, feedback: 'helpful' })}
                  className={`text-xs px-2.5 py-1.5 rounded-full border ${
                    state.completed && state.feedback === 'helpful'
                      ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-300'
                      : 'border-[var(--border-color)] text-[var(--text-muted)]'
                  }`}
                >
                  도움 됐어요
                </button>
                <button
                  type="button"
                  onClick={() => onUpdate(action, { completed: true, feedback: 'not_helpful' })}
                  className={`text-xs px-2.5 py-1.5 rounded-full border ${
                    state.completed && state.feedback === 'not_helpful'
                      ? 'border-amber-500/40 bg-amber-500/15 text-amber-300'
                      : 'border-[var(--border-color)] text-[var(--text-muted)]'
                  }`}
                >
                  별로였어요
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

/**
 * 컨디션 선택 단계
 */
function ConditionStep({ value, onChange }) {
  const conditions = [
    { value: 1, emoji: '😫', label: '최악' },
    { value: 2, emoji: '😔', label: '별로' },
    { value: 3, emoji: '😐', label: '보통' },
    { value: 4, emoji: '😊', label: '좋음' },
    { value: 5, emoji: '🤩', label: '최고' },
  ];

  return (
    <div className="text-center">
      <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-2">
        오늘 컨디션은 어땠나요?
      </h2>
      <p className="text-[var(--text-secondary)] mb-8">
        전반적인 몸과 마음 상태를 선택해주세요
      </p>

      <div className="flex justify-center gap-4 mb-8" role="radiogroup" aria-label="컨디션 선택">
        {conditions.map((c) => (
          <button
            key={c.value}
            onClick={() => onChange(c.value)}
            role="radio"
            aria-checked={value === c.value}
            aria-label={`컨디션 ${c.label}`}
            className={`
              flex flex-col items-center gap-2 p-4 rounded-2xl transition-all
              ${value === c.value
                ? 'bg-violet-500/20 scale-110'
                : 'bg-[var(--bg-secondary)] hover:bg-[var(--bg-tertiary)]'
              }
            `}
          >
            <span className="text-4xl" aria-hidden="true">{c.emoji}</span>
            <span className={`text-xs ${value === c.value ? 'text-violet-400' : 'text-[var(--text-muted)]'}`}>
              {c.label}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

/**
 * 감정 선택 단계
 */
function EmotionStep({ selected, onChange }) {
  const toggleEmotion = (id) => {
    if (selected.includes(id)) {
      onChange(selected.filter(e => e !== id));
    } else if (selected.length < 5) {
      onChange([...selected, id]);
    }
  };

  return (
    <div>
      <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-2 text-center">
        오늘 느낀 감정을 선택해주세요
      </h2>
      <p className="text-[var(--text-secondary)] mb-6 text-center">
        최대 5개까지 선택할 수 있어요
      </p>

      <div className="flex flex-wrap justify-center gap-2" role="group" aria-label="감정 선택 (최대 5개)">
        {EMOTIONS.map((emotion) => {
          const isSelected = selected.includes(emotion.id);
          return (
            <button
              key={emotion.id}
              onClick={() => toggleEmotion(emotion.id)}
              aria-pressed={isSelected}
              aria-label={`감정 ${emotion.name}`}
              className={`
                px-4 py-2 rounded-full text-sm transition-all
                ${isSelected
                  ? 'scale-105'
                  : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]'
                }
              `}
              style={isSelected ? {
                backgroundColor: `${emotion.color}20`,
                color: emotion.color,
                borderColor: emotion.color,
              } : {}}
            >
              <span aria-hidden="true">{emotion.emoji}</span> {emotion.name}
            </button>
          );
        })}
      </div>

      {selected.length > 0 && (
        <p className="text-center text-sm text-[var(--text-muted)] mt-4">
          {selected.length}개 선택됨
        </p>
      )}
    </div>
  );
}

/**
 * 스트레스 레벨 단계
 */
function StressStep({ value, onChange }) {
  const levels = [
    { value: 1, label: '거의 없음', color: '#10b981' },
    { value: 2, label: '약간', color: '#3b82f6' },
    { value: 3, label: '보통', color: '#f59e0b' },
    { value: 4, label: '많음', color: '#f97316' },
    { value: 5, label: '심함', color: '#ef4444' },
  ];

  return (
    <div className="text-center">
      <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-2">
        오늘 스트레스는 어땠나요?
      </h2>
      <p className="text-[var(--text-secondary)] mb-8">
        스트레스 정도를 선택해주세요
      </p>

      <div className="flex justify-center gap-2 mb-6" role="radiogroup" aria-label="스트레스 레벨 선택">
        {levels.map((level) => (
          <button
            key={level.value}
            onClick={() => onChange(level.value)}
            role="radio"
            aria-checked={value === level.value}
            aria-label={`스트레스 ${level.label} (${level.value}/5)`}
            className={`
              w-12 h-12 rounded-xl transition-all flex items-center justify-center
              ${value === level.value ? 'scale-110 shadow-lg' : 'opacity-50'}
            `}
            style={{
              backgroundColor: value >= level.value ? level.color : 'var(--bg-tertiary)',
            }}
          >
            <span className="text-white font-bold">{level.value}</span>
          </button>
        ))}
      </div>

      <p
        className="text-lg font-medium"
        style={{ color: levels[value - 1].color }}
      >
        {levels[value - 1].label}
      </p>
    </div>
  );
}

/**
 * 수면 정보 단계 (healthkit 플래그 on일 때)
 */
function SleepStep({ data, onChange }) {
  const handleTimeChange = (field, value) => {
    const updated = { ...data, [field]: value, source: 'manual' };
    // 취침/기상 시간으로 duration 자동 계산
    if (updated.bedTime && updated.wakeTime) {
      const [bH, bM] = updated.bedTime.split(':').map(Number);
      const [wH, wM] = updated.wakeTime.split(':').map(Number);
      let mins = (wH * 60 + wM) - (bH * 60 + bM);
      if (mins < 0) mins += 24 * 60; // 자정 넘김 (0은 동일 시간이므로 유지)
      updated.duration = mins;
    }
    onChange(updated);
  };

  const hours = Math.floor(data.duration / 60);
  const mins = data.duration % 60;
  const qualityLabels = ['', '매우 나쁨', '나쁨', '보통', '좋음', '매우 좋음'];

  return (
    <div className="text-center">
      <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-2">
        어젯밤 수면은 어땠나요?
      </h2>
      <p className="text-[var(--text-secondary)] mb-6">
        {data.source !== 'manual' ? (
          <span className="text-emerald-400">웨어러블 데이터가 자동으로 채워졌어요</span>
        ) : (
          '대략적인 수면 정보를 입력해주세요'
        )}
      </p>

      <div className="space-y-6 max-w-sm mx-auto">
        {/* 취침/기상 시간 */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="flex items-center gap-1.5 text-sm text-[var(--text-muted)] mb-2 justify-center">
              <Moon className="w-4 h-4" aria-hidden="true" />
              취침
            </label>
            <input
              type="time"
              value={data.bedTime}
              onChange={(e) => handleTimeChange('bedTime', e.target.value)}
              aria-label="취침 시간"
              className="w-full rounded-xl bg-[var(--bg-secondary)] border border-[var(--border)] px-3 py-2.5 text-center text-[var(--text-primary)] text-lg"
            />
          </div>
          <div>
            <label className="flex items-center gap-1.5 text-sm text-[var(--text-muted)] mb-2 justify-center">
              <Sun className="w-4 h-4" aria-hidden="true" />
              기상
            </label>
            <input
              type="time"
              value={data.wakeTime}
              onChange={(e) => handleTimeChange('wakeTime', e.target.value)}
              aria-label="기상 시간"
              className="w-full rounded-xl bg-[var(--bg-secondary)] border border-[var(--border)] px-3 py-2.5 text-center text-[var(--text-primary)] text-lg"
            />
          </div>
        </div>

        {/* 수면 시간 표시 */}
        <div className="flex items-center justify-center gap-2 text-[var(--text-secondary)]">
          <Clock className="w-4 h-4" aria-hidden="true" />
          <span>수면 시간: <strong className="text-[var(--text-primary)]">{hours}시간 {mins > 0 ? `${mins}분` : ''}</strong></span>
        </div>

        {/* 수면 품질 */}
        <div>
          <p className="text-sm text-[var(--text-muted)] mb-3">수면 품질</p>
          <div className="flex justify-center gap-2" role="radiogroup" aria-label="수면 품질 선택">
            {[1, 2, 3, 4, 5].map((q) => (
              <button
                key={q}
                onClick={() => onChange({ ...data, quality: q, source: 'manual' })}
                role="radio"
                aria-checked={data.quality === q}
                aria-label={`수면 품질 ${qualityLabels[q]} (${q}/5)`}
                className={`
                  w-11 h-11 rounded-xl transition-all flex items-center justify-center text-lg
                  ${data.quality === q
                    ? 'bg-violet-500/30 scale-110 shadow-lg'
                    : 'bg-[var(--bg-secondary)] opacity-50'
                  }
                `}
              >
                {['', '😴', '😪', '😐', '😌', '🌟'][q]}
              </button>
            ))}
          </div>
          <p className="text-sm mt-2" style={{ color: data.quality >= 4 ? '#10b981' : data.quality >= 3 ? '#f59e0b' : '#ef4444' }}>
            {qualityLabels[data.quality]}
          </p>
        </div>
      </div>
    </div>
  );
}

/**
 * 이벤트 선택 단계
 */
function EventsStep({ selected, onChange }) {
  const eventsByCategory = getEventsByCategory();

  const toggleEvent = (id) => {
    if (selected.includes(id)) {
      onChange(selected.filter(e => e !== id));
    } else {
      onChange([...selected, id]);
    }
  };

  return (
    <div>
      <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-2 text-center">
        오늘 어떤 일이 있었나요?
      </h2>
      <p className="text-[var(--text-secondary)] mb-6 text-center">
        해당하는 것을 모두 선택해주세요
      </p>

      <div className="space-y-4">
        {Object.entries(eventsByCategory).map(([category, events]) => (
          <div key={category}>
            <p
              className="text-xs font-medium mb-2"
              style={{ color: EVENT_CATEGORIES[category].color }}
            >
              {EVENT_CATEGORIES[category].name}
            </p>
            <div className="flex flex-wrap gap-2" role="group" aria-label={`${EVENT_CATEGORIES[category].name} 이벤트`}>
              {events.map((event) => {
                const isSelected = selected.includes(event.id);
                return (
                  <button
                    key={event.id}
                    onClick={() => toggleEvent(event.id)}
                    aria-pressed={isSelected}
                    aria-label={`이벤트 ${event.name}`}
                    className={`
                      px-3 py-1.5 rounded-full text-sm transition-all
                      ${isSelected
                        ? 'bg-violet-500/20 text-violet-300'
                        : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]'
                      }
                    `}
                  >
                    <span aria-hidden="true">{event.emoji}</span> {event.name}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
