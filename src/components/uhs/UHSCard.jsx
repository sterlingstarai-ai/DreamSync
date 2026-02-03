/**
 * UHS (Unconscious Health Score) 카드 컴포넌트
 *
 * ⚠️ 중요: 의료/진단/치료 표현 절대 금지
 * "참고 지표", "웰니스 상태" 등만 사용
 */
import { Info, ChevronRight } from 'lucide-react';
import { getUHSLevel, UHS_DISCLAIMER } from '../../lib/scoring';

export default function UHSCard({ score, breakdown, confidence, onDetail, compact = false }) {
  const { level, description } = getUHSLevel(score || 0);

  // 점수에 따른 색상
  const getScoreColor = () => {
    if (score >= 80) return 'text-accent-success';
    if (score >= 60) return 'text-accent-secondary';
    if (score >= 40) return 'text-accent-warning';
    return 'text-accent-danger';
  };

  const getScoreGradient = () => {
    if (score >= 80) return 'from-accent-success to-emerald-400';
    if (score >= 60) return 'from-accent-secondary to-blue-400';
    if (score >= 40) return 'from-accent-warning to-yellow-400';
    return 'from-accent-danger to-red-400';
  };

  if (compact) {
    return (
      <button
        onClick={onDetail}
        className="w-full p-4 bg-bg-secondary border border-border-default rounded-xl
                   flex items-center justify-between"
      >
        <div className="flex items-center gap-3">
          <div className={`text-3xl font-bold ${getScoreColor()}`}>
            {Math.round(score || 0)}
          </div>
          <div>
            <p className="text-sm text-text-secondary">웰니스 지수</p>
            <p className={`font-medium ${getScoreColor()}`}>{level}</p>
          </div>
        </div>
        <ChevronRight size={20} className="text-text-muted" />
      </button>
    );
  }

  return (
    <div className="bg-bg-secondary border border-border-default rounded-xl overflow-hidden">
      {/* 점수 표시 */}
      <div className={`p-6 bg-gradient-to-br ${getScoreGradient()}`}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-white/80 text-sm mb-1">웰니스 지수</p>
            <div className="flex items-baseline gap-2">
              <span className="text-5xl font-bold text-white">{Math.round(score || 0)}</span>
              <span className="text-white/60 text-lg">/100</span>
            </div>
          </div>

          <div className="text-right">
            <span className="px-3 py-1 bg-white/20 rounded-full text-white text-sm font-medium">
              {level}
            </span>
            {confidence && (
              <p className="text-white/60 text-xs mt-2">
                신뢰도 {confidence}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* 설명 */}
      <div className="p-4">
        <p className="text-text-primary mb-3">{description}</p>

        {/* 간단 분석 */}
        {breakdown && (
          <div className="grid grid-cols-5 gap-2 mb-4">
            {[
              { key: 'sleep', label: '수면', emoji: '😴' },
              { key: 'stress', label: '스트레스', emoji: '😤' },
              { key: 'dream', label: '꿈', emoji: '💭' },
              { key: 'mood', label: '기분', emoji: '🎭' },
              { key: 'prediction', label: '예측', emoji: '🎯' },
            ].map(({ key, label, emoji }) => (
              <div key={key} className="text-center p-2 bg-bg-tertiary rounded-lg">
                <span className="text-lg">{emoji}</span>
                <p className="text-xs text-text-muted mt-1">{label}</p>
                <p className="text-sm font-medium text-text-primary">
                  {breakdown[key] ? Math.round(breakdown[key]) : '-'}
                </p>
              </div>
            ))}
          </div>
        )}

        {/* 상세 보기 버튼 */}
        {onDetail && (
          <button
            onClick={onDetail}
            className="w-full flex items-center justify-center gap-2 py-3 bg-bg-tertiary rounded-lg
                       text-text-secondary hover:text-text-primary transition-colors"
          >
            <span className="text-sm">상세 분석 보기</span>
            <ChevronRight size={16} />
          </button>
        )}
      </div>

      {/* 면책 조항 */}
      <div className="px-4 pb-4">
        <div className="flex items-start gap-2 p-3 bg-bg-tertiary rounded-lg">
          <Info size={14} className="text-text-muted flex-shrink-0 mt-0.5" />
          <p className="text-xs text-text-muted">{UHS_DISCLAIMER}</p>
        </div>
      </div>
    </div>
  );
}
