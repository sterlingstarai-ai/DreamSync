/**
 * 인사이트 목록 컴포넌트
 */
import { Sparkles, ChevronRight } from 'lucide-react';

export default function InsightList({ insights = [], onInsightClick }) {
  if (!insights.length) {
    return (
      <div className="p-4 bg-bg-secondary border border-border-default rounded-xl">
        <p className="text-center text-text-muted text-sm">
          아직 인사이트가 없어요. 더 많은 데이터를 쌓아보세요!
        </p>
      </div>
    );
  }

  // 중요도별 색상
  const importanceColors = {
    high: 'border-l-accent-primary',
    medium: 'border-l-accent-secondary',
    low: 'border-l-accent-warning',
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Sparkles size={18} className="text-accent-primary" />
        <h3 className="font-medium text-text-primary">이번 주 인사이트</h3>
      </div>

      <div className="space-y-2">
        {insights.map((insight, index) => (
          <button
            key={index}
            onClick={() => onInsightClick?.(insight)}
            className={`w-full text-left p-4 bg-bg-secondary border border-border-default rounded-xl
                        border-l-4 ${importanceColors[insight.importance] || importanceColors.medium}
                        transition-all hover:border-accent-primary/50 active:scale-[0.98]`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                {/* 카테고리 */}
                {insight.category && (
                  <span className="text-xs text-text-muted">{insight.category}</span>
                )}

                {/* 제목 */}
                <h4 className="font-medium text-text-primary mb-1">{insight.title}</h4>

                {/* 설명 */}
                <p className="text-sm text-text-secondary line-clamp-2">{insight.description}</p>

                {/* 태그 */}
                {insight.tags && insight.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {insight.tags.map((tag, i) => (
                      <span
                        key={i}
                        className="px-2 py-0.5 bg-bg-tertiary rounded text-xs text-text-muted"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <ChevronRight size={20} className="text-text-muted flex-shrink-0" />
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
