/**
 * 꿈 카드 컴포넌트
 */
import { Moon, ChevronRight } from 'lucide-react';
import { formatRelativeDate } from '../../lib/utils/date';
import SymbolTag from './SymbolTag';

export default function DreamCard({ dream, onClick }) {
  const { content, analysis, createdAt, title } = dream;

  // 내용 요약 (최대 100자)
  const summary = content?.length > 100 ? content.slice(0, 100) + '...' : content;

  // 감정 이모지 매핑
  const emotionEmojis = {
    joy: '😊',
    sadness: '😢',
    fear: '😨',
    anger: '😠',
    surprise: '😲',
    disgust: '😖',
    anticipation: '🤔',
    trust: '🤝',
  };

  const primaryEmotion = analysis?.emotions?.[0];
  const emotionEmoji = primaryEmotion ? emotionEmojis[primaryEmotion.type] || '💭' : '💭';

  return (
    <button
      onClick={onClick}
      className="w-full p-4 bg-bg-secondary border border-border-default rounded-xl
                 text-left transition-all hover:border-accent-primary/50 active:scale-[0.98]"
    >
      <div className="flex items-start gap-3">
        {/* 이모지 아이콘 */}
        <div className="w-10 h-10 flex items-center justify-center bg-accent-primary/20 rounded-lg text-xl">
          {emotionEmoji}
        </div>

        <div className="flex-1 min-w-0">
          {/* 제목 & 날짜 */}
          <div className="flex items-center justify-between gap-2 mb-1">
            <h3 className="font-medium text-text-primary truncate">
              {title || '제목 없는 꿈'}
            </h3>
            <span className="text-xs text-text-muted whitespace-nowrap">
              {formatRelativeDate(createdAt)}
            </span>
          </div>

          {/* 내용 요약 */}
          <p className="text-sm text-text-secondary line-clamp-2 mb-2">
            {summary}
          </p>

          {/* 심볼 태그 */}
          {analysis?.symbols && analysis.symbols.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {analysis.symbols.slice(0, 3).map((symbol, index) => (
                <SymbolTag key={index} symbol={symbol} size="sm" />
              ))}
              {analysis.symbols.length > 3 && (
                <span className="text-xs text-text-muted px-2 py-0.5">
                  +{analysis.symbols.length - 3}
                </span>
              )}
            </div>
          )}
        </div>

        <ChevronRight size={20} className="text-text-muted flex-shrink-0" />
      </div>

      {/* 강도 표시 */}
      {analysis?.intensity && (
        <div className="mt-3 pt-3 border-t border-border-default">
          <div className="flex items-center justify-between text-xs">
            <span className="text-text-muted">꿈 강도</span>
            <div className="flex items-center gap-1">
              {[...Array(10)].map((_, i) => (
                <div
                  key={i}
                  className={`w-1.5 h-3 rounded-full ${
                    i < analysis.intensity
                      ? 'bg-accent-primary'
                      : 'bg-bg-tertiary'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </button>
  );
}
