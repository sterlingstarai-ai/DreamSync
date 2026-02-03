/**
 * 패턴 카드 컴포넌트
 */
import { TrendingUp, TrendingDown, Minus, Lightbulb } from 'lucide-react';

export default function PatternCard({ pattern }) {
  if (!pattern) return null;

  const { title, description, trend, insight, emoji, confidence } = pattern;

  const trendConfig = {
    up: {
      icon: TrendingUp,
      color: 'text-accent-success',
      bgColor: 'bg-accent-success/10',
      label: '상승',
    },
    down: {
      icon: TrendingDown,
      color: 'text-accent-danger',
      bgColor: 'bg-accent-danger/10',
      label: '하락',
    },
    stable: {
      icon: Minus,
      color: 'text-accent-secondary',
      bgColor: 'bg-accent-secondary/10',
      label: '안정',
    },
  };

  const trendStyle = trendConfig[trend] || trendConfig.stable;
  const TrendIcon = trendStyle.icon;

  return (
    <div className="p-4 bg-bg-secondary border border-border-default rounded-xl">
      {/* 헤더 */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          {emoji && <span className="text-2xl">{emoji}</span>}
          <h4 className="font-medium text-text-primary">{title}</h4>
        </div>

        {trend && (
          <div className={`flex items-center gap-1 px-2 py-1 rounded-full ${trendStyle.bgColor}`}>
            <TrendIcon size={14} className={trendStyle.color} />
            <span className={`text-xs ${trendStyle.color}`}>{trendStyle.label}</span>
          </div>
        )}
      </div>

      {/* 설명 */}
      {description && (
        <p className="text-sm text-text-secondary mb-3">{description}</p>
      )}

      {/* 인사이트 */}
      {insight && (
        <div className="flex items-start gap-2 p-3 bg-accent-primary/10 rounded-lg">
          <Lightbulb size={16} className="text-accent-primary flex-shrink-0 mt-0.5" />
          <p className="text-sm text-text-primary">{insight}</p>
        </div>
      )}

      {/* 신뢰도 */}
      {confidence !== undefined && (
        <div className="mt-3 flex items-center justify-end gap-2">
          <span className="text-xs text-text-muted">신뢰도</span>
          <div className="flex gap-0.5">
            {[...Array(5)].map((_, i) => (
              <div
                key={i}
                className={`w-1.5 h-3 rounded-full ${
                  i < Math.round(confidence / 20)
                    ? 'bg-accent-primary'
                    : 'bg-bg-tertiary'
                }`}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
