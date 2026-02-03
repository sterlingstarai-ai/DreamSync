/**
 * 주간 리포트 페이지
 */
import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BarChart3, Moon, Calendar, TrendingUp, TrendingDown,
  Minus, ChevronLeft, ChevronRight, Sparkles, AlertTriangle
} from 'lucide-react';
import {
  PageContainer, PageHeader, Card, EmptyState
} from '../components/common';
import BottomNav from '../components/common/BottomNav';
import useDreams from '../hooks/useDreams';
import useCheckIn from '../hooks/useCheckIn';
import useForecast from '../hooks/useForecast';
import { formatDate, getRecentDays, getShortDayName } from '../lib/utils/date';
import { getEmotionById } from '../constants/emotions';

export default function WeeklyReport() {
  const navigate = useNavigate();
  const { recentDreams, symbols, error: dreamError, clearError: clearDreamError } = useDreams();
  const { recentLogs, stats: checkInStats, error: checkInError, clearError: clearCheckInError } = useCheckIn();
  const { stats: forecastStats, error: forecastError, clearError: clearForecastError } = useForecast();

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
      log.emotions.forEach(e => {
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

  return (
    <>
      <PageContainer className="pb-24">
        <PageHeader
          title="주간 리포트"
          subtitle={`${formatDate(weekDays[0])} - ${formatDate(weekDays[6])}`}
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
function SummaryCard({ icon: SummaryIcon, label, value, unit, trend }) {
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
