/**
 * 주간 차트 컴포넌트
 */
import { formatShortDate } from '../../lib/utils/date';

export default function WeeklyChart({ data, type = 'condition', height = 120 }) {
  if (!data || data.length === 0) {
    return (
      <div className="p-4 bg-bg-secondary border border-border-default rounded-xl">
        <p className="text-center text-text-muted text-sm">데이터가 없어요</p>
      </div>
    );
  }

  const chartConfig = {
    condition: {
      label: '컨디션',
      maxValue: 5,
      color: 'bg-accent-primary',
      gradient: 'from-accent-primary to-accent-secondary',
    },
    stress: {
      label: '스트레스',
      maxValue: 5,
      color: 'bg-accent-danger',
      gradient: 'from-accent-warning to-accent-danger',
    },
    sleep: {
      label: '수면 시간',
      maxValue: 10, // 시간 단위
      color: 'bg-accent-secondary',
      gradient: 'from-accent-secondary to-accent-primary',
    },
    dream: {
      label: '꿈 강도',
      maxValue: 10,
      color: 'bg-purple-500',
      gradient: 'from-purple-400 to-purple-600',
    },
  };

  const config = chartConfig[type] || chartConfig.condition;

  // 최대값 계산
  const maxValue = Math.max(...data.map(d => d.value), config.maxValue);

  return (
    <div className="p-4 bg-bg-secondary border border-border-default rounded-xl">
      <h4 className="text-sm text-text-secondary mb-4">{config.label} 추이</h4>

      {/* 차트 영역 */}
      <div className="flex items-end justify-between gap-2" style={{ height }}>
        {data.map((item, index) => {
          const barHeight = (item.value / maxValue) * 100;
          const isToday = index === data.length - 1;

          return (
            <div key={index} className="flex-1 flex flex-col items-center">
              {/* 값 표시 */}
              <span className="text-xs text-text-muted mb-1">
                {item.value.toFixed(type === 'sleep' ? 1 : 0)}
              </span>

              {/* 바 */}
              <div
                className="w-full relative rounded-t-md transition-all"
                style={{ height: `${barHeight}%`, minHeight: '4px' }}
              >
                <div
                  className={`absolute inset-0 rounded-t-md bg-gradient-to-t ${config.gradient}
                              ${isToday ? 'opacity-100' : 'opacity-60'}`}
                />
                {isToday && (
                  <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-white rounded-full" />
                )}
              </div>

              {/* 날짜 */}
              <span className={`text-xs mt-2 ${isToday ? 'text-accent-primary font-medium' : 'text-text-muted'}`}>
                {formatShortDate(item.date)}
              </span>
            </div>
          );
        })}
      </div>

      {/* 평균 라인 */}
      {data.length > 1 && (
        <div className="mt-3 pt-3 border-t border-border-default flex justify-between text-xs">
          <span className="text-text-muted">7일 평균</span>
          <span className="text-text-primary font-medium">
            {(data.reduce((sum, d) => sum + d.value, 0) / data.length).toFixed(1)}
          </span>
        </div>
      )}
    </div>
  );
}
