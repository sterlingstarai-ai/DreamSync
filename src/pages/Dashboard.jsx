/**
 * 대시보드 (홈) 페이지
 */
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Moon, Sun, Sparkles, TrendingUp, Calendar,
  ChevronRight, Plus, CheckCircle2, AlertTriangle
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

export default function Dashboard() {
  const navigate = useNavigate();
  const user = useAuthStore(useShallow(state => state.user));
  const { todayDreams, recentDreams, error: dreamError, clearError: clearDreamError } = useDreams();
  const { checkedInToday, stats: checkInStats, error: checkInError, clearError: clearCheckInError } = useCheckIn();
  const { todayForecast, createTodayForecast, isGenerating, confidence: calculatedConfidence, error: forecastError, clearError: clearForecastError } = useForecast();
  const { isUHSEnabled } = useFeatureFlags();

  const activeError = dreamError || checkInError || forecastError;

  const greeting = getGreeting();
  const userName = user?.name || '사용자';

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
        <section className="mb-6">
          <ForecastCard
            forecast={todayForecast}
            isLoading={isGenerating}
            confidence={calculatedConfidence}
            hasMinimumData={hasMinimumData}
          />
        </section>

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
              <button
                onClick={() => navigate('/symbols')}
                aria-label="심볼 사전 보기"
                className="flex items-center gap-1 text-sm text-violet-400 hover:text-violet-300 transition-colors"
              >
                심볼 사전
                <ChevronRight className="w-4 h-4" aria-hidden="true" />
              </button>
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
function ForecastCard({ forecast, isLoading, confidence, hasMinimumData }) {
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
        <div className="flex flex-wrap gap-2">
          {prediction.suggestions.map((suggestion, i) => (
            <span
              key={i}
              className="text-xs px-2 py-1 rounded-full bg-violet-500/10 text-violet-300"
            >
              {suggestion}
            </span>
          ))}
        </div>
      )}

      <p className="text-xs text-[var(--text-muted)] mt-3 opacity-70">
        데이터 기반 참고 지표이며, 의료적 조언이 아닙니다.
      </p>
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
