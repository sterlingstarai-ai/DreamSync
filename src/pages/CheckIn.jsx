/**
 * 체크인 페이지
 * 30초 완료 목표
 */
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, ChevronRight, Sparkles } from 'lucide-react';
import {
  PageContainer, PageHeader, Card, Button, useToast
} from '../components/common';
import BottomNav from '../components/common/BottomNav';
import useCheckIn from '../hooks/useCheckIn';
import useForecast from '../hooks/useForecast';
import { EMOTIONS, getEmotionById } from '../constants/emotions';
import { EVENTS, getEventsByCategory, EVENT_CATEGORIES } from '../constants/events';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { Capacitor } from '@capacitor/core';

const STEPS = ['condition', 'emotion', 'stress', 'events'];

export default function CheckIn() {
  const navigate = useNavigate();
  const toast = useToast();
  const { checkedInToday, todayLog, submitCheckIn, isLoading, error: checkInError, clearError: clearCheckInError } = useCheckIn();
  const { recordActualFromCheckIn } = useForecast();

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

  // 이미 체크인 했으면 완료 화면
  useEffect(() => {
    if (checkedInToday && todayLog) {
      setCondition(todayLog.condition);
      setSelectedEmotions(todayLog.emotions);
      setStressLevel(todayLog.stressLevel);
      setSelectedEvents(todayLog.events);
    }
  }, [checkedInToday, todayLog]);

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
    if (step < STEPS.length - 1) {
      setStep(step + 1);
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
    const result = await submitCheckIn({
      condition,
      emotions: selectedEmotions,
      stressLevel,
      events: selectedEvents,
    });

    if (result) {
      toast.success('체크인 완료!', '오늘 하루도 수고했어요');
      // 예보 정확도 기록
      recordActualFromCheckIn();
      // 대시보드로 이동
      setTimeout(() => navigate('/'), 1000);
    }
  };

  const currentStep = STEPS[step];
  const progress = ((step + 1) / STEPS.length) * 100;

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
                    {['😫', '😔', '😐', '😊', '🤩'][condition - 1]}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--text-muted)]">스트레스</span>
                  <span className="font-medium">{stressLevel}/5</span>
                </div>
                <div>
                  <span className="text-[var(--text-muted)]">감정</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {selectedEmotions.map(id => {
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

          {currentStep === 'events' && (
            <EventsStep
              selected={selectedEvents}
              onChange={setSelectedEvents}
            />
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
