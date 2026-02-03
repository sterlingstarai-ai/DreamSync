/**
 * 꿈 분석 결과 표시 컴포넌트
 */
import { Sparkles, TrendingUp, Heart, AlertCircle } from 'lucide-react';
import SymbolTag from './SymbolTag';

export default function DreamAnalysis({ analysis, isLoading }) {
  if (isLoading) {
    return (
      <div className="p-6 bg-bg-secondary border border-border-default rounded-xl">
        <div className="flex items-center gap-3 mb-4">
          <Sparkles size={20} className="text-accent-primary animate-pulse" />
          <span className="text-text-primary">꿈을 분석하고 있어요...</span>
        </div>
        <div className="space-y-3">
          <div className="h-4 bg-bg-tertiary rounded animate-pulse" />
          <div className="h-4 bg-bg-tertiary rounded animate-pulse w-3/4" />
          <div className="h-4 bg-bg-tertiary rounded animate-pulse w-1/2" />
        </div>
      </div>
    );
  }

  if (!analysis) {
    return null;
  }

  const { symbols, emotions, themes, intensity, interpretation, actionSuggestion } = analysis;

  // 감정 색상 매핑
  const emotionColors = {
    joy: 'bg-green-500/20 text-green-400',
    sadness: 'bg-blue-500/20 text-blue-400',
    fear: 'bg-purple-500/20 text-purple-400',
    anger: 'bg-red-500/20 text-red-400',
    surprise: 'bg-yellow-500/20 text-yellow-400',
    disgust: 'bg-orange-500/20 text-orange-400',
    anticipation: 'bg-cyan-500/20 text-cyan-400',
    trust: 'bg-emerald-500/20 text-emerald-400',
  };

  return (
    <div className="space-y-4">
      {/* 해석 */}
      {interpretation && (
        <div className="p-4 bg-bg-secondary border border-border-default rounded-xl">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles size={18} className="text-accent-primary" />
            <h4 className="font-medium text-text-primary">AI 해석</h4>
          </div>
          <p className="text-sm text-text-secondary leading-relaxed">
            {interpretation}
          </p>
        </div>
      )}

      {/* 심볼 */}
      {symbols && symbols.length > 0 && (
        <div className="p-4 bg-bg-secondary border border-border-default rounded-xl">
          <h4 className="font-medium text-text-primary mb-3">등장한 심볼</h4>
          <div className="flex flex-wrap gap-2">
            {symbols.map((symbol, index) => (
              <SymbolTag key={index} symbol={symbol} showMeaning />
            ))}
          </div>
        </div>
      )}

      {/* 감정 */}
      {emotions && emotions.length > 0 && (
        <div className="p-4 bg-bg-secondary border border-border-default rounded-xl">
          <div className="flex items-center gap-2 mb-3">
            <Heart size={18} className="text-accent-danger" />
            <h4 className="font-medium text-text-primary">감정</h4>
          </div>
          <div className="flex flex-wrap gap-2">
            {emotions.map((emotion, index) => (
              <div
                key={index}
                className={`px-3 py-1.5 rounded-full text-sm ${
                  emotionColors[emotion.type] || 'bg-bg-tertiary text-text-secondary'
                }`}
              >
                {emotion.label} {Math.round(emotion.intensity * 100)}%
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 테마 */}
      {themes && themes.length > 0 && (
        <div className="p-4 bg-bg-secondary border border-border-default rounded-xl">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp size={18} className="text-accent-secondary" />
            <h4 className="font-medium text-text-primary">테마</h4>
          </div>
          <div className="flex flex-wrap gap-2">
            {themes.map((theme, index) => (
              <span
                key={index}
                className="px-3 py-1.5 bg-accent-secondary/20 text-accent-secondary rounded-full text-sm"
              >
                #{theme}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* 강도 */}
      {intensity !== undefined && (
        <div className="p-4 bg-bg-secondary border border-border-default rounded-xl">
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-medium text-text-primary">꿈 강도</h4>
            <span className="text-accent-primary font-bold">{intensity}/10</span>
          </div>
          <div className="h-2 bg-bg-tertiary rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-accent-primary to-accent-secondary rounded-full transition-all"
              style={{ width: `${intensity * 10}%` }}
            />
          </div>
        </div>
      )}

      {/* 행동 제안 */}
      {actionSuggestion && (
        <div className="p-4 bg-accent-primary/10 border border-accent-primary/30 rounded-xl">
          <div className="flex items-start gap-3">
            <AlertCircle size={18} className="text-accent-primary flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-medium text-text-primary mb-1">오늘의 제안</h4>
              <p className="text-sm text-text-secondary">{actionSuggestion}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
