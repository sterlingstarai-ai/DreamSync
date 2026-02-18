/**
 * 주간 리포트 페이지
 */
import { useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BarChart3, Moon, Calendar, TrendingUp, TrendingDown,
  Minus, Plus, Sparkles, AlertTriangle, Share2
} from 'lucide-react';
import {
  PageContainer, PageHeader, Card, EmptyState, Button, useToast
} from '../components/common';
import BottomNav from '../components/common/BottomNav';
import useDreams from '../hooks/useDreams';
import useCheckIn from '../hooks/useCheckIn';
import useForecast from '../hooks/useForecast';
import { formatDate, getRecentDays, getShortDayName } from '../lib/utils/date';
import { getEmotionById } from '../constants/emotions';
import useAuthStore from '../store/useAuthStore';
import useGoalStore from '../store/useGoalStore';
import useCoachPlanStore from '../store/useCoachPlanStore';

export default function WeeklyReport() {
  const navigate = useNavigate();
  const toast = useToast();
  const user = useAuthStore(state => state.user);
  const {
    dreams,
    recentDreams,
    symbols,
    error: dreamError,
    clearError: clearDreamError,
  } = useDreams();
  const {
    logs,
    recentLogs,
    stats: checkInStats,
    error: checkInError,
    clearError: clearCheckInError,
  } = useCheckIn();
  const {
    stats: forecastStats,
    experimentSummary,
    error: forecastError,
    clearError: clearForecastError,
  } = useForecast();
  const getWeeklyProgress = useGoalStore(state => state.getWeeklyProgress);
  const updateGoals = useGoalStore(state => state.updateGoals);
  const getSuggestedGoals = useGoalStore(state => state.getSuggestedGoals);
  const applySuggestedGoals = useGoalStore(state => state.applySuggestedGoals);
  const coachPlanStats = useCoachPlanStore((state) => {
    if (!user?.id) {
      return {
        days: 7,
        activeDays: 0,
        totalTasks: 0,
        completedTasks: 0,
        completionRate: 0,
      };
    }
    return state.getRecentPlanStats(user.id, 7);
  });

  const activeError = dreamError || checkInError || forecastError;

  const weekDays = getRecentDays(7);

  // 주간 데이터가 충분한지 확인
  const hasEnoughData = recentLogs.length >= 3 || recentDreams.length >= 2;

  // 일별 컨디션 데이터
  const conditionByDay = useMemo(() => {
    const map = {};
    recentLogs.forEach(log => {
      map[log.date] = log.condition;
    });
    return weekDays.map(day => ({
      date: day,
      dayName: getShortDayName(day),
      condition: map[day] || null,
    }));
  }, [recentLogs, weekDays]);

  // 감정 통계
  const emotionStats = useMemo(() => {
    const counts = {};
    recentLogs.forEach(log => {
      (log.emotions || []).forEach(e => {
        counts[e] = (counts[e] || 0) + 1;
      });
    });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([id, count]) => ({
        ...getEmotionById(id),
        count,
      }));
  }, [recentLogs]);

  // 심볼 통계
  const topSymbols = symbols.slice(0, 5);

  const goalProgress = useMemo(() => {
    if (!user?.id) {
      return {
        goals: {},
        metrics: {},
        progress: {},
      };
    }
    return getWeeklyProgress(user.id, {
      logs: recentLogs,
      dreams: recentDreams,
    });
  }, [user, getWeeklyProgress, recentLogs, recentDreams]);

  const achievedGoalCount = useMemo(() => {
    const progressValues = Object.values(goalProgress.progress || {});
    return progressValues.filter(item => item.achieved).length;
  }, [goalProgress]);

  const adjustGoal = useCallback((goalKey, delta) => {
    if (!user?.id) return;
    const current = goalProgress.goals?.[goalKey];
    if (typeof current !== 'number') return;

    const step = goalKey === 'avgSleepHours' ? 0.5 : 1;
    const rawNext = current + (delta * step);
    const next = goalKey === 'avgSleepHours'
      ? Math.max(4, Math.min(10, Math.round(rawNext * 10) / 10))
      : Math.max(1, Math.round(rawNext));

    updateGoals(user.id, {
      ...goalProgress.goals,
      [goalKey]: next,
    });
  }, [user, goalProgress, updateGoals]);

  const goalSuggestion = useMemo(() => {
    if (!user?.id) return null;
    return getSuggestedGoals(user.id, {
      logs,
      dreams,
      lookbackDays: 14,
    });
  }, [user, getSuggestedGoals, logs, dreams]);

  const applyRecommendedGoals = useCallback(() => {
    if (!user?.id) return;
    const applied = applySuggestedGoals(user.id, {
      logs,
      dreams,
      lookbackDays: 14,
    });
    if (applied) {
      toast.success('추천 목표를 적용했어요');
    }
  }, [user, logs, dreams, applySuggestedGoals, toast]);

  // 공유 텍스트 생성
  const buildShareText = useCallback(() => {
    const lines = [
      `DreamSync 주간 리포트`,
      `${formatDate(weekDays[0])} - ${formatDate(weekDays[6])}`,
      ``,
      `꿈 기록: ${recentDreams.length}개`,
      `체크인율: ${checkInStats.completionRate}%`,
      `평균 컨디션: ${checkInStats.averageCondition}/5`,
    ];
    if (forecastStats.averageAccuracy) {
      lines.push(`예보 정확도: ${forecastStats.averageAccuracy}%`);
    }
    if (emotionStats.length > 0) {
      lines.push('', '주요 감정: ' + emotionStats.map(e => e.name).join(', '));
    }
    if (topSymbols.length > 0) {
      lines.push('자주 등장한 심볼: ' + topSymbols.map(s => s.name).join(', '));
    }
    lines.push('', '#DreamSync');
    return lines.join('\n');
  }, [weekDays, recentDreams, checkInStats, forecastStats, emotionStats, topSymbols]);

  const handleShare = useCallback(async () => {
    const text = buildShareText();

    if (navigator.share) {
      try {
        await navigator.share({ title: 'DreamSync 주간 리포트', text });
        return;
      } catch {
        // user cancelled or share failed — fall through to clipboard
      }
    }

    try {
      await navigator.clipboard.writeText(text);
      toast.success('클립보드에 복사되었습니다');
    } catch {
      toast.warning('공유할 수 없습니다');
    }
  }, [buildShareText, toast]);

  return (
    <>
      <PageContainer className="pb-24">
        <PageHeader
          title="주간 리포트"
          subtitle={`${formatDate(weekDays[0])} - ${formatDate(weekDays[6])}`}
          rightAction={
            hasEnoughData ? (
              <button onClick={handleShare} className="p-2 rounded-lg hover:bg-[var(--bg-tertiary)] transition-colors">
                <Share2 className="w-5 h-5 text-[var(--text-muted)]" />
              </button>
            ) : null
          }
        />

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

        {!hasEnoughData ? (
          <EmptyState
            icon={BarChart3}
            title="데이터가 부족해요"
            description="최소 3일 이상 체크인하면 주간 리포트를 볼 수 있어요"
          />
        ) : (
          <div className="space-y-6">
            {/* 요약 통계 카드 */}
            <section className="grid grid-cols-2 gap-3">
              <SummaryCard
                icon={Moon}
                label="꿈 기록"
                value={recentDreams.length}
                unit="개"
                trend={recentDreams.length >= 3 ? 'up' : null}
              />
              <SummaryCard
                icon={Calendar}
                label="체크인율"
                value={checkInStats.completionRate}
                unit="%"
                trend={checkInStats.completionRate >= 70 ? 'up' : checkInStats.completionRate < 50 ? 'down' : null}
              />
              <SummaryCard
                icon={BarChart3}
                label="평균 컨디션"
                value={checkInStats.averageCondition}
                unit="/5"
              />
              <SummaryCard
                icon={Sparkles}
                label="예보 정확도"
                value={forecastStats.averageAccuracy || '--'}
                unit={forecastStats.averageAccuracy ? '%' : ''}
              />
            </section>

            {/* 컨디션 차트 */}
            <section>
              <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-3">
                일별 컨디션
              </h2>
              <Card padding="lg">
                <div className="flex items-end justify-between h-32">
                  {conditionByDay.map((day) => (
                    <div key={day.date} className="flex flex-col items-center gap-2">
                      <div
                        className="w-8 rounded-t-lg transition-all"
                        style={{
                          height: day.condition ? `${(day.condition / 5) * 80}px` : '4px',
                          backgroundColor: day.condition
                            ? getConditionColor(day.condition)
                            : 'var(--bg-tertiary)',
                        }}
                      />
                      <span className="text-xs text-[var(--text-muted)]">
                        {day.dayName}
                      </span>
                    </div>
                  ))}
                </div>
              </Card>
            </section>

            {/* 감정 분석 */}
            {emotionStats.length > 0 && (
              <section>
                <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-3">
                  주요 감정
                </h2>
                <Card padding="lg">
                  <div className="space-y-3">
                    {emotionStats.map((emotion) => (
                      <div key={emotion.id} className="flex items-center gap-3">
                        <span className="text-2xl">{emotion.emoji}</span>
                        <div className="flex-1">
                          <div className="flex justify-between mb-1">
                            <span className="text-sm text-[var(--text-primary)]">
                              {emotion.name}
                            </span>
                            <span className="text-sm text-[var(--text-muted)]">
                              {emotion.count}회
                            </span>
                          </div>
                          <div className="h-2 bg-[var(--bg-tertiary)] rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full"
                              style={{
                                width: `${(emotion.count / recentLogs.length) * 100}%`,
                                backgroundColor: emotion.color,
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              </section>
            )}

            {/* 심볼 분석 */}
            {topSymbols.length > 0 && (
              <section>
                <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-3">
                  자주 등장한 심볼
                </h2>
                <Card padding="lg">
                  <div className="flex flex-wrap gap-2">
                    {topSymbols.map((symbol) => (
                      <button
                        key={symbol.name}
                        onClick={() => navigate('/symbols')}
                        className="px-4 py-2 rounded-xl bg-violet-500/10 text-violet-300 hover:bg-violet-500/20 transition-colors"
                      >
                        <span className="font-medium">{symbol.name}</span>
                        <span className="text-xs ml-2 text-violet-400/70">
                          {symbol.count}회
                        </span>
                      </button>
                    ))}
                  </div>
                </Card>
              </section>
            )}

            {/* 주간 코치 목표 */}
            <section>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg font-semibold text-[var(--text-primary)]">
                  주간 코치 목표
                </h2>
                <span className="text-sm text-[var(--text-muted)]">
                  {achievedGoalCount}/3 달성
                </span>
              </div>

              <div className="space-y-3">
                <GoalProgressCard
                  label="체크인"
                  unit="일"
                  goalKey="checkInDays"
                  progress={goalProgress.progress?.checkInDays}
                  onAdjust={adjustGoal}
                />
                <GoalProgressCard
                  label="꿈 기록"
                  unit="개"
                  goalKey="dreamCount"
                  progress={goalProgress.progress?.dreamCount}
                  onAdjust={adjustGoal}
                />
                <GoalProgressCard
                  label="평균 수면"
                  unit="시간"
                  goalKey="avgSleepHours"
                  progress={goalProgress.progress?.avgSleepHours}
                  onAdjust={adjustGoal}
                />
              </div>

              {goalSuggestion && (
                <Card padding="md" className="mt-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-[var(--text-primary)]">
                        추천 목표 ({goalSuggestion.confidence})
                      </p>
                      <p className="text-xs text-[var(--text-muted)] mt-1">
                        최근 {goalSuggestion.basis.lookbackDays}일 패턴 기반
                      </p>
                      <p className="text-xs text-[var(--text-secondary)] mt-2">
                        체크인 {goalSuggestion.suggested.checkInDays}일 · 꿈 {goalSuggestion.suggested.dreamCount}개 · 수면 {goalSuggestion.suggested.avgSleepHours}시간
                      </p>
                    </div>
                    <Button size="sm" variant="secondary" onClick={applyRecommendedGoals}>
                      추천 적용
                    </Button>
                  </div>
                </Card>
              )}
            </section>

            {/* 행동 실험 리포트 */}
            <section>
              <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-3">
                행동 실험 결과
              </h2>
              <Card padding="lg">
                {experimentSummary.sampleSize === 0 ? (
                  <p className="text-sm text-[var(--text-muted)]">
                    아직 실험 데이터가 부족해요. 대시보드에서 추천 행동을 체크해보세요.
                  </p>
                ) : (
                  <div className="space-y-2">
                    <p className="text-sm text-[var(--text-secondary)]">
                      추천 행동을 절반 이상 실천한 날: <strong className="text-[var(--text-primary)]">{experimentSummary.highCompletionDays}일</strong>
                    </p>
                    <p className="text-sm text-[var(--text-secondary)]">
                      실천률이 낮았던 날: <strong className="text-[var(--text-primary)]">{experimentSummary.lowCompletionDays}일</strong>
                    </p>
                    <p className="text-sm text-[var(--text-secondary)]">
                      실천율 높은 날 평균 컨디션: <strong className="text-emerald-300">{experimentSummary.avgConditionHighCompletion || 0}/5</strong>
                    </p>
                    <p className="text-sm text-[var(--text-secondary)]">
                      실천율 낮은 날 평균 컨디션: <strong className="text-amber-300">{experimentSummary.avgConditionLowCompletion || 0}/5</strong>
                    </p>
                    <p className="text-sm text-[var(--text-secondary)]">
                      차이: <strong className={experimentSummary.improvement >= 0 ? 'text-emerald-300' : 'text-red-300'}>
                        {experimentSummary.improvement > 0 ? '+' : ''}{experimentSummary.improvement}
                      </strong>
                    </p>
                  </div>
                )}
              </Card>
            </section>

            {/* 코치 플랜 이행률 */}
            <section>
              <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-3">
                코치 플랜 이행률
              </h2>
              <Card padding="lg">
                {coachPlanStats.totalTasks === 0 ? (
                  <p className="text-sm text-[var(--text-muted)]">
                    코치 플랜 기록이 아직 없어요. 대시보드에서 오늘 플랜을 실행해보세요.
                  </p>
                ) : (
                  <div className="space-y-2">
                    <p className="text-sm text-[var(--text-secondary)]">
                      최근 7일 활성 일수: <strong className="text-[var(--text-primary)]">{coachPlanStats.activeDays}일</strong>
                    </p>
                    <p className="text-sm text-[var(--text-secondary)]">
                      완료 태스크: <strong className="text-emerald-300">{coachPlanStats.completedTasks}개</strong>
                      {' '}/ {coachPlanStats.totalTasks}개
                    </p>
                    <p className="text-sm text-[var(--text-secondary)]">
                      이행률: <strong className={coachPlanStats.completionRate >= 60 ? 'text-emerald-300' : 'text-amber-300'}>
                        {coachPlanStats.completionRate}%
                      </strong>
                    </p>
                  </div>
                )}
              </Card>
            </section>

            {/* 인사이트 */}
            <section>
              <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-3">
                이번 주 인사이트
              </h2>
              <Card variant="gradient" padding="lg">
                <div className="flex gap-3">
                  <div className="w-10 h-10 rounded-xl bg-violet-500/20 flex items-center justify-center flex-shrink-0">
                    <Sparkles className="w-5 h-5 text-violet-400" />
                  </div>
                  <div>
                    {generateInsight(checkInStats, recentDreams.length, emotionStats)}
                  </div>
                </div>
              </Card>
            </section>
          </div>
        )}
      </PageContainer>

      <BottomNav />
    </>
  );
}

/**
 * 요약 통계 카드
 */
function SummaryCard({ icon: SummaryIcon, label, value, unit, trend = null }) {
  return (
    <Card padding="md">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-[var(--text-muted)] mb-1">{label}</p>
          <p className="text-2xl font-bold text-[var(--text-primary)]">
            {value}
            <span className="text-sm font-normal text-[var(--text-muted)]">
              {unit}
            </span>
          </p>
        </div>
        <div className="flex items-center gap-1">
          <SummaryIcon className="w-4 h-4 text-[var(--text-muted)]" />
          {trend === 'up' && <TrendingUp className="w-4 h-4 text-emerald-400" />}
          {trend === 'down' && <TrendingDown className="w-4 h-4 text-red-400" />}
        </div>
      </div>
    </Card>
  );
}

function GoalProgressCard({ label, unit, goalKey, progress, onAdjust }) {
  if (!progress) return null;

  const rate = Math.min(100, progress.rate || 0);

  return (
    <Card padding="md">
      <div className="flex items-center justify-between mb-2">
        <div>
          <p className="text-sm text-[var(--text-primary)] font-medium">{label}</p>
          <p className="text-xs text-[var(--text-muted)]">
            {progress.current}{unit} / 목표 {progress.target}{unit}
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => onAdjust(goalKey, -1)}
            className="w-7 h-7 rounded-full bg-[var(--bg-tertiary)] text-[var(--text-secondary)] flex items-center justify-center"
            aria-label={`${label} 목표 낮추기`}
          >
            <Minus className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onAdjust(goalKey, 1)}
            className="w-7 h-7 rounded-full bg-[var(--bg-tertiary)] text-[var(--text-secondary)] flex items-center justify-center"
            aria-label={`${label} 목표 높이기`}
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="h-2 rounded-full bg-[var(--bg-tertiary)] overflow-hidden">
        <div
          className={`h-full ${progress.achieved ? 'bg-emerald-500' : 'bg-violet-500'}`}
          style={{ width: `${rate}%` }}
        />
      </div>
      <p className={`text-xs mt-2 ${progress.achieved ? 'text-emerald-300' : 'text-[var(--text-muted)]'}`}>
        {progress.achieved ? '목표 달성' : `달성률 ${rate}%`}
      </p>
    </Card>
  );
}

/**
 * 컨디션별 색상
 */
function getConditionColor(condition) {
  const colors = {
    1: '#ef4444',
    2: '#f97316',
    3: '#f59e0b',
    4: '#3b82f6',
    5: '#10b981',
  };
  return colors[condition] || '#9ca3af';
}

/**
 * 인사이트 생성
 */
function generateInsight(checkInStats, dreamCount, emotionStats) {
  const insights = [];

  // 컨디션 기반 인사이트
  if (checkInStats.averageCondition >= 4) {
    insights.push('이번 주는 전반적으로 좋은 컨디션을 유지했어요!');
  } else if (checkInStats.averageCondition <= 2) {
    insights.push('이번 주는 조금 힘들었던 것 같아요. 충분한 휴식이 필요해 보여요.');
  } else {
    insights.push('이번 주는 평범하게 지나갔네요.');
  }

  // 꿈 기록 기반
  if (dreamCount >= 5) {
    insights.push('꿈을 활발하게 기록하고 있어요. 무의식의 메시지에 귀 기울이는 중이네요.');
  } else if (dreamCount === 0) {
    insights.push('이번 주는 꿈 기록이 없었어요. 아침에 일어나자마자 기록해보세요.');
  }

  // 감정 기반
  if (emotionStats.length > 0) {
    const topEmotion = emotionStats[0];
    insights.push(`가장 많이 느낀 감정은 '${topEmotion.name}'이었어요.`);
  }

  return (
    <div className="space-y-2">
      {insights.map((text, i) => (
        <p key={i} className="text-sm text-[var(--text-secondary)]">
          {text}
        </p>
      ))}
    </div>
  );
}
