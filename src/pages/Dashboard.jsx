/**
 * 대시보드 (홈) 페이지
 */
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Moon, Sun, Sparkles, TrendingUp, Calendar,
  ChevronRight, CheckCircle2, AlertTriangle, Search
} from 'lucide-react';
import {
  PageContainer, Card, Button, Skeleton
} from '../components/common';
import BottomNav from '../components/common/BottomNav';
import { UHSCard as UHSCardComponent } from '../components/uhs';
import { calculateUHS } from '../lib/scoring';
import { useShallow } from 'zustand/react/shallow';
import useAuthStore from '../store/useAuthStore';
import useDreams from '../hooks/useDreams';
import useCheckIn from '../hooks/useCheckIn';
import useForecast from '../hooks/useForecast';
import useFeatureFlags from '../hooks/useFeatureFlags';
import useSleepStore from '../store/useSleepStore';
import { formatFriendlyDate } from '../lib/utils/date';
import { getConditionLabel, getConditionColor } from '../lib/ai/generateForecast';
import { detectPatternAlerts } from '../lib/services/patternAlertService';

export default function Dashboard() {
  const navigate = useNavigate();
  const user = useAuthStore(useShallow(state => state.user));
  const { todayDreams, recentDreams, error: dreamError, clearError: clearDreamError } = useDreams();
  const {
    checkedInToday,
    recentLogs,
    stats: checkInStats,
    error: checkInError,
    clearError: clearCheckInError,
  } = useCheckIn();
  const {
    todayForecast,
    createTodayForecast,
    isGenerating,
    confidence: calculatedConfidence,
    error: forecastError,
    clearError: clearForecastError,
    yesterdayForecast,
    yesterdayLog,
    canReviewYesterdayForecast,
    reviewYesterdayForecast,
    toggleTodaySuggestion,
    todayActionProgress,
  } = useForecast();
  const { isUHSEnabled } = useFeatureFlags();

  const activeError = dreamError || checkInError || forecastError;

  const greeting = getGreeting();
  const userName = user?.name || '사용자';
  const patternAlerts = useMemo(() => {
    return detectPatternAlerts({
      recentLogs,
      recentDreams,
    });
  }, [recentLogs, recentDreams]);

  // 페이지 로드 시 오늘 예보 생성 (최소 데이터 + 에러 가드)
  const hasMinimumData = recentDreams.length > 0 || checkedInToday;
  useEffect(() => {
    if (!todayForecast && !isGenerating && !forecastError && hasMinimumData) {
      createTodayForecast();
    }
  }, [todayForecast, isGenerating, forecastError, hasMinimumData, createTodayForecast]);

  return (
    <>
      <PageContainer className="pb-24">
        {/* Header */}
        <header className="pt-4 pb-6">
          <p className="text-[var(--text-muted)] text-sm">{greeting}</p>
          <h1 className="text-2xl font-bold text-[var(--text-primary)] mt-1">
            {userName}님
          </h1>
        </header>

        {/* Error Banner */}
        {activeError && (
          <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm text-red-400">{activeError}</p>
            </div>
            <button
              onClick={() => { clearDreamError(); clearCheckInError(); clearForecastError(); }}
              className="text-xs text-red-400/70 hover:text-red-400"
            >
              닫기
            </button>
          </div>
        )}

        {/* Today's Forecast Card */}
        {patternAlerts.length > 0 && (
          <section className="mb-4">
            <PatternAlertCard alerts={patternAlerts} />
          </section>
        )}

        <section className="mb-6">
          <ForecastCard
            forecast={todayForecast}
            isLoading={isGenerating}
            confidence={calculatedConfidence}
            hasMinimumData={hasMinimumData}
            onToggleSuggestion={toggleTodaySuggestion}
            actionProgress={todayActionProgress}
          />
        </section>

        {canReviewYesterdayForecast && yesterdayForecast && yesterdayLog && (
          <section className="mb-6">
            <ForecastReviewCard
              forecast={yesterdayForecast}
              log={yesterdayLog}
              onReview={reviewYesterdayForecast}
            />
          </section>
        )}

        {/* Quick Actions */}
        <section className="grid grid-cols-2 gap-3 mb-6">
          <QuickActionCard
            icon={Moon}
            label="꿈 기록하기"
            sublabel={todayDreams.length > 0 ? `오늘 ${todayDreams.length}개 기록됨` : '아직 기록 없음'}
            onClick={() => navigate('/dream')}
            highlight={todayDreams.length === 0}
          />
          <QuickActionCard
            icon={checkedInToday ? CheckCircle2 : Sun}
            label="저녁 체크인"
            sublabel={checkedInToday ? '완료됨' : '30초면 끝나요'}
            onClick={() => navigate('/checkin')}
            completed={checkedInToday}
          />
        </section>

        {/* Stats Overview */}
        <section className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-[var(--text-primary)]">
              이번 주 현황
            </h2>
            <button
              onClick={() => navigate('/report')}
              aria-label="주간 리포트 자세히 보기"
              className="flex items-center gap-1 text-sm text-violet-400 hover:text-violet-300 transition-colors"
            >
              자세히 보기
              <ChevronRight className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <StatCard
              label="꿈 기록"
              value={recentDreams.length}
              unit="개"
              icon={Moon}
            />
            <StatCard
              label="체크인"
              value={checkInStats.completionRate}
              unit="%"
              icon={Calendar}
            />
            <StatCard
              label="연속"
              value={checkInStats.streak}
              unit="일"
              icon={TrendingUp}
            />
          </div>
        </section>

        {/* UHS Card (Phase 4 - Feature Flag) */}
        {isUHSEnabled && (
          <section className="mb-6">
            <UHSCard />
          </section>
        )}

        {/* Recent Dreams */}
        {recentDreams.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold text-[var(--text-primary)]">
                최근 꿈
              </h2>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => navigate('/search')}
                  aria-label="통합 검색 보기"
                  className="flex items-center gap-1 text-sm text-blue-400 hover:text-blue-300 transition-colors"
                >
                  통합 검색
                  <Search className="w-4 h-4" aria-hidden="true" />
                </button>
                <button
                  onClick={() => navigate('/symbols')}
                  aria-label="심볼 사전 보기"
                  className="flex items-center gap-1 text-sm text-violet-400 hover:text-violet-300 transition-colors"
                >
                  심볼 사전
                  <ChevronRight className="w-4 h-4" aria-hidden="true" />
                </button>
              </div>
            </div>

            <div className="space-y-3">
              {recentDreams.slice(0, 3).map((dream) => (
                <RecentDreamCard key={dream.id} dream={dream} />
              ))}
            </div>
          </section>
        )}
      </PageContainer>

      <BottomNav />
    </>
  );
}

/**
 * 인사말 생성
 */
function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 6) return '새벽이에요';
  if (hour < 12) return '좋은 아침이에요';
  if (hour < 18) return '좋은 오후예요';
  return '좋은 저녁이에요';
}

/**
 * 오늘의 예보 카드
 */
function ForecastCard({
  forecast,
  isLoading,
  confidence,
  hasMinimumData,
  onToggleSuggestion,
  actionProgress,
}) {
  if (isLoading) {
    return (
      <Card variant="gradient" padding="lg">
        <div className="space-y-3">
          <Skeleton className="h-6 w-24" />
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-4 w-full" />
        </div>
      </Card>
    );
  }

  if (!forecast) {
    return (
      <Card variant="gradient" padding="lg">
        <div className="flex items-center gap-3">
          <Sparkles className="w-8 h-8 text-violet-400" />
          <div>
            <h3 className="font-semibold text-[var(--text-primary)]">
              {hasMinimumData ? '오늘의 예보 준비 중' : '첫 예보를 기다리고 있어요'}
            </h3>
            <p className="text-sm text-[var(--text-secondary)]">
              {hasMinimumData
                ? '데이터가 쌓이면 예측 정확도가 높아져요'
                : '첫 꿈이나 체크인을 기록하면 예보가 시작됩니다'}
            </p>
          </div>
        </div>
      </Card>
    );
  }

  const { prediction } = forecast;
  const conditionColor = getConditionColor(prediction.condition);

  return (
    <Card variant="gradient" padding="lg">
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="text-sm text-[var(--text-muted)] mb-1">오늘의 예보</p>
          <div className="flex items-center gap-2">
            <span
              className="text-2xl font-bold"
              style={{ color: conditionColor }}
            >
              {getConditionLabel(prediction.condition)}
            </span>
            <span className="text-sm text-[var(--text-muted)]">
              신뢰도 {confidence || prediction.confidence}%
            </span>
          </div>
        </div>
        <div
          className="w-12 h-12 rounded-full flex items-center justify-center"
          style={{ backgroundColor: `${conditionColor}20` }}
        >
          <Sparkles className="w-6 h-6" style={{ color: conditionColor }} />
        </div>
      </div>

      <p className="text-[var(--text-secondary)] text-sm mb-3">
        {prediction.summary}
      </p>

      {prediction.suggestions.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs text-[var(--text-muted)]">오늘의 추천 행동</p>
            <p className="text-xs text-violet-300">
              {actionProgress?.completed || 0}/{actionProgress?.total || prediction.suggestions.length} 실천
            </p>
          </div>
          <div className="space-y-1.5">
            {prediction.suggestions.map((suggestion, i) => {
              const completed = (forecast.experiment?.completedSuggestions || []).includes(suggestion);
              return (
                <button
                  key={i}
                  onClick={() => onToggleSuggestion?.(suggestion)}
                  className={`w-full text-left text-xs px-2.5 py-2 rounded-lg border transition-colors ${
                    completed
                      ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40'
                      : 'bg-violet-500/10 text-violet-300 border-violet-500/20 hover:bg-violet-500/20'
                  }`}
                >
                  {completed ? '✓ ' : ''}{suggestion}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <p className="text-xs text-[var(--text-muted)] mt-3 opacity-70">
        데이터 기반 참고 지표이며, 의료적 조언이 아닙니다.
      </p>
    </Card>
  );
}

function PatternAlertCard({ alerts }) {
  const top = alerts[0];
  const colorClass = top?.severity === 'high'
    ? 'bg-red-500/10 border-red-500/30 text-red-300'
    : 'bg-amber-500/10 border-amber-500/30 text-amber-300';

  return (
    <Card padding="md" className={`border ${colorClass}`}>
      <div className="flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="font-medium">{top.title}</p>
          <p className="text-sm opacity-90 mt-1">{top.description}</p>
          {alerts.length > 1 && (
            <p className="text-xs opacity-80 mt-2">
              추가 경보 {alerts.length - 1}건이 함께 감지되었습니다.
            </p>
          )}
        </div>
      </div>
    </Card>
  );
}

const HIT_REASONS = ['수면이 좋아서', '스트레스를 잘 관리해서', '추천 행동을 실천해서'];
const MISS_REASONS = ['수면이 부족해서', '예상 못한 스트레스가 생겨서', '일정 변동이 커서'];

function ForecastReviewCard({ forecast, log, onReview }) {
  const [selectedOutcome, setSelectedOutcome] = useState('hit');
  const [selectedReasons, setSelectedReasons] = useState([HIT_REASONS[0]]);

  const toggleReason = (reason) => {
    setSelectedReasons((prev) => (
      prev.includes(reason)
        ? prev.filter(item => item !== reason)
        : [...prev, reason]
    ));
  };

  const handleQuickReview = (outcome) => {
    const reasonPool = outcome === 'hit' ? HIT_REASONS : MISS_REASONS;
    const reasons = selectedOutcome === outcome
      ? (selectedReasons.length > 0 ? selectedReasons : [reasonPool[0]])
      : [reasonPool[0]];
    onReview?.({ outcome, reasons });
  };

  const reasonOptions = selectedOutcome === 'hit' ? HIT_REASONS : MISS_REASONS;

  return (
    <Card padding="lg">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-[var(--text-primary)]">어제 예보 검증</h3>
        <span className="text-xs text-[var(--text-muted)]">1탭 기록</span>
      </div>

      <div className="text-sm text-[var(--text-secondary)] mb-3">
        예보 <strong className="text-[var(--text-primary)]">{getConditionLabel(forecast.prediction.condition)}</strong>
        {' '}→ 실제 <strong className="text-[var(--text-primary)]">{getConditionLabel(log.condition)}</strong>
      </div>

      <div className="flex gap-2 mb-3">
        <Button fullWidth onClick={() => handleQuickReview('hit')}>
          맞았어요
        </Button>
        <Button fullWidth variant="secondary" onClick={() => handleQuickReview('miss')}>
          빗나갔어요
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        {['hit', 'miss'].map((outcome) => (
          <button
            key={outcome}
            onClick={() => {
              setSelectedOutcome(outcome);
              setSelectedReasons([outcome === 'hit' ? HIT_REASONS[0] : MISS_REASONS[0]]);
            }}
            className={`text-xs px-2 py-1 rounded-full ${
              selectedOutcome === outcome
                ? 'bg-violet-500/20 text-violet-300'
                : 'bg-[var(--bg-tertiary)] text-[var(--text-muted)]'
            }`}
          >
            {outcome === 'hit' ? '적중 이유' : '빗나간 이유'}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-2 mt-2">
        {reasonOptions.map((reason) => (
          <button
            key={reason}
            onClick={() => toggleReason(reason)}
            className={`text-xs px-2 py-1 rounded-full border ${
              selectedReasons.includes(reason)
                ? 'border-violet-500/50 bg-violet-500/15 text-violet-300'
                : 'border-[var(--border-color)] bg-[var(--bg-secondary)] text-[var(--text-muted)]'
            }`}
          >
            {reason}
          </button>
        ))}
      </div>
    </Card>
  );
}

/**
 * Quick Action 카드
 */
function QuickActionCard({ icon: ActionIcon, label, sublabel, onClick, highlight = false, completed = false }) {
  return (
    <Card
      variant={highlight ? 'gradient' : 'default'}
      padding="md"
      hover
      onClick={onClick}
    >
      <div className="flex flex-col items-center text-center">
        <div
          className={`
            w-12 h-12 rounded-full flex items-center justify-center mb-2
            ${completed
              ? 'bg-emerald-500/20'
              : highlight
                ? 'bg-violet-500/20'
                : 'bg-[var(--bg-tertiary)]'
            }
          `}
        >
          <ActionIcon
            className={`w-6 h-6 ${
              completed
                ? 'text-emerald-400'
                : highlight
                  ? 'text-violet-400'
                  : 'text-[var(--text-muted)]'
            }`}
          />
        </div>
        <span className="font-medium text-[var(--text-primary)]">{label}</span>
        <span className="text-xs text-[var(--text-muted)] mt-0.5">{sublabel}</span>
      </div>
    </Card>
  );
}

/**
 * 통계 카드
 */
function StatCard({ label, value, unit, icon: StatIcon }) {
  return (
    <Card padding="md">
      <div className="flex flex-col items-center text-center">
        <StatIcon className="w-5 h-5 text-[var(--text-muted)] mb-1" />
        <span className="text-xl font-bold text-[var(--text-primary)]">
          {value}
          <span className="text-sm font-normal text-[var(--text-muted)]">
            {unit}
          </span>
        </span>
        <span className="text-xs text-[var(--text-muted)]">{label}</span>
      </div>
    </Card>
  );
}

/**
 * 최근 꿈 카드
 */
function RecentDreamCard({ dream }) {
  const navigate = useNavigate();

  return (
    <Card
      padding="md"
      hover
      onClick={() => navigate(`/dream?id=${dream.id}`)}
    >
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center flex-shrink-0">
          <Moon className="w-5 h-5 text-violet-400" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm text-[var(--text-primary)] line-clamp-2">
            {dream.content}
          </p>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs text-[var(--text-muted)]">
              {formatFriendlyDate(dream.createdAt.split('T')[0])}
            </span>
            {dream.analysis?.symbols?.slice(0, 2).map((symbol, i) => (
              <span
                key={i}
                className="text-xs px-1.5 py-0.5 rounded bg-[var(--bg-tertiary)] text-[var(--text-muted)]"
              >
                {symbol.name}
              </span>
            ))}
          </div>
        </div>
      </div>
    </Card>
  );
}

/**
 * UHS 카드 (Phase 4) - 실제 스토어 데이터 기반
 */
function UHSCard() {
  const navigate = useNavigate();
  const { recentDreams, symbols } = useDreams();
  const { recentLogs } = useCheckIn();
  const { stats: forecastStats } = useForecast();
  const getTodaySummary = useSleepStore(state => state.getTodaySummary);

  const todaySleep = getTodaySummary();
  const hasEnoughData = recentDreams.length > 0 || recentLogs.length > 0;

  if (!hasEnoughData) {
    return (
      <Card padding="lg">
        <div className="flex items-center gap-3">
          <Sparkles className="w-8 h-8 text-violet-400" />
          <div>
            <h3 className="font-semibold text-[var(--text-primary)]">웰니스 지수</h3>
            <p className="text-sm text-[var(--text-secondary)]">
              데이터가 더 쌓이면 웰니스 지수를 보여드려요
            </p>
          </div>
        </div>
      </Card>
    );
  }

  // 최근 체크인에서 컨디션/스트레스 추출
  const conditions = recentLogs.map(log => log.condition);
  const avgStress = recentLogs.length > 0
    ? recentLogs.reduce((sum, log) => sum + log.stressLevel, 0) / recentLogs.length
    : undefined;

  // 꿈 강도 평균
  const analyzedDreams = recentDreams.filter(d => d.analysis);
  const avgIntensity = analyzedDreams.length > 0
    ? analyzedDreams.reduce((sum, d) => sum + (d.analysis.intensity || 5), 0) / analyzedDreams.length
    : undefined;

  const uhsData = calculateUHS({
    sleep: {
      duration: todaySleep?.totalSleepMinutes,
      quality: todaySleep?.sleepQualityScore != null ? Math.round(todaySleep.sleepQualityScore / 2) : undefined,
    },
    stress: { avgStress },
    dream: {
      avgIntensity,
      dreamCount: recentDreams.length,
      symbolVariety: symbols.length,
    },
    mood: { conditions },
    prediction: { avgAccuracy: forecastStats.averageAccuracy || undefined },
  });

  return (
    <UHSCardComponent
      score={uhsData.score}
      breakdown={uhsData.breakdown}
      confidence={uhsData.confidence}
      onDetail={() => navigate('/settings')}
      compact
    />
  );
}
